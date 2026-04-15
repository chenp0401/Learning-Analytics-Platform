"""
数据集内存管理

提供数据集 TTL 过期管理，避免内存泄漏。
支持可选的 Redis 缓存。
"""

import os
import time
import logging
import threading
from typing import Optional

logger = logging.getLogger(__name__)

# 默认 TTL（秒）：30 分钟
DEFAULT_TTL = int(os.getenv("DATASET_TTL", "1800"))
# 清理间隔（秒）：5 分钟
CLEANUP_INTERVAL = 300


class DatasetEntry:
    """数据集条目，包含数据和过期时间"""

    def __init__(self, data, ttl: int = DEFAULT_TTL):
        self.data = data
        self.created_at = time.time()
        self.last_accessed = time.time()
        self.ttl = ttl

    def is_expired(self) -> bool:
        """检查是否已过期"""
        return (time.time() - self.last_accessed) > self.ttl

    def touch(self):
        """更新最后访问时间"""
        self.last_accessed = time.time()


class DatasetManager:
    """数据集内存管理器"""

    def __init__(self, default_ttl: int = DEFAULT_TTL):
        self._store: dict[str, DatasetEntry] = {}
        self._lock = threading.Lock()
        self._default_ttl = default_ttl
        self._redis_client = None
        self._cleanup_thread: Optional[threading.Thread] = None
        self._running = False

        # 尝试连接 Redis
        self._init_redis()
        # 启动清理线程
        self._start_cleanup()

    def _init_redis(self):
        """尝试初始化 Redis 连接"""
        redis_url = os.getenv("REDIS_URL", "")
        if not redis_url:
            return

        try:
            import redis
            self._redis_client = redis.from_url(redis_url, decode_responses=False)
            self._redis_client.ping()
            logger.info("Redis 缓存已连接")
        except Exception as e:
            logger.warning(f"Redis 连接失败，使用纯内存存储: {str(e)}")
            self._redis_client = None

    def _start_cleanup(self):
        """启动后台清理线程"""
        self._running = True
        self._cleanup_thread = threading.Thread(
            target=self._cleanup_loop, daemon=True
        )
        self._cleanup_thread.start()

    def _cleanup_loop(self):
        """定期清理过期数据集"""
        while self._running:
            time.sleep(CLEANUP_INTERVAL)
            self._cleanup_expired()

    def _cleanup_expired(self):
        """清理过期的数据集"""
        with self._lock:
            expired_keys = [
                key for key, entry in self._store.items()
                if entry.is_expired()
            ]
            for key in expired_keys:
                del self._store[key]
                logger.info(f"数据集 {key} 已过期清理")

            if expired_keys:
                logger.info(f"清理了 {len(expired_keys)} 个过期数据集，当前存储 {len(self._store)} 个")

    def put(self, key: str, data, ttl: Optional[int] = None):
        """
        存储数据集

        Args:
            key: 数据集 ID
            data: 数据集对象
            ttl: 过期时间（秒），默认使用全局 TTL
        """
        entry = DatasetEntry(data, ttl or self._default_ttl)
        with self._lock:
            self._store[key] = entry

        # 同时缓存到 Redis（序列化 DataFrame 为 JSON）
        if self._redis_client:
            try:
                import pickle
                serialized = pickle.dumps(data)
                self._redis_client.setex(
                    f"dataset:{key}",
                    ttl or self._default_ttl,
                    serialized,
                )
            except Exception as e:
                logger.warning(f"Redis 缓存写入失败: {str(e)}")

    def get(self, key: str):
        """
        获取数据集

        Args:
            key: 数据集 ID

        Returns:
            数据集对象，不存在或已过期返回 None
        """
        with self._lock:
            entry = self._store.get(key)
            if entry and not entry.is_expired():
                entry.touch()
                return entry.data

            # 内存中没有，尝试从 Redis 恢复
            if self._redis_client:
                try:
                    import pickle
                    cached = self._redis_client.get(f"dataset:{key}")
                    if cached:
                        data = pickle.loads(cached)
                        self._store[key] = DatasetEntry(data, self._default_ttl)
                        return data
                except Exception as e:
                    logger.warning(f"Redis 缓存读取失败: {str(e)}")

            # 清理过期条目
            if entry and entry.is_expired():
                del self._store[key]

            return None

    def delete(self, key: str):
        """删除数据集"""
        with self._lock:
            self._store.pop(key, None)

        if self._redis_client:
            try:
                self._redis_client.delete(f"dataset:{key}")
            except Exception:
                pass

    def stats(self) -> dict:
        """获取存储统计信息"""
        with self._lock:
            active = sum(1 for e in self._store.values() if not e.is_expired())
            expired = len(self._store) - active
            return {
                "total": len(self._store),
                "active": active,
                "expired": expired,
                "redis_available": self._redis_client is not None,
            }

    def shutdown(self):
        """关闭管理器"""
        self._running = False
        if self._cleanup_thread:
            self._cleanup_thread.join(timeout=5)


# 全局单例
dataset_manager = DatasetManager()

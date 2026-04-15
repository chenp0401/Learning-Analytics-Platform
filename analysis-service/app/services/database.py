"""
数据库连接配置

支持 PostgreSQL/MySQL 数据源，用于从数据库导入考试数据。
"""

import os
import logging
from typing import Optional
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
import pandas as pd

logger = logging.getLogger(__name__)

# 默认数据库 URL
DEFAULT_DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:postgres@postgres:5432/edu_platform",
)


class DatabaseConnector:
    """数据库连接器"""

    def __init__(self, database_url: Optional[str] = None):
        self.database_url = database_url or DEFAULT_DATABASE_URL
        self._engine = None
        self._session_factory = None

    def _get_engine(self):
        """获取或创建数据库引擎"""
        if self._engine is None:
            self._engine = create_engine(
                self.database_url,
                pool_size=5,
                max_overflow=10,
                pool_timeout=30,
                pool_recycle=1800,
            )
        return self._engine

    def test_connection(self) -> dict:
        """
        测试数据库连接

        Returns:
            连接测试结果
        """
        try:
            engine = self._get_engine()
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            return {
                "status": "ok",
                "message": "数据库连接成功",
                "database_url": self._mask_url(self.database_url),
            }
        except Exception as e:
            logger.error(f"数据库连接失败: {str(e)}")
            return {
                "status": "error",
                "message": f"数据库连接失败: {str(e)}",
                "database_url": self._mask_url(self.database_url),
            }

    def query_to_dataframe(self, sql: str) -> pd.DataFrame:
        """
        执行 SQL 查询并返回 DataFrame

        Args:
            sql: SQL 查询语句

        Returns:
            查询结果 DataFrame
        """
        engine = self._get_engine()
        try:
            df = pd.read_sql(sql, engine)
            return df
        except Exception as e:
            logger.error(f"SQL 查询失败: {str(e)}")
            raise

    def list_tables(self) -> list[str]:
        """列出数据库中的所有表"""
        engine = self._get_engine()
        try:
            with engine.connect() as conn:
                # PostgreSQL
                if "postgresql" in self.database_url:
                    result = conn.execute(text(
                        "SELECT table_name FROM information_schema.tables "
                        "WHERE table_schema = 'public' ORDER BY table_name"
                    ))
                # MySQL
                elif "mysql" in self.database_url:
                    result = conn.execute(text("SHOW TABLES"))
                else:
                    result = conn.execute(text(
                        "SELECT table_name FROM information_schema.tables "
                        "WHERE table_schema = 'public' ORDER BY table_name"
                    ))
                return [row[0] for row in result]
        except Exception as e:
            logger.error(f"获取表列表失败: {str(e)}")
            raise

    def get_table_columns(self, table_name: str) -> list[dict]:
        """获取表的列信息"""
        engine = self._get_engine()
        try:
            with engine.connect() as conn:
                result = conn.execute(text(
                    "SELECT column_name, data_type "
                    "FROM information_schema.columns "
                    f"WHERE table_name = :table_name "
                    "ORDER BY ordinal_position"
                ), {"table_name": table_name})
                return [
                    {"name": row[0], "type": row[1]}
                    for row in result
                ]
        except Exception as e:
            logger.error(f"获取列信息失败: {str(e)}")
            raise

    def close(self):
        """关闭数据库连接"""
        if self._engine:
            self._engine.dispose()
            self._engine = None

    @staticmethod
    def _mask_url(url: str) -> str:
        """隐藏数据库 URL 中的密码"""
        try:
            from urllib.parse import urlparse, urlunparse
            parsed = urlparse(url)
            if parsed.password:
                masked = parsed._replace(
                    netloc=f"{parsed.username}:***@{parsed.hostname}:{parsed.port}"
                )
                return urlunparse(masked)
        except Exception:
            pass
        return "***"


# 默认连接器
db_connector = DatabaseConnector()

"""
文档查重服务

通过三级查重策略实现文档相似度检测：
1. 完全一致：MD5 指纹比对
2. 语义相似：Dify RAG 向量检索（Weaviate）
3. 核心内容：DeepSeek 分析题干和知识点
"""

import os
import hashlib
import json
import logging
from typing import Optional

from app.services.dify_client import dify_client

logger = logging.getLogger(__name__)

# 查重工作流 API Key
DEDUP_API_KEY = os.getenv("DIFY_DEDUP_API_KEY", "")
# Dify 知识库 ID（文档库）
DEDUP_DATASET_ID = os.getenv("DIFY_DEDUP_DATASET_ID", "")


class DedupService:
    """文档查重服务"""

    def __init__(self):
        self.client = dify_client
        # 内存中的 MD5 指纹库（生产环境应使用数据库）
        self._fingerprints: dict[str, dict] = {}

    def compute_md5(self, content: str) -> str:
        """计算文本 MD5 指纹"""
        return hashlib.md5(content.encode("utf-8")).hexdigest()

    def compute_paragraph_fingerprints(self, content: str) -> list[dict]:
        """
        计算段落级别的 MD5 指纹

        将文本按段落分割，分别计算每段的 MD5
        """
        paragraphs = [p.strip() for p in content.split("\n") if p.strip()]
        fingerprints = []
        for para in paragraphs:
            fingerprints.append({
                "text": para,
                "md5": self.compute_md5(para),
            })
        return fingerprints

    async def check_documents(
        self,
        contents: list[dict],
        user: str = "teacher",
    ) -> dict:
        """
        执行文档查重

        Args:
            contents: 文档内容列表 [{"filename": "xxx", "content": "xxx"}]
            user: 用户标识

        Returns:
            查重结果
        """
        all_results = []

        for doc in contents:
            filename = doc["filename"]
            content = doc["content"]

            # 第一级：MD5 完全一致检测
            exact_matches = await self._check_exact_match(content)

            # 第二级：语义相似检测（Dify RAG）
            semantic_matches = await self._check_semantic_similarity(content, user)

            # 第三级：核心内容检测（DeepSeek 分析）
            core_matches = await self._check_core_content(content, user)

            # 合并结果
            doc_results = []
            result_id = 1

            for match in exact_matches:
                doc_results.append({
                    "id": result_id,
                    "fileName": filename,
                    "similarity": match["similarity"],
                    "type": "exact",
                    "matchedDoc": match["matched_doc"],
                    "matchedContent": match["matched_content"],
                    "uploadedContent": match["uploaded_content"],
                })
                result_id += 1

            for match in semantic_matches:
                doc_results.append({
                    "id": result_id,
                    "fileName": filename,
                    "similarity": match["similarity"],
                    "type": "semantic",
                    "matchedDoc": match["matched_doc"],
                    "matchedContent": match["matched_content"],
                    "uploadedContent": match["uploaded_content"],
                })
                result_id += 1

            for match in core_matches:
                doc_results.append({
                    "id": result_id,
                    "fileName": filename,
                    "similarity": match["similarity"],
                    "type": "core",
                    "matchedDoc": match["matched_doc"],
                    "matchedContent": match["matched_content"],
                    "uploadedContent": match["uploaded_content"],
                })
                result_id += 1

            all_results.extend(doc_results)

        # 按相似度降序排列
        all_results.sort(key=lambda x: x["similarity"], reverse=True)

        # 统计信息
        stats = {
            "total_matches": len(all_results),
            "exact_count": len([r for r in all_results if r["type"] == "exact"]),
            "semantic_count": len([r for r in all_results if r["type"] == "semantic"]),
            "core_count": len([r for r in all_results if r["type"] == "core"]),
            "high_similarity": len([r for r in all_results if r["similarity"] >= 80]),
            "medium_similarity": len([r for r in all_results if 60 <= r["similarity"] < 80]),
            "low_similarity": len([r for r in all_results if r["similarity"] < 60]),
        }

        return {
            "results": all_results,
            "stats": stats,
        }

    async def _check_exact_match(self, content: str) -> list[dict]:
        """
        第一级：MD5 完全一致检测

        将文档按段落分割，与指纹库中的段落进行 MD5 比对
        """
        matches = []
        paragraphs = self.compute_paragraph_fingerprints(content)

        for para in paragraphs:
            if para["md5"] in self._fingerprints:
                matched = self._fingerprints[para["md5"]]
                matches.append({
                    "similarity": 100,
                    "matched_doc": matched.get("source", "文档库文件"),
                    "matched_content": matched.get("text", ""),
                    "uploaded_content": para["text"],
                })

        return matches

    async def _check_semantic_similarity(
        self,
        content: str,
        user: str,
    ) -> list[dict]:
        """
        第二级：语义相似检测

        使用 Dify RAG 知识库进行向量检索
        """
        matches = []

        if not DEDUP_DATASET_ID:
            logger.warning("未配置 DIFY_DEDUP_DATASET_ID，跳过语义相似检测")
            return matches

        try:
            # 将文档按段落分割，逐段检索
            paragraphs = [p.strip() for p in content.split("\n") if p.strip() and len(p.strip()) > 20]

            for para in paragraphs[:10]:  # 限制最多检索 10 段
                result = await self.client.knowledge_retrieval(
                    dataset_id=DEDUP_DATASET_ID,
                    query=para,
                    top_k=3,
                    score_threshold=0.6,
                    api_key=DEDUP_API_KEY or None,
                )

                records = result.get("records", [])
                for record in records:
                    score = record.get("score", 0)
                    similarity = round(score * 100, 1)
                    if similarity >= 60:
                        matches.append({
                            "similarity": similarity,
                            "matched_doc": record.get("document", {}).get("name", "未知文档"),
                            "matched_content": record.get("segment", {}).get("content", "")[:200],
                            "uploaded_content": para[:200],
                        })

        except Exception as e:
            logger.error(f"语义相似检测失败: {str(e)}")

        return matches

    async def _check_core_content(
        self,
        content: str,
        user: str,
    ) -> list[dict]:
        """
        第三级：核心内容检测

        使用 DeepSeek 分析题干和知识点，判断核心内容是否相同
        """
        matches = []

        try:
            result = await self.client.run_workflow(
                inputs={
                    "text": content[:5000],  # 限制输入长度
                    "task": "dedup_analysis",
                },
                user=user,
                api_key=DEDUP_API_KEY or None,
            )

            workflow_output = result.get("data", {}).get("outputs", {})
            raw_result = workflow_output.get("result", "")

            if isinstance(raw_result, str):
                try:
                    parsed = json.loads(raw_result)
                except json.JSONDecodeError:
                    parsed = {"matches": []}
            elif isinstance(raw_result, dict):
                parsed = raw_result
            else:
                parsed = {"matches": []}

            for match in parsed.get("matches", []):
                matches.append({
                    "similarity": match.get("similarity", 50),
                    "matched_doc": match.get("source", "文档库文件"),
                    "matched_content": match.get("matched_content", ""),
                    "uploaded_content": match.get("uploaded_content", ""),
                })

        except Exception as e:
            logger.error(f"核心内容检测失败: {str(e)}")

        return matches

    async def import_documents(
        self,
        documents: list[dict],
    ) -> dict:
        """
        增量导入文档到知识库

        Args:
            documents: 文档列表 [{"filename": "xxx", "content": "xxx"}]

        Returns:
            导入结果
        """
        imported = 0
        failed = 0
        errors = []

        for doc in documents:
            content = doc["content"]
            filename = doc["filename"]

            # 更新 MD5 指纹库
            paragraphs = self.compute_paragraph_fingerprints(content)
            for para in paragraphs:
                self._fingerprints[para["md5"]] = {
                    "text": para["text"],
                    "source": filename,
                }

            imported += 1

        return {
            "total": len(documents),
            "imported": imported,
            "failed": failed,
            "errors": errors,
            "fingerprint_count": len(self._fingerprints),
        }


# 全局单例
dedup_service = DedupService()

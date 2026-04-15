"""
Dify API 客户端封装

提供与 Dify 自托管平台的通信能力，支持：
- 工作流执行（Workflow Run）
- 知识库检索（Knowledge Retrieval）
"""

import os
import httpx
from typing import Optional


class DifyClient:
    """Dify API 客户端"""

    def __init__(
        self,
        api_url: Optional[str] = None,
        api_key: Optional[str] = None,
        timeout: float = 120.0,
    ):
        self.api_url = (api_url or os.getenv("DIFY_API_URL", "http://dify-nginx:80/v1")).rstrip("/")
        self.api_key = api_key or os.getenv("DIFY_API_KEY", "")
        self.timeout = timeout

    def _get_headers(self, api_key: Optional[str] = None) -> dict:
        """获取请求头"""
        key = api_key or self.api_key
        return {
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
        }

    async def run_workflow(
        self,
        inputs: dict,
        user: str = "edu-platform",
        api_key: Optional[str] = None,
    ) -> dict:
        """
        执行 Dify 工作流

        Args:
            inputs: 工作流输入参数
            user: 用户标识
            api_key: 可选的特定工作流 API Key

        Returns:
            工作流执行结果
        """
        url = f"{self.api_url}/workflows/run"
        payload = {
            "inputs": inputs,
            "response_mode": "blocking",
            "user": user,
        }

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.post(
                url,
                json=payload,
                headers=self._get_headers(api_key),
            )
            response.raise_for_status()
            return response.json()

    async def chat_message(
        self,
        query: str,
        user: str = "edu-platform",
        conversation_id: Optional[str] = None,
        inputs: Optional[dict] = None,
        api_key: Optional[str] = None,
    ) -> dict:
        """
        发送聊天消息（用于对话型应用）

        Args:
            query: 用户消息
            user: 用户标识
            conversation_id: 会话 ID（可选）
            inputs: 额外输入参数
            api_key: 可选的特定应用 API Key

        Returns:
            聊天响应结果
        """
        url = f"{self.api_url}/chat-messages"
        payload = {
            "query": query,
            "user": user,
            "response_mode": "blocking",
            "inputs": inputs or {},
        }
        if conversation_id:
            payload["conversation_id"] = conversation_id

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.post(
                url,
                json=payload,
                headers=self._get_headers(api_key),
            )
            response.raise_for_status()
            return response.json()

    async def knowledge_retrieval(
        self,
        dataset_id: str,
        query: str,
        top_k: int = 5,
        score_threshold: float = 0.5,
        api_key: Optional[str] = None,
    ) -> dict:
        """
        知识库检索

        Args:
            dataset_id: 知识库 ID
            query: 检索查询
            top_k: 返回结果数量
            score_threshold: 相似度阈值
            api_key: 可选的 API Key

        Returns:
            检索结果
        """
        url = f"{self.api_url}/datasets/{dataset_id}/retrieve"
        payload = {
            "query": query,
            "retrieval_model": {
                "search_method": "hybrid_search",
                "reranking_enable": True,
                "top_k": top_k,
                "score_threshold_enabled": True,
                "score_threshold": score_threshold,
            },
        }

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.post(
                url,
                json=payload,
                headers=self._get_headers(api_key),
            )
            response.raise_for_status()
            return response.json()

    async def upload_document(
        self,
        dataset_id: str,
        file_path: str,
        api_key: Optional[str] = None,
    ) -> dict:
        """
        上传文档到知识库

        Args:
            dataset_id: 知识库 ID
            file_path: 文件路径
            api_key: 可选的 API Key

        Returns:
            上传结果
        """
        url = f"{self.api_url}/datasets/{dataset_id}/document/create_by_file"
        headers = self._get_headers(api_key)
        # 文件上传不使用 JSON content-type
        headers.pop("Content-Type", None)

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            with open(file_path, "rb") as f:
                response = await client.post(
                    url,
                    files={"file": f},
                    data={
                        "data": '{"indexing_technique":"high_quality","process_rule":{"mode":"automatic"}}',
                    },
                    headers=headers,
                )
                response.raise_for_status()
                return response.json()


# 全局单例
dify_client = DifyClient()

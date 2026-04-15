"""
文本校对服务

通过 Dify 工作流调用 DeepSeek 模型，实现：
- 错别字检测
- 语法错误检查
- 格式规范检查（题号、选项格式等）
"""

import os
import json
import logging
from typing import Optional

from app.services.dify_client import dify_client

logger = logging.getLogger(__name__)

# 校对工作流 API Key（在 Dify 控制台创建校对工作流后获取）
PROOFREAD_API_KEY = os.getenv("DIFY_PROOFREAD_API_KEY", "")


class ProofreadService:
    """文本校对服务"""

    def __init__(self):
        self.client = dify_client

    async def check_text(self, text: str, user: str = "teacher") -> dict:
        """
        校对文本内容

        Args:
            text: 待校对的文本
            user: 用户标识

        Returns:
            校对结果，包含错误列表和统计信息
        """
        try:
            # 调用 Dify 工作流
            result = await self.client.run_workflow(
                inputs={
                    "text": text,
                    "task": "proofread",
                },
                user=user,
                api_key=PROOFREAD_API_KEY or None,
            )

            # 解析工作流输出
            return self._parse_workflow_result(result, text)

        except Exception as e:
            logger.error(f"Dify 校对工作流调用失败: {str(e)}")
            # 降级：使用本地基础校对
            return await self._fallback_check(text)

    def _parse_workflow_result(self, result: dict, original_text: str) -> dict:
        """
        解析 Dify 工作流返回结果

        Args:
            result: Dify 工作流原始返回
            original_text: 原始文本

        Returns:
            结构化的校对结果
        """
        errors = []

        try:
            # 从工作流输出中提取结果
            workflow_output = result.get("data", {}).get("outputs", {})
            raw_result = workflow_output.get("result", "")

            # 尝试解析 JSON 格式的结果
            if isinstance(raw_result, str):
                try:
                    parsed = json.loads(raw_result)
                except json.JSONDecodeError:
                    parsed = self._extract_errors_from_text(raw_result)
            elif isinstance(raw_result, dict):
                parsed = raw_result
            elif isinstance(raw_result, list):
                parsed = {"errors": raw_result}
            else:
                parsed = {"errors": []}

            # 标准化错误格式
            raw_errors = parsed.get("errors", [])
            for idx, err in enumerate(raw_errors):
                error_item = {
                    "id": idx + 1,
                    "type": self._normalize_error_type(err.get("type", "typo")),
                    "position": {
                        "start": err.get("start", 0),
                        "end": err.get("end", 0),
                    },
                    "original": err.get("original", ""),
                    "suggestion": err.get("suggestion", ""),
                    "description": err.get("description", ""),
                }
                errors.append(error_item)

        except Exception as e:
            logger.warning(f"解析校对结果失败: {str(e)}")

        # 统计信息
        error_counts = {
            "typo": len([e for e in errors if e["type"] == "typo"]),
            "grammar": len([e for e in errors if e["type"] == "grammar"]),
            "format": len([e for e in errors if e["type"] == "format"]),
        }

        return {
            "text": original_text,
            "errors": errors,
            "error_counts": error_counts,
            "total_errors": len(errors),
        }

    def _normalize_error_type(self, error_type: str) -> str:
        """标准化错误类型"""
        type_mapping = {
            "typo": "typo",
            "错别字": "typo",
            "spelling": "typo",
            "grammar": "grammar",
            "语法": "grammar",
            "语法错误": "grammar",
            "format": "format",
            "格式": "format",
            "格式问题": "format",
        }
        return type_mapping.get(error_type.lower().strip(), "typo")

    def _extract_errors_from_text(self, text: str) -> dict:
        """从非 JSON 文本中提取错误信息"""
        errors = []
        lines = text.strip().split("\n")
        for line in lines:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            # 尝试简单解析
            if "→" in line or "->" in line:
                separator = "→" if "→" in line else "->"
                parts = line.split(separator)
                if len(parts) == 2:
                    errors.append({
                        "type": "typo",
                        "original": parts[0].strip(),
                        "suggestion": parts[1].strip(),
                        "description": f"建议将 \"{parts[0].strip()}\" 修改为 \"{parts[1].strip()}\"",
                        "start": 0,
                        "end": 0,
                    })
        return {"errors": errors}

    async def _fallback_check(self, text: str) -> dict:
        """
        降级校对方案：当 Dify 不可用时使用本地基础检查

        仅检查基本格式问题（题号格式等）
        """
        errors = []
        error_id = 1

        # 检查题号格式一致性
        import re
        # 检测不同的题号格式
        patterns = {
            r"^\d+\)": "括号格式题号",
            r"^\d+\.": "点号格式题号",
            r"^\d+、": "顿号格式题号",
        }

        lines = text.split("\n")
        found_formats = {}
        for line_idx, line in enumerate(lines):
            line = line.strip()
            for pattern, name in patterns.items():
                if re.match(pattern, line):
                    if name not in found_formats:
                        found_formats[name] = []
                    found_formats[name].append((line_idx, line))

        # 如果存在多种题号格式，报告格式不一致
        if len(found_formats) > 1:
            # 找出最常用的格式
            main_format = max(found_formats, key=lambda k: len(found_formats[k]))
            for fmt, occurrences in found_formats.items():
                if fmt != main_format:
                    for line_idx, line in occurrences:
                        match = re.match(r"^(\d+[)\.、])", line)
                        if match:
                            errors.append({
                                "id": error_id,
                                "type": "format",
                                "position": {"start": 0, "end": len(match.group(1))},
                                "original": match.group(1),
                                "suggestion": match.group(1)[:-1] + "." if main_format == "点号格式题号" else match.group(1),
                                "description": f"题号格式不统一，建议统一使用{main_format}",
                            })
                            error_id += 1

        error_counts = {
            "typo": len([e for e in errors if e["type"] == "typo"]),
            "grammar": len([e for e in errors if e["type"] == "grammar"]),
            "format": len([e for e in errors if e["type"] == "format"]),
        }

        return {
            "text": text,
            "errors": errors,
            "error_counts": error_counts,
            "total_errors": len(errors),
            "fallback": True,
            "message": "Dify 服务不可用，仅执行了基础格式检查",
        }


# 全局单例
proofread_service = ProofreadService()

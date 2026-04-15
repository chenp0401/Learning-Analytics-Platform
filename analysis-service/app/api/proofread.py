"""
文本校对 API 路由
"""

import io
import logging
from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel, Field

from app.services.proofreader import proofread_service

logger = logging.getLogger(__name__)

router = APIRouter()


class ProofreadRequest(BaseModel):
    """校对请求"""
    text: str = Field(..., min_length=1, max_length=50000, description="待校对的文本内容")


class ProofreadError(BaseModel):
    """校对错误项"""
    id: int = Field(..., description="错误 ID")
    type: str = Field(..., description="错误类型：typo/grammar/format")
    position: dict = Field(..., description="错误位置 {start, end}")
    original: str = Field(..., description="原始文本")
    suggestion: str = Field(..., description="修改建议")
    description: str = Field(..., description="错误描述")


class ProofreadResponse(BaseModel):
    """校对响应"""
    text: str = Field(..., description="原始文本")
    errors: list[ProofreadError] = Field(default_factory=list, description="错误列表")
    error_counts: dict = Field(default_factory=dict, description="各类型错误数量")
    total_errors: int = Field(0, description="错误总数")
    fallback: bool = Field(False, description="是否使用了降级方案")
    message: str = Field("", description="附加消息")


@router.post("/check", response_model=ProofreadResponse)
async def check_text(request: ProofreadRequest):
    """
    提交文本进行校对

    检测错别字、语法错误和格式问题，返回结构化的错误列表。
    """
    try:
        result = await proofread_service.check_text(request.text)
        return result
    except Exception as e:
        logger.error(f"校对失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"校对服务异常: {str(e)}")


@router.post("/upload", response_model=ProofreadResponse)
async def upload_and_check(file: UploadFile = File(...)):
    """
    上传文件进行校对

    支持 Word (.docx)、PDF (.pdf)、纯文本 (.txt) 格式。
    系统会自动解析文件内容并进行校对。
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="请上传文件")

    filename = file.filename.lower()
    content = await file.read()

    try:
        text = ""

        if filename.endswith(".txt"):
            # 纯文本文件
            text = content.decode("utf-8")

        elif filename.endswith(".docx"):
            # Word 文件
            try:
                from docx import Document
                doc = Document(io.BytesIO(content))
                text = "\n".join([para.text for para in doc.paragraphs if para.text.strip()])
            except ImportError:
                raise HTTPException(
                    status_code=500,
                    detail="Word 文件解析依赖未安装，请安装 python-docx",
                )

        elif filename.endswith(".pdf"):
            # PDF 文件
            try:
                from PyPDF2 import PdfReader
                reader = PdfReader(io.BytesIO(content))
                text = "\n".join([
                    page.extract_text() or ""
                    for page in reader.pages
                ])
            except ImportError:
                raise HTTPException(
                    status_code=500,
                    detail="PDF 文件解析依赖未安装，请安装 PyPDF2",
                )

        else:
            raise HTTPException(
                status_code=400,
                detail="不支持的文件格式，请上传 .docx、.pdf 或 .txt 文件",
            )

        if not text.strip():
            raise HTTPException(status_code=400, detail="文件内容为空")

        result = await proofread_service.check_text(text)
        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"文件校对失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"文件处理失败: {str(e)}")

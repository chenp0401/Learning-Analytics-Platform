"""
数据分析 API 路由（增强版）

支持：
- CSV 文件上传
- 数据库连接导入
- 数据集 TTL 管理
- 大数据集 Celery 异步处理
- PNG/PDF 报告导出
"""

import io
import logging
import pandas as pd
from fastapi import APIRouter, UploadFile, File, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from typing import Optional

from app.services.analyzer import ExamAnalyzer
from app.services.dataset_manager import dataset_manager
from app.services.tasks import (
    LARGE_DATASET_THRESHOLD,
    run_dashboard_task,
    run_distribution_task,
    run_difficulty_task,
    run_discrimination_task,
    run_reliability_task,
    get_task_status,
)

logger = logging.getLogger(__name__)

router = APIRouter()


# ==================== 请求/响应模型 ====================

class DatabaseQueryRequest(BaseModel):
    """数据库查询请求"""
    database_url: Optional[str] = Field(None, description="数据库连接 URL（可选，默认使用系统配置）")
    sql: str = Field(..., description="SQL 查询语句")


class DatabaseTestRequest(BaseModel):
    """数据库连接测试请求"""
    database_url: str = Field(..., description="数据库连接 URL")


# ==================== CSV 上传 ====================

@router.post("/upload")
async def upload_csv(file: UploadFile = File(...)):
    """
    上传 CSV 文件

    CSV 格式要求：
    - 每行代表一个学生
    - 每列代表一道题目的得分
    - 可包含 "姓名"/"学号" 等非数值列（会自动忽略）
    """
    if not file.filename or not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="请上传 CSV 格式文件")

    try:
        content = await file.read()
        df = pd.read_csv(io.BytesIO(content))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"CSV 文件解析失败: {str(e)}")

    if df.empty:
        raise HTTPException(status_code=400, detail="CSV 文件为空")

    analyzer = ExamAnalyzer(df)
    dataset_manager.put(analyzer.dataset_id, analyzer)

    score_cols = analyzer.get_score_columns()
    is_large = len(df) > LARGE_DATASET_THRESHOLD

    return {
        "dataset_id": analyzer.dataset_id,
        "filename": file.filename,
        "rows": len(df),
        "columns": len(score_cols),
        "column_names": score_cols,
        "is_large_dataset": is_large,
        "message": "大数据集将使用异步处理" if is_large else "",
    }


# ==================== 数据库连接 ====================

@router.post("/db/test")
async def test_database_connection(request: DatabaseTestRequest):
    """测试数据库连接"""
    from app.services.database import DatabaseConnector
    connector = DatabaseConnector(request.database_url)
    result = connector.test_connection()
    connector.close()
    return result


@router.post("/db/tables")
async def list_database_tables(request: DatabaseTestRequest):
    """列出数据库中的表"""
    from app.services.database import DatabaseConnector
    connector = DatabaseConnector(request.database_url)
    try:
        tables = connector.list_tables()
        return {"tables": tables}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        connector.close()


@router.post("/db/query")
async def query_database(request: DatabaseQueryRequest):
    """
    从数据库查询数据并创建数据集

    执行 SQL 查询，将结果作为考试数据集导入。
    """
    from app.services.database import DatabaseConnector
    connector = DatabaseConnector(request.database_url)
    try:
        df = connector.query_to_dataframe(request.sql)
        if df.empty:
            raise HTTPException(status_code=400, detail="查询结果为空")

        analyzer = ExamAnalyzer(df)
        dataset_manager.put(analyzer.dataset_id, analyzer)

        score_cols = analyzer.get_score_columns()
        return {
            "dataset_id": analyzer.dataset_id,
            "rows": len(df),
            "columns": len(score_cols),
            "column_names": score_cols,
            "is_large_dataset": len(df) > LARGE_DATASET_THRESHOLD,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"数据库查询失败: {str(e)}")
    finally:
        connector.close()


# ==================== 分析接口 ====================

@router.get("/distribution/{dataset_id}")
async def get_distribution(dataset_id: str, async_mode: bool = Query(False)):
    """获取成绩分布分析"""
    analyzer = _get_analyzer(dataset_id)

    if async_mode or len(analyzer.df) > LARGE_DATASET_THRESHOLD:
        csv_json = analyzer.df.to_json()
        task = run_distribution_task.delay(csv_json, dataset_id)
        return {"task_id": task.id, "status": "PENDING", "message": "异步任务已提交"}

    return analyzer.analyze_distribution()


@router.get("/difficulty/{dataset_id}")
async def get_difficulty(dataset_id: str, async_mode: bool = Query(False)):
    """获取题目难度分析"""
    analyzer = _get_analyzer(dataset_id)

    if async_mode or len(analyzer.df) > LARGE_DATASET_THRESHOLD:
        csv_json = analyzer.df.to_json()
        task = run_difficulty_task.delay(csv_json, dataset_id)
        return {"task_id": task.id, "status": "PENDING", "message": "异步任务已提交"}

    return analyzer.analyze_difficulty()


@router.get("/discrimination/{dataset_id}")
async def get_discrimination(dataset_id: str, async_mode: bool = Query(False)):
    """获取区分度分析"""
    analyzer = _get_analyzer(dataset_id)

    if async_mode or len(analyzer.df) > LARGE_DATASET_THRESHOLD:
        csv_json = analyzer.df.to_json()
        task = run_discrimination_task.delay(csv_json, dataset_id)
        return {"task_id": task.id, "status": "PENDING", "message": "异步任务已提交"}

    return analyzer.analyze_discrimination()


@router.get("/reliability/{dataset_id}")
async def get_reliability(dataset_id: str, async_mode: bool = Query(False)):
    """获取信度分析"""
    analyzer = _get_analyzer(dataset_id)

    if async_mode or len(analyzer.df) > LARGE_DATASET_THRESHOLD:
        csv_json = analyzer.df.to_json()
        task = run_reliability_task.delay(csv_json, dataset_id)
        return {"task_id": task.id, "status": "PENDING", "message": "异步任务已提交"}

    return analyzer.analyze_reliability()


@router.get("/dashboard/{dataset_id}")
async def get_dashboard(dataset_id: str, async_mode: bool = Query(False)):
    """获取综合 Dashboard 数据"""
    analyzer = _get_analyzer(dataset_id)

    if async_mode or len(analyzer.df) > LARGE_DATASET_THRESHOLD:
        csv_json = analyzer.df.to_json()
        task = run_dashboard_task.delay(csv_json, dataset_id)
        return {"task_id": task.id, "status": "PENDING", "message": "异步任务已提交"}

    return analyzer.get_dashboard()


# ==================== 异步任务状态 ====================

@router.get("/task/{task_id}")
async def get_task(task_id: str):
    """获取异步任务状态和结果"""
    return get_task_status(task_id)


# ==================== 报告导出 ====================

@router.get("/export/{dataset_id}")
async def export_report(
    dataset_id: str,
    format: str = Query("png", description="导出格式：png 或 pdf"),
):
    """
    导出分析报告

    支持 PNG 和 PDF 格式。
    """
    analyzer = _get_analyzer(dataset_id)
    dashboard_data = analyzer.get_dashboard()

    from app.services.exporter import report_exporter

    try:
        if format.lower() == "pdf":
            data = report_exporter.export_pdf(dashboard_data, dataset_id)
            return StreamingResponse(
                io.BytesIO(data),
                media_type="application/pdf",
                headers={"Content-Disposition": f"attachment; filename=report_{dataset_id[:8]}.pdf"},
            )
        else:
            data = report_exporter.export_png(dashboard_data, dataset_id)
            return StreamingResponse(
                io.BytesIO(data),
                media_type="image/png",
                headers={"Content-Disposition": f"attachment; filename=report_{dataset_id[:8]}.png"},
            )
    except ImportError as e:
        raise HTTPException(
            status_code=500,
            detail=f"导出依赖未安装: {str(e)}。请安装 matplotlib 和 reportlab。",
        )
    except Exception as e:
        logger.error(f"报告导出失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"报告导出失败: {str(e)}")


# ==================== 数据集管理 ====================

@router.get("/datasets/stats")
async def get_datasets_stats():
    """获取数据集存储统计信息"""
    return dataset_manager.stats()


@router.delete("/datasets/{dataset_id}")
async def delete_dataset(dataset_id: str):
    """删除数据集"""
    dataset_manager.delete(dataset_id)
    return {"message": "数据集已删除", "dataset_id": dataset_id}


# ==================== 辅助函数 ====================

def _get_analyzer(dataset_id: str) -> ExamAnalyzer:
    """获取分析器实例"""
    analyzer = dataset_manager.get(dataset_id)
    if analyzer is None:
        raise HTTPException(status_code=404, detail="数据集不存在或已过期，请重新上传数据")
    return analyzer

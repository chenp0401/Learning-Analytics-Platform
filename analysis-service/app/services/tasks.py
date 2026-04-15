"""
Celery 异步任务配置

用于处理大数据集（>1万行）的异步分析任务。
"""

import os
import json
import logging
from celery import Celery
from celery.result import AsyncResult

logger = logging.getLogger(__name__)

# Redis URL
REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379/0")
CELERY_BROKER_URL = os.getenv("CELERY_BROKER_URL", f"{REDIS_URL}")
CELERY_RESULT_BACKEND = os.getenv("CELERY_RESULT_BACKEND", f"{REDIS_URL}")

# 创建 Celery 应用
celery_app = Celery(
    "analysis_tasks",
    broker=CELERY_BROKER_URL,
    backend=CELERY_RESULT_BACKEND,
)

# Celery 配置
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Asia/Shanghai",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=600,  # 10 分钟超时
    task_soft_time_limit=540,
    result_expires=3600,  # 结果保留 1 小时
)

# 大数据集阈值
LARGE_DATASET_THRESHOLD = 10000


@celery_app.task(bind=True, name="analysis.run_dashboard")
def run_dashboard_task(self, dataset_csv_json: str, dataset_id: str):
    """
    异步执行综合 Dashboard 分析

    Args:
        dataset_csv_json: CSV 数据的 JSON 序列化
        dataset_id: 数据集 ID
    """
    import pandas as pd
    from app.services.analyzer import ExamAnalyzer

    try:
        self.update_state(state="PROGRESS", meta={"step": "解析数据", "progress": 10})

        df = pd.read_json(dataset_csv_json)
        analyzer = ExamAnalyzer(df)
        analyzer.dataset_id = dataset_id

        self.update_state(state="PROGRESS", meta={"step": "分析成绩分布", "progress": 30})
        distribution = analyzer.analyze_distribution()

        self.update_state(state="PROGRESS", meta={"step": "计算难度系数", "progress": 50})
        difficulty = analyzer.analyze_difficulty()

        self.update_state(state="PROGRESS", meta={"step": "计算区分度", "progress": 70})
        discrimination = analyzer.analyze_discrimination()

        self.update_state(state="PROGRESS", meta={"step": "计算信度", "progress": 90})
        reliability = analyzer.analyze_reliability()

        result = {
            "dataset_id": dataset_id,
            "distribution": distribution,
            "difficulty": difficulty,
            "discrimination": discrimination,
            "reliability": reliability,
            "summary": distribution["statistics"],
        }

        return result

    except Exception as e:
        logger.error(f"异步分析任务失败: {str(e)}")
        raise


@celery_app.task(bind=True, name="analysis.run_distribution")
def run_distribution_task(self, dataset_csv_json: str, dataset_id: str):
    """异步执行成绩分布分析"""
    import pandas as pd
    from app.services.analyzer import ExamAnalyzer

    df = pd.read_json(dataset_csv_json)
    analyzer = ExamAnalyzer(df)
    analyzer.dataset_id = dataset_id
    return analyzer.analyze_distribution()


@celery_app.task(bind=True, name="analysis.run_difficulty")
def run_difficulty_task(self, dataset_csv_json: str, dataset_id: str):
    """异步执行难度分析"""
    import pandas as pd
    from app.services.analyzer import ExamAnalyzer

    df = pd.read_json(dataset_csv_json)
    analyzer = ExamAnalyzer(df)
    analyzer.dataset_id = dataset_id
    return analyzer.analyze_difficulty()


@celery_app.task(bind=True, name="analysis.run_discrimination")
def run_discrimination_task(self, dataset_csv_json: str, dataset_id: str):
    """异步执行区分度分析"""
    import pandas as pd
    from app.services.analyzer import ExamAnalyzer

    df = pd.read_json(dataset_csv_json)
    analyzer = ExamAnalyzer(df)
    analyzer.dataset_id = dataset_id
    return analyzer.analyze_discrimination()


@celery_app.task(bind=True, name="analysis.run_reliability")
def run_reliability_task(self, dataset_csv_json: str, dataset_id: str):
    """异步执行信度分析"""
    import pandas as pd
    from app.services.analyzer import ExamAnalyzer

    df = pd.read_json(dataset_csv_json)
    analyzer = ExamAnalyzer(df)
    analyzer.dataset_id = dataset_id
    return analyzer.analyze_reliability()


def get_task_status(task_id: str) -> dict:
    """
    获取异步任务状态

    Args:
        task_id: Celery 任务 ID

    Returns:
        任务状态信息
    """
    result = AsyncResult(task_id, app=celery_app)

    response = {
        "task_id": task_id,
        "status": result.status,
    }

    if result.status == "PROGRESS":
        response["meta"] = result.info
    elif result.status == "SUCCESS":
        response["result"] = result.result
    elif result.status == "FAILURE":
        response["error"] = str(result.result)

    return response

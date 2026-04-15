from pydantic import BaseModel, Field
from typing import Optional


class FileUploadResponse(BaseModel):
    """文件上传响应"""
    dataset_id: str = Field(..., description="数据集ID")
    filename: str = Field(..., description="文件名")
    rows: int = Field(..., description="数据行数")
    columns: int = Field(..., description="数据列数")
    column_names: list[str] = Field(..., description="列名列表")


class DistributionResult(BaseModel):
    """成绩分布结果"""
    histogram: dict = Field(..., description="直方图数据")
    statistics: dict = Field(..., description="统计摘要")
    normality_test: dict = Field(..., description="正态性检验结果")


class DifficultyItem(BaseModel):
    """题目难度"""
    question: str = Field(..., description="题目名称")
    difficulty: float = Field(..., description="难度系数 P = R/N")
    level: str = Field(..., description="难度等级：容易/适中/较难")


class DiscriminationItem(BaseModel):
    """区分度"""
    question: str = Field(..., description="题目名称")
    discrimination: float = Field(..., description="区分度指数 D")
    level: str = Field(..., description="区分度等级：优秀/良好/一般/较差")


class ReliabilityResult(BaseModel):
    """信度分析结果"""
    cronbach_alpha: float = Field(..., description="Cronbach's Alpha 系数")
    kr20: Optional[float] = Field(None, description="KR-20 信度系数")
    alpha_level: str = Field(..., description="信度等级")
    item_total_correlations: list[dict] = Field(default_factory=list, description="题目-总分相关")


class DashboardResult(BaseModel):
    """综合 Dashboard 数据"""
    distribution: DistributionResult
    difficulty: list[DifficultyItem]
    discrimination: list[DiscriminationItem]
    reliability: ReliabilityResult
    summary: dict = Field(..., description="统计摘要")

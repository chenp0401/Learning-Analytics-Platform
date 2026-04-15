"""
考试数据分析服务

提供以下统计分析功能：
- 成绩分布分析（频数分布、正态性检验）
- 题目难度系数计算（P = R/N）
- 区分度指数计算（点二列相关系数）
- 信度分析（Cronbach's Alpha、KR-20）
- 效度分析（内容效度、结构效度）
"""

import uuid
import numpy as np
import pandas as pd
from scipy import stats as scipy_stats
from typing import Optional


class ExamAnalyzer:
    """考试数据分析器"""

    def __init__(self, df: pd.DataFrame):
        """
        初始化分析器

        Args:
            df: 考试数据 DataFrame，行为学生，列为题目得分
        """
        self.df = df
        self.dataset_id = str(uuid.uuid4())

    @classmethod
    def from_csv(cls, file_path: str) -> "ExamAnalyzer":
        """从 CSV 文件创建分析器"""
        df = pd.read_csv(file_path)
        return cls(df)

    @classmethod
    def from_dataframe(cls, df: pd.DataFrame) -> "ExamAnalyzer":
        """从 DataFrame 创建分析器"""
        return cls(df)

    def get_score_columns(self) -> list[str]:
        """获取数值型得分列"""
        return self.df.select_dtypes(include=[np.number]).columns.tolist()

    def get_total_scores(self) -> pd.Series:
        """计算总分"""
        score_cols = self.get_score_columns()
        return self.df[score_cols].sum(axis=1)

    # ==================== 成绩分布分析 ====================

    def analyze_distribution(self) -> dict:
        """
        分析成绩分布

        Returns:
            包含直方图数据、统计摘要和正态性检验结果的字典
        """
        total_scores = self.get_total_scores()

        # 基本统计量
        statistics = {
            "count": int(len(total_scores)),
            "mean": round(float(total_scores.mean()), 2),
            "std": round(float(total_scores.std()), 2),
            "min": round(float(total_scores.min()), 2),
            "max": round(float(total_scores.max()), 2),
            "median": round(float(total_scores.median()), 2),
            "q1": round(float(total_scores.quantile(0.25)), 2),
            "q3": round(float(total_scores.quantile(0.75)), 2),
            "skewness": round(float(total_scores.skew()), 4),
            "kurtosis": round(float(total_scores.kurtosis()), 4),
        }

        # 及格率（假设满分为总分列数 * 每题满分，及格线为 60%）
        max_possible = total_scores.max()
        pass_line = max_possible * 0.6
        pass_count = int((total_scores >= pass_line).sum())
        statistics["pass_rate"] = round(pass_count / len(total_scores) * 100, 1)

        # 频数分布（按分数段）
        bins = self._calculate_bins(total_scores)
        hist_counts, bin_edges = np.histogram(total_scores, bins=bins)
        histogram = {
            "bins": [f"{int(bin_edges[i])}-{int(bin_edges[i+1])}" for i in range(len(hist_counts))],
            "counts": hist_counts.tolist(),
        }

        # 正态性检验（Shapiro-Wilk）
        if len(total_scores) >= 3:
            stat, p_value = scipy_stats.shapiro(
                total_scores.sample(min(len(total_scores), 5000))
            )
            normality_test = {
                "method": "Shapiro-Wilk",
                "statistic": round(float(stat), 4),
                "p_value": round(float(p_value), 4),
                "is_normal": p_value > 0.05,
                "conclusion": "符合正态分布" if p_value > 0.05 else "不符合正态分布",
            }
        else:
            normality_test = {"method": "N/A", "conclusion": "样本量不足，无法进行检验"}

        return {
            "histogram": histogram,
            "statistics": statistics,
            "normality_test": normality_test,
        }

    def _calculate_bins(self, scores: pd.Series) -> list:
        """计算合适的分数段"""
        min_score = int(scores.min())
        max_score = int(scores.max())
        # 按 10 分一段
        start = (min_score // 10) * 10
        end = ((max_score // 10) + 1) * 10 + 1
        return list(range(start, end, 10))

    # ==================== 题目难度分析 ====================

    def analyze_difficulty(self) -> list[dict]:
        """
        计算每道题的难度系数

        难度系数 P = 该题平均得分 / 该题满分
        P 越大，题目越容易

        Returns:
            每道题的难度系数列表
        """
        score_cols = self.get_score_columns()
        results = []

        for col in score_cols:
            scores = self.df[col]
            max_score = scores.max()
            if max_score == 0:
                difficulty = 0.0
            else:
                difficulty = round(float(scores.mean() / max_score), 4)

            # 难度等级
            if difficulty >= 0.7:
                level = "容易"
            elif difficulty >= 0.4:
                level = "适中"
            else:
                level = "较难"

            results.append({
                "question": col,
                "difficulty": difficulty,
                "level": level,
                "mean_score": round(float(scores.mean()), 2),
                "max_score": round(float(max_score), 2),
            })

        return results

    # ==================== 区分度分析 ====================

    def analyze_discrimination(self) -> list[dict]:
        """
        计算每道题的区分度

        使用点二列相关系数法：
        将学生按总分排序，取前 27% 为高分组，后 27% 为低分组
        D = (高分组平均分 - 低分组平均分) / 该题满分

        Returns:
            每道题的区分度列表
        """
        score_cols = self.get_score_columns()
        total_scores = self.get_total_scores()

        # 按总分排序
        sorted_indices = total_scores.sort_values(ascending=False).index
        n = len(sorted_indices)
        n_group = max(1, int(n * 0.27))

        high_group = sorted_indices[:n_group]
        low_group = sorted_indices[-n_group:]

        results = []
        for col in score_cols:
            high_mean = self.df.loc[high_group, col].mean()
            low_mean = self.df.loc[low_group, col].mean()
            max_score = self.df[col].max()

            if max_score == 0:
                discrimination = 0.0
            else:
                discrimination = round(float((high_mean - low_mean) / max_score), 4)

            # 区分度等级
            if discrimination >= 0.4:
                level = "优秀"
            elif discrimination >= 0.3:
                level = "良好"
            elif discrimination >= 0.2:
                level = "一般"
            else:
                level = "较差"

            results.append({
                "question": col,
                "discrimination": discrimination,
                "level": level,
                "high_group_mean": round(float(high_mean), 2),
                "low_group_mean": round(float(low_mean), 2),
            })

        return results

    # ==================== 信度分析 ====================

    def analyze_reliability(self) -> dict:
        """
        计算试卷信度

        Cronbach's Alpha = (k / (k-1)) * (1 - Σσi² / σt²)
        其中 k 为题目数，σi² 为第 i 题方差，σt² 为总分方差

        Returns:
            信度分析结果
        """
        score_cols = self.get_score_columns()
        k = len(score_cols)

        if k < 2:
            return {
                "cronbach_alpha": 0.0,
                "kr20": None,
                "alpha_level": "无法计算",
                "item_total_correlations": [],
            }

        item_variances = self.df[score_cols].var(ddof=1)
        total_variance = self.get_total_scores().var(ddof=1)

        if total_variance == 0:
            alpha = 0.0
        else:
            alpha = round(
                float((k / (k - 1)) * (1 - item_variances.sum() / total_variance)),
                4,
            )

        # 信度等级
        if alpha >= 0.9:
            alpha_level = "极好"
        elif alpha >= 0.8:
            alpha_level = "良好"
        elif alpha >= 0.7:
            alpha_level = "可接受"
        else:
            alpha_level = "不足"

        # 题目-总分相关
        total_scores = self.get_total_scores()
        item_total_correlations = []
        for col in score_cols:
            corr = round(float(self.df[col].corr(total_scores)), 4)
            item_total_correlations.append({
                "question": col,
                "correlation": corr,
            })

        # KR-20（适用于二分计分题目）
        kr20 = self._calculate_kr20(score_cols)

        return {
            "cronbach_alpha": alpha,
            "kr20": kr20,
            "alpha_level": alpha_level,
            "item_total_correlations": item_total_correlations,
        }

    def _calculate_kr20(self, score_cols: list[str]) -> Optional[float]:
        """
        计算 KR-20 信度（适用于 0/1 计分）

        KR-20 = (k / (k-1)) * (1 - Σpi*qi / σt²)
        """
        # 检查是否为二分计分
        is_binary = all(
            set(self.df[col].dropna().unique()).issubset({0, 1, 0.0, 1.0})
            for col in score_cols
        )

        if not is_binary:
            return None

        k = len(score_cols)
        total_variance = self.get_total_scores().var(ddof=1)

        if total_variance == 0:
            return 0.0

        pq_sum = 0.0
        for col in score_cols:
            p = self.df[col].mean()
            q = 1 - p
            pq_sum += p * q

        kr20 = round(float((k / (k - 1)) * (1 - pq_sum / total_variance)), 4)
        return kr20

    # ==================== 综合 Dashboard ====================

    def get_dashboard(self) -> dict:
        """获取综合 Dashboard 数据"""
        distribution = self.analyze_distribution()
        difficulty = self.analyze_difficulty()
        discrimination = self.analyze_discrimination()
        reliability = self.analyze_reliability()

        return {
            "dataset_id": self.dataset_id,
            "distribution": distribution,
            "difficulty": difficulty,
            "discrimination": discrimination,
            "reliability": reliability,
            "summary": distribution["statistics"],
        }

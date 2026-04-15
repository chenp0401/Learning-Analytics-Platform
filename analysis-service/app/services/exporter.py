"""
分析报告导出服务

支持导出 PNG 和 PDF 格式的分析报告。
"""

import io
import logging
from typing import Optional

logger = logging.getLogger(__name__)


class ReportExporter:
    """分析报告导出器"""

    def export_png(self, dashboard_data: dict, dataset_id: str) -> bytes:
        """
        导出 PNG 格式的分析报告

        Args:
            dashboard_data: Dashboard 数据
            dataset_id: 数据集 ID

        Returns:
            PNG 图片字节数据
        """
        import matplotlib
        matplotlib.use("Agg")
        import matplotlib.pyplot as plt
        import matplotlib.font_manager as fm
        import numpy as np

        # 设置中文字体
        plt.rcParams["font.sans-serif"] = ["SimHei", "DejaVu Sans", "Arial Unicode MS"]
        plt.rcParams["axes.unicode_minus"] = False

        fig, axes = plt.subplots(2, 2, figsize=(16, 12))
        fig.suptitle("考试数据分析报告", fontsize=18, fontweight="bold", y=0.98)

        # 1. 成绩分布直方图
        ax1 = axes[0, 0]
        distribution = dashboard_data.get("distribution", {})
        histogram = distribution.get("histogram", {})
        bins = histogram.get("bins", [])
        counts = histogram.get("counts", [])
        if bins and counts:
            x_pos = range(len(bins))
            ax1.bar(x_pos, counts, color="#3b82f6", alpha=0.8, edgecolor="white")
            ax1.set_xticks(x_pos)
            ax1.set_xticklabels(bins, rotation=45, ha="right", fontsize=8)
            ax1.set_ylabel("人数")
            ax1.set_title("成绩分布")
            # 添加统计信息
            stats = distribution.get("statistics", {})
            info_text = f"均值: {stats.get('mean', '-')}  中位数: {stats.get('median', '-')}  及格率: {stats.get('pass_rate', '-')}%"
            ax1.text(0.5, -0.2, info_text, transform=ax1.transAxes, ha="center", fontsize=9, color="gray")

        # 2. 难度系数柱状图
        ax2 = axes[0, 1]
        difficulty = dashboard_data.get("difficulty", [])
        if difficulty:
            questions = [d["question"] for d in difficulty]
            diff_values = [d["difficulty"] for d in difficulty]
            colors = ["#22c55e" if v >= 0.7 else "#3b82f6" if v >= 0.4 else "#ef4444" for v in diff_values]
            x_pos = range(len(questions))
            ax2.bar(x_pos, diff_values, color=colors, alpha=0.8, edgecolor="white")
            ax2.set_xticks(x_pos)
            ax2.set_xticklabels(questions, rotation=45, ha="right", fontsize=8)
            ax2.set_ylabel("难度系数 P")
            ax2.set_title("题目难度分析")
            ax2.axhline(y=0.7, color="green", linestyle="--", alpha=0.5, label="容易线")
            ax2.axhline(y=0.4, color="red", linestyle="--", alpha=0.5, label="较难线")
            ax2.legend(fontsize=8)

        # 3. 区分度折线图
        ax3 = axes[1, 0]
        discrimination = dashboard_data.get("discrimination", [])
        if discrimination:
            questions = [d["question"] for d in discrimination]
            disc_values = [d["discrimination"] for d in discrimination]
            ax3.plot(range(len(questions)), disc_values, "o-", color="#f59e0b", linewidth=2, markersize=6)
            ax3.set_xticks(range(len(questions)))
            ax3.set_xticklabels(questions, rotation=45, ha="right", fontsize=8)
            ax3.set_ylabel("区分度 D")
            ax3.set_title("题目区分度分析")
            ax3.axhline(y=0.4, color="green", linestyle="--", alpha=0.5, label="优秀线")
            ax3.axhline(y=0.2, color="red", linestyle="--", alpha=0.5, label="较差线")
            ax3.legend(fontsize=8)

        # 4. 信度信息
        ax4 = axes[1, 1]
        reliability = dashboard_data.get("reliability", {})
        ax4.axis("off")
        alpha = reliability.get("cronbach_alpha", 0)
        kr20 = reliability.get("kr20")
        alpha_level = reliability.get("alpha_level", "-")

        info_lines = [
            f"Cronbach's Alpha: {alpha}",
            f"信度等级: {alpha_level}",
        ]
        if kr20 is not None:
            info_lines.append(f"KR-20: {kr20}")

        # 添加统计摘要
        summary = dashboard_data.get("summary", {})
        info_lines.extend([
            "",
            "--- 统计摘要 ---",
            f"样本量: {summary.get('count', '-')}",
            f"平均分: {summary.get('mean', '-')}",
            f"标准差: {summary.get('std', '-')}",
            f"最高分: {summary.get('max', '-')}",
            f"最低分: {summary.get('min', '-')}",
            f"及格率: {summary.get('pass_rate', '-')}%",
        ])

        ax4.set_title("信度分析 & 统计摘要")
        for i, line in enumerate(info_lines):
            ax4.text(0.1, 0.9 - i * 0.08, line, transform=ax4.transAxes,
                     fontsize=11, verticalalignment="top",
                     fontweight="bold" if "---" in line else "normal")

        plt.tight_layout(rect=[0, 0, 1, 0.95])

        # 导出为 PNG
        buf = io.BytesIO()
        fig.savefig(buf, format="png", dpi=150, bbox_inches="tight")
        plt.close(fig)
        buf.seek(0)
        return buf.getvalue()

    def export_pdf(self, dashboard_data: dict, dataset_id: str) -> bytes:
        """
        导出 PDF 格式的分析报告

        Args:
            dashboard_data: Dashboard 数据
            dataset_id: 数据集 ID

        Returns:
            PDF 字节数据
        """
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.units import mm
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib import colors

        buf = io.BytesIO()
        doc = SimpleDocTemplate(buf, pagesize=A4, topMargin=20 * mm, bottomMargin=20 * mm)
        styles = getSampleStyleSheet()
        elements = []

        # 标题
        title_style = ParagraphStyle(
            "CustomTitle", parent=styles["Title"], fontSize=20, spaceAfter=12
        )
        elements.append(Paragraph("Exam Analysis Report", title_style))
        elements.append(Spacer(1, 10 * mm))

        # 统计摘要表格
        summary = dashboard_data.get("summary", {})
        elements.append(Paragraph("Statistical Summary", styles["Heading2"]))
        summary_data = [
            ["Metric", "Value"],
            ["Sample Size", str(summary.get("count", "-"))],
            ["Mean", str(summary.get("mean", "-"))],
            ["Std Dev", str(summary.get("std", "-"))],
            ["Max", str(summary.get("max", "-"))],
            ["Min", str(summary.get("min", "-"))],
            ["Median", str(summary.get("median", "-"))],
            ["Pass Rate", f"{summary.get('pass_rate', '-')}%"],
        ]
        table = Table(summary_data, colWidths=[60 * mm, 60 * mm])
        table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#3b82f6")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTSIZE", (0, 0), (-1, -1), 10),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f0f9ff")]),
            ("ALIGN", (1, 0), (1, -1), "CENTER"),
        ]))
        elements.append(table)
        elements.append(Spacer(1, 8 * mm))

        # 难度分析表格
        difficulty = dashboard_data.get("difficulty", [])
        if difficulty:
            elements.append(Paragraph("Difficulty Analysis", styles["Heading2"]))
            diff_data = [["Question", "Difficulty (P)", "Level", "Mean Score"]]
            for d in difficulty:
                diff_data.append([
                    d["question"],
                    str(d["difficulty"]),
                    d["level"],
                    str(d.get("mean_score", "-")),
                ])
            table = Table(diff_data, colWidths=[35 * mm, 35 * mm, 35 * mm, 35 * mm])
            table.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#3b82f6")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f0f9ff")]),
                ("ALIGN", (1, 0), (-1, -1), "CENTER"),
            ]))
            elements.append(table)
            elements.append(Spacer(1, 8 * mm))

        # 信度分析
        reliability = dashboard_data.get("reliability", {})
        elements.append(Paragraph("Reliability Analysis", styles["Heading2"]))
        rel_data = [
            ["Metric", "Value"],
            ["Cronbach's Alpha", str(reliability.get("cronbach_alpha", "-"))],
            ["Reliability Level", reliability.get("alpha_level", "-")],
        ]
        if reliability.get("kr20") is not None:
            rel_data.append(["KR-20", str(reliability["kr20"])])
        table = Table(rel_data, colWidths=[60 * mm, 60 * mm])
        table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#3b82f6")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTSIZE", (0, 0), (-1, -1), 10),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
            ("ALIGN", (1, 0), (1, -1), "CENTER"),
        ]))
        elements.append(table)

        # 嵌入 PNG 图表
        try:
            png_data = self.export_png(dashboard_data, dataset_id)
            img_buf = io.BytesIO(png_data)
            elements.append(Spacer(1, 10 * mm))
            elements.append(Paragraph("Charts", styles["Heading2"]))
            img = Image(img_buf, width=170 * mm, height=130 * mm)
            elements.append(img)
        except Exception as e:
            logger.warning(f"PDF 中嵌入图表失败: {str(e)}")

        doc.build(elements)
        buf.seek(0)
        return buf.getvalue()


# 全局单例
report_exporter = ReportExporter()

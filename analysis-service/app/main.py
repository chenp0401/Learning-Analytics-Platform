from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.analysis import router as analysis_router
from app.api.proofread import router as proofread_router
from app.api.dedup import router as dedup_router

app = FastAPI(
    title="教育辅助平台 - 后端服务",
    description="提供文本校对、文档查重、考试数据分析等功能",
    version="1.0.0",
)

# CORS 配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:80", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(analysis_router, prefix="/api/analysis", tags=["数据分析"])
app.include_router(proofread_router, prefix="/api/proofread", tags=["文本校对"])
app.include_router(dedup_router, prefix="/api/dedup", tags=["文档查重"])


@app.get("/health")
async def health_check():
    """健康检查接口"""
    return {"status": "ok", "service": "edu-platform-backend"}

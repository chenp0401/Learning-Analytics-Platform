#!/bin/bash
set -e

# ============================================================
# 教育辅助平台 - 打包脚本
# 在当前服务器上运行，生成可移植的部署包
# 用法: bash pack.sh [输出目录]
# ============================================================

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
OUTPUT_DIR="${1:-$SCRIPT_DIR/release}"
PACK_NAME="edu-platform-$(date +%Y%m%d%H%M%S)"
PACK_DIR="$OUTPUT_DIR/$PACK_NAME"

# 检测是否需要 sudo 运行 docker
DOCKER_CMD="docker"
if ! docker info > /dev/null 2>&1; then
    if sudo docker info > /dev/null 2>&1; then
        DOCKER_CMD="sudo docker"
    else
        echo "错误: 无法运行 Docker，请确保 Docker 已安装且当前用户有权限"
        exit 1
    fi
fi

echo "============================================"
echo "  教育辅助平台 - 打包工具"
echo "============================================"
echo ""
echo "项目目录: $SCRIPT_DIR"
echo "输出目录: $OUTPUT_DIR"
echo "包名称:   $PACK_NAME"
echo ""

# 创建输出目录
mkdir -p "$PACK_DIR/images"

# ----------------------------------------------------------
# 步骤 1: 打包源代码（排除不需要的文件）
# ----------------------------------------------------------
echo "[1/4] 打包源代码..."
tar czf "$PACK_DIR/source.tar.gz" \
    --exclude='node_modules' \
    --exclude='__pycache__' \
    --exclude='.venv' \
    --exclude='venv' \
    --exclude='dist' \
    --exclude='build' \
    --exclude='*.egg-info' \
    --exclude='.env' \
    --exclude='.env.local' \
    --exclude='.git' \
    --exclude='.docker' \
    --exclude='release' \
    --exclude='*.log' \
    --exclude='logs' \
    --exclude='uploads' \
    --exclude='dify/docker/volumes/app/storage/*' \
    --exclude='dify/docker/volumes/plugin_daemon/cwd' \
    --exclude='dify/docker/volumes/plugin_daemon/plugin' \
    --exclude='dify/docker/volumes/plugin_daemon/plugin_packages' \
    --exclude='dify/docker/volumes/plugin_daemon/assets' \
    -C "$SCRIPT_DIR" \
    docker-compose.yml \
    .env.example \
    README.md \
    LICENSE \
    frontend/ \
    analysis-service/ \
    dify/ \
    deploy.sh

echo "  ✓ 源代码打包完成 ($(du -sh "$PACK_DIR/source.tar.gz" | cut -f1))"

# ----------------------------------------------------------
# 步骤 2: 导出 Docker 镜像
# ----------------------------------------------------------
echo "[2/4] 导出 Docker 镜像（这可能需要几分钟）..."

# 当前版本需要的所有镜像
IMAGES=(
    "edu-platform-frontend:latest"
    "edu-platform-analysis-service:latest"
    "postgres:16-alpine"
    "redis:7-alpine"
    "minio/minio:latest"
    "nginx:latest"
    "langgenius/dify-api:1.13.3"
    "langgenius/dify-web:1.13.3"
    "langgenius/dify-plugin-daemon:0.5.3-local"
    "langgenius/dify-sandbox:0.2.14"
    "ubuntu/squid:latest"
    "semitechnologies/weaviate:1.27.0"
    "busybox:latest"
)

# 检查所有镜像是否存在
MISSING_IMAGES=()
for img in "${IMAGES[@]}"; do
    if ! $DOCKER_CMD image inspect "$img" > /dev/null 2>&1; then
        MISSING_IMAGES+=("$img")
    fi
done

if [ ${#MISSING_IMAGES[@]} -gt 0 ]; then
    echo "  ⚠ 以下镜像不存在，将跳过："
    for img in "${MISSING_IMAGES[@]}"; do
        echo "    - $img"
    done
    # 过滤掉不存在的镜像
    EXISTING_IMAGES=()
    for img in "${IMAGES[@]}"; do
        if $DOCKER_CMD image inspect "$img" > /dev/null 2>&1; then
            EXISTING_IMAGES+=("$img")
        fi
    done
    IMAGES=("${EXISTING_IMAGES[@]}")
fi

echo "  正在导出 ${#IMAGES[@]} 个镜像..."
if [ ${#IMAGES[@]} -eq 0 ]; then
    echo "  ⚠ 没有可导出的镜像，跳过镜像导出"
    echo "  提示: 新服务器部署时将需要联网拉取镜像"
else
    $DOCKER_CMD save "${IMAGES[@]}" | gzip > "$PACK_DIR/images/all-images.tar.gz"
fi
echo "  ✓ 镜像导出完成 ($(du -sh "$PACK_DIR/images/all-images.tar.gz" | cut -f1))"

# ----------------------------------------------------------
# 步骤 3: 生成镜像清单
# ----------------------------------------------------------
echo "[3/4] 生成镜像清单..."
cat > "$PACK_DIR/images/manifest.txt" << 'EOF'
# 教育辅助平台 Docker 镜像清单
# 以下镜像已包含在 all-images.tar.gz 中

## 主应用服务
edu-platform-frontend:latest          # 前端应用（Nginx + React）
edu-platform-analysis-service:latest  # 后端分析服务（FastAPI）
postgres:16-alpine                    # PostgreSQL 数据库
redis:7-alpine                        # Redis 缓存
minio/minio:latest                    # MinIO 对象存储

## Dify AI 引擎
langgenius/dify-api:1.13.3            # Dify API 服务
langgenius/dify-web:1.13.3            # Dify Web 控制台
langgenius/dify-plugin-daemon:0.5.3-local  # Dify 插件守护进程
langgenius/dify-sandbox:0.2.14        # Dify 代码沙箱
nginx:latest                          # Dify Nginx 网关
ubuntu/squid:latest                   # SSRF 防护代理
semitechnologies/weaviate:1.27.0      # Weaviate 向量数据库
busybox:latest                        # 初始化工具
EOF
echo "  ✓ 镜像清单已生成"

# ----------------------------------------------------------
# 步骤 4: 打包最终部署包
# ----------------------------------------------------------
echo "[4/4] 生成最终部署包..."
cd "$OUTPUT_DIR"
tar czf "${PACK_NAME}.tar.gz" "$PACK_NAME/"
FINAL_SIZE=$(du -sh "${PACK_NAME}.tar.gz" | cut -f1)

echo ""
echo "============================================"
echo "  ✅ 打包完成！"
echo "============================================"
echo ""
echo "部署包位置: $OUTPUT_DIR/${PACK_NAME}.tar.gz"
echo "部署包大小: $FINAL_SIZE"
echo ""
echo "使用方法："
echo "  1. 将 ${PACK_NAME}.tar.gz 传输到目标服务器"
echo "  2. 解压: tar xzf ${PACK_NAME}.tar.gz"
echo "  3. 进入目录: cd ${PACK_NAME}"
echo "  4. 运行部署: bash deploy.sh"
echo ""
echo "传输示例（scp）："
echo "  scp $OUTPUT_DIR/${PACK_NAME}.tar.gz user@target-server:/opt/"
echo ""

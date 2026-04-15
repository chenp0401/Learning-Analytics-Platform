#!/bin/bash
set -e

# ============================================================
# 教育辅助平台 - 一键在线部署脚本
# 在全新服务器上运行，自动完成所有部署工作
#
# 用法:
#   方式一（推荐）: 先克隆仓库再运行
#     git clone https://github.com/chenp0401/Learning-Analytics-Platform.git
#     cd Learning-Analytics-Platform
#     bash deploy.sh
#
#   方式二: 直接运行（自动克隆）
#     curl -fsSL https://raw.githubusercontent.com/chenp0401/Learning-Analytics-Platform/main/deploy.sh | bash
#
# ============================================================

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# GitHub 仓库地址
REPO_URL="https://github.com/chenp0401/Learning-Analytics-Platform.git"

# 项目名称（用于 Docker Compose）
PROJECT_NAME="edu-platform"
DIFY_PROJECT_NAME="edu-platform-dify"

echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}  教育辅助平台 - 一键在线部署${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""

# ==========================================================
# 步骤 1: 检测运行环境 & 安装依赖
# ==========================================================
echo -e "${CYAN}[1/6] 检测运行环境...${NC}"

# 检测操作系统
OS=""
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$ID
fi
echo -e "  操作系统: ${BLUE}${OS:-unknown}${NC}"

# 检测是否需要 sudo
SUDO=""
if [ "$(id -u)" -ne 0 ]; then
    SUDO="sudo"
fi

# ----------------------------------------------------------
# 1a. 检测/安装 Docker
# ----------------------------------------------------------
if command -v docker &> /dev/null && ($SUDO docker info &> /dev/null); then
    DOCKER_VERSION=$($SUDO docker --version | awk '{print $3}' | tr -d ',')
    echo -e "  ${GREEN}✓ Docker 已安装 (v${DOCKER_VERSION})${NC}"
else
    echo -e "  ${YELLOW}⚠ Docker 未安装，正在自动安装...${NC}"
    if [ "$OS" = "ubuntu" ] || [ "$OS" = "debian" ]; then
        $SUDO apt-get update -qq
        $SUDO apt-get install -y -qq ca-certificates curl gnupg lsb-release > /dev/null 2>&1
        $SUDO install -m 0755 -d /etc/apt/keyrings
        curl -fsSL https://download.docker.com/linux/$OS/gpg | $SUDO gpg --dearmor -o /etc/apt/keyrings/docker.gpg 2>/dev/null
        $SUDO chmod a+r /etc/apt/keyrings/docker.gpg
        echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/$OS $(lsb_release -cs) stable" | $SUDO tee /etc/apt/sources.list.d/docker.list > /dev/null
        $SUDO apt-get update -qq
        $SUDO apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-compose-plugin > /dev/null 2>&1
    elif [ "$OS" = "centos" ] || [ "$OS" = "rhel" ] || [ "$OS" = "fedora" ]; then
        $SUDO yum install -y -q yum-utils > /dev/null 2>&1
        $SUDO yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo > /dev/null 2>&1
        $SUDO yum install -y -q docker-ce docker-ce-cli containerd.io docker-compose-plugin > /dev/null 2>&1
    else
        echo -e "  ${YELLOW}无法自动安装 Docker，尝试使用官方脚本...${NC}"
        curl -fsSL https://get.docker.com | $SUDO sh
    fi
    $SUDO systemctl start docker
    $SUDO systemctl enable docker
    echo -e "  ${GREEN}✓ Docker 安装完成${NC}"
fi

# ----------------------------------------------------------
# 1b. 检测/安装 Docker Compose
# ----------------------------------------------------------
if $SUDO docker compose version &> /dev/null; then
    COMPOSE_CMD="$SUDO docker compose"
    echo -e "  ${GREEN}✓ Docker Compose (插件模式) 已就绪${NC}"
elif command -v docker-compose &> /dev/null; then
    COMPOSE_CMD="$SUDO docker-compose"
    echo -e "  ${GREEN}✓ Docker Compose (独立模式) 已就绪${NC}"
else
    echo -e "  ${YELLOW}⚠ Docker Compose 未安装，正在安装...${NC}"
    COMPOSE_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep '"tag_name"' | sed -E 's/.*"v?([^"]+)".*/\1/')
    if [ -z "$COMPOSE_VERSION" ]; then
        COMPOSE_VERSION="2.29.1"
    fi
    $SUDO curl -fsSL "https://github.com/docker/compose/releases/download/v${COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    $SUDO chmod +x /usr/local/bin/docker-compose
    COMPOSE_CMD="$SUDO docker-compose"
    echo -e "  ${GREEN}✓ Docker Compose v${COMPOSE_VERSION} 安装完成${NC}"
fi

# ----------------------------------------------------------
# 1c. 检测/安装 Git
# ----------------------------------------------------------
if command -v git &> /dev/null; then
    echo -e "  ${GREEN}✓ Git 已安装${NC}"
else
    echo -e "  ${YELLOW}⚠ Git 未安装，正在安装...${NC}"
    if [ "$OS" = "ubuntu" ] || [ "$OS" = "debian" ]; then
        $SUDO apt-get install -y -qq git > /dev/null 2>&1
    elif [ "$OS" = "centos" ] || [ "$OS" = "rhel" ] || [ "$OS" = "fedora" ]; then
        $SUDO yum install -y -q git > /dev/null 2>&1
    fi
    echo -e "  ${GREEN}✓ Git 安装完成${NC}"
fi

# ----------------------------------------------------------
# 1d. 检查磁盘空间
# ----------------------------------------------------------
AVAILABLE_GB=$(df -BG "." | tail -1 | awk '{print $4}' | sed 's/G//')
if [ "$AVAILABLE_GB" -lt 15 ]; then
    echo -e "  ${YELLOW}⚠ 磁盘可用空间不足 15GB（当前: ${AVAILABLE_GB}GB），可能影响部署${NC}"
else
    echo -e "  ${GREEN}✓ 磁盘空间充足 (${AVAILABLE_GB}GB 可用)${NC}"
fi

echo ""

# ==========================================================
# 步骤 2: 获取项目代码
# ==========================================================
echo -e "${CYAN}[2/6] 获取项目代码...${NC}"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# 判断当前是否已在项目目录中
if [ -f "$SCRIPT_DIR/docker-compose.yml" ] && [ -d "$SCRIPT_DIR/frontend" ] && [ -d "$SCRIPT_DIR/dify" ]; then
    PROJECT_DIR="$SCRIPT_DIR"
    echo -e "  ${GREEN}✓ 已在项目目录中: $PROJECT_DIR${NC}"
else
    # 需要克隆代码
    PROJECT_DIR="$(pwd)/Learning-Analytics-Platform"
    if [ -d "$PROJECT_DIR" ]; then
        echo "  项目目录已存在，拉取最新代码..."
        cd "$PROJECT_DIR"
        git pull origin main 2>/dev/null || true
    else
        echo "  正在从 GitHub 克隆项目..."
        git clone "$REPO_URL" "$PROJECT_DIR"
    fi
    echo -e "  ${GREEN}✓ 代码获取完成: $PROJECT_DIR${NC}"
fi

cd "$PROJECT_DIR"
echo ""

# ==========================================================
# 步骤 3: 配置环境变量
# ==========================================================
echo -e "${CYAN}[3/6] 配置环境变量...${NC}"

if [ ! -f "$PROJECT_DIR/.env" ]; then
    if [ -f "$PROJECT_DIR/.env.example" ]; then
        cp "$PROJECT_DIR/.env.example" "$PROJECT_DIR/.env"
        echo -e "  ${GREEN}✓ 已从模板创建 .env 文件${NC}"
        echo -e "  ${YELLOW}⚠ 部署完成后请编辑 $PROJECT_DIR/.env 填入实际配置（如 DeepSeek API Key）${NC}"
    fi
else
    echo -e "  ${GREEN}✓ .env 文件已存在，跳过${NC}"
fi

echo ""

# ==========================================================
# 步骤 4: 初始化运行环境
# ==========================================================
echo -e "${CYAN}[4/6] 初始化运行环境...${NC}"

# 创建 Dify 所需的 volumes 目录
mkdir -p "$PROJECT_DIR/dify/docker/volumes/app/storage"
mkdir -p "$PROJECT_DIR/dify/docker/volumes/sandbox/dependencies"
mkdir -p "$PROJECT_DIR/dify/docker/volumes/sandbox/conf"
mkdir -p "$PROJECT_DIR/dify/docker/volumes/plugin_daemon"

# 创建 sandbox 配置文件
if [ ! -f "$PROJECT_DIR/dify/docker/volumes/sandbox/conf/config.yaml" ]; then
    cat > "$PROJECT_DIR/dify/docker/volumes/sandbox/conf/config.yaml" << 'SANDBOX_EOF'
app:
  port: 8194
  debug: false
  key: dify-sandbox

max_workers: 4
max_requests: 50
worker_timeout: 15

python_path: /usr/local/bin/python3

enable_network: true
proxy:
  socks5: ""
  http: http://ssrf_proxy:3128
  https: http://ssrf_proxy:3128

allowed_syscalls: []
python_lib_paths: []
nodejs_path: /usr/local/bin/node
SANDBOX_EOF
fi

# 创建 sandbox 依赖文件
touch "$PROJECT_DIR/dify/docker/volumes/sandbox/dependencies/python-requirements.txt" 2>/dev/null || true
touch "$PROJECT_DIR/dify/docker/volumes/sandbox/dependencies/nodejs-requirements.txt" 2>/dev/null || true

# 确保脚本有执行权限
chmod +x "$PROJECT_DIR/dify/docker/nginx/docker-entrypoint.sh" 2>/dev/null || true
chmod +x "$PROJECT_DIR/dify/docker/ssrf_proxy/docker-entrypoint.sh" 2>/dev/null || true

echo -e "  ${GREEN}✓ 运行环境初始化完成${NC}"
echo ""

# ==========================================================
# 步骤 5: 构建并启动主应用服务
# ==========================================================
echo -e "${CYAN}[5/6] 构建并启动主应用服务...${NC}"
echo "  正在拉取基础镜像并构建前端/后端服务（首次可能需要 5-10 分钟）..."

cd "$PROJECT_DIR"
COMPOSE_PROJECT_NAME=$PROJECT_NAME $COMPOSE_CMD up -d --build

echo -e "  ${GREEN}✓ 主应用服务已启动${NC}"
echo ""

# 等待网络创建完成
sleep 5

# ==========================================================
# 步骤 6: 启动 Dify AI 引擎
# ==========================================================
echo -e "${CYAN}[6/6] 启动 Dify AI 引擎...${NC}"
echo "  正在拉取 Dify 相关镜像（首次可能需要 10-20 分钟）..."

cd "$PROJECT_DIR/dify/docker"
COMPOSE_PROJECT_NAME=$DIFY_PROJECT_NAME $COMPOSE_CMD up -d

echo -e "  ${GREEN}✓ Dify 服务已启动${NC}"
echo ""

# ==========================================================
# 等待服务就绪 & 初始化 Dify
# ==========================================================
echo -e "${YELLOW}等待服务就绪...${NC}"

MAX_WAIT=180
WAITED=0
while [ $WAITED -lt $MAX_WAIT ]; do
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost 2>/dev/null || echo "000")
    if [ "$HTTP_CODE" = "200" ]; then
        break
    fi
    sleep 5
    WAITED=$((WAITED + 5))
    printf "\r  已等待 %ds / %ds ... (HTTP: %s)" "$WAITED" "$MAX_WAIT" "$HTTP_CODE"
done
echo ""

if [ $WAITED -ge $MAX_WAIT ]; then
    echo -e "  ${YELLOW}⚠ 部分服务可能仍在启动中，请稍后检查${NC}"
else
    echo -e "  ${GREEN}✓ 前端服务已就绪${NC}"
fi

# 尝试运行 Dify 数据库迁移和初始化
echo ""
echo -e "${YELLOW}初始化 Dify 数据库...${NC}"
sleep 10

# 等待 Dify API 就绪
DIFY_WAITED=0
while [ $DIFY_WAITED -lt 120 ]; do
    DIFY_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3002/console/api/setup 2>/dev/null || echo "000")
    if [ "$DIFY_CODE" != "000" ] && [ "$DIFY_CODE" != "502" ] && [ "$DIFY_CODE" != "503" ]; then
        break
    fi
    sleep 5
    DIFY_WAITED=$((DIFY_WAITED + 5))
    printf "\r  等待 Dify API 就绪... %ds" "$DIFY_WAITED"
done
echo ""

# 检查 Dify 是否需要初始化
SETUP_RESPONSE=$(curl -s http://localhost:3002/console/api/setup 2>/dev/null || echo "")
if echo "$SETUP_RESPONSE" | grep -q "not_started"; then
    echo "  正在初始化 Dify 管理员账号..."
    INIT_RESULT=$(curl -s -X POST http://localhost:3002/console/api/setup \
        -H "Content-Type: application/json" \
        -d '{"email": "admin@edu-platform.com", "name": "Admin", "password": "Admin@123456"}' 2>/dev/null || echo "")
    if echo "$INIT_RESULT" | grep -q "success"; then
        echo -e "  ${GREEN}✓ Dify 初始化完成${NC}"
        echo -e "  ${BLUE}  管理员邮箱: admin@edu-platform.com${NC}"
        echo -e "  ${BLUE}  管理员密码: Admin@123456${NC}"
    else
        echo -e "  ${YELLOW}⚠ Dify 自动初始化未成功，请手动访问 http://<IP>/signin 完成设置${NC}"
    fi
elif echo "$SETUP_RESPONSE" | grep -q "finished"; then
    echo -e "  ${GREEN}✓ Dify 已初始化${NC}"
else
    echo -e "  ${YELLOW}⚠ 无法连接 Dify API，请稍后手动检查${NC}"
fi

echo ""

# ==========================================================
# 显示部署结果
# ==========================================================
# 获取服务器 IP
SERVER_IP=$(hostname -I 2>/dev/null | awk '{print $1}')
if [ -z "$SERVER_IP" ]; then
    SERVER_IP="<服务器IP>"
fi

echo -e "${BLUE}============================================${NC}"
echo -e "${GREEN}  ✅ 部署完成！${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""
echo -e "  项目目录:  ${BLUE}$PROJECT_DIR${NC}"
echo ""
echo -e "  ${BLUE}📌 访问地址：${NC}"
echo -e "  ┌──────────────────────────────────────────────────────┐"
echo -e "  │ 平台首页      http://${SERVER_IP}                    │"
echo -e "  │ 文本校对      http://${SERVER_IP}/proofread           │"
echo -e "  │ 文档查重      http://${SERVER_IP}/dedup               │"
echo -e "  │ 数据分析      http://${SERVER_IP}/analysis            │"
echo -e "  │ 文档库入口    http://${SERVER_IP}/knowledge            │"
echo -e "  │ Dify 控制台   http://${SERVER_IP}/signin              │"
echo -e "  │ API 文档      http://${SERVER_IP}:8000/docs           │"
echo -e "  └──────────────────────────────────────────────────────┘"
echo ""
echo -e "  ${YELLOW}📋 Dify 管理员账号：${NC}"
echo -e "  邮箱: admin@edu-platform.com"
echo -e "  密码: Admin@123456"
echo ""
echo -e "  ${YELLOW}📋 部署后配置：${NC}"
echo -e "  1. 编辑环境变量:  vi $PROJECT_DIR/.env"
echo -e "  2. 填入 DeepSeek API Key 等配置"
echo -e "  3. 登录 Dify 控制台，配置模型提供商（DeepSeek）"
echo -e "  4. 创建校对/查重工作流并获取 API Key"
echo ""
echo -e "  ${YELLOW}🔧 常用管理命令：${NC}"
echo -e "  # 查看所有服务状态"
echo -e "  cd $PROJECT_DIR && COMPOSE_PROJECT_NAME=$PROJECT_NAME $COMPOSE_CMD ps"
echo -e "  cd $PROJECT_DIR/dify/docker && COMPOSE_PROJECT_NAME=$DIFY_PROJECT_NAME $COMPOSE_CMD ps"
echo ""
echo -e "  # 查看日志"
echo -e "  cd $PROJECT_DIR && COMPOSE_PROJECT_NAME=$PROJECT_NAME $COMPOSE_CMD logs -f [服务名]"
echo ""
echo -e "  # 重启所有服务"
echo -e "  cd $PROJECT_DIR && COMPOSE_PROJECT_NAME=$PROJECT_NAME $COMPOSE_CMD restart"
echo -e "  cd $PROJECT_DIR/dify/docker && COMPOSE_PROJECT_NAME=$DIFY_PROJECT_NAME $COMPOSE_CMD restart"
echo ""
echo -e "  # 停止所有服务"
echo -e "  cd $PROJECT_DIR/dify/docker && COMPOSE_PROJECT_NAME=$DIFY_PROJECT_NAME $COMPOSE_CMD down"
echo -e "  cd $PROJECT_DIR && COMPOSE_PROJECT_NAME=$PROJECT_NAME $COMPOSE_CMD down"
echo ""
echo -e "  # 更新代码并重新部署"
echo -e "  cd $PROJECT_DIR && git pull && COMPOSE_PROJECT_NAME=$PROJECT_NAME $COMPOSE_CMD up -d --build"
echo ""

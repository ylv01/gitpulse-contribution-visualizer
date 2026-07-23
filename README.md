![GitPulse 演示图片](ylv01-contribution-report.svg)
可根据 GitHub 账号与日期范围，按日、周、月展示 Push 数量，并支持将可视化结果保存为图片。

# GitPulse · GitHub Contribution Visualizer

一个可直接运行的 GitHub 贡献可视化 MVP。输入 GitHub 用户名与日期范围后，应用通过 GitHub GraphQL API 拉取贡献数据，使用 pandas 聚合，再通过 ECharts 生成趋势、日历热力图与活动类型分布图。

> **自动更新不是必须配置。** 单纯体验或测试时，保持默认“单次生成”模式即可：生成 SVG 后上传到目标仓库并嵌入主页 README。只有希望报告每天自动刷新时，才需要保存自动化 Token、配置推送目标并注册计划任务。

## 功能

- GitHub 用户名查询
- 页面 Token 可选输入，或使用后端环境变量中的 Token
- 自定义开始与结束日期，最多单次查询 10 年
- 按日 / 周 / 月聚合贡献趋势
- GitHub 风格日历热力图，支持跨年展示
- commits / pull requests / issues / code reviews 活动类型分布
- 总贡献、活跃天数、最长连续贡献等关键指标
- 一键导出完整可视化报告 SVG（矢量）或 PNG
- 一键导出日数据、聚合趋势和活动分布 CSV
- 对超过一年的范围自动分片请求 GitHub API 并合并数据
- 深色科技风、蓝紫霓虹、响应式 Dashboard
- 单次生成 / 自动更新双模式，默认不保存页面 Token
- 自动模式支持固定日期或“固定开始日期到当天”
- 自动模式支持日 / 周 / 月聚合与自定义目标仓库、分支、SVG 路径
- 支持只在本地生成测试 SVG，或手动确认后立即推送
- 自动提交只覆盖目标 SVG，不使用 `git push --force`

## 技术栈

- Frontend: Next.js、TypeScript、Tailwind CSS、ECharts
- Backend: FastAPI、pandas、httpx、GitHub GraphQL API
- Tests: pytest
- Deployment: Docker Compose（可选）

## 目录结构

```text
GitHub Contribution Visualizer/
├── .env.example
├── .gitignore
├── docker-compose.yml
├── start-dev.ps1
├── README.md
├── automation/
│   ├── .env.example              # 自动化 Token 模板
│   ├── config.example.json       # 非敏感自动配置模板
│   ├── run-daily.ps1             # 每日任务入口
│   └── register-task.ps1         # Windows 计划任务注册脚本
├── backend/
│   ├── .env.example
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── app/
│   │   ├── main.py                 # FastAPI 入口与路由
│   │   ├── config.py               # 环境配置
│   │   ├── models.py               # Pydantic 请求/响应模型
│   │   ├── github_client.py        # GitHub GraphQL 客户端
│   │   └── services/
│   │       └── contributions.py    # 日期切片、pandas 聚合、指标计算
│   └── tests/
│       └── test_contributions.py
└── frontend/
    ├── .env.example
    ├── Dockerfile
    ├── package.json
    ├── tailwind.config.ts
    ├── app/
    │   ├── globals.css
    │   ├── layout.tsx
    │   └── page.tsx
    ├── components/
    │   ├── Dashboard.tsx
    │   ├── MetricCard.tsx
    │   └── charts/
    │       ├── ActivityChart.tsx
    │       ├── HeatmapChart.tsx
    │       └── TrendChart.tsx
    └── lib/
        ├── api.ts
        ├── export.ts
        └── types.ts
```

## 前置要求

- Node.js 20+
- Python 3.10+
- 一个 GitHub Personal Access Token

GitHub GraphQL API 必须经过身份认证，因此“Token 可选”指：

1. 可以在页面临时输入 Token；它只随本次请求发送，不写入文件或数据库。
2. 也可以把 Token 配置在后端 `backend/.env` 的 `GITHUB_TOKEN` 中，此时页面无需输入。

自动更新模式是另一条明确隔离的链路：只有切换到“自动更新”并点击“保存配置”“仅生成测试”或“立即推送”时，页面中的 Token 才会写入 `automation/.env.local`。这个文件已经被 Git 忽略。普通“生成图谱”请求仍然只在内存使用 Token。

只查询公开贡献时建议使用最小权限 Token。若需要统计 Token 所属账户可见的私有贡献，请根据仓库类型配置相应读取权限；GitHub 仍不会返回私有贡献的仓库或活动明细。

## 本地启动

### 1. 启动后端

```powershell
cd "E:\GitHub Contribution Visualizer\backend"(取决于你的项目拉取盘符和位置修改)
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
```

编辑 `backend/.env`：

```dotenv
GITHUB_TOKEN=github_pat_your_token_here
FRONTEND_ORIGINS=http://localhost:3000
GITHUB_GRAPHQL_URL=https://api.github.com/graphql
REQUEST_TIMEOUT_SECONDS=30
```

启动 API：

```powershell
uvicorn app.main:app --reload --port 8000
```

可访问：

- API health: http://localhost:8000/api/health
- Swagger: http://localhost:8000/docs

### 2. 启动前端

另开一个 PowerShell：

```powershell
cd "E:\GitHub Contribution Visualizer\frontend"(取决于你的项目拉取盘符和位置修改)
Copy-Item .env.example .env.local
npm install
npm run dev
```

浏览器打开 http://localhost:3000。

也可以在项目根目录运行 `./start-dev.ps1`，脚本会分别打开前后端开发进程。首次启动会自动安装依赖。

## 三种使用方式

### 1. 单次生成（默认）

保持页面顶部的“单次生成”，输入账号、Token 和日期后生成报告，再导出 SVG、PNG 或 CSV。Token 不会写入文件、数据库或浏览器本地存储。

### 2. 只生成自动化测试文件

切换到“自动更新”，填写目标信息后点击“仅生成测试”。后端会把原生动画 SVG 写入：

```text
automation/generated/<目标文件名>.svg
```

这一步不会访问目标仓库的写入接口，也不会创建 Git 提交。可以把生成文件手动上传到个人主页仓库，然后在 README 嵌入：

```markdown
![GitPulse Contribution Report](./others_show/ylv01-contribution-report.svg)
```

### 3. 自动更新（可选）

自动模式默认配置为：

```text
账号：ylv01
开始日期：2026-06-01
结束日期：运行当天
聚合：按月
目标仓库：ylv01/ylv01
目标分支：main
目标路径：others_show/ylv01-contribution-report.svg
```

前端提供：

- 保存配置：保存非敏感配置；输入了新 Token 时才更新本地 Token 文件。
- 仅生成测试：保存配置后只在本地输出 SVG。
- 立即推送：明确确认后通过 GitHub Contents API 正常提交并覆盖目标 SVG。
- 删除 Token：删除 `automation/.env.local`，不影响单次生成。

如果希望每天自动运行，先从前端保存配置并勾选“启用每日任务”，然后在项目根目录执行一次：

```powershell
powershell -ExecutionPolicy Bypass -File .\automation\register-task.ps1
```

计划任务会读取页面保存的执行时间。若启用了“需要代理”，脚本只有在检测到 TUN、TAP、Wintun、Clash、WireGuard、sing-box 或 vEthernet 虚拟网卡，并且 GitHub API 实际可达时才继续执行。

自动化本地文件如下，均不会被 Git 正常提交：

```text
automation/.env.local
automation/config.local.json
automation/generated/
automation/.state/
```

同一个 Token 会用于 GraphQL 查询和目标文件提交，因此它必须同时具备读取贡献数据和写入目标仓库内容的权限。建议使用只授权目标仓库的细粒度 Token。

## Docker Compose 启动

在项目根目录创建 `.env`，可参考根目录 `.env.example`：

```dotenv
GITHUB_TOKEN=github_pat_your_token_here
```

然后执行：

```powershell
docker compose up --build
```

访问 http://localhost:3000。API 位于 http://localhost:8000。

## API

`POST /api/contributions`

请求示例：

```json
{
  "username": "torvalds",
  "start_date": "2025-01-01",
  "end_date": "2025-12-31",
  "aggregation": "week"
}
```

也可以在请求中增加 `"token": "github_pat_..."`。接口返回：

- `user`: GitHub 用户资料
- `daily`: 完整连续日期序列，用于热力图和 CSV
- `trend`: 按指定粒度聚合的数据
- `activity`: 四类公开活动统计
- `meta`: 总贡献、活跃天数、最长连续贡献、私有贡献数量等

## 测试与检查

后端：

```powershell
cd backend
pytest -q
```

前端：

```powershell
cd frontend
npm run typecheck
npm run build
```

## 数据与隐私说明

- 本项目不包含数据库，页面输入的 Token 不会被持久化。
- 上一条适用于默认单次生成；自动模式只有在用户明确保存时才把 Token 写入被忽略的 `automation/.env.local`。
- 后端不会把已保存的完整 Token 返回给前端，只返回“是否已配置”。
- 生产部署必须启用 HTTPS，并限制 `FRONTEND_ORIGINS`。
- 自动化文件写入和 Windows 计划任务只面向本机部署；公共网站不应开放这些接口。
- 日历总贡献可能包含 GitHub 不公开分类细节的贡献，因此它不一定等于四类活动数量之和。
- GitHub API 的限流、可见性设置和 Token 权限会影响结果。

# Vercel 部署指南

本项目使用 Next.js App Router + Vercel Serverless Functions + PostgreSQL。

## 快速部署

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-repo/social-universe)

## 手动部署步骤

### 1. 准备数据库 (PostgreSQL)

推荐使用 Vercel Postgres（免费额度充足）:

1. 登录 [Vercel Dashboard](https://vercel.com)
2. 进入 Storage -> Create Database -> Postgres
3. 复制连接字符串

或其他 PostgreSQL 服务:
- [Neon](https://neon.tech) - 免费开源 Serverless PostgreSQL
- [Supabase](https://supabase.com) - 开源 Firebase 替代
- [Railway](https://railway.app) - 简单易用的 PaaS

### 2. 准备 SecondMe OAuth

1. 访问 SecondMe 开放平台申请 OAuth 应用
2. 获取 `CLIENT_ID` 和 `CLIENT_SECRET`
3. 设置回调地址: `https://你的域名/api/auth/callback`

### 3. 部署到 Vercel

```bash
# 安装 Vercel CLI (可选)
npm i -g vercel

# 登录
vercel login

# 部署
vercel
```

或者:
1. 将代码推送到 GitHub
2. 在 Vercel Dashboard 导入项目
3. 配置环境变量

### 4. 配置环境变量

在 Vercel Project Settings -> Environment Variables 添加:

```
DATABASE_URL=postgresql://...  # PostgreSQL 连接字符串
NEO4J_URI=bolt://...          # Neo4j 连接 (可选)
NEO4J_USER=neo4j
NEO4J_PASSWORD=...
SECONDME_API_BASE_URL=https://api.mindverse.com/gate/lab
SECONDME_OAUTH_URL=https://go.second.me/oauth/
SECONDME_CLIENT_ID=your_client_id
SECONDME_CLIENT_SECRET=your_client_secret
SECONDME_REDIRECT_URI=https://your-app.vercel.app/api/auth/callback
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

### 5. 运行数据库迁移

```bash
# 本地测试连接
npx prisma db push

# 生产环境 (Vercel)
vercel env pull .env.production.local
npx prisma db push --schema=./prisma/schema.prisma
```

## 本地开发

```bash
# 复制环境变量
cp .env.example .env

# 编辑 .env 填入配置

# 安装依赖
npm install

# 生成 Prisma Client
npx prisma generate

# 启动开发服务器
npm run dev
```

## 项目结构

```
src/
├── app/
│   ├── api/              # API Routes (Serverless Functions)
│   │   ├── auth/         # 认证相关
│   │   └── secondme/     # SecondMe API
│   ├── users-chat/       # 多用户对话页面
│   └── page.tsx         # 首页
├── lib/
│   └── auth.ts          # Prisma & 认证工具
└── prisma/
    └── schema.prisma    # 数据库模型
```

## 注意事项

1. **Vercel Serverless 限制**: 函数执行时间最长 10 秒（可配置至 60 秒）
2. **PostgreSQL 连接**: Vercel Serverless Functions 每次调用可能新建连接，建议使用连接池
3. **环境变量**: 生产环境务必设置 `NODE_ENV=production`

## 故障排除

### 数据库连接失败
- 检查 `DATABASE_URL` 是否正确
- 确保数据库允许 Vercel IP 访问

### OAuth 回调失败
- 确认 `SECONDME_REDIRECT_URI` 与 OAuth 应用配置一致
- 检查 `NEXT_PUBLIC_APP_URL` 是否正确

### Prisma 错误
```bash
# 重新生成 Prisma Client
npx prisma generate
```

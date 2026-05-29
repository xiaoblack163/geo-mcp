# GEO MCP Server

一个基于 [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) 的品牌可见度分析工具，为 AI 助手提供品牌在 AI 搜索引擎中的可见度、品牌声量和品牌准确度数据查询能力。

## 功能

| 工具 | 说明 |
|------|------|
| `list_brands` | 获取当前用户下的品牌列表 |
| `get_brand_visibility_report` | 查询品牌可见度、品牌声量、Top1/Top3 可见度，自动对比上期变化 |
| `get_brand_accuracy_report` | 查询品牌信息准确率，自动对比上期变化 |

### 品牌可见度报告

展示品牌在 AI 搜索引擎中的表现，包含：
- **品牌可见度** — AI 搜索结果中品牌的引用率
- **品牌声量** — 展示次数 / 总展示次数
- **Top1可见度 / Top3可见度** — 排名前 1 / 前 3 的比率
- **上期对比** — 自动与上一周期数据做升降对比

### 品牌准确度报告

展示 AI 输出品牌信息的准确率，计算公式：

```
准确率 = (总行数 - 错误行数) / 总行数
```

## 安装

### 前置要求

- Node.js >= 18
- npm

### 1. 克隆仓库

```bash
git clone https://github.com/xiaoblack163/geo-mcp.git
cd geo-mcp
```

### 2. 安装依赖

```bash
npm install
```

### 3. 配置

```bash
cp config.example.json config.json
```

编辑 `config.json`，填入你的凭据：

| 字段 | 说明 |
|------|------|
| `baseUrl` | API 基础地址 |
| `origin` | 请求头中的 Origin 值 |
| `credentials.userName` | 登录用户名 |
| `credentials.passWord` | 登录密码（明文，MD5 加密后传输） |
| `credentials.tenantId` | 租户 ID |

## 对接 MCP 客户端

该 Server 通过标准 stdio 传输协议通信，支持任何兼容 MCP 的客户端。

### 通用配置

在所有支持 MCP 的客户端中，添加以下配置：

```json
{
  "mcpServers": {
    "geo-mcp": {
      "command": "node",
      "args": ["/绝对路径/geo-mcp/index.js"]
    }
  }
}
```

### 各客户端配置文件位置

| 客户端 | 配置文件路径 |
|--------|-------------|
| Claude Desktop | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| Claude Code | `~/.claude.json` 或 `~/.claude/settings.json` |
| Cursor | `~/.cursor/mcp.json` |
| Windsurf | `~/.windsurf/mcp_config.json` |
| Continue.dev | `~/.continue/config.json` |

配置添加后，重启客户端即可生效。AI 助手会根据对话上下文自动调用对应的工具。

## 认证机制

- 首次调用 tool 时自动登录，获取 token 缓存在内存
- 后续请求自动携带 `token` 和 `origin` header
- 如果接口返回 401，自动重新登录并重试一次
- 密码使用 MD5 加密后传输

## 项目结构

```
geo-mcp/
├── index.js              # MCP Server 入口
├── auth.js               # 认证模块（登录、token 缓存、刷新）
├── request.js            # HTTP 客户端（自动注入 token、处理 401）
├── httpClient.js         # 共享 HTTPS 客户端
├── config.json           # 环境配置（已 gitignore）
├── config.example.json   # 配置示例
├── tools/
│   ├── index.js          # Tool 注册入口
│   ├── brand.js          # list_brands
│   ├── brandVisibility.js # get_brand_visibility_report
│   └── accuracy.js       # get_brand_accuracy_report
└── package.json
```

## 注意事项

- 调试日志请使用 `console.error`（stderr），不要使用 `console.log`，否则会干扰 MCP 的 stdout 协议通信
- 切勿提交 `config.json`，请使用 `config.example.json` 作为模板

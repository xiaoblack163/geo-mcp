# GEO MCP Server

一个基于 [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) 的品牌可见度分析工具，为 AI 助手提供品牌在 AI 搜索引擎中的可见度、品牌声量和品牌准确度数据查询能力。

## 功能

| 工具 | 说明 |
|------|------|
| `list_brands` | 获取当前用户下的品牌列表 |
| `get_brand_visibility_report` | 查询品牌可见度（refRate）、品牌声量（showCount/totalShowCount）、Top1/Top3 可见度，自动对比上期变化 |
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
准确率 = (总行数 - 错误行数) / 总行数 = 1 - (错误行数 / 总行数)
```

## 安装

### 前置要求

- Node.js >= 18
- npm

### 安装依赖

```bash
cd geo-mcp
npm install
```

### 配置

复制示例配置文件并修改：

```bash
cp config.example.json config.json
```

编辑 `config.json`，填入真实凭据：

| 字段 | 说明 |
|------|------|
| `baseUrl` | API 基础地址 |
| `origin` | 请求头中的 Origin 值 |
| `credentials.userName` | 登录用户名 |
| `credentials.passWord` | 登录密码（明文，MD5 加密后传输） |
| `credentials.tenantId` | 租户 ID |

## 在 Claude Code 中使用

### 方法一：通过命令行添加

在 Claude Code 会话中执行：

```
/mcp add geo-mcp node /absolute/path/to/geo-mcp/index.js
```

### 方法二：通过配置文件添加

在 `~/.claude.json` 或 `~/.claude/settings.json` 中添加：

```json
{
  "mcpServers": {
    "geo-mcp": {
      "command": "node",
      "args": ["/absolute/path/to/geo-mcp/index.js"],
      "type": "stdio"
    }
  }
}
```

### 方法三：用 MCP Inspector 调试

```bash
npx @modelcontextprotocol/inspector node /absolute/path/to/geo-mcp/index.js
```

浏览器打开后（默认 `http://localhost:5173`）即可可视化调用和调试。

### 验证是否生效

重启 Claude Code 后，输入 `/mcp` 查看 server 列表，应显示：

```
2 servers
❯ MiniMax · ✔ connected · 2 tools
❯ geo-mcp · ✔ connected · 2 tools
```

### 使用示例

在 Claude Code 对话中直接询问：

> "查一下三星最近7天的品牌可见度"
> "品牌准确度怎么样"
> "有哪些品牌可以查"
> "对比上期品牌可见度的变化"

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
├── config.json           # 环境配置
├── tools/
│   ├── index.js          # Tool 注册入口
│   ├── brand.js          # list_brands
│   ├── brandVisibility.js # get_brand_visibility_report
│   └── accuracy.js       # get_brand_accuracy_report
└── package.json
```

## 注意事项

- 调试日志使用 `console.error`（stderr），不会干扰 MCP 的 stdout 协议通信
- 不要在 handler 中使用 `console.log`，会污染 JSON-RPC 通信

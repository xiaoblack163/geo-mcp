import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerTools } from './tools/index.js';

async function main() {
  const server = new McpServer({
    name: 'geo-mcp',
    version: '1.0.0',
    description: 'GEO 品牌可见度分析 MCP Server — 查询品牌在 AI 搜索引擎中的排名、声量、引用率等数据',
  });

  // 注册所有 tool（登录懒加载，首次调用 tool 时才触发）
  registerTools(server);

  // 通过 stdio 传输启动
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('✅ geo-mcp server started');
}

main().catch((err) => {
  console.error('❌ Failed to start MCP Server:', err.message);
  process.exit(1);
});

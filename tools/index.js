import brandVisibilityTools from './brandVisibility.js';
import brandTools from './brand.js';
import accuracyTools from './accuracy.js';
import dailyTrendTools from './dailyTrend.js';

const allTools = [
  ...brandVisibilityTools,
  ...brandTools,
  ...accuracyTools,
  ...dailyTrendTools,
];

/**
 * 将所有 tool 注册到 MCP Server 实例
 * @param {import('@modelcontextprotocol/sdk').McpServer} server
 */
export function registerTools(server) {
  for (const tool of allTools) {
    server.tool(
      tool.name,
      tool.description,
      tool.paramsSchema,
      tool.handler,
    );
  }
}

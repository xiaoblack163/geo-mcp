import { z } from 'zod';
import { apiRequest } from '../request.js';

const tools = [
  {
    name: 'list_brands',
    description: '获取当前用户下的品牌列表（核心品牌和竞品），返回每个品牌的 ID、名称、英文名、别名等信息。可用于查看有哪些品牌可以查询可见度。',
    paramsSchema: {
    },
    handler: async (args) => {
      const result = await apiRequest('GET', '/v1/brand/list', args, null);
      const brands = result?.data ?? [];
      console.error(`[list_brands] 返回 ${brands.length} 个品牌`);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    },
  },
];

export default tools;

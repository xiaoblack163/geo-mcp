import { z } from 'zod';
import { apiRequest } from '../request.js';

let cachedBrandId = null;

async function resolveBrandId(providedBrandId) {
  if (providedBrandId != null) return providedBrandId;
  if (cachedBrandId != null) return cachedBrandId;
  const res = await apiRequest('GET', '/v1/brand/list');
  const brands = res?.data ?? [];
  if (brands.length === 0) throw new Error('未找到任何品牌');
  cachedBrandId = brands[0].id;
  return cachedBrandId;
}

const tools = [
  {
    name: 'get_daily_brand_trend',
    description: '查询品牌每天的品牌可见度、声量、Top1可见度、Top3可见度趋势数据。返回按日期排列的每日指标，可用于绘制趋势图表。',
    paramsSchema: {
      brandId: z.number().int().optional().describe('品牌 ID（可选，不传则自动取第一个）'),
      startTime: z.string().optional().describe('开始时间 yyyy-MM-dd（可选）'),
      endTime: z.string().optional().describe('结束时间 yyyy-MM-dd（可选）'),
      brandRelevance: z.number().int().optional().describe('品牌关联度：0=无品牌倾向，1=品牌倾向，2=品牌摇摆（可选，默认 0）'),
      groupNames: z.array(z.string()).optional().describe('问题分组名筛选（可选）'),
      ismonitor: z.number().int().optional().describe('问题类型：0=历史问题，1=监控问题，2=全部（可选，默认 1）'),
      modelIds: z.array(z.number().int()).optional().describe('AI 模型 ID 筛选（可选）'),
      modelNames: z.array(z.string()).optional().describe('AI 模型名称筛选，如 ["豆包","Deepseek"]（可选，自动转换）'),
      tagIds: z.array(z.number().int()).optional().describe('标签 ID 筛选（可选）'),
      askType: z.number().int().optional().describe('终端类型：1=App，3=PC（可选）'),
      deepThinking: z.number().int().optional().describe('思考模式：1=深度，0=快速（可选）'),
    },
    handler: async (args) => {
      const brandId = await resolveBrandId(args.brandId);
      args.brandIds = [brandId];
      delete args.brandId;

      if (args.ismonitor == null) args.ismonitor = 1;
      if (args.brandRelevance == null) args.brandRelevance = 0;
      if (args.ismonitor === 0) delete args.brandRelevance;

      if (!args.startTime) {
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - 30);
        args.startTime = start.toISOString().split('T')[0];
        args.endTime = end.toISOString().split('T')[0];
      }

      if (args.modelNames && args.modelNames.length > 0) {
        const modelListRes = await apiRequest('GET', '/v1/tenantInfo/modelList');
        const modelList = modelListRes?.data ?? [];
        const nameToIds = modelList.filter(m => args.modelNames.includes(m.name)).map(m => m.id);
        const existingIds = args.modelIds ?? [];
        args.modelIds = [...new Set([...existingIds, ...nameToIds])];
        delete args.modelNames;
      }

      const result = await apiRequest('GET', '/v1/ai/report/multiBrandReportTotalByDay', args, null);
      const dayList = result?.data ?? [];

      const enriched = dayList.map(day => {
        const brand = day.brandResultByDayVos?.[0] || {};
        const totalShowCount = day.totalShowCount || 0;
        return {
          date: day.day,
          品牌可见度: brand.refRate,
          品牌声量: totalShowCount > 0
            ? Math.round((brand.showCount / totalShowCount) * 10000) / 10000
            : 0,
          Top1可见度: brand.rankTop1Rate,
          Top3可见度: brand.rankTop3Rate,
          Top10可见度: brand.rankTop10Rate,
          展示次数: brand.showCount,
          引用次数: brand.refNum,
          排名: brand.rank,
        };
      });

      return {
        content: [{ type: 'text', text: JSON.stringify(enriched, null, 2) }],
      };
    },
  },
];

export default tools;

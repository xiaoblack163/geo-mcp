import { z } from 'zod';
import { apiRequest } from '../request.js';

let cachedBrandId = null;

async function resolveBrandId(providedBrandId) {
  if (providedBrandId != null) return providedBrandId;
  if (cachedBrandId != null) return cachedBrandId;

  const res = await apiRequest('GET', '/v1/brand/list');
  const brands = res?.data ?? [];
  if (brands.length === 0) {
    throw new Error('未找到任何品牌，请先创建品牌或手动传入 brandId');
  }
  cachedBrandId = brands[0].id;
  return cachedBrandId;
}

const tools = [
  {
    name: 'get_brand_visibility_report',
    description: '查询品牌在 AI 搜索引擎中的可见度数据。返回结果中第一条数据的 refRate 字段即为当前品牌可见度分值，同时包含排名、声量、引用率、展示率等 GEO 核心指标。支持按时间范围、问题分组名、AI 模型、标签等维度筛选。如果不传 brandId，自动取当前用户品牌列表的第一个品牌。',
    paramsSchema: {
      brandId: z.number().int().optional().describe('品牌 ID（可选，不传则自动取第一个品牌的 ID）'),
      startTime: z.string().optional().describe('开始时间，格式 yyyy-MM-dd，如 2026-05-01（可选）'),
      endTime: z.string().optional().describe('结束时间，格式 yyyy-MM-dd，如 2026-05-28（可选）'),
      brandRelevance: z.number().int().optional().describe('品牌关联度筛选：0=无品牌倾向，1=品牌倾向，2=品牌摇摆（可选，默认 0）'),
      groupNames: z.array(z.string()).optional().describe('问题分组名筛选，如 ["美容护肤","口腔护理"]（可选，来源：问题分组名列表）'),
      ismonitor: z.number().int().optional().describe('问题类型：0=历史问题，1=监控问题，2=全部（可选，默认 1）'),
      modelIds: z.array(z.number().int()).optional().describe('AI 模型 ID 筛选，如 [1,2,3]（可选）'),
      modelNames: z.array(z.string()).optional().describe('AI 模型名称筛选，如 ["豆包","ChatGPT"]（可选，自动转换为对应 ID）'),
      tagIds: z.array(z.number().int()).optional().describe('标签 ID 筛选（可选，来源：标签列表）'),
    },
    handler: async (args) => {
      // 自动解析 brandId
      args.brandId = await resolveBrandId(args.brandId);
      console.error(`[get_brand_visibility_report] brandId=${args.brandId}, time=${args.startTime || 'auto'} ~ ${args.endTime || 'auto'}`);

      // 设置默认值
      if (args.ismonitor == null) args.ismonitor = 1;
      if (args.brandRelevance == null) args.brandRelevance = 0;

      // ismonitor=0（历史问题）时，必须删除 brandRelevance
      if (args.ismonitor === 0) {
        delete args.brandRelevance;
        console.error('[get_brand_visibility_report] ismonitor=0，已删除 brandRelevance');
      }

      // 设置默认时间范围
      if (!args.startTime) {
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - 30);
        args.startTime = start.toISOString().split('T')[0];
        args.endTime = end.toISOString().split('T')[0];
      }

      // modelNames → modelIds 自动映射
      if (args.modelNames && args.modelNames.length > 0) {
        const modelListRes = await apiRequest('GET', '/v1/tenantInfo/modelList');
        const modelList = modelListRes?.data ?? [];

        const nameToIds = modelList
          .filter(m => args.modelNames.includes(m.name))
          .map(m => m.id);

        console.error(`[get_brand_visibility_report] modelNames → IDs: ${JSON.stringify(nameToIds)}`);
        const existingIds = args.modelIds ?? [];
        args.modelIds = [...new Set([...existingIds, ...nameToIds])];
        delete args.modelNames;
      }

      console.error(`[get_brand_visibility_report] 最终参数: ${JSON.stringify(args)}`);

      const result = await apiRequest('GET', '/v1/ai/dashboard/brandReportTotol', args, null);
      const items = result?.data ?? [];

      // 计算品牌声量（showCount / totalShowCount）
      const enriched = items.map(item => ({
        ...item,
        brandVolume: item.totalShowCount > 0
          ? Math.round((item.showCount / item.totalShowCount) * 10000) / 10000
          : 0,
      }));

      // 本期 vs 上期对比（第1条=本期，第2条=上期）
      const current = enriched[0] || {};
      const previous = enriched[1] || {};

      const brandVolume = current.totalShowCount > 0
        ? Math.round((current.showCount / current.totalShowCount) * 10000) / 10000
        : 0;
      const prevBrandVolume = previous.totalShowCount > 0
        ? Math.round((previous.showCount / previous.totalShowCount) * 10000) / 10000
        : 0;

      const pct = v => v != null ? (v * 100).toFixed(1) + '%' : '-';
      const diffPct = (a, b) => {
        if (a == null || b == null || b === 0) return null;
        return Math.round(((a - b) / b) * 10000) / 100;
      };
      const trend = (v) => {
        if (v == null) return '-';
        return (v > 0 ? '↑' : '↓') + Math.abs(v).toFixed(1) + '%';
      };

      const output = [
        `📊 品牌可见度报告`,
        `━━━━━━━━━━━━━━━━━━━━`,
        ``,
        `品牌可见度: ${pct(current.refRate)}  ${trend(diffPct(current.refRate, previous.refRate))}`,
        `品牌声量:   ${pct(brandVolume)}  ${trend(diffPct(brandVolume, prevBrandVolume))}`,
        `Top1可见度:  ${pct(current.rankTop1Rate)}  ${trend(diffPct(current.rankTop1Rate, previous.rankTop1Rate))}`,
        `Top3可见度:  ${pct(current.rankTop3Rate)}  ${trend(diffPct(current.rankTop3Rate, previous.rankTop3Rate))}`,
        ``,
      ].join('\n');

      return {
        content: [{ type: 'text', text: output }],
      };
    },
  },
];

export default tools;

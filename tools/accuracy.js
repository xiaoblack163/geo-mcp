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
    name: 'get_brand_accuracy_report',
    description: '查询品牌信息准确率，即 AI 输出的品牌相关信息中正确信息的占比。计算公式：准确率 = (总行数 - 错误行数) / 总行数。返回结果包含本期数据和上期对比。',
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
    },
    handler: async (args) => {
      args.brandId = await resolveBrandId(args.brandId);
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

      const result = await apiRequest('GET', '/v1/ai/dashboard/rightRateReportTotol', args, null);
      const items = result?.data ?? [];

      // 计算准确率并对比
      const current = items[0] || {};
      const previous = items[1] || {};

      const calcAccuracy = (item) => {
        if (!item || !item.totalLineCount || item.totalLineCount === 0) return 0;
        return Math.round((1 - (item.errorLineCount / item.totalLineCount)) * 10000) / 10000;
      };

      const acc = calcAccuracy(current);
      const prevAcc = calcAccuracy(previous);

      const diffPct = (a, b) => {
        if (a == null || b == null || b === 0) return null;
        return Math.round(((a - b) / b) * 10000) / 100;
      };
      const trend = (v) => {
        if (v == null) return '-';
        return (v > 0 ? '↑' : '↓') + Math.abs(v).toFixed(1) + '%';
      };

      const output = [
        `品牌准确度: ${(acc * 100).toFixed(1)}%  ${trend(diffPct(acc, prevAcc))}`,
      ].join('\n');

      return { content: [{ type: 'text', text: output }] };
    },
  },
];

export default tools;

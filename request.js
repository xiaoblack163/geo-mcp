import httpClient from './httpClient.js';
import config from './config.json' with { type: 'json' };
import { getToken, refreshToken } from './auth.js';

/**
 * 封装 HTTP 请求，自动注入 token，处理 401 自动重试
 *
 * @param {string} method  - HTTP 方法（GET / POST / PUT / DELETE）
 * @param {string} path    - API 路径，如 "/v1/ai/dashboard/brandReportTotol"
 * @param {object} params  - URL 查询参数（可选）
 * @param {object} body    - 请求体（可选）
 * @param {number} retries - 剩余重试次数（内部使用，外部调用无需传）
 */
export async function apiRequest(method, path, params = null, body = null, retries = 1) {
  const baseUrl = config.baseUrl.replace(/\/+$/, '');
  const url = `${baseUrl}${path}`;

  try {
    const token = await getToken();
    const headers = {
      token,
      origin: config.origin,
    };

    // 如果参数中有 arrays（如 groupNames, modelIds, tagIds），axios params 会自动序列化
    // 配置 paramsSerializer 确保数组被正确传递
    const res = await httpClient({
      method,
      url,
      params,
      data: body,
      headers,
      timeout: 30000,
      paramsSerializer: {
        indexes: null, // 用 groupNames[]=a&groupNames[]=b 格式（后端常用）
      },
    });

    // 统一响应解包，检查业务 code
    const responseData = res.data;

    // 后端统一用 {code, data, message} 包裹，code=0 表示成功
    if (responseData && typeof responseData === 'object' && 'code' in responseData && responseData.code !== 0) {
      throw new Error(`API错误: ${responseData.message || '未知错误'}`, {
        cause: { status: res.status, code: responseData.code, data: responseData.data },
      });
    }

    return responseData;
  } catch (err) {
    // 401 且还有重试次数 -> 自动重新登录重试
    if (err.response?.status === 401 && retries > 0) {
      await refreshToken();
      return apiRequest(method, path, params, body, retries - 1);
    }

    // 结构化错误抛出
    const status = err.response?.status ?? 0;
    const data = err.response?.data ?? null;
    const message = err.response?.data?.message || err.message;
    throw new Error(`[${status}] ${message}`, { cause: { status, data } });
  }
}

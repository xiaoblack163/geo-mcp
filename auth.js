import httpClient from './httpClient.js';
import { createHash } from 'node:crypto';
import config from './config.json' with { type: 'json' };

let cachedToken = null;

/**
 * 登录接口调用，获取 token
 */
async function login() {
  const url = `${config.baseUrl.replace(/\/+$/, '')}/v1/user/login`;
  try {
    const res = await httpClient.post(url, {
      userName: config.credentials.userName,
      passWord: createHash('md5').update(config.credentials.passWord).digest('hex'),
      tenantId: config.credentials.tenantId,
      mobileNum: config.credentials.mobileNum,
    }, {
      headers: { origin: config.origin },
      timeout: 10000,
    });
    const token = res?.data?.data?.token;
    if (!token) {
      throw new Error(`登录失败：响应中未找到 token 字段。响应体: ${JSON.stringify(res.data)}`);
    }
    cachedToken = token;
    return cachedToken;
  } catch (err) {
    if (err.response) {
      throw new Error(
        `登录失败 (${err.response.status}): ${JSON.stringify(err.response.data)}`
      );
    }
    throw new Error(`登录请求异常: ${err.message}`);
  }
}

/**
 * 获取 token：有缓存直接返回，无缓存则登录获取
 */
export async function getToken() {
  if (cachedToken) return cachedToken;
  return await login();
}

/**
 * 强制重新登录，刷新 token 缓存
 */
export async function refreshToken() {
  cachedToken = null;
  return await login();
}

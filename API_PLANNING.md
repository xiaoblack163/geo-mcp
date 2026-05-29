# API 接口梳理与 MCP 工具规划

> **数据来源**: `openapi.json`（唯一事实来源，6 个接口）  
> **生成时间**: 2026-05-28  
> **项目**: "MC服务 API" — AI 品牌可见度（GEO）分析平台

---

## 一、认证信息总结

### 1.1 登录接口

| 属性 | 值 |
|------|-----|
| **Method + Path** | `POST /v1/user/login` |
| **operationId** | `loginUsingPOST` |
| **Tag** | `用户信息管理` |
| **请求体 Content-Type** | `application/json` |
| **请求体 Schema** | `UserInfoVO` |

### 1.2 请求体结构（UserInfoVO）

```json
{
  "userName": "zyr",       // 账户名（required）
  "passWord": "123456",    // 密码（required）
  "mobileNum": "",         // 手机号（required，待确认是否可留空）
  "tenantId": 0,           // 租户ID（required，需确认具体值）
  "level": 0,              // 账号等级（可选：0账号管家/1主账号/2子账号）
  "id": 0,                 // id（可选）
  "qywxUserId": "",        // 企业微信userId（可选）
  "remark": "",            // 备注（可选）
  "ctime": "",             // 创建时间（可选，格式 date-time）
  "mtime": ""              // 修改时间（可选，格式 date-time）
}
```

**实际登录需传字段**（基于 `required` 标记）:

| 字段 | 类型 | 必填 | 值 |
|------|------|------|-----|
| `userName` | string | ✅ | `"zyr"` |
| `passWord` | string | ✅ | `"123456"` |
| `mobileNum` | string | ✅ | ⚠️ 待确认 |
| `tenantId` | int32 | ✅ | ⚠️ 待确认（建议先试 `0`） |

### 1.3 Token 返回路径

```
响应结构: SingleResult<RedisSession>
         └─ data: RedisSession
                   └─ token: string   ← 目标字段
```

**Token 提取路径**: `response.data.data.token`  
（`SingleResult.data` → `RedisSession.token`，字段名明确，**已确认**）

### 1.4 RedisSession 完整结构

| 字段 | 类型 | 说明 |
|------|------|------|
| `token` | string | **认证令牌** |
| `url` | string | 前端跳转地址 |
| `subSystemVos` | SubSystemVo[] | 子系统列表（含菜单） |
| `attributes` | object | 扩展属性 |

### 1.5 后续请求 Header 要求

所有已认证接口需在 HTTP Header 中携带：

```
token: <login返回的token值>
origin: http://192.168.5.94:9077    ← 额外必需（防止 CORS 拦截）
```

---

## 二、接口分组清单

> **Tool 建议原则**：
> - ✅ **做 tool**：面向业务动作/查询分析，有明确业务语义
> - ❌ **不做 tool**：返回枚举/字典/下拉选项，供内部使用
> - ⏭️ **跳过**：登录认证（内部处理）、健康检查、上传下载

### 2.1 dashboard（1 个接口）

| Method | Path | operationId | 简述 | 做 Tool? | 原因 |
|--------|------|-------------|------|----------|------|
| GET | `/v1/ai/dashboard/brandReportTotol` | `brandReportTotolUsingGET` | 品牌可见度汇总（品牌声量和可见度汇总） | ✅ **是（MVP）** | 核心业务查询接口，按时间范围查询品牌在 AI 搜索中的排名、声量、引用率等 GEO 指标 |

### 2.2 用户问题管理（1 个接口）

| Method | Path | operationId | 简述 | 做 Tool? | 原因 |
|--------|------|-------------|------|----------|------|
| POST | `/v1/custQuestion/listGroupName` | `listGroupNameUsingPOST` | 问题分组名列表 | ❌ 否 | 枚举/字典类接口，返回 `Id2Name[]` ID-名称映射，供 brandReportTotol 的 `groupNames` 参数使用 |

### 2.3 用户标签管理（1 个接口）

| Method | Path | operationId | 简述 | 做 Tool? | 原因 |
|--------|------|-------------|------|----------|------|
| GET | `/v1/custTag/list` | `listUsingGET_5` | 标签列表（分页） | ❌ 否 | 枚举/字典类接口，分页返回 `CustTag[]`，供 brandReportTotol 的 `tagIds` 参数使用 |

### 2.4 租户信息管理（1 个接口）

| Method | Path | operationId | 简述 | 做 Tool? | 原因 |
|--------|------|-------------|------|----------|------|
| GET | `/v1/tenantInfo/modelList` | `modelListUsingGET` | 获取租户模型列表 | ❌ 否 | 枚举/字典类接口，返回 `CustAIModelVo[]`，供 brandReportTotol 的 `modelIds` 参数使用 |

### 2.5 用户信息管理（2 个接口）

| Method | Path | operationId | 简述 | 做 Tool? | 原因 |
|--------|------|-------------|------|----------|------|
| POST | `/v1/user/login` | `loginUsingPOST` | 用户登陆 | ⏭️ 跳过 | 登录接口，由 MCP Server 认证模块内部管理，不暴露为 tool |
| GET | `/v1/user/info` | `infoUsingGET` | 用户信息 | ❌ 否 | 返回当前用户 RedisSession，辅助类接口，暂不暴露 |

---

## 三、枚举/字典类接口汇总

共 3 个接口属于枚举/字典类，返回结构化列表数据，供其他 tool 参数填充使用。

### 3.1 问题分组名列表

| 属性 | 值 |
|------|-----|
| **Path** | `POST /v1/custQuestion/listGroupName` |
| **请求体** | `GroupNameDto`：`{ismonitor(int), searchKey(string), tenantIds(string[]), tenantStatus(int)}` |
| **返回结构** | `SingleResult<List<Id2Name>>`：`{code, data: [{id, name, num, pid}], message}` |
| **用途** | 提供 `brandReportTotol` 接口的 `groupNames` 可选参数值 |

**Id2Name 结构**:
| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | int64 | 分组 ID |
| `name` | string | 分组名称 |
| `num` | int32 | 关联问题数量 |
| `pid` | int64 | 父分组 ID |

### 3.2 标签列表

| 属性 | 值 |
|------|-----|
| **Path** | `GET /v1/custTag/list` |
| **参数** | `id(int64)`, `isDimensionTag(bool)`, `page(int64, default=1)`, `pageSize(int64, default=10)`, `searchKey(string)`, `type(int32, default=2)` |
| **返回结构** | `PageInfo<CustTag>`：`{code, data: CustTag[], message, page, pageSize, total, totalPage}` |
| **用途** | 提供 `brandReportTotol` 接口的 `tagIds` 可选参数值 |

**CustTag 关键字段**:
| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | int64 | 标签 ID |
| `name` | string | 标签名（前端展示） |
| `aiName` | string | AI 时标签名 |
| `type` | int32 | 标签类型：**1=问题标签，2=答案标签** ✅ 可推断 |
| `dimension` | string | 维度 |
| `label` | string | 标签的具体类别 |
| `level` | int32 | 层级 |
| `pid` | int64 | 父 ID |
| `study` | string | 研究对象 |
| `status` | int32 | 状态：**1=正常，0=删除** ✅ 可推断 |
| `sort` | number | 排序 |

### 3.3 租户模型列表

| 属性 | 值 |
|------|-----|
| **Path** | `GET /v1/tenantInfo/modelList` |
| **参数** | 无（仅需 header 认证） |
| **返回结构** | `SingleResult<List<CustAIModelVo>>`：`{code, data: CustAIModelVo[], message}` |
| **用途** | 提供 `brandReportTotol` 接口的 `modelIds` 可选参数值 |

**CustAIModelVo 字段**:
| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | int32 | 模型 ID |
| `name` | string | 模型名称 |
| `logo` | string | 图标 |
| `isOpen` | int32 | 是否开通：**1=是，0=否** ✅ 可推断 |
| `errorLineCount` | int32 | 错误行数 |
| `remark` | string | 描述 |

> ⚠️ **无法推断的枚举**: `CustTag.dimension` 和 `CustTag.label` 的具体可选值无法从 Schema 推断，需实际调用接口获取。

---

## 四、跳过接口列表

| 接口 | 跳过原因 |
|------|----------|
| `POST /v1/user/login` | 登录认证接口，由 MCP Server 启动时的 `auth.js` 模块内部调用，token 缓存于内存，不暴露为 tool |

> 本项目接口数量少、无上传下载/健康检查类接口，其余 5 个接口均已在上述分组中给出明确分类。

---

## 五、MVP Tool 定义

### 唯一 Tool：`get_brand_visibility_report`

| 属性 | 值 |
|------|-----|
| **Tool 名称** | `get_brand_visibility_report` |
| **对应接口** | `GET /v1/ai/dashboard/brandReportTotol` |
| **操作** | `brandReportTotolUsingGET` |
| **功能描述** | 查询品牌在 AI 搜索引擎中的可见度数据，包括排名、声量、引用率、展示率等 GEO 核心指标 |

#### 输入参数（Zod Schema）

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `brandId` | `z.number().int()` | ✅ 是 | 品牌 ID |
| `startTime` | `z.string()` | ✅ 是 | 开始时间（格式待确认，建议 `yyyy-MM-dd`） |
| `endTime` | `z.string()` | ✅ 是 | 结束时间（格式待确认） |
| `brandRelevance` | `z.number().int().optional()` | 否 | 品牌关联度筛选 |
| `groupNames` | `z.array(z.string()).optional()` | 否 | 问题分组名筛选（来源：问题分组名列表） |
| `ismonitor` | `z.number().int().optional()` | 否 | 是否仅监测数据 |
| `modelIds` | `z.array(z.number().int()).optional()` | 否 | AI 模型 ID 筛选（来源：租户模型列表） |
| `tagIds` | `z.array(z.number().int()).optional()` | 否 | 标签 ID 筛选（来源：标签列表） |

#### 返回数据结构（QABrandResultByDayVo[]）

品牌分日声量数据，单条记录包含 30+ 字段，核心指标如下：

**排名类**：
| 字段 | 类型 | 说明 |
|------|------|------|
| `rank` | int32 | 当前排名 |
| `avgRank` | int32 | 平均排名 |
| `maxRank` | int32 | 最高排名 |
| `rankTop1` | int32 | 排名第 1 次数 |
| `rankTop3` | int32 | 排名前 3 次数 |
| `rankTop10` | int32 | 排名前 10 次数 |
| `rankCount` | int32 | 上榜次数 |
| `rankRate` | float | 上榜率 |
| `rankTop1Rate` | float | 排名第 1 率 |
| `rankTop3Rate` | float | 排名前 3 率 |
| `rankTop10Rate` | float | 排名前 10 率 |

**声量/展示类**：
| 字段 | 类型 | 说明 |
|------|------|------|
| `showCount` | int32 | 展示次数 |
| `showRate` | float | 展示率 |
| `showTGIRate` | float | TGI 展示率 |
| `totalShowCount` | int32 | 总展示次数 |
| `avgShowCount` | int32 | 平均展示次数 |
| `askCount` | int32 | 提问次数 |

**引用类**：
| 字段 | 类型 | 说明 |
|------|------|------|
| `refNum` | int32 | 引用数量 |
| `refRate` | float | 引用率 |
| `zmRate` | float | 正面率 |
| `zmRefRate` | float | 正面引用率 |

**其他**：
| 字段 | 类型 | 说明 |
|------|------|------|
| `brandId` | int64 | 品牌 ID |
| `brandName` | string | 品牌名称 |
| `brandLogo` | string | 品牌 Logo |
| `brandType` | int32 | 品牌类型 |
| `brandUrl` | string | 品牌 URL |
| `productId` | int64 | 产品 ID |
| `productName` | string | 产品名称 |
| `questionId` | int64 | 问题 ID |
| `content` | string | 问题内容 |
| `cdate` / `day` | string | 日期 |
| `aiModelId` | int32 | AI 模型 ID |
| `custAIModelVo` | object | 关联 AI 模型信息 |
| `questionCount` | int32 | 问题数量 |
| `dimensionCount` | int32 | 维度数量 |
| `feelCount` | int32 | 情感数量 |

#### 业务场景覆盖

1. **品牌可见度查询**：输入品牌 ID + 时间范围，获取品牌在各 AI 平台的排名和展示数据
2. **竞品对比分析**：切换 brandId 查询不同品牌数据，对比排名、引用率、正面率
3. **趋势分析**：调整 startTime/endTime 获取不同周期数据，观察声量变化趋势
4. **细分维度分析**：通过 groupNames、modelIds、tagIds 等可选参数，筛选特定问题分组、AI 模型或标签下的数据

---

## 六、MCP Server 架构建议

### 6.1 模块划分

```
geo-mcp/
├── index.js          # MCP Server 入口，注册 tools
├── auth.js           # 认证模块（登录、token 缓存、401 自动重试）
├── client.js         # HTTP 客户端（axios 封装，注入 header）
├── tools/
│   └── brandVisibility.js   # 品牌可见度 tool
├── config.json       # 环境配置（baseUrl、credentials、origin）
├── openapi.json      # API 定义
└── API_PLANNING.md   # 本文档
```

### 6.2 认证流程伪代码

```js
// auth.js
let cachedToken = null;

async function login() {
  const res = await axios.post(`${baseUrl}/v1/user/login`, {
    userName: config.userName,
    passWord: config.passWord,
    tenantId: config.tenantId,
    mobileNum: config.mobileNum,
  }, {
    headers: { origin: config.origin }
  });
  cachedToken = res.data.data.token;
  return cachedToken;
}

async function getToken() {
  if (!cachedToken) return await login();
  return cachedToken;
}

async function requestWithRetry(config) {
  try {
    const token = await getToken();
    config.headers = {
      ...config.headers,
      token,
      origin: config.origin,
    };
    return await axios(config);
  } catch (err) {
    if (err.response?.status === 401) {
      cachedToken = null;
      const token = await login();
      config.headers.token = token;
      return await axios(config); // 重试一次
    }
    throw err;
  }
}
```

### 6.3 Tool 注册伪代码

```js
// tools/brandVisibility.js
import { z } from 'zod';

export const brandVisibilitySchema = {
  name: 'get_brand_visibility_report',
  description: '查询品牌在 AI 搜索引擎中的可见度数据...',
  inputSchema: {
    brandId: z.number().int().describe('品牌 ID'),
    startTime: z.string().describe('开始时间'),
    endTime: z.string().describe('结束时间'),
    brandRelevance: z.number().int().optional().describe('品牌关联度筛选'),
    groupNames: z.array(z.string()).optional().describe('问题分组名筛选'),
    ismonitor: z.number().int().optional().describe('是否仅监测数据'),
    modelIds: z.array(z.number().int()).optional().describe('AI 模型 ID 筛选'),
    tagIds: z.array(z.number().int()).optional().describe('标签 ID 筛选'),
  },
};

export async function handler(params) {
  const res = await requestWithRetry({
    method: 'GET',
    url: `${baseUrl}/v1/ai/dashboard/brandReportTotol`,
    params,
  });
  return res.data;
}
```

---

## 七、待确认项

| # | 项目 | 状态 | 说明 |
|---|------|------|------|
| 1 | `tenantId` 具体值 | ⚠️ 待确认 | UserInfoVO 标记为 required，用户未提供，建议先以 `0` 测试 |
| 2 | `mobileNum` 是否必填 | ⚠️ 待确认 | Schema 标记 required，但 login 接口可能接受空字符串，需实测 |
| 3 | `startTime` / `endTime` 格式 | ⚠️ 待确认 | Schema 类型为 `string`，未标注 format，推测 `yyyy-MM-dd` 或 `yyyy-MM-dd HH:mm:ss` |
| 4 | login 的 `requestBody.required` | ⚠️ 已识别 | openapi 中 login 接口的 `requestBody` 未标记 `required: true`（但显然需要），不影响实现 |
| 5 | `baseUrl` 尾部斜杠 | ✅ 已确认 | `http://192.168.5.153:85/ma/`，拼接时注意不要重复 |
| 6 | `origin` header | ✅ 已确认 | `http://192.168.5.94:9077` |

---

## 八、总结

| 维度 | 数据 |
|------|------|
| 总接口数 | 6 |
| MVP Tool 数 | **1**（品牌可见度汇总） |
| 枚举/字典接口 | 3（分组名列表、标签列表、模型列表） |
| 跳过接口 | 1（登录） |
| 暂不暴露 | 1（用户信息） |
| baseUrl | `http://192.168.5.153:85/ma/` |
| 认证方式 | Header `token`，内存缓存 + 401 自动重试 |
| 额外 Header | `origin: http://192.168.5.94:9077` |

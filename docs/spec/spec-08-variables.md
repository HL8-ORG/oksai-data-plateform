# 变量命名规范

[返回目录](./spec.md) | [上一章：测试文件](./spec-07-testing.md)

---

## 一、领域对象变量

```typescript
// ✅ 正确
const job = Job.create(...);
const money = new Money(100, 'CNY');
const jobId = new JobId('123');
const customer = await customerRepository.findById('123');

// ❌ 错误
const j = Job.create(...);              // 单字母变量
const jb = Job.create(...);             // 无意义缩写
const jobAggregate = Job.create(...);   // 冗余
```

---

## 二、集合变量

```typescript
// ✅ 正确
const jobs: Job[] = [];
const jobMap: Map<string, Job> = new Map();
const jobSet: Set<Job> = new Set();
const customerList: Customer[] = [];      // List 后缀表示有序集合

// ❌ 错误
const jobArray: Job[] = [];               // 冗余，类型已表达
const jobsCollection: Job[] = [];         // 冗余
const jobObj: Record<string, Job> = {};   // 可用 Map 替代
```

### 2.1 集合变量后缀选择

| 类型 | 推荐后缀 | 示例 |
|:---|:---|:---|
| `Array` | 复数形式 | `jobs`, `customers` |
| `Array`（强调顺序） | `List` | `jobList`, `sortedList` |
| `Map` | `Map` | `jobMap`, `customerByIdMap` |
| `Set` | `Set` | `uniqueIdsSet`, `tagSet` |
| `Record/Object` | `ById` 或 `Map` | `jobsById`, `configMap` |

---

## 三、布尔变量

```typescript
// ✅ 正确 - 使用 is/has/can/should 前缀
const isValid: boolean = true;
const hasItems: boolean = false;
const canSubmit: boolean = true;
const isSubmitted: boolean = false;
const shouldNotify: boolean = true;
const isEnabled: boolean = true;
const exists: boolean = false;
const isEmpty: boolean = true;

// ❌ 错误
const valid: boolean = true;       // 缺少前缀
const submit: boolean = false;     // 语义不清
const flag: boolean = true;        // 语义不清
const status: boolean = false;     // 与状态混淆
```

### 3.1 布尔变量前缀选择

| 前缀 | 用途 | 示例 |
|:---|:---|:---|
| `is` | 状态判断 | `isActive`, `isPublished`, `isDeleted` |
| `has` | 拥有判断 | `hasPermission`, `hasItems`, `hasChildren` |
| `can` | 能力判断 | `canEdit`, `canDelete`, `canPublish` |
| `should` | 行为判断 | `shouldNotify`, `shouldRetry`, `shouldExpire` |
| `was` | 过去状态 | `wasProcessed`, `wasSuccessful` |
| `will` | 未来状态 | `willExpire`, `willBeDeleted` |
| `supports` | 功能支持 | `supportsBatch`, `supportsAsync` |

---

## 四、数字变量

```typescript
// ✅ 正确 - 带单位或含义的后缀
const maxCount: number = 100;
const totalCount: number = 50;
const retryCount: number = 3;
const timeoutMs: number = 5000;
const priceInCents: number = 9999;
const pageSize: number = 20;
const pageIndex: number = 1;
const discountPercent: number = 10;

// ❌ 错误
const num: number = 100;           // 语义不清
const count: number = 50;          // 缺少上下文
const timeout: number = 5000;      // 缺少单位
const price: number = 99.99;       // 浮点数精度问题
```

### 4.1 数字变量后缀选择

| 后缀 | 用途 | 示例 |
|:---|:---|:---|
| `Count` | 计数 | `totalCount`, `errorCount`, `itemCount` |
| `Index` | 索引 | `pageIndex`, `currentIndex` |
| `Size` | 大小 | `pageSize`, `fileSize`, `bufferSize` |
| `Ms` / `Seconds` | 时间 | `timeoutMs`, `durationSeconds` |
| `Percent` | 百分比 | `discountPercent`, `taxPercent` |
| `InCents` | 金额（避免浮点） | `priceInCents`, `totalInCents` |

---

## 五、字符串变量

```typescript
// ✅ 正确 - 带含义的变量名
const customerName: string = '张三';
const emailAddress: string = 'zhang@example.com';
const filePath: string = '/path/to/file';
const errorMessage: string = '出错了';
const htmlContent: string = '<div>...</div>';
const jsonPayload: string = '{"key": "value"}';

// ❌ 错误
const name: string = '张三';       // 缺少上下文
const str: string = 'hello';       // 语义不清
const text: string = '...';        // 语义不清
const value: string = '...';       // 语义不清
```

---

## 六、函数参数

```typescript
// ✅ 正确 - 参数名应表达其用途
function createJob(command: CreateJobCommand): void { }
function findJobById(jobId: string): Job | null { }
function updateTenant(tenantId: string, data: UpdateTenantData): void { }
function calculateTotal(items: JobItem[]): Money { }

// ✅ 正确 - 可选参数
function sendEmail(to: string, subject: string, body?: string): void { }

// ✅ 正确 - 使用解构
function createCustomer({ name, email, phone }: CreateCustomerProps): Customer { }
```

---

## 七、回调与事件处理变量

```typescript
// ✅ 正确 - 事件处理器参数
job.on('created', (event: JobCreatedEvent) => { });
job.on('updated', (event: JobUpdatedEvent) => { });

// ✅ 正确 - 回调参数
array.map((item: JobItem) => item.total);
array.filter((item: JobItem) => item.isActive);
array.find((item: JobItem) => item.id === targetId);
array.reduce((sum: number, item: JobItem) => sum + item.total, 0);

// ✅ 正确 - 索引参数
array.forEach((item: JobItem, index: number) => {
  console.log(`${index}: ${item.id}`);
});

// ✅ 正确 - 使用下划线忽略参数
array.map((item: JobItem, _index: number) => item.id);  // 忽略 index
array.filter((_item: JobItem, index: number) => index % 2 === 0);  // 忽略 item
```

---

## 八、私有成员变量

```typescript
// ✅ 正确 - 使用 _ 前缀（本项目推荐）
export class Job {
  private _id: string;
  private _status: JobStatus;
  private _items: JobItem[];

  get id(): string {
    return this._id;
  }
}

// ✅ 正确 - 使用 # 私有字段（ES2022）
export class Job {
  #id: string;
  #status: JobStatus;
  #items: JobItem[];

  get id(): string {
    return this.#id;
  }
}

// ❌ 错误 - 使用 m_ 或其他前缀
export class Job {
  private m_id: string;     // 不推荐
  private status_: string;  // 不推荐
}
```

> **建议**：团队应统一选择 `_` 前缀或 `#` 私有字段，本项目推荐使用 `_` 前缀。

---

## 九、常量与配置变量

```typescript
// ✅ 正确 - 文件级常量使用 UPPER_SNAKE_CASE
const MAX_RETRY_COUNT = 3;
const DEFAULT_TIMEOUT_MS = 5000;
const API_BASE_URL = 'https://api.example.com';

// ✅ 正确 - 函数内常量使用 camelCase
function calculateDiscount(price: number): number {
  const discountRate = 0.1;
  const minDiscount = 100;
  return Math.max(price * discountRate, minDiscount);
}

// ✅ 正确 - 配置对象
const databaseConfig = {
  host: 'localhost',
  port: 5432,
  database: 'mydb'
};
```

---

## 十、临时变量

```typescript
// ✅ 正确 - 循环中使用有意义的变量名
for (const item of items) { }
for (const job of jobs) { }
for (const [key, value] of map) { }

// ✅ 正确 - 简单循环可使用 i, j, k
for (let i = 0; i < items.length; i++) {
  for (let j = 0; j < items[i].length; j++) {
    // ...
  }
}

// ✅ 正确 - 临时变量
const temp = transform(input);
const result = process(temp);

// ❌ 错误 - 无意义的变量名
const x = getData();
const y = process(x);
const z = transform(y);
```

---

## 十一、多租户相关变量

```typescript
// ✅ 正确 - 租户标识变量
const tenantId: string;
const currentTenant: Tenant;
const tenantContext: ITenantContext;

// 中间件注入
req.tenantId;
req.tenantContext;

// 仓储方法
jobRepository.findByTenantAndId(tenantId, jobId);

// 查询参数
interface ListJobsQuery {
  tenantId: string;  // 必须包含租户 ID
  page?: number;
  pageSize?: number;
}
```

---

## 十二、事件溯源相关变量

```typescript
// ✅ 正确 - 事件流标识
const streamId: string = 'job-123';
const aggregateId: string = 'job-123';
const expectedVersion: number = 5;
const currentVersion: number = 5;

// 事件存储方法
eventStore.appendToStream(streamId, events, expectedVersion);
eventStore.loadEvents(streamId, fromVersion);

// 快照相关
const snapshotVersion: number = 100;
const snapshotState: JobState = { ... };
```

---

## 十三、CQRS 相关变量

```typescript
// ✅ 正确 - 命令侧
const command = new CreateJobCommand({ ... });
const commandResult = await commandBus.execute(command);

// ✅ 正确 - 查询侧
const query = new GetJobQuery({ id: '123' });
const queryResult = await queryBus.execute(query);

// ✅ 正确 - 区分写模型和读模型
const job: Job = await jobRepository.findById(id);           // 写模型
const jobDto: JobDto = await jobReadRepository.findById(id); // 读模型
const jobRecord: JobRecord = await clickhouseJobRepo.findById(id); // 投影
```

---

## 十四、异步相关变量

```typescript
// ✅ 正确 - Promise 变量
const jobPromise: Promise<Job> = repository.findById(id);
const pendingJobs: Promise<Job>[] = ids.map(id => repository.findById(id));

// ✅ 正确 - Observable 变量（如果使用 RxJS）
const job$: Observable<Job> = jobService.getJob(id);
const jobs$: Observable<Job[]> = jobService.listJobs();

// ✅ 正确 - 回调函数
const onSuccess: (result: Job) => void = (result) => { };
const onError: (error: Error) => void = (error) => { };
```

---

## 十五、命名空间与模块变量

```typescript
// ✅ 正确 - 导入别名
import { Job as JobAggregate } from './job.aggregate';
import { IJobRepository } from './job.repository';
import * as JobEvents from './events';

// 使用
const event = new JobEvents.JobCreatedEvent({ ... });

// ✅ 正确 - 模块常量
export const JOB_CONSTANTS = {
  MAX_ITEMS: 100,
  MIN_ITEMS: 1,
  TIMEOUT_MINUTES: 30
} as const;
```

---

[下一章：多租户/事件溯源/CQRS 规范 →](./spec-09-advanced.md)

# Novu Worker 服务与消息队列架构研究报告

## 一、Worker 服务架构

### 1.1 项目结构概览

```
apps/worker/src/
├── app.module.ts           # 主模块，整合所有子模块
├── bootstrap.ts            # 应用启动引导
├── main.ts                 # 入口文件
├── config/
│   ├── env.config.ts       # 环境变量配置
│   └── worker-init.config.ts # Worker 初始化配置
└── app/
    ├── workflow/           # 工作流处理模块
    │   ├── services/       # Worker 服务
    │   │   ├── workflow.worker.ts
    │   │   ├── standard.worker.ts
    │   │   └── subscriber-process.worker.ts
    │   └── usecases/       # 业务用例
    └── health/             # 健康检查
```

### 1.2 Worker 模块组织

Novu 定义了 **6 种核心队列类型**：

```typescript
export enum JobTopicNameEnum {
  ACTIVE_JOBS_METRIC = 'metric-active-jobs',
  INBOUND_PARSE_MAIL = 'inbound-parse-mail',
  STANDARD = 'standard',
  WEB_SOCKETS = 'ws_socket_queue',
  WORKFLOW = 'trigger-handler',
  PROCESS_SUBSCRIBER = 'process-subscriber',
}
```

---

## 二、消息队列 (BullMQ)

### 2.1 队列定义与配置

```typescript
export class QueueBaseService {
  public readonly DEFAULT_ATTEMPTS = 3;
  public queue: Queue;

  private getQueueOptions(): QueueOptions {
    return {
      defaultJobOptions: {
        removeOnComplete: true,  // 完成后自动删除
      },
    };
  }
}
```

### 2.2 Job 数据结构

```typescript
interface IStandardJobDto {
  name: string;                    // Job 名称
  data: IStandardDataDto;          // Job 数据
  groupId?: string;                // 分组 ID（BullMQ Pro）
  options?: JobsOptions;           // Job 选项
}

interface IStandardDataDto {
  _id: string;                     // Job ID
  _environmentId: string;          // 环境ID
  _organizationId: string;         // 组织ID
  _userId: string;                 // 用户ID
  skipProcessing?: boolean;        // 跳过处理标志
}
```

### 2.3 重试与错误处理

```typescript
private async jobHasFailed(job: Job, error: Error): Promise<void> {
  const hasToBackoff = this.runJob.shouldBackoff(error);
  const hasReachedMaxAttempts = job.attemptsMade >= this.DEFAULT_ATTEMPTS;
  
  if (!hasToBackoff || shouldHandleLastFailedJob) {
    await this.setJobAsFailed.execute(
      SetJobAsFailedCommand.create({ ...minimalData, isLastJobFailed: isLastJobInWorkflow }),
      error
    );
  }
}
```

---

## 三、事件驱动架构

### 3.1 架构概览

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          Novu 事件驱动架构                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│   ┌──────────────┐     ┌──────────────┐     ┌──────────────────────────┐  │
│   │   Trigger    │────▶│   Workflow   │────▶│   Standard Queue         │  │
│   │   Event      │     │   Queue      │     │   (Job Processing)       │  │
│   └──────────────┘     └──────────────┘     └──────────────────────────┘  │
│         │                    │                          │                   │
│         ▼                    ▼                          ▼                   │
│   ┌──────────────┐     ┌──────────────┐     ┌──────────────────────────┐  │
│   │  Process     │     │   Add Job    │     │   Run Job                │  │
│   │  Subscriber  │     │   (Delay/    │     │   (Send Message)         │  │
│   │              │     │   Digest)    │     │                          │  │
│   └──────────────┘     └──────────────┘     └──────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Redis 限流实现

```typescript
// Lua 脚本实现原子性限流操作
private readonly reserveScript = `
  local setKey = KEYS[1]
  local limit = tonumber(ARGV[1])
  local ttlSec = tonumber(ARGV[2])
  local jobId = ARGV[3]

  local count = redis.call('SCARD', setKey)
  if count >= limit then
    return {0, count, ttl}  -- 拒绝
  end

  redis.call('SADD', setKey, jobId)
  count = count + 1
  if count == 1 then
    redis.call('EXPIRE', setKey, ttlSec)
  end

  return {1, count, ttl}  -- 授权
`;
```

---

## 四、WebSocket 服务

### 4.1 服务结构

```
apps/ws/src/
├── socket/
│   ├── ws.gateway.ts       # WebSocket 网关
│   └── services/
│       └── web-socket.worker.ts  # WebSocket Worker
└── shared/
    └── subscriber-online/  # 在线状态管理
```

### 4.2 实时推送机制

```typescript
@WebSocketGateway()
export class WSGateway implements OnGatewayConnection, OnGatewayDisconnect {
  async sendMessage(userId: string, event: string, data: any, contextKeys: string[]) {
    const sockets = await this.server.in(userId).fetchSockets();

    for (const socket of sockets) {
      const inboxContextKeys = socket.data.contextKeys;
      
      // 精确匹配上下文
      if (this.isExactMatch(contextKeys, inboxContextKeys)) {
        socket.emit(event, data);
      }
    }
  }
}
```

---

## 五、关键设计总结

| 特性 | 实现 |
|:---|:---|
| **多队列策略** | 6 种专用队列类型 |
| **BullMQ Pro** | 分组、指标收集 |
| **Redis 集群** | Hash Tag 支持 |
| **重试机制** | 自定义退避，最多 3 次 |
| **限流保护** | Lua 脚本原子性 |
| **实时推送** | WebSocket + 上下文匹配 |
| **优雅关闭** | 冷启动机制 |

---

*报告生成时间：2026-02-22*

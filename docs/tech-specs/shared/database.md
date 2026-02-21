# Database 模块技术规范

> 版本：1.0.0  
> 更新日期：2026-02-21

---

## 一、概述

### 1.1 模块定位

`@oksai/database` 提供数据库访问的基础设施，包括：

- **连接池管理**：统一管理数据库连接
- **事务管理**：支持事务的开始、提交、回滚
- **仓储基类**：提供通用的 CRUD 接口

### 1.2 设计说明

> **注意**：当前实现为同步版本，用于测试和演示目的。生产环境应集成真实数据库驱动（如 pg, MikroORM, TypeORM）。

---

## 二、架构设计

### 2.1 模块结构

```
@oksai/database/
├── lib/
│   ├── database-config.vo.ts       # 数据库配置值对象
│   ├── connection-pool.ts          # 连接池
│   ├── transaction-manager.ts      # 事务管理器
│   └── repository-base.ts          # 仓储基类
├── spec/
│   └── database.spec.ts
└── index.ts
```

### 2.2 核心组件

```
┌─────────────────────────────────────────────────────────────┐
│                      Application Layer                       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    RepositoryBase<T>                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ findById()  │  │ save()      │  │ delete/findAll/count│  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   TransactionManager                         │
│  ┌─────────────────┐  ┌─────────────────────────────────┐  │
│  │ beginTransaction│  │ Transaction                      │  │
│  │                 │  │ (commit/rollback/isActive)       │  │
│  └─────────────────┘  └─────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     ConnectionPool                           │
│  ┌─────────────────┐  ┌─────────────────────────────────┐  │
│  │ connect()       │  │ acquire/release                  │  │
│  │ disconnect()    │  │ isConnected()                    │  │
│  └─────────────────┘  └─────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     DatabaseConfig                           │
│            (host, port, database, username, etc.)           │
└─────────────────────────────────────────────────────────────┘
```

---

## 三、配置选项

### 3.1 DatabaseConfig

```typescript
interface DatabaseConfigOptions {
  host: string;
  port?: number;           // 默认 5432
  database: string;
  username: string;
  password: string;
  maxConnections?: number; // 默认 20
}

class DatabaseConfig {
  readonly host: string;
  readonly port: number;
  readonly database: string;
  readonly username: string;
  readonly password: string;
  readonly maxConnections: number;

  static create(options: DatabaseConfigOptions): DatabaseConfig;
  toConnectionString(): string;
}
```

### 3.2 连接字符串格式

```
postgresql://{username}:{password}@{host}:{port}/{database}
```

---

## 四、使用方式

### 4.1 创建配置和连接池

```typescript
import { DatabaseConfig, ConnectionPool } from '@oksai/database';

// 创建配置
const config = DatabaseConfig.create({
  host: 'localhost',
  port: 5432,
  database: 'oksai_db',
  username: 'postgres',
  password: 'password',
  maxConnections: 20,
});

// 创建连接池
const pool = ConnectionPool.create(config);

// 连接
await pool.connect();

// 检查状态
if (pool.isConnected()) {
  console.log('数据库已连接');
}
```

### 4.2 获取和释放连接

```typescript
// 获取连接
const connection = await pool.acquire();

try {
  // 使用连接执行查询...
} finally {
  // 释放连接
  await pool.release(connection);
}
```

### 4.3 事务管理

```typescript
import { TransactionManager } from '@oksai/database';

const txManager = TransactionManager.create(pool);

// 开始事务
const tx = await txManager.beginTransaction();

try {
  // 执行操作...

  // 提交
  await tx.commit();
} catch (error) {
  // 回滚
  await tx.rollback();
  throw error;
}
```

### 4.4 实现仓储

```typescript
import { RepositoryBase } from '@oksai/database';

interface User {
  id: string;
  email: string;
  name: string;
}

class UserRepository extends RepositoryBase<User> {
  async findById(id: string): Promise<User | null> {
    // 实现查询逻辑
    return null;
  }

  async save(entity: User): Promise<void> {
    // 实现保存逻辑
  }

  // delete, findAll, count 可选实现
  // 默认抛出 'xxx 方法未实现' 错误
}
```

---

## 五、API 参考

### 5.1 DatabaseConfig

```typescript
class DatabaseConfig {
  readonly host: string;
  readonly port: number;
  readonly database: string;
  readonly username: string;
  readonly password: string;
  readonly maxConnections: number;

  static create(options: DatabaseConfigOptions): DatabaseConfig;
  toConnectionString(): string;
}
```

### 5.2 ConnectionPool

```typescript
interface IConnectionPool {
  readonly config: DatabaseConfig;
  isConnected(): boolean;
  acquire(): Promise<unknown>;
  release(connection: unknown): Promise<void>;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
}

class ConnectionPool implements IConnectionPool {
  static create(config: DatabaseConfig): ConnectionPool;
}
```

### 5.3 Transaction / TransactionManager

```typescript
interface ITransaction {
  isActive(): boolean;
  commit(): Promise<void>;
  rollback(): Promise<void>;
}

class Transaction implements ITransaction {
  isActive(): boolean;
  commit(): Promise<void>;
  rollback(): Promise<void>;
}

interface ITransactionManager {
  beginTransaction(): Promise<ITransaction>;
}

class TransactionManager implements ITransactionManager {
  static create(pool: IConnectionPool): TransactionManager;
  beginTransaction(): Promise<ITransaction>;
}
```

### 5.4 RepositoryBase

```typescript
abstract class RepositoryBase<T> {
  abstract findById(id: string): Promise<T | null>;
  abstract save(entity: T): Promise<void>;

  async delete(id: string): Promise<void>;    // 默认抛出未实现错误
  async findAll(): Promise<T[]>;              // 默认抛出未实现错误
  async count(): Promise<number>;             // 默认抛出未实现错误
}
```

---

## 六、测试覆盖

| 指标 | 覆盖率 |
|------|--------|
| Statements | 100% |
| Branches | 100% |
| Functions | 100% |
| Lines | 100% |

---

## 七、注意事项

1. **当前为同步实现**：生产环境需集成真实数据库驱动
2. **事务状态检查**：对已结束的事务调用 commit/rollback 会抛出错误
3. **连接池状态**：未连接时调用 acquire 会抛出错误
4. **仓储基类方法**：`delete`, `findAll`, `count` 默认抛出未实现错误

---

## 八、错误处理

| 场景 | 错误消息 |
|------|----------|
| 连接池未连接时 acquire | `连接池未连接` |
| 事务已结束时 commit | `事务已结束` |
| 事务已结束时 rollback | `事务已结束` |
| 未实现的仓储方法 | `xxx 方法未实现` |

# Aggregate Metadata 模块技术规范

> 版本：1.0.0  
> 更新日期：2026-02-21

---

## 一、概述

### 1.1 模块定位

`@oksai/aggregate-metadata` 提供跨域的聚合根元数据查询能力：

- **统一元数据**：所有聚合根的标准化元数据
- **扩展接口**：支持分析、AI、同步三种扩展
- **读模型实体**：基于 MikroORM 的持久化
- **查询服务**：高级过滤和分页

### 1.2 三种扩展能力

| 扩展 | 能力 | 用途 |
|------|------|------|
| **Analyzable** | 标签、分类、质量分数 | 数据分析 |
| **AIEnabled** | 向量嵌入状态、AI 元数据 | AI 能力 |
| **Syncable** | 外部系统映射、同步状态 | 数据同步 |

---

## 二、架构设计

### 2.1 模块结构

```
@oksai/aggregate-metadata/
├── lib/
│   ├── interfaces/
│   │   └── aggregate-metadata.interface.ts
│   ├── read-model/
│   │   └── aggregate-metadata.entity.ts
│   └── services/
│       ├── aggregate-metadata-query.service.ts
│       └── aggregate-metadata-projector.ts
└── index.ts
```

### 2.2 元数据结构

```
┌─────────────────────────────────────────────────────────────┐
│                  IFullAggregateMetadata                      │
├─────────────────────────────────────────────────────────────┤
│  基础字段                                                    │
│  - aggregateType: string                                    │
│  - aggregateId: string                                      │
│  - tenantId: string                                         │
│  - createdAt, updatedAt: Date                               │
│  - createdBy, updatedBy?: string                            │
│  - deletedAt?, deletedBy?, isDeleted: boolean               │
├─────────────────────────────────────────────────────────────┤
│  可选扩展                                                    │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │ Analyzable      │  │ AIEnabled       │  │ Syncable     │ │
│  │ - tags[]        │  │ - embeddingStatus│ │ - externalIds│ │
│  │ - category      │  │ - embeddingId   │  │ - syncStatus │ │
│  │ - qualityScore  │  │ - needsReembed  │  │ - needsSync  │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## 三、使用方式

### 3.1 查询聚合元数据

```typescript
import { AggregateMetadataQueryService } from '@oksai/aggregate-metadata';

@Injectable()
export class DashboardService {
  constructor(
    private readonly metadataQuery: AggregateMetadataQueryService
  ) {}

  async getRecentAggregates(tenantId: string) {
    const result = await this.metadataQuery.query({
      tenantId,
      excludeDeleted: true,
      offset: 0,
      limit: 20,
    });

    return result;
    // { items: [...], total: 100, hasMore: true }
  }
}
```

### 3.2 按类型过滤

```typescript
// 查询所有任务聚合
const result = await this.metadataQuery.query({
  tenantId: 'tenant-123',
  aggregateType: 'Job',
  category: 'import',
  tags: ['priority:high'],
  createdAtFrom: new Date('2024-01-01'),
  limit: 50,
});
```

### 3.3 获取单个元数据

```typescript
const metadata = await this.metadataQuery.getById(
  'tenant-123',
  'Job',
  'job-456'
);

if (metadata) {
  console.log(metadata.aggregateType);  // 'Job'
  console.log(metadata.analyzable?.tags);  // ['priority:high']
  console.log(metadata.aiEnabled?.embeddingStatus);  // 'COMPLETED'
}
```

### 3.4 获取聚合类型和分类

```typescript
// 获取所有聚合类型
const types = await this.metadataQuery.getAggregateTypes('tenant-123');
// ['Job', 'User', 'Tenant', ...]

// 获取某类型的所有分类
const categories = await this.metadataQuery.getCategories('tenant-123', 'Job');
// ['import', 'export', 'sync']

// 获取所有标签
const tags = await this.metadataQuery.getTags('tenant-123', 'Job');
// ['priority:high', 'status:pending', ...]
```

---

## 四、API 参考

### 4.1 IAggregateMetadata

```typescript
interface IAggregateMetadata {
  aggregateType: string;
  aggregateId: string;
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  updatedBy?: string;
  deletedAt?: Date;
  deletedBy?: string;
  isDeleted: boolean;
}
```

### 4.2 AnalyzableExtension

```typescript
interface AnalyzableExtension {
  tags: string[];
  category?: string;
  analyticsDimensions?: Record<string, string | number | boolean>;
  qualityScore?: number;
  includeInAnalytics: boolean;
}
```

### 4.3 AIEnabledExtension

```typescript
interface AIEnabledExtension {
  embeddingStatus: EmbeddingStatus | string;
  embeddingVersion?: string;
  embeddingId?: string;
  aiMetadata?: AIProcessingMetadata;
  needsReembedding: boolean;
}
```

### 4.4 SyncableExtension

```typescript
interface SyncableExtension {
  externalIds: Record<string, string>;
  dataSource?: string;
  syncStatus: SyncStatus | string;
  lastSyncedAt?: Date;
  syncVersion: number;
  etlMetadata?: ETLMetadata;
  needsSync: boolean;
}
```

### 4.5 AggregateMetadataFilter

```typescript
interface AggregateMetadataFilter {
  tenantId: string;          // 必填
  aggregateType?: string;
  aggregateId?: string;
  tags?: string[];
  category?: string;
  excludeDeleted?: boolean;  // 默认 true
  createdAtFrom?: Date;
  createdAtTo?: Date;
  offset?: number;
  limit?: number;
}
```

### 4.6 AggregateMetadataQueryService

```typescript
class AggregateMetadataQueryService {
  query(filter: AggregateMetadataFilter): Promise<AggregateMetadataQueryResult>;
  getById(tenantId: string, aggregateType: string, aggregateId: string): Promise<IFullAggregateMetadata | null>;
  getAggregateTypes(tenantId: string): Promise<string[]>;
  getCategories(tenantId: string, aggregateType?: string): Promise<string[]>;
  getTags(tenantId: string, aggregateType?: string): Promise<string[]>;
}
```

---

## 五、数据库表

### 5.1 aggregate_metadata 表

| 字段 | 类型 | 说明 |
|------|------|------|
| `tenant_id` | VARCHAR | 租户 ID（PK） |
| `aggregate_type` | VARCHAR | 聚合类型（PK） |
| `aggregate_id` | VARCHAR | 聚合 ID（PK） |
| `created_at` | TIMESTAMP | 创建时间 |
| `updated_at` | TIMESTAMP | 更新时间 |
| `is_deleted` | BOOLEAN | 是否删除 |
| `tags` | JSONB | 标签数组 |
| `category` | VARCHAR | 分类 |
| `embedding_status` | VARCHAR | 嵌入状态 |
| `sync_status` | VARCHAR | 同步状态 |

### 5.2 索引

```sql
PRIMARY KEY (tenant_id, aggregate_type, aggregate_id)
INDEX (tenant_id, aggregate_type)
INDEX (tenant_id, created_at)
INDEX (tenant_id, is_deleted)
```

---

## 六、测试覆盖

| 指标 | 覆盖率 |
|------|--------|
| Statements | 100% |
| Branches | 85.61% |
| Functions | 100% |
| Lines | 100% |

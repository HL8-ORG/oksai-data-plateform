# AI Embeddings 模块技术规范

> 版本：1.0.0  
> 更新日期：2026-02-22

---

## 一、概述

### 1.1 模块定位

`@oksai/ai-embeddings` 提供 AI 向量嵌入能力：

- **向量生成**：调用 OpenAI API 生成文本嵌入向量
- **向量存储**：基于 PostgreSQL pgvector 扩展存储
- **相似性搜索**：高效的向量相似性查询

### 1.2 技术栈

| 依赖 | 用途 |
|------|------|
| openai | OpenAI API 客户端 |
| pgvector | PostgreSQL 向量扩展 |

---

## 二、架构设计

### 2.1 模块结构

```
@oksai/ai-embeddings/
├── lib/
│   ├── interfaces/
│   │   └── embedding.interface.ts
│   └── adapters/
│       ├── openai-embedding.service.ts
│       └── pgvector.store.ts
└── index.ts
```

### 2.2 向量嵌入流程

```
┌─────────────────────────────────────────────────────────────┐
│                    文本内容                                   │
│  "这是一个关于数据分析的文档..."                              │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ OpenAI Embedding API
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   Embedding Vector                           │
│  [0.123, -0.456, 0.789, ..., 0.234]  (1536 维)              │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ 存储
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                 PostgreSQL + pgvector                        │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ id | tenant_id | content | embedding | metadata     │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ 相似性搜索
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   搜索结果                                    │
│  [{ id, content, similarity: 0.95 }, ...]                   │
└─────────────────────────────────────────────────────────────┘
```

---

## 三、使用方式

### 3.1 生成嵌入向量

```typescript
import { OpenAIEmbeddingService } from '@oksai/ai-embeddings';

const embeddingService = new OpenAIEmbeddingService({
  apiKey: process.env.OPENAI_API_KEY,
  model: 'text-embedding-3-small',  // 或 'text-embedding-ada-002'
});

// 生成单个文本的嵌入
const embedding = await embeddingService.embed('这是一个测试文档');
// [0.123, -0.456, ..., 0.234]

// 批量生成嵌入
const embeddings = await embeddingService.embedBatch([
  '文档一内容',
  '文档二内容',
  '文档三内容',
]);
```

### 3.2 存储嵌入向量

```typescript
import { PgVectorStore } from '@oksai/ai-embeddings';

const vectorStore = new PgVectorStore(pool);

// 存储向量
await vectorStore.upsert({
  id: 'doc-123',
  tenantId: 'tenant-456',
  content: '文档内容...',
  embedding: embedding,
  metadata: {
    source: 'upload',
    category: 'report',
  },
});
```

### 3.3 相似性搜索

```typescript
// 搜索相似内容
const results = await vectorStore.search({
  tenantId: 'tenant-456',
  query: '数据分析报告',
  topK: 10,
  threshold: 0.7,  // 相似度阈值
});

// results: [{ id, content, similarity, metadata }, ...]
```

### 3.4 混合搜索

```typescript
// 结合元数据过滤
const results = await vectorStore.search({
  tenantId: 'tenant-456',
  query: '数据分析',
  topK: 5,
  filter: {
    category: 'report',
    createdAt: { gte: '2024-01-01' },
  },
});
```

---

## 四、API 参考

### 4.1 IEmbeddingService

```typescript
interface IEmbeddingService {
  /**
   * 生成单个文本的嵌入向量
   */
  embed(text: string): Promise<number[]>;

  /**
   * 批量生成嵌入向量
   */
  embedBatch(texts: string[]): Promise<number[][]>;

  /**
   * 获取向量维度
   */
  getDimension(): number;
}
```

### 4.2 OpenAIEmbeddingService

```typescript
interface OpenAIEmbeddingOptions {
  apiKey: string;
  model?: 'text-embedding-3-small' | 'text-embedding-3-large' | 'text-embedding-ada-002';
  dimensions?: number;
}

class OpenAIEmbeddingService implements IEmbeddingService {
  constructor(options: OpenAIEmbeddingOptions);

  embed(text: string): Promise<number[]>;
  embedBatch(texts: string[]): Promise<number[][]>;
  getDimension(): number;
}
```

### 4.3 IVectorStore

```typescript
interface VectorRecord {
  id: string;
  tenantId: string;
  content: string;
  embedding: number[];
  metadata?: Record<string, unknown>;
}

interface SearchOptions {
  tenantId: string;
  query: string | number[];  // 文本或向量
  topK?: number;             // 默认 10
  threshold?: number;        // 默认 0
  filter?: Record<string, unknown>;
}

interface SearchResult {
  id: string;
  content: string;
  similarity: number;
  metadata?: Record<string, unknown>;
}

interface IVectorStore {
  upsert(record: VectorRecord): Promise<void>;
  batchUpsert(records: VectorRecord[]): Promise<void>;
  search(options: SearchOptions): Promise<SearchResult[]>;
  delete(id: string): Promise<void>;
  deleteByTenant(tenantId: string): Promise<void>;
}
```

### 4.4 PgVectorStore

```typescript
class PgVectorStore implements IVectorStore {
  constructor(pool: Pool, options?: { tableName?: string });

  upsert(record: VectorRecord): Promise<void>;
  batchUpsert(records: VectorRecord[]): Promise<void>;
  search(options: SearchOptions): Promise<SearchResult[]>;
  delete(id: string): Promise<void>;
  deleteByTenant(tenantId: string): Promise<void>;
}
```

---

## 五、数据库配置

### 5.1 启用 pgvector

```sql
-- 安装扩展
CREATE EXTENSION IF NOT EXISTS vector;

-- 创建表
CREATE TABLE embeddings (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  content TEXT NOT NULL,
  embedding vector(1536),
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 创建索引
CREATE INDEX ON embeddings USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX ON embeddings (tenant_id);
```

---

## 六、测试覆盖

| 指标 | 覆盖率 |
|------|--------|
| Statements | 80.8% |
| Branches | 81.57% |
| Functions | 96.29% |
| Lines | 80.23% |

---

## 七、最佳实践

### 7.1 文本预处理

```typescript
// 长文本截断
const MAX_TOKENS = 8000;  // text-embedding-3-small 限制

function truncateText(text: string, maxTokens: number): string {
  // 简单估算：4 字符 ≈ 1 token
  const maxChars = maxTokens * 4;
  return text.length > maxChars ? text.slice(0, maxChars) : text;
}
```

### 7.2 批量处理

```typescript
// 批量生成嵌入时注意速率限制
const BATCH_SIZE = 100;

async function batchEmbed(texts: string[], service: IEmbeddingService) {
  const results = [];
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const embeddings = await service.embedBatch(batch);
    results.push(...embeddings);
  }
  return results;
}
```

### 7.3 缓存策略

```typescript
// 相同内容缓存嵌入结果
const embeddingCache = new Map<string, number[]>();

async function getCachedEmbedding(text: string, service: IEmbeddingService) {
  const hash = createHash(text);
  if (embeddingCache.has(hash)) {
    return embeddingCache.get(hash)!;
  }
  const embedding = await service.embed(text);
  embeddingCache.set(hash, embedding);
  return embedding;
}
```

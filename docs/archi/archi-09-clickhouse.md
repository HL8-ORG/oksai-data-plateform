# ClickHouse 表结构设计

[返回目录](./archi.md) | [上一章：事件消费者](./archi-08-consumer.md)

---

## 一、Job 事实表

```sql
-- Job 事实表
CREATE TABLE job_facts (
  -- 主键
  job_id String,
  tenant_id String,
  
  -- 维度
  title String,
  status String,
  created_by String,
  
  -- 时间维度
  created_at DateTime,
  started_at Nullable(DateTime),
  completed_at Nullable(DateTime),
  
  -- 度量
  duration_ms Nullable(UInt64),
  
  -- 维度属性（反范式化，避免 JOIN）
  priority String,
  tags Array(String)
)
ENGINE = MergeTree()
PARTITION BY (tenant_id, toYYYYMM(created_at))
ORDER BY (tenant_id, created_at, job_id)
SETTINGS index_granularity = 8192;

-- 注释
COMMENT ON TABLE job_facts IS 'Job 事实表 - 用于分析和查询';
COMMENT ON COLUMN job_facts.tenant_id IS '租户 ID';
COMMENT ON COLUMN job_facts.status IS '状态: PENDING, IN_PROGRESS, COMPLETED, CANCELLED';
COMMENT ON COLUMN job_facts.duration_ms IS '持续时间（毫秒）';
```

---

## 二、Job 搜索索引表

```sql
-- Job 搜索索引
CREATE TABLE job_search_index (
  job_id String,
  tenant_id String,
  title String,
  status String,
  created_by String,
  created_at DateTime,
  completed_at Nullable(DateTime)
)
ENGINE = MergeTree()
PARTITION BY (tenant_id, toYYYYMM(created_at))
ORDER BY (tenant_id, created_at, job_id)
SETTINGS index_granularity = 8192;

-- 为标题添加跳数索引
ALTER TABLE job_search_index
ADD INDEX idx_title title TYPE tokenbf_v1(512, 3, 0) GRANULARITY 4;

-- 搜索示例
SELECT * FROM job_search_index
WHERE tenant_id = 'tenant-123'
  AND hasToken(title, '重要')
ORDER BY created_at DESC
LIMIT 20;
```

---

## 三、租户日统计物化视图

```sql
-- 租户日统计物化视图
CREATE MATERIALIZED VIEW tenant_daily_job_stats_mv
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(day)
ORDER BY (tenant_id, day)
AS SELECT
  tenant_id,
  toDate(created_at) AS day,
  count() AS job_count,
  countIf(status = 'COMPLETED') AS completed_count,
  countIf(status = 'CANCELLED') AS cancelled_count,
  avg(duration_ms) AS avg_duration_ms
FROM job_facts
GROUP BY tenant_id, day;

-- 查询物化视图
SELECT * FROM tenant_daily_job_stats_mv 
WHERE tenant_id = 'tenant-123' 
  AND day >= '2024-01-01' 
ORDER BY day DESC;
```

---

## 四、租户统计概览视图

```sql
-- 租户统计概览视图
CREATE VIEW tenant_job_stats_overview_v
AS SELECT
  tenant_id,
  count() AS total_jobs,
  countIf(status = 'PENDING') AS pending_jobs,
  countIf(status = 'IN_PROGRESS') AS in_progress_jobs,
  countIf(status = 'COMPLETED') AS completed_jobs,
  countIf(status = 'CANCELLED') AS cancelled_jobs,
  avgIf(duration_ms, status = 'COMPLETED') AS avg_completion_time_ms
FROM job_facts
GROUP BY tenant_id;

-- 查询示例
SELECT * FROM tenant_job_stats_overview_v
WHERE tenant_id = 'tenant-123';
```

---

## 五、事件存储表（PostgreSQL 风格）

```sql
-- 事件存储表（在 ClickHouse 中用于分析查询）
CREATE TABLE event_store_analytics (
  event_id String,
  stream_id String,
  event_type String,
  aggregate_type String,
  tenant_id String,
  payload String,  -- JSON 字符串
  version UInt64,
  occurred_at DateTime,
  created_at DateTime DEFAULT now()
)
ENGINE = MergeTree()
PARTITION BY (tenant_id, toYYYYMM(occurred_at))
ORDER BY (tenant_id, occurred_at, event_id)
SETTINGS index_granularity = 8192;

-- 按事件类型索引
ALTER TABLE event_store_analytics
ADD INDEX idx_event_type event_type TYPE set(100) GRANULARITY 4;
```

---

## 六、时间旅行查询

```sql
-- 时间旅行：查询某个时间点的 Job 状态
SELECT 
  job_id,
  status,
  created_at
FROM job_facts
WHERE tenant_id = 'tenant-123'
  AND created_at <= '2024-01-15 10:00:00'
  AND job_id = 'job-456'
ORDER BY created_at DESC
LIMIT 1;

-- 历史回放：按时间顺序查看 Job 的所有事件
SELECT 
  event_type,
  occurred_at,
  payload
FROM event_store_analytics
WHERE stream_id = 'job-456'
  AND tenant_id = 'tenant-123'
ORDER BY version ASC;
```

---

## 七、性能优化

### 7.1 分区策略

| 表 | 分区键 | 说明 |
|:---|:---|:---|
| job_facts | `(tenant_id, toYYYYMM(created_at))` | 租户 + 月分区 |
| job_search_index | `(tenant_id, toYYYYMM(created_at))` | 租户 + 月分区 |
| tenant_daily_job_stats_mv | `toYYYYMM(day)` | 按月分区 |

### 7.2 排序键

| 表 | 排序键 | 说明 |
|:---|:---|:---|
| job_facts | `(tenant_id, created_at, job_id)` | 租户 + 时间 + ID |
| job_search_index | `(tenant_id, created_at, job_id)` | 租户 + 时间 + ID |

### 7.3 索引优化

```sql
-- 为常用过滤条件添加跳数索引
ALTER TABLE job_facts 
ADD INDEX idx_status status TYPE set(10) GRANULARITY 4;

ALTER TABLE job_facts 
ADD INDEX idx_created_by created_by TYPE bloom_filter GRANULARITY 4;

-- 为时间范围查询优化
ALTER TABLE job_facts
ADD INDEX idx_created_at created_at TYPE minmax GRANULARITY 4;
```

---

## 八、数据生命周期管理

```sql
-- TTL：自动删除 2 年前的数据
ALTER TABLE job_facts 
MODIFY TTL created_at + INTERVAL 2 YEAR;

-- 冷热数据分离（可选）
ALTER TABLE job_facts 
MODIFY TTL created_at + INTERVAL 6 MONTH TO VOLUME 'cold',
           created_at + INTERVAL 2 YEAR TO VOLUME 'archive';
```

---

[下一章：部署架构 →](./archi-10-deployment.md)

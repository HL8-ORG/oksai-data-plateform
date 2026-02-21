# Analytics 模块技术规范

> 版本：1.0.0  
> 更新日期：2026-02-21

---

## 一、概述

### 1.1 模块定位

`@oksai/analytics` 提供数据分析能力，支持：

- **业务维度计算**：按业务维度聚合统计数据
- **时间维度计算**：按时间窗口分析趋势
- **质量评分**：计算数据质量分数
- **ClickHouse 集成**：高性能分析查询

### 1.2 分析能力

| 能力 | 说明 |
|------|------|
| 统计计算 | 计数、求和、平均值、百分比 |
| 时间聚合 | 按小时/天/周/月聚合 |
| 维度分析 | 按租户/用户/业务维度分组 |
| 趋势分析 | 同比、环比、趋势预测 |

---

## 二、架构设计

### 2.1 模块结构

```
@oksai/analytics/
├── lib/
│   ├── calculators/
│   │   ├── business-dimension-calculator.ts
│   │   ├── time-dimension-calculator.ts
│   │   └── default-quality-scorer.ts
│   ├── metrics/
│   │   └── metric.types.ts
│   └── index.ts
├── spec/
│   └── ...
└── index.ts
```

### 2.2 分析流程

```
┌─────────────────────────────────────────────────────────────┐
│                    Raw Events                                │
│  (写入 ClickHouse)                                           │
└─────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│                   Calculators                                │
│  ┌─────────────────┐  ┌─────────────────┐                  │
│  │ Business        │  │ Time            │                  │
│  │ Dimension       │  │ Dimension       │                  │
│  │ Calculator      │  │ Calculator      │                  │
│  └─────────────────┘  └─────────────────┘                  │
│           │                   │                             │
│           └───────┬───────────┘                             │
│                   ▼                                         │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Quality Scorer                          │   │
│  │  计算数据质量分数                                     │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│                   Analytics Results                          │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ {                                                    │   │
│  │   tenantId: 'tenant-1',                              │   │
│  │   metrics: { jobs: 100, success: 95 },               │   │
│  │   qualityScore: 0.92,                                │   │
│  │   trend: 'improving'                                 │   │
│  │ }                                                    │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 三、核心计算器

### 3.1 BusinessDimensionCalculator

按业务维度计算统计数据：

```typescript
import { BusinessDimensionCalculator } from '@oksai/analytics';

const calculator = new BusinessDimensionCalculator();

// 计算任务统计
const stats = await calculator.calculate({
  tenantId: 'tenant-123',
  dimensions: ['status', 'priority'],
  metrics: ['count', 'avg_duration'],
  filters: {
    createdAt: { gte: '2024-01-01' }
  }
});

// 返回结果
// {
//   status: {
//     completed: { count: 50, avg_duration: 120 },
//     pending: { count: 30, avg_duration: 0 },
//     failed: { count: 5, avg_duration: 60 }
//   },
//   priority: {
//     high: { count: 20, avg_duration: 90 },
//     normal: { count: 65, avg_duration: 130 }
//   }
// }
```

### 3.2 TimeDimensionCalculator

按时间维度分析趋势：

```typescript
import { TimeDimensionCalculator } from '@oksai/analytics';

const calculator = new TimeDimensionCalculator();

// 按天统计
const dailyStats = await calculator.calculate({
  tenantId: 'tenant-123',
  interval: 'day',
  metrics: ['jobs_created', 'jobs_completed'],
  range: {
    start: '2024-01-01',
    end: '2024-01-31'
  }
});

// 返回结果
// [
//   { date: '2024-01-01', jobs_created: 10, jobs_completed: 8 },
//   { date: '2024-01-02', jobs_created: 12, jobs_completed: 11 },
//   ...
// ]

// 计算环比
const trend = calculator.calculateTrend(dailyStats, 'jobs_completed');
// { direction: 'up', percentage: 15.5 }
```

### 3.3 DefaultQualityScorer

计算数据质量分数：

```typescript
import { DefaultQualityScorer } from '@oksai/analytics';

const scorer = new DefaultQualityScorer();

// 计算质量分数
const score = await scorer.calculate({
  tenantId: 'tenant-123',
  factors: {
    completeness: 0.95,   // 完整性：字段填充率
    accuracy: 0.92,       // 准确性：数据正确率
    timeliness: 0.88,     // 及时性：数据更新频率
    consistency: 0.90     // 一致性：跨源数据一致性
  },
  weights: {
    completeness: 0.3,
    accuracy: 0.35,
    timeliness: 0.15,
    consistency: 0.2
  }
});

console.log(score.overall);     // 0.92
console.log(score.grade);       // 'A'
console.log(score.breakdown);   // 详细分解
```

---

## 四、API 参考

### 4.1 BusinessDimensionCalculator

```typescript
interface BusinessDimensionOptions {
  tenantId: string;
  dimensions: string[];
  metrics: string[];
  filters?: Record<string, any>;
}

interface DimensionResult {
  [dimension: string]: {
    [value: string]: Record<string, number>;
  };
}

class BusinessDimensionCalculator {
  calculate(options: BusinessDimensionOptions): Promise<DimensionResult>;
}
```

### 4.2 TimeDimensionCalculator

```typescript
interface TimeDimensionOptions {
  tenantId: string;
  interval: 'hour' | 'day' | 'week' | 'month';
  metrics: string[];
  range: { start: string; end: string };
}

interface TimeSeriesData {
  date: string;
  [metric: string]: number;
}

interface TrendResult {
  direction: 'up' | 'down' | 'stable';
  percentage: number;
}

class TimeDimensionCalculator {
  calculate(options: TimeDimensionOptions): Promise<TimeSeriesData[]>;
  calculateTrend(data: TimeSeriesData[], metric: string): TrendResult;
}
```

### 4.3 DefaultQualityScorer

```typescript
interface QualityFactors {
  completeness: number;  // 0-1
  accuracy: number;      // 0-1
  timeliness: number;    // 0-1
  consistency: number;   // 0-1
}

interface QualityWeights {
  completeness: number;  // 权重和应为 1
  accuracy: number;
  timeliness: number;
  consistency: number;
}

interface QualityScore {
  overall: number;       // 0-1
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  breakdown: {
    completeness: number;
    accuracy: number;
    timeliness: number;
    consistency: number;
  };
}

class DefaultQualityScorer {
  calculate(options: {
    tenantId: string;
    factors: QualityFactors;
    weights?: QualityWeights;
  }): Promise<QualityScore>;
}
```

### 4.4 质量等级

| 分数范围 | 等级 | 说明 |
|----------|------|------|
| 0.9 - 1.0 | A | 优秀 |
| 0.8 - 0.9 | B | 良好 |
| 0.7 - 0.8 | C | 一般 |
| 0.6 - 0.7 | D | 较差 |
| < 0.6 | F | 不合格 |

---

## 五、测试覆盖

| 指标 | 覆盖率 |
|------|--------|
| Statements | 94.92% |
| Branches | 79.5% |
| Functions | 97.18% |
| Lines | 95.43% |

---

## 六、注意事项

1. **多租户隔离**：所有查询必须包含 tenantId 过滤
2. **性能优化**：使用 ClickHouse 物化视图预聚合
3. **数据新鲜度**：分析数据可能有分钟级延迟
4. **并发控制**：避免同时执行大量聚合查询

---

## 七、与其他模块集成

### 7.1 与 @oksai/event-store 集成

```typescript
// 事件投影到分析表
class AnalyticsProjector {
  async onJobCreated(event: JobCreatedEvent) {
    await this.clickhouse.insert('jobs', {
      id: event.aggregateId,
      tenant_id: event.payload.tenantId,
      status: 'pending',
      created_at: event.occurredAt,
    });
  }
}
```

### 7.2 与 API 层集成

```typescript
@Controller('analytics')
class AnalyticsController {
  @Get('dashboard')
  async getDashboard(@TenantId() tenantId: string) {
    const [businessStats, timeStats, qualityScore] = await Promise.all([
      this.businessCalculator.calculate({ tenantId, ... }),
      this.timeCalculator.calculate({ tenantId, ... }),
      this.qualityScorer.calculate({ tenantId }),
    ]);

    return { businessStats, timeStats, qualityScore };
  }
}
```

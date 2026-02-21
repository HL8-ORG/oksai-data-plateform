# US-TN-001: 租户创建

## 用户故事

**As a** 系统管理员  
**I want** 创建新租户  
**So that** 为客户提供独立的租户空间

---

## 业务规则

1. 租户名称不能为空
2. 租户名称长度为 2-50 个字符
3. 租户创建时自动分配默认计划
4. 新租户默认状态为活跃
5. 创建成功后触发 `TenantCreated` 事件

---

## 验收标准

### AC1: 成功创建租户

```gherkin
Given 一个有效的租户名称 "测试公司"
  And 一个租户ID "tenant-001"
When 创建新租户
Then 租户创建成功
  And 租户名称为 "测试公司"
  And 租户状态为 "active"
  And 租户计划为 "free"
  And 触发 "TenantCreated" 事件
```

### AC2: 租户名称长度验证

```gherkin
Given 一个租户名称 "<name>"
When 尝试创建租户
Then <result>

Examples:
  | name       | result           |
  | A          | 创建失败（太短）   |
  | 测试公司   | 创建成功         |
  | 超过50个字符的租户名称... | 创建失败（太长） |
```

### AC3: 空名称创建失败

```gherkin
Given 一个空的租户名称
When 尝试创建租户
Then 创建失败
  And 错误信息应包含 "租户名称不能为空"
```

---

## 技术说明

### 聚合根

```typescript
class Tenant extends AggregateRoot<TenantProps> {
  get id(): TenantId
  get name(): TenantName
  get plan(): TenantPlan
  get status(): TenantStatus
  
  static create(id: TenantId, name: TenantName): Result<Tenant>
  
  activate(): void
  suspend(reason: string): void
  upgradePlan(newPlan: TenantPlan): void
  downgradePlan(newPlan: TenantPlan): void
}
```

### 值对象

```typescript
class TenantName extends ValueObject<{ value: string }> {
  private static readonly MIN_LENGTH = 2;
  private static readonly MAX_LENGTH = 50;
  
  static create(name: string): Result<TenantName>
}

class TenantPlan extends ValueObject<{ value: string }> {
  static readonly FREE = 'free';
  static readonly PRO = 'pro';
  static readonly ENTERPRISE = 'enterprise';
  
  isUpgrade(other: TenantPlan): boolean
  isDowngrade(other: TenantPlan): boolean
}
```

---

## 关联 BDD 场景

- [租户管理.feature](../../features/domains/tenant/tenant-management.feature)

---

## 修订历史

| 版本 | 日期 | 变更说明 |
|:---|:---|:---|
| v1.0 | 2026-02-21 | 初始版本 |

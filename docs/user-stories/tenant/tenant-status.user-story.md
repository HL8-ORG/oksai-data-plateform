# US-TN-003: 租户状态管理

## 用户故事

**As a** 系统管理员  
**I want** 暂停或恢复租户  
**So that** 控制租户对平台的访问

---

## 业务规则

1. 暂停租户时需要填写原因
2. 已暂停的租户可以恢复
3. 暂停/恢复操作是幂等的
4. 状态变更触发领域事件

---

## 验收标准

### AC1: 成功暂停租户

```gherkin
Given 一个活跃的租户 "tenant-001"
When 暂停租户并填写原因为 "欠费"
Then 租户状态变为 "suspended"
  And 暂停原因为 "欠费"
  And 触发 "TenantSuspended" 事件
```

### AC2: 成功恢复租户

```gherkin
Given 一个已暂停的租户 "tenant-001"
When 恢复租户
Then 租户状态变为 "active"
  And 暂停原因为空
  And 触发 "TenantActivated" 事件
```

### AC3: 暂停操作幂等

```gherkin
Given 一个已暂停的租户 "tenant-001"
When 再次暂停租户
Then 操作成功完成
  And 不产生新的事件
```

### AC4: 恢复操作幂等

```gherkin
Given 一个活跃的租户 "tenant-001"
When 恢复租户
Then 操作成功完成
  And 不产生新的事件
```

---

## 状态流转

```
         ┌──────────┐
    ┌───▶│  active  │◀───┐
    │    └──────────┘    │
    │         │          │
    │    suspend    activate
    │         │          │
    │         ▼          │
    │    ┌──────────┐    │
    └────│suspended │────┘
         └──────────┘
```

---

## 修订历史

| 版本 | 日期 | 变更说明 |
|:---|:---|:---|
| v1.0 | 2026-02-21 | 初始版本 |

# US-ID-002: 用户生命周期管理

## 用户故事

**As a** 系统管理员  
**I want** 禁用或启用用户  
**So that** 控制用户对平台的访问

---

## 业务规则

1. 用户可以被禁用，禁用时需要填写原因
2. 已禁用的用户可以被重新启用
3. 禁用/启用操作是幂等的（重复操作不产生副作用）
4. 租户所有者不能被禁用
5. 状态变更时触发相应的领域事件

---

## 验收标准

### AC1: 成功禁用用户

```gherkin
Given 已存在一个活跃用户 "user-001" 邮箱为 "active@example.com"
  And 用户 "user-001" 处于活跃状态
When 禁用用户并填写原因为 "违规操作"
Then 用户状态变为 "disabled"
  And 禁用原因为 "违规操作"
  And 触发 "UserDisabled" 事件
```

### AC2: 成功启用已禁用用户

```gherkin
Given 用户 "user-001" 已被禁用，原因为 "测试"
When 启用用户
Then 用户状态变为 "active"
  And 禁用原因为空
  And 触发 "UserEnabled" 事件
```

### AC3: 禁用操作幂等

```gherkin
Given 用户 "user-001" 已被禁用，原因为 "测试"
When 再次禁用用户
Then 操作成功完成
  And 不产生新的事件
```

### AC4: 启用操作幂等

```gherkin
Given 用户 "user-001" 处于活跃状态
When 启用用户
Then 操作成功完成
  And 不产生新的事件
```

### AC5: 租户所有者不能被禁用

```gherkin
Given 用户 "user-001" 是租户 "tenant-001" 的所有者
When 尝试禁用用户
Then 禁用失败
  And 错误信息应包含 "租户所有者不能被禁用"
```

---

## 技术说明

### 状态枚举

```typescript
enum UserStatus {
  ACTIVE = 'active',
  DISABLED = 'disabled'
}
```

### 聚合根行为

```typescript
class User extends AggregateRoot<UserProps> {
  disable(reason: string): void {
    if (this.isOwnerOfTenant) {
      throw new Error('租户所有者不能被禁用');
    }
    if (this.status === UserStatus.DISABLED) {
      return; // 幂等
    }
    this.props.status = UserStatus.DISABLED;
    this.props.disabledReason = reason;
    this.addDomainEvent(new UserDisabledEvent(this.id));
  }

  enable(): void {
    if (this.status === UserStatus.ACTIVE) {
      return; // 幂等
    }
    this.props.status = UserStatus.ACTIVE;
    this.props.disabledReason = null;
    this.addDomainEvent(new UserEnabledEvent(this.id));
  }
}
```

---

## 关联 BDD 场景

- [用户生命周期.feature](../../features/domains/identity/user-lifecycle.feature)

---

## 修订历史

| 版本 | 日期 | 变更说明 |
|:---|:---|:---|
| v1.0 | 2026-02-21 | 初始版本 |

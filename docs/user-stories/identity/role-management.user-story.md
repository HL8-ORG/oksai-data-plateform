# US-ID-003: 角色管理

## 用户故事

**As a** 租户管理员  
**I want** 为用户授予或撤销角色  
**So that** 用户获得相应权限

---

## 业务规则

1. 用户可以被授予多种角色
2. 不能重复授予相同的角色
3. 已禁用的用户不能接受角色授予
4. 不能撤销用户的最后一个角色
5. 角色键格式必须符合规范（如 `TenantMember`, `TenantAdmin`）
6. 角色变更时触发领域事件

---

## 验收标准

### AC1: 成功授予角色

```gherkin
Given 已存在一个活跃用户 "user-001" 邮箱为 "role-test@example.com"
  And 用户 "user-001" 拥有角色 "TenantMember"
When 授予角色 "TenantAdmin"
Then 用户拥有角色 "TenantAdmin"
  And 触发 "RoleGrantedToUser" 事件
```

### AC2: 不能重复授予相同角色

```gherkin
Given 用户 "user-001" 拥有角色 "TenantMember"
When 尝试再次授予角色 "TenantMember"
Then 授予失败
  And 错误信息应包含 "用户已拥有该角色"
```

### AC3: 禁用用户不能接受角色授予

```gherkin
Given 用户 "user-001" 已被禁用
When 尝试授予角色 "TenantAdmin"
Then 授予失败
  And 错误信息应包含 "用户已禁用"
```

### AC4: 成功撤销角色

```gherkin
Given 用户 "user-001" 拥有角色 "TenantMember" 和 "TenantAdmin"
When 撤销角色 "TenantAdmin"
Then 用户不再拥有角色 "TenantAdmin"
  And 用户仍拥有角色 "TenantMember"
```

### AC5: 不能撤销最后一个角色

```gherkin
Given 用户 "user-001" 仅拥有角色 "TenantMember"
When 尝试撤销角色 "TenantMember"
Then 撤销失败
  And 错误信息应包含 "不能移除最后一个角色"
```

### AC6: 无效角色键格式

```gherkin
When 尝试授予角色 "invalid_role"
Then 授予失败
  And 错误信息应包含 "角色键格式不正确"
```

---

## 技术说明

### 角色键值对象

```typescript
class RoleKey extends ValueObject<{ value: string }> {
  private static readonly VALID_PATTERN = /^[A-Z][a-zA-Z]+$/;
  
  static create(key: string): Result<RoleKey> {
    if (!this.VALID_PATTERN.test(key)) {
      return fail('角色键格式不正确');
    }
    return ok(new RoleKey({ value: key }));
  }
}
```

### 预定义角色

| 角色键 | 说明 |
|:---|:---|
| `TenantOwner` | 租户所有者 |
| `TenantAdmin` | 租户管理员 |
| `TenantMember` | 租户成员 |

---

## 关联 BDD 场景

- [用户生命周期.feature](../../features/domains/identity/user-lifecycle.feature) - 角色管理部分

---

## 修订历史

| 版本 | 日期 | 变更说明 |
|:---|:---|:---|
| v1.0 | 2026-02-21 | 初始版本 |

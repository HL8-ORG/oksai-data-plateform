# US-ID-001: 用户注册

## 用户故事

**As a** 新用户  
**I want** 使用邮箱注册账户  
**So that** 我可以访问平台服务

---

## 业务规则

1. 邮箱地址必须是有效的格式
2. 邮箱地址在存储时自动转换为小写
3. 系统为每个用户自动生成唯一标识符（UUID）
4. 新注册用户默认状态为活跃（active）
5. 注册成功后触发 `UserRegistered` 事件

---

## 验收标准

### AC1: 成功注册新用户

```gherkin
Given 一个有效的邮箱地址 "user@example.com"
  And 一个用户ID "user-123"
When 注册新用户
Then 用户创建成功
  And 用户状态应为 "active"
  And 用户邮箱应为 "user@example.com"
  And 触发 "UserRegistered" 事件
```

### AC2: 邮箱自动转小写

```gherkin
Given 一个邮箱地址 "USER@Example.COM"
  And 一个用户ID "user-456"
When 注册新用户
Then 用户邮箱应为 "user@example.com"
```

### AC3: 无效邮箱格式注册失败

```gherkin
Given 一个无效的邮箱地址 "<email>"
  And 一个用户ID "<userId>"
When 尝试注册新用户
Then 注册失败
  And 错误信息应包含 "邮箱格式不正确"

Examples:
  | email              | userId    |
  | invalid-email      | user-001  |
  | missing@domain     | user-002  |
  | @nodomain.com      | user-003  |
  | spaces in@test.com | user-004  |
```

### AC4: 空邮箱注册失败

```gherkin
Given 一个空的邮箱地址
  And 一个用户ID "user-005"
When 尝试注册新用户
Then 注册失败
  And 错误信息应包含 "邮箱不能为空"
```

### AC5: 生成随机用户ID

```gherkin
Given 一个有效的邮箱地址 "auto@example.com"
When 系统自动生成用户ID并注册
Then 用户创建成功
  And 用户ID应为有效的UUID格式
```

---

## 技术说明

### 领域模型

```typescript
// 聚合根
class User extends AggregateRoot<UserProps> {
  get id(): UserId
  get email(): Email
  get status(): UserStatus
  get roles(): RoleKey[]
  
  // 工厂方法
  static create(id: UserId, email: Email): Result<User>
  
  // 行为方法
  disable(reason: string): void
  enable(): void
  addRole(roleKey: RoleKey): void
  removeRole(roleKey: RoleKey): void
}

// 值对象
class Email extends ValueObject<{ value: string }> {
  static create(email: string): Result<Email>
}

class UserId extends ValueObject<{ value: string }> {
  static generate(): UserId
  static fromString(id: string): UserId
}
```

### 领域事件

```typescript
class UserRegisteredEvent extends DomainEvent {
  readonly userId: string
  readonly email: string
  readonly occurredAt: Date
}
```

### 仓储接口

```typescript
interface IUserRepository {
  save(user: User): Promise<void>
  findById(id: UserId): Promise<User | null>
  findByEmail(email: Email): Promise<User | null>
}
```

---

## 关联 BDD 场景

- [用户注册.feature](../../features/domains/identity/user-registration.feature)

---

## 测试覆盖

| 测试文件 | 状态 |
|:---|:---|
| `user.aggregate.spec.ts` | ✅ |
| `email.vo.spec.ts` | ✅ |
| `user-id.vo.spec.ts` | ✅ |

---

## 修订历史

| 版本 | 日期 | 变更说明 |
|:---|:---|:---|
| v1.0 | 2026-02-21 | 初始版本 |

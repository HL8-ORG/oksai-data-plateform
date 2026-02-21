# BDD 场景文档

> 本目录包含项目各领域的 BDD（行为驱动开发）场景文件。

---

## 一、BDD 场景索引

### 1.1 Identity 领域

| Feature | 描述 | 文件 |
|:---|:---|:---|
| 用户注册 | 新用户使用邮箱注册账户 | [user-registration.feature](./domains/identity/user-registration.feature) |
| 用户生命周期 | 用户启用/禁用管理 | [user-lifecycle.feature](./domains/identity/user-lifecycle.feature) |

### 1.2 Tenant 领域

| Feature | 描述 | 文件 |
|:---|:---|:---|
| 租户管理 | 租户创建、状态、计划管理 | [tenant-management.feature](./domains/tenant/tenant-management.feature) |

---

## 二、目录结构

```
docs/features/
├── README.md                           # 本文档
├── domains/
│   ├── identity/
│   │   ├── user-registration.feature   # 用户注册场景
│   │   └── user-lifecycle.feature      # 用户生命周期场景
│   └── tenant/
│       └── tenant-management.feature   # 租户管理场景
└── shared/                             # 共享层场景（待补充）
```

---

## 三、Feature 文件规范

### 3.1 文件命名

```
[业务功能].feature

示例：
user-registration.feature
tenant-management.feature
```

### 3.2 Feature 结构

```gherkin
Feature: [功能名称]
  As a [角色]
  I want [功能]
  So that [业务价值]

  Background:
    Given [共享前置条件]

  Scenario: [场景名称]
    Given [前置条件]
    When [执行动作]
    Then [预期结果]
```

### 3.3 Scenario 命名规范

| 类型 | 命名模式 | 示例 |
|:---|:---|:---|
| 正向场景 | 成功[动作] | 成功创建租户 |
| 异常场景 | [动作]失败 | 创建租户失败 |
| 边界场景 | [边界条件] | 空名称创建失败 |
| 幂等场景 | [动作]幂等 | 暂停操作幂等 |

---

## 四、与代码的关系

### 4.1 Feature 文件位置

| 类型 | 位置 | 说明 |
|:---|:---|:---|
| **文档** | `docs/features/domains/*/` | 文档化，供团队参考 |
| **执行** | `libs/domains/*/src/features/` | 可被 Cucumber.js 执行 |

### 4.2 步骤定义

步骤定义文件位于各模块的 `src/features/step-definitions/` 目录：

```
libs/domains/identity/src/features/
├── user-registration.feature
├── user-lifecycle.feature
└── step-definitions/
    ├── user-registration.steps.ts
    └── user-lifecycle.steps.ts
```

---

## 五、运行 BDD 测试

```bash
# 运行所有 BDD 测试
pnpm run test:bdd

# 运行特定领域的 BDD 测试
pnpm run test:bdd --filter=@oksai/identity

# 运行特定 feature 文件
pnpm run test:bdd -- features/user-registration.feature
```

---

## 六、与用户故事的关系

每个 Feature 对应一个或多个用户故事：

| Feature | 用户故事 |
|:---|:---|
| 用户注册 | [US-ID-001: 用户注册](../user-stories/identity/user-registration.user-story.md) |
| 用户生命周期 | [US-ID-002: 用户生命周期管理](../user-stories/identity/user-lifecycle.user-story.md) |
| 租户管理 | [US-TN-001: 租户创建](../user-stories/tenant/tenant-creation.user-story.md) |

---

## 七、修订历史

| 版本 | 日期 | 变更说明 |
|:---|:---|:---|
| v1.0 | 2026-02-21 | 创建 BDD 场景文档目录结构 |

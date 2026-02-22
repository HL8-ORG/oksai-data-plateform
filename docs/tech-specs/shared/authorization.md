# Authorization 模块技术规范

> 版本：1.0.0  
> 更新日期：2026-02-22

---

## 一、概述

### 1.1 模块定位

`@oksai/authorization` 提供基于角色的访问控制（RBAC）：

- **角色**：权限的集合
- **权限**：细粒度的操作授权
- **授权服务**：权限检查逻辑

### 1.2 RBAC 模型

```
┌─────────────────────────────────────────────────────────────┐
│                       Role（角色）                           │
│  - name: string                                              │
│  - permissions: Permission[]                                 │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ 包含
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Permission（权限）                        │
│  - resource: string（资源）                                  │
│  - action: string（操作）                                    │
│  - conditions?: Record<string, unknown>（条件）              │
└─────────────────────────────────────────────────────────────┘
```

---

## 二、架构设计

### 2.1 模块结构

```
@oksai/authorization/
├── lib/
│   ├── role.vo.ts                  # 角色值对象
│   ├── permission.vo.ts            # 权限值对象
│   └── authorization.service.ts    # 授权服务
└── index.ts
```

---

## 三、使用方式

### 3.1 定义权限

```typescript
import { Permission } from '@oksai/authorization';

// 创建权限
const readJobs = Permission.create({
  resource: 'jobs',
  action: 'read',
});

const writeJobs = Permission.create({
  resource: 'jobs',
  action: 'write',
});

const deleteJobs = Permission.create({
  resource: 'jobs',
  action: 'delete',
});

// 带条件的权限
const readOwnJobs = Permission.create({
  resource: 'jobs',
  action: 'read',
  conditions: { owner: true },
});
```

### 3.2 定义角色

```typescript
import { Role, Permission } from '@oksai/authorization';

// 创建角色并分配权限
const viewerRole = Role.create({
  name: 'viewer',
  permissions: [
    Permission.create({ resource: 'jobs', action: 'read' }),
  ],
});

const editorRole = Role.create({
  name: 'editor',
  permissions: [
    Permission.create({ resource: 'jobs', action: 'read' }),
    Permission.create({ resource: 'jobs', action: 'write' }),
  ],
});

const adminRole = Role.create({
  name: 'admin',
  permissions: [
    Permission.create({ resource: 'jobs', action: 'read' }),
    Permission.create({ resource: 'jobs', action: 'write' }),
    Permission.create({ resource: 'jobs', action: 'delete' }),
  ],
});
```

### 3.3 权限检查

```typescript
import { AuthorizationService } from '@oksai/authorization';

const authService = AuthorizationService.create();

// 检查单个权限
const canRead = authService.checkPermission(viewerRole, readJobs);
// true

const canDelete = authService.checkPermission(viewerRole, deleteJobs);
// false

// 检查任意一个权限
const canReadOrWrite = authService.checkAnyPermission(viewerRole, [
  readJobs,
  writeJobs,
]);
// true（有 read 权限）

// 检查所有权限
const canReadAndWrite = authService.checkAllPermissions(editorRole, [
  readJobs,
  writeJobs,
]);
// true（两个权限都有）
```

### 3.4 在 NestJS 中使用

```typescript
import { UseGuards, Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { AuthorizationService, Permission, Role } from '@oksai/authorization';

@Injectable()
export class AuthorizationGuard implements CanActivate {
  constructor(private readonly authService: AuthorizationService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // 从用户获取角色
    const role = user.role as Role;

    // 从装饰器获取所需权限
    const requiredPermissions = this.getRequiredPermissions(context);

    // 检查所有权限
    return this.authService.checkAllPermissions(role, requiredPermissions);
  }
}
```

---

## 四、API 参考

### 4.1 Permission

```typescript
interface PermissionProps {
  resource: string;
  action: string;
  conditions?: Record<string, unknown>;
}

class Permission extends ValueObject<PermissionProps> {
  get resource(): string;
  get action(): string;
  get conditions(): Record<string, unknown> | undefined;

  static create(props: PermissionProps): Permission;

  equals(other: Permission): boolean;
}
```

### 4.2 Role

```typescript
interface RoleProps {
  name: string;
  permissions: Permission[];
}

class Role extends ValueObject<RoleProps> {
  get name(): string;
  get permissions(): Permission[];

  static create(props: RoleProps): Role;

  hasPermission(permission: Permission): boolean;
  addPermission(permission: Permission): Role;
  removePermission(permission: Permission): Role;
}
```

### 4.3 AuthorizationService

```typescript
interface IAuthorizationService {
  checkPermission(role: Role, permission: Permission): boolean;
  checkAnyPermission(role: Role, permissions: Permission[]): boolean;
  checkAllPermissions(role: Role, permissions: Permission[]): boolean;
}

class AuthorizationService implements IAuthorizationService {
  static create(): AuthorizationService;

  checkPermission(role: Role, permission: Permission): boolean;
  checkAnyPermission(role: Role, permissions: Permission[]): boolean;
  checkAllPermissions(role: Role, permissions: Permission[]): boolean;
}
```

---

## 五、权限命名约定

### 5.1 Resource 命名

使用复数形式的资源名：

| Resource | 说明 |
|----------|------|
| `jobs` | 任务资源 |
| `users` | 用户资源 |
| `tenants` | 租户资源 |
| `reports` | 报表资源 |

### 5.2 Action 命名

使用标准 CRUD 操作：

| Action | 说明 |
|--------|------|
| `create` | 创建 |
| `read` | 读取 |
| `update` | 更新 |
| `delete` | 删除 |
| `export` | 导出 |
| `import` | 导入 |
| `manage` | 完全管理权限 |

---

## 六、测试覆盖

| 指标 | 覆盖率 |
|------|--------|
| Statements | 88% |
| Branches | 100% |
| Functions | 84.21% |
| Lines | 90.47% |

---

## 七、最佳实践

### 7.1 最小权限原则

```typescript
// ❌ 不好：给过多权限
const userRole = Role.create({
  name: 'user',
  permissions: [allPermission],  // 所有权限
});

// ✅ 好：只给必需权限
const userRole = Role.create({
  name: 'user',
  permissions: [
    Permission.create({ resource: 'jobs', action: 'read' }),
  ],
});
```

### 7.2 使用角色继承

```typescript
// 基础角色
const baseRole = Role.create({
  name: 'base',
  permissions: [readPermission],
});

// 扩展角色
const adminRole = Role.create({
  name: 'admin',
  permissions: [
    ...baseRole.permissions,  // 继承基础权限
    writePermission,
    deletePermission,
  ],
});
```

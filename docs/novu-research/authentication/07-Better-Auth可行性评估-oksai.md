# Better Auth 集成可行性评估 - oksai-data-plateform

## 一、评估概述

### 1.1 评估目标

评估将 Better Auth 作为 oksai-data-plateform 身份认证基础设施的可行性，基于以下约束：
- **去掉 Clerk**：不使用 SaaS 认证服务
- **重点在 Better Auth 集成**：自托管、开源、无用户数限制
- **符合 DDD + 六边形架构**：认证逻辑与业务领域解耦

### 1.2 评估范围

| 评估维度 | 内容 |
|:---|:---|
| 技术可行性 | 架构兼容性、技术栈匹配度 |
| 功能覆盖 | Better Auth 是否满足所有认证需求 |
| 架构适配 | 如何在 DDD/六边形架构中集成 |
| 工作量估算 | 开发工作量、时间预估 |
| 风险评估 | 潜在风险、缓解措施 |

---

## 二、现状分析

### 2.1 oksai 当前认证基础设施

```
libs/shared/auth/                    # 认证基础设施
├── password-hasher.service.ts       # 密码哈希（argon2）
├── jwt-token.service.ts             # 简化版 JWT（自实现）
└── authentication-result.vo.ts      # 认证结果值对象

libs/domains/identity/               # 身份领域
├── domain/
│   ├── model/
│   │   ├── user.aggregate.ts        # 用户聚合根
│   │   ├── user-id.vo.ts            # 用户 ID
│   │   ├── email.vo.ts              # 邮箱值对象
│   │   └── role-key.vo.ts           # 角色键值对象
│   └── events/
│       ├── user-registered.domain-event.ts
│       ├── user-enabled.domain-event.ts
│       ├── user-disabled.domain-event.ts
│       └── ...
```

### 2.2 Novu Better Auth 架构参考

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          Novu Better Auth 架构                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   前端 Dashboard                      后端 API                              │
│   ┌─────────────────────────┐        ┌─────────────────────────────────┐   │
│   │ better-auth/react       │        │ /v1/better-auth/*               │   │
│   │ - createAuthClient      │───────▶│ Better Auth Server (嵌入)       │   │
│   │ - organizationClient    │        │                                 │   │
│   │ - ssoClient             │        │ JWT 验证 Strategy               │   │
│   └─────────────────────────┘        │ - 验证 Better Auth JWT          │   │
│                                      │ - 同步用户到 Novu DB            │   │
│   Vite 别名替换                       │ - 加载角色/权限                 │   │
│   @clerk/clerk-react → better-auth   └─────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.3 Better Auth 核心能力

| 能力 | 支持情况 | 说明 |
|:---|:---|:---|
| 邮箱/密码注册登录 | ✅ | 内置 |
| 邮箱验证 | ✅ | 内置 |
| 密码重置 | ✅ | 内置 |
| Session 管理 | ✅ | JWT + Cookie |
| 组织管理 | ✅ | organization 插件 |
| 成员角色 | ✅ | organization 插件 |
| SSO 集成 | ✅ | sso 插件 |
| 多数据库支持 | ✅ | PostgreSQL/MySQL/SQLite |
| React SDK | ✅ | better-auth/react |

---

## 三、架构适配方案

### 3.1 DDD + 六边形架构集成

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     oksai Better Auth 架构设计                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                        领域层 (Domain Layer)                         │   │
│   │                                                                      │   │
│   │   libs/domains/identity/                                             │   │
│   │   ├── model/                                                         │   │
│   │   │   ├── user.aggregate.ts          # 用户聚合根                    │   │
│   │   │   ├── session.vo.ts              # 会话值对象                    │   │
│   │   │   └── credentials.vo.ts          # 凭证值对象                    │   │
│   │   ├── ports/                                                         │   │
│   │   │   └── secondary/                                                 │   │
│   │   │       ├── auth.port.ts           # 认证端口（接口）              │   │
│   │   │       └── session.port.ts        # 会话端口（接口）              │   │
│   │   └── services/                                                      │   │
│   │       └── authentication.domain-service.ts                          │   │
│   │                                                                      │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                       │                                     │
│                                       │ Port 接口                           │
│                                       ▼                                     │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                    基础设施层 (Infrastructure Layer)                  │   │
│   │                                                                      │   │
│   │   libs/shared/auth/                                                  │   │
│   │   ├── adapters/                                                      │   │
│   │   │   └── secondary/                                                 │   │
│   │   │       └── better-auth/                                           │   │
│   │   │           ├── better-auth.adapter.ts     # Better Auth 适配器   │   │
│   │   │           ├── better-auth.config.ts      # Better Auth 配置     │   │
│   │   │           └── user-sync.service.ts       # 用户同步服务         │   │
│   │   ├── ports/                                                         │   │
│   │   │   └── IAuthProvider.ts                   # Provider 接口        │   │
│   │   └── auth.module.ts                        # NestJS 模块           │   │
│   │                                                                      │   │
│   │   Better Auth Server (嵌入模式)                                      │   │
│   │   ├── /v1/auth/sign-in/email                                        │   │
│   │   ├── /v1/auth/sign-up/email                                        │   │
│   │   ├── /v1/auth/sign-out                                             │   │
│   │   ├── /v1/auth/session                                              │   │
│   │   ├── /v1/auth/organization/*                                       │   │
│   │   └── /v1/auth/sso/*                                                │   │
│   │                                                                      │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                       │                                     │
│                                       │ JWT Token                           │
│                                       ▼                                     │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                        应用层 (Application Layer)                    │   │
│   │                                                                      │   │
│   │   libs/domains/identity/src/application/                            │   │
│   │   ├── commands/                                                      │   │
│   │   │   ├── sign-in.command.ts                                        │   │
│   │   │   ├── sign-up.command.ts                                        │   │
│   │   │   └── handlers/                                                  │   │
│   │   │       └── sign-in.handler.ts                                    │   │
│   │   └── queries/                                                       │   │
│   │       ├── get-current-user.query.ts                                 │   │
│   │       └── handlers/                                                  │   │
│   │           └── get-current-user.handler.ts                           │   │
│   │                                                                      │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                        接口层 (Interface Layer)                       │   │
│   │                                                                      │   │
│   │   apps/platform-api/src/                                             │   │
│   │   ├── auth/                                                          │   │
│   │   │   ├── auth.controller.ts         # REST API                     │   │
│   │   │   └── dto/                                                       │   │
│   │   │       ├── sign-in-request.dto.ts                                │   │
│   │   │       └── sign-up-request.dto.ts                                │   │
│   │   └── guards/                                                        │   │
│   │       └── jwt-auth.guard.ts          # JWT 验证 Guard               │   │
│   │                                                                      │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                          前端 (Frontend)                             │   │
│   │                                                                      │   │
│   │   packages/auth-react/ (新建)                                        │   │
│   │   ├── client.ts                      # Better Auth React 客户端     │   │
│   │   ├── provider.tsx                   # AuthProvider 组件            │   │
│   │   ├── hooks/                                                         │   │
│   │   │   ├── use-auth.ts                                               │   │
│   │   │   ├── use-user.ts                                               │   │
│   │   │   └── use-organization.ts                                       │   │
│   │   └── components/                                                    │   │
│   │       ├── sign-in.tsx                                               │   │
│   │       ├── sign-up.tsx                                               │   │
│   │       └── organization-switcher.tsx                                 │   │
│   │                                                                      │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 领域层 Port 定义

```typescript
// libs/domains/identity/src/domain/ports/secondary/auth.port.ts

import type { Email } from '../model/email.vo';
import type { UserId } from '../model/user-id.vo';

/**
 * 认证结果
 */
export interface AuthResult {
  userId: UserId;
  email: Email;
  token: string;
  refreshToken?: string;
  expiresAt: Date;
}

/**
 * 会话数据
 */
export interface SessionData {
  userId: string;
  tenantId: string;
  organizationId?: string;
  roles: string[];
  permissions: string[];
}

/**
 * 认证端口 - 领域层定义的认证接口
 *
 * 此接口由基础设施层的 Better Auth Adapter 实现
 */
export interface IAuthPort {
  /**
   * 邮箱密码注册
   */
  signUpWithEmail(email: string, password: string, name: string): Promise<AuthResult>;

  /**
   * 邮箱密码登录
   */
  signInWithEmail(email: string, password: string): Promise<AuthResult>;

  /**
   * 登出
   */
  signOut(token: string): Promise<void>;

  /**
   * 验证会话
   */
  verifySession(token: string): Promise<SessionData | null>;

  /**
   * 刷新令牌
   */
  refreshToken(refreshToken: string): Promise<AuthResult>;

  /**
   * 发送邮箱验证
   */
  sendVerificationEmail(email: string): Promise<void>;

  /**
   * 发送密码重置邮件
   */
  sendPasswordResetEmail(email: string): Promise<void>;

  /**
   * 重置密码
   */
  resetPassword(token: string, newPassword: string): Promise<void>;
}
```

### 3.3 Better Auth Adapter 实现

```typescript
// libs/shared/auth/src/lib/adapters/secondary/better-auth/better-auth.adapter.ts

import { Injectable } from '@nestjs/common';
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { organization } from 'better-auth/plugins';
import type { IAuthPort, AuthResult, SessionData } from '@oksai/identity';
import { PrismaClient } from '@prisma/client';

/**
 * Better Auth 适配器
 *
 * 实现领域层的 IAuthPort 接口，将 Better Auth 的能力适配到领域
 */
@Injectable()
export class BetterAuthAdapter implements IAuthPort {
  private auth: ReturnType<typeof betterAuth>;

  constructor(private readonly prisma: PrismaClient) {
    this.auth = betterAuth({
      database: prismaAdapter(this.prisma, {
        provider: 'postgresql',
      }),
      emailAndPassword: {
        enabled: true,
        requireEmailVerification: true,
      },
      plugins: [
        organization({
          allowUserToCreateOrganization: true,
          membershipLimit: 100,
        }),
      ],
      secret: process.env.BETTER_AUTH_SECRET!,
      baseURL: process.env.BETTER_AUTH_BASE_URL!,
    });
  }

  /**
   * 获取 Better Auth 实例（用于路由挂载）
   */
  getAuthInstance() {
    return this.auth;
  }

  async signUpWithEmail(email: string, password: string, name: string): Promise<AuthResult> {
    const result = await this.auth.api.signUpEmail({
      body: { email, password, name },
    });

    if (result.error) {
      throw new Error(result.error.message);
    }

    return this.mapToAuthResult(result.data);
  }

  async signInWithEmail(email: string, password: string): Promise<AuthResult> {
    const result = await this.auth.api.signInEmail({
      body: { email, password },
    });

    if (result.error) {
      throw new Error(result.error.message);
    }

    return this.mapToAuthResult(result.data);
  }

  async signOut(token: string): Promise<void> {
    await this.auth.api.signOut({
      headers: { authorization: `Bearer ${token}` },
    });
  }

  async verifySession(token: string): Promise<SessionData | null> {
    const session = await this.auth.api.getSession({
      headers: { authorization: `Bearer ${token}` },
    });

    if (!session || session.error) {
      return null;
    }

    return {
      userId: session.user.id,
      tenantId: session.session.activeOrganizationId || '',
      organizationId: session.session.activeOrganizationId,
      roles: [], // 从 organization 插件获取
      permissions: [],
    };
  }

  async refreshToken(refreshToken: string): Promise<AuthResult> {
    // Better Auth 自动处理 token 刷新
    throw new Error('Not implemented - Better Auth handles refresh automatically');
  }

  async sendVerificationEmail(email: string): Promise<void> {
    await this.auth.api.sendVerificationEmail({
      body: { email },
    });
  }

  async sendPasswordResetEmail(email: string): Promise<void> {
    await this.auth.api.forgetPassword({
      body: { email },
    });
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    await this.auth.api.resetPassword({
      body: { token, newPassword },
    });
  }

  private mapToAuthResult(data: any): AuthResult {
    return {
      userId: data.user.id,
      email: data.user.email,
      token: data.token,
      refreshToken: data.refreshToken,
      expiresAt: new Date(data.expiresAt),
    };
  }
}
```

### 3.4 用户同步机制

Better Auth 管理用户数据，需要同步到 oksai 内部领域模型：

```typescript
// libs/shared/auth/src/lib/adapters/secondary/better-auth/user-sync.service.ts

import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type { IAuthPort, SessionData } from '@oksai/identity';

/**
 * 用户同步服务
 *
 * 将 Better Auth 的用户数据同步到 oksai 内部领域模型
 */
@Injectable()
export class UserSyncService {
  /**
   * 在 JWT 验证时同步用户
   *
   * 如果用户不存在，则创建；如果存在，则更新
   */
  async syncUserFromSession(session: SessionData): Promise<void> {
    // 1. 检查用户是否存在
    // 2. 如果不存在，发布 UserRegistered 事件
    // 3. 如果存在但信息变更，发布 UserUpdated 事件
    // 4. 同步组织信息
  }

  /**
   * 监听 Better Auth 的用户注册事件
   */
  @OnEvent('auth.user.registered')
  async handleUserRegistered(payload: any) {
    // 同步到 identity 领域
  }

  /**
   * 监听 Better Auth 的组织创建事件
   */
  @OnEvent('auth.organization.created')
  async handleOrganizationCreated(payload: any) {
    // 同步到 tenant 领域
  }
}
```

---

## 四、功能覆盖分析

### 4.1 认证功能矩阵

| 功能 | Better Auth | oksai 需求 | 适配方案 |
|:---|:---:|:---:|:---|
| 邮箱注册 | ✅ | ✅ | 直接使用 |
| 邮箱登录 | ✅ | ✅ | 直接使用 |
| 密码哈希 | ✅ | ✅ | Better Auth 内置 bcrypt |
| 邮箱验证 | ✅ | ✅ | 直接使用 |
| 密码重置 | ✅ | ✅ | 直接使用 |
| Session 管理 | ✅ | ✅ | JWT + Cookie |
| 记住我 | ✅ | ✅ | 配置 sessionExpiresAt |
| 多租户组织 | ✅ | ✅ | organization 插件 |
| 角色权限 | ⚠️ | ✅ | 需扩展 + CASL |
| SSO 集成 | ✅ | 🔶 | sso 插件（可选） |
| MFA | ⚠️ | 🔶 | 需要额外实现 |
| API Key | ❌ | ✅ | 需自行实现 |

### 4.2 需要自行实现的功能

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        需要自行实现的功能                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   1. API Key 认证                                                           │
│      ├── 生成/撤销 API Key                                                  │
│      ├── API Key 验证 Guard                                                 │
│      └── 与用户/组织关联                                                    │
│                                                                             │
│   2. 增强权限系统                                                            │
│      ├── CASL Ability 集成                                                  │
│      ├── 细粒度权限定义                                                      │
│      └── 权限继承（组织 → 环境）                                             │
│                                                                             │
│   3. 租户隔离增强                                                            │
│      ├── 行级数据隔离                                                       │
│      ├── 租户上下文传递                                                     │
│      └── 跨租户访问控制                                                     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 五、数据库设计

### 5.1 Better Auth 表结构

```sql
-- Better Auth 内置表（自动创建）
CREATE TABLE "user" (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  email_verified BOOLEAN DEFAULT FALSE,
  image TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE "session" (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES "user"(id),
  expires_at TIMESTAMP NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE "account" (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES "user"(id),
  account_id TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  access_token_expires_at TIMESTAMP,
  refresh_token_expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE "verification" (
  id TEXT PRIMARY KEY,
  identifier TEXT NOT NULL,
  value TEXT NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Organization 插件表
CREATE TABLE "organization" (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE "member" (
  id TEXT PRIMARY KEY,
  organization_id TEXT REFERENCES "organization"(id),
  user_id TEXT REFERENCES "user"(id),
  role TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE "invitation" (
  id TEXT PRIMARY KEY,
  organization_id TEXT REFERENCES "organization"(id),
  email TEXT NOT NULL,
  role TEXT NOT NULL,
  status TEXT NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 5.2 oksai 扩展表

```sql
-- oksai 扩展：API Key
CREATE TABLE "api_key" (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES "user"(id),
  organization_id TEXT REFERENCES "organization"(id),
  key_hash TEXT NOT NULL,
  name TEXT,
  last_used_at TIMESTAMP,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- oksai 扩展：细粒度权限
CREATE TABLE "permission" (
  id TEXT PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  description TEXT
);

CREATE TABLE "role_permission" (
  role TEXT NOT NULL,
  permission_id TEXT REFERENCES "permission"(id),
  PRIMARY KEY (role, permission_id)
);
```

---

## 六、前端集成方案

### 6.1 前端包结构

```
packages/auth-react/
├── src/
│   ├── index.ts                    # 导出入口
│   ├── client.ts                   # Better Auth 客户端配置
│   │
│   ├── provider/
│   │   ├── auth-provider.tsx       # 认证 Provider
│   │   └── auth-context.ts         # React Context
│   │
│   ├── hooks/
│   │   ├── use-auth.ts             # 认证状态 Hook
│   │   ├── use-user.ts             # 用户信息 Hook
│   │   ├── use-organization.ts     # 组织信息 Hook
│   │   └── use-session.ts          # 会话管理 Hook
│   │
│   ├── components/
│   │   ├── sign-in.tsx             # 登录表单
│   │   ├── sign-up.tsx             # 注册表单
│   │   ├── forgot-password.tsx     # 忘记密码
│   │   ├── reset-password.tsx      # 重置密码
│   │   ├── verify-email.tsx        # 邮箱验证
│   │   ├── user-button.tsx         # 用户菜单
│   │   ├── organization-switcher.tsx  # 组织切换
│   │   ├── organization-create.tsx    # 创建组织
│   │   └── protect.tsx             # 权限保护组件
│   │
│   └── types/
│       └── auth.types.ts           # 类型定义
│
├── package.json
└── tsconfig.json
```

### 6.2 客户端配置

```typescript
// packages/auth-react/src/client.ts

import { createAuthClient } from 'better-auth/react';
import { organizationClient } from 'better-auth/client/plugins';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

/**
 * oksai Better Auth 客户端
 */
export const authClient = createAuthClient({
  baseURL: `${API_BASE_URL}/v1/auth`,
  plugins: [
    organizationClient(),
  ],
  fetchOptions: {
    credentials: 'include',
    auth: {
      type: 'Bearer',
      token: () => localStorage.getItem('oksai-session-token') || '',
    },
    onSuccess: (ctx) => {
      const token = ctx.response.headers.get('set-auth-token');
      if (token) {
        localStorage.setItem('oksai-session-token', token);
      }
    },
  },
});

export type AuthClient = typeof authClient;
```

---

## 七、工作量估算

### 7.1 开发任务分解

| 阶段 | 任务 | 工作量 | 优先级 |
|:---|:---|:---:|:---:|
| **P1: 基础设施** | | | |
| | 安装配置 Better Auth | 0.5d | P0 |
| | 数据库表创建与迁移 | 0.5d | P0 |
| | BetterAuthAdapter 实现 | 2d | P0 |
| | AuthModule 配置 | 1d | P0 |
| **P2: 领域层** | | | |
| | IAuthPort 接口定义 | 0.5d | P0 |
| | User 聚合根扩展 | 1d | P1 |
| | 认证相关领域事件 | 0.5d | P1 |
| | 用户同步服务 | 1d | P1 |
| **P3: 应用层** | | | |
| | 登录/注册 Command Handler | 1d | P1 |
| | 会话验证 Query Handler | 0.5d | P1 |
| | 组织管理 Command Handler | 1d | P2 |
| **P4: 接口层** | | | |
| | Auth Controller | 1d | P1 |
| | JWT Guard | 0.5d | P1 |
| | DTO 定义 | 0.5d | P1 |
| **P5: 前端** | | | |
| | @oksai/auth-react 包初始化 | 0.5d | P1 |
| | AuthProvider + Hooks | 1.5d | P1 |
| | 登录/注册组件 | 1d | P1 |
| | 组织管理组件 | 1d | P2 |
| | 权限保护组件 | 0.5d | P2 |
| **P6: 扩展功能** | | | |
| | API Key 认证 | 2d | P2 |
| | CASL 权限集成 | 1.5d | P2 |
| | 租户隔离增强 | 1d | P2 |
| **P7: 测试** | | | |
| | 单元测试 | 2d | P1 |
| | 集成测试 | 1.5d | P1 |
| | E2E 测试 | 1d | P2 |

### 7.2 工作量汇总

| 阶段 | 工作量 |
|:---|:---:|
| P1: 基础设施 | 4d |
| P2: 领域层 | 3d |
| P3: 应用层 | 3d |
| P4: 接口层 | 3d |
| P5: 前端 | 5.5d |
| P6: 扩展功能 | 4.5d |
| P7: 测试 | 4.5d |
| **总计** | **27.5d** |

**建议分阶段交付**：
- **MVP (P1-P4)**: 约 13 个工作日
- **完整版 (P1-P7)**: 约 28 个工作日

---

## 八、风险评估

### 8.1 技术风险

| 风险 | 影响 | 概率 | 缓解措施 |
|:---|:---|:---:|:---|
| Better Auth 版本不稳定 | 中 | 低 | 锁定版本，关注更新 |
| 用户同步数据不一致 | 高 | 中 | 事件驱动同步 + 定期校验 |
| JWT 性能问题 | 中 | 低 | Redis 缓存 Session |
| 组织切换延迟 | 低 | 中 | 前端乐观更新 |
| SSO 集成复杂度 | 中 | 中 | 渐进式支持 SSO |

### 8.2 架构风险

| 风险 | 影响 | 概率 | 缓解措施 |
|:---|:---|:---:|:---|
| 领域层污染 | 高 | 低 | 严格 Port/Adapter 边界 |
| 循环依赖 | 中 | 低 | 模块依赖检查 |
| 认证逻辑泄漏到业务层 | 中 | 中 | 代码审查 + 架构测试 |

### 8.3 运维风险

| 风险 | 影响 | 概率 | 缓解措施 |
|:---|:---|:---:|:---|
| 数据库迁移失败 | 高 | 低 | 迁移脚本测试 + 回滚方案 |
| 认证服务宕机 | 高 | 低 | 健康检查 + 自动重启 |
| 密钥泄露 | 高 | 低 | 密钥轮换 + 密钥管理服务 |

---

## 九、可行性结论

### 9.1 可行性评估

| 维度 | 评分 | 说明 |
|:---|:---:|:---|
| **技术可行性** | ⭐⭐⭐⭐⭐ | Better Auth 成熟稳定，与 NestJS 兼容 |
| **架构兼容性** | ⭐⭐⭐⭐ | 通过 Port/Adapter 可完美适配 DDD |
| **功能覆盖** | ⭐⭐⭐⭐ | 核心功能覆盖 90%，API Key 需自行实现 |
| **工作量合理** | ⭐⭐⭐⭐ | MVP 约 13d，完整版约 28d |
| **风险可控** | ⭐⭐⭐⭐ | 风险已知且可控 |

### 9.2 建议

1. **采用 Better Auth** ✅
   - 技术可行、架构兼容、功能覆盖充分
   - 开源免费、无用户数限制、自托管

2. **分阶段实施**
   - Phase 1: MVP (P1-P4) - 核心认证功能
   - Phase 2: 前端集成 (P5) - React 组件库
   - Phase 3: 扩展功能 (P6) - API Key + 权限增强
   - Phase 4: 测试完善 (P7) - 全面测试覆盖

3. **架构原则**
   - 严格遵循 Port/Adapter 模式
   - Better Auth 作为基础设施层 Adapter
   - 领域层定义认证 Port 接口
   - 用户数据通过事件同步

4. **需要关注**
   - API Key 认证需自行实现
   - 细粒度权限需结合 CASL
   - SSO 作为可选扩展

---

## 十、下一步行动

### 10.1 立即行动

- [ ] 安装 better-auth 依赖
- [ ] 创建数据库迁移脚本
- [ ] 实现 BetterAuthAdapter
- [ ] 定义 IAuthPort 接口

### 10.2 短期计划 (1-2 周)

- [ ] 完成 P1-P4 阶段
- [ ] 基础认证功能可用
- [ ] 单元测试覆盖

### 10.3 中期计划 (3-4 周)

- [ ] 完成前端 React 组件库
- [ ] API Key 认证实现
- [ ] 权限系统集成

---

*文档版本：1.0*
*创建时间：2026-02-22*
*作者：AI Assistant*

# Novu 身份认证机制研究

## 概述

本目录包含对 Novu 开源通知平台身份认证机制的深入研究文档。Novu 采用了多层次的认证体系，支持社区版和企业版两种部署模式，实现了完整的用户认证、API 认证、OAuth 集成和企业级 SSO。

## 文档索引

| 文档 | 内容 |
|:---|:---|
| [01-架构概览.md](./01-架构概览.md) | 认证模块结构、支持的认证方式、流程总览、模块动态加载 |
| [02-JWT与APIKey认证.md](./02-JWT与APIKey认证.md) | JWT Strategy、API Key Strategy、订阅者认证 |
| [03-OAuth与企业版认证.md](./03-OAuth与企业版认证.md) | GitHub OAuth、Clerk 集成、Better Auth、组织切换 |
| [04-安全机制.md](./04-安全机制.md) | 密码哈希、登录锁定、密码重置限流、CORS 配置 |
| [05-缓存与会话管理.md](./05-缓存与会话管理.md) | LRU 缓存架构、会话上下文传递、缓存失效策略 |
| [06-Better-Auth集成.md](./06-Better-Auth集成.md) | Better Auth 深入研究：前后端职责划分、组件实现、配置指南 |

## 认证方式总览

```
┌─────────────────────────────────────────────────────────────────────┐
│                       Novu 认证方式                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   社区版                          企业版                             │
│   ┌───────────────────────┐      ┌───────────────────────┐         │
│   │ • JWT Bearer          │      │ • Clerk JWT           │         │
│   │ • API Key             │      │ • Better Auth JWT     │         │
│   │ • 订阅者 JWT          │      │ • Keyless 模式        │         │
│   │ • GitHub OAuth        │      │ • 企业 SSO            │         │
│   └───────────────────────┘      └───────────────────────┘         │
│                                                                      │
│   ┌─────────────────────────────────────────────────────────────┐  │
│   │                      适用场景                                 │  │
│   │                                                              │  │
│   │   JWT Bearer    → Dashboard 用户登录                         │  │
│   │   API Key       → 外部 API 调用（服务间通信）                 │  │
│   │   订阅者 JWT    → Widget/Inbox 前端组件访问                  │  │
│   │   GitHub OAuth  → 社交登录                                   │  │
│   │   Clerk         → 企业级身份管理（SaaS）                     │  │
│   │   Better Auth   → 企业自托管认证                             │  │
│   │   Keyless       → 演示/测试环境                              │  │
│   │                                                              │  │
│   └─────────────────────────────────────────────────────────────┘  │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## 核心概念

### UserSessionData

认证成功后，用户会话数据注入到请求上下文：

```typescript
type UserSessionData = {
  _id: string;                    // 用户 ID
  organizationId: string;         // 组织 ID（多租户核心）
  environmentId: string;          // 环境 ID
  roles: MemberRoleEnum[];        // 角色
  permissions: PermissionsEnum[]; // 权限
  scheme: ApiAuthSchemeEnum;      // 认证方案
};
```

### 认证流程

```
请求 → Guard → Strategy → 验证凭证 → 加载用户 → 构建会话 → 注入 request.user
```

### 装饰器

| 装饰器 | 用途 |
|:---|:---|
| `@RequireAuthentication()` | 标记需要认证的路由 |
| `@UserSession()` | 注入用户会话数据 |
| `@RequirePermissions(...)` | 标记需要特定权限的路由 |
| `@ExternalApiAccessible()` | 标记可从外部 API 访问 |

## 安全特性

| 特性 | 实现 |
|:---|:---|
| 密码哈希 | bcrypt, salt rounds = 10 |
| 登录保护 | 5 次失败后锁定 5 分钟 |
| 密码重置限流 | 5 次/分钟, 15 次/天 |
| CORS | 白名单验证, 开发环境通配 |
| HTTP 安全头 | Helmet |
| 用户枚举防护 | 统一响应时间, 统一成功消息 |

## 缓存策略

| 存储 | TTL | 用途 |
|:---|:---|:---|
| API_KEY_USER | 60s | API Key 用户会话 |
| ORGANIZATION | 60s | 组织信息 |
| ENVIRONMENT | 60s | 环境配置 |

## 与 oksai-data-plateform 的对比

| 方面 | Novu | oksai-data-plateform 目标 |
|:---|:---|:---|
| 架构模式 | NestJS 模块化 | DDD + 六边形 + CQRS |
| 认证策略 | Passport Strategy | 领域层 Port + 基础设施层 Adapter |
| 会话管理 | request.user | 租户上下文（TenantContext） |
| 缓存 | 内存 LRU | 可扩展为 Redis |
| 权限 | RBAC | 可扩展为 ABAC |

## 可借鉴的设计

1. **双重认证模式**：JWT（Dashboard）+ API Key（外部 API）
2. **动态模块加载**：社区版/企业版配置分离
3. **LRU 缓存**：减少数据库查询，支持并发控制
4. **登录保护**：失败计数 + 时间窗口锁定
5. **CORS 策略**：路由级别的差异化配置

---

*文档版本：1.0*  
*更新时间：2026-02-22*

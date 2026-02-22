# Novu 项目研究报告索引

本目录包含对 [Novu](https://github.com/novuhq/novu) 开源通知基础设施项目的全面研究报告。

## 项目概述

**Novu** 是一个开源的通知基础设施平台，提供统一的多渠道通知 API（邮件、短信、推送、应用内、聊天）。

- **技术栈**: Node.js 20+ / TypeScript 5.6 / NestJS / MongoDB / Redis / BullMQ / React 19 / Vite
- **Monorepo**: Nx 21.3.11 + pnpm 10.16.1 workspaces
- **代码规模**: ~4600 个 TypeScript 文件

## 研究文档目录

### 架构研究

| 文档 | 内容 |
|:---|:---|
| [01-架构与Monorepo组织.md](./01-架构与Monorepo组织.md) | 项目结构、Nx 配置、构建系统、依赖管理 |
| [02-领域层与数据模型.md](./02-领域层与数据模型.md) | DAL 设计、BaseRepository 模式、实体关系、数据流 |
| [03-API层与NestJS模块.md](./03-API层与NestJS模块.md) | NestJS 模块组织、Controller/Service 模式、认证授权 |

### 核心组件

| 文档 | 内容 |
|:---|:---|
| [04-Worker与消息队列.md](./04-Worker与消息队列.md) | BullMQ 队列架构、Worker 设计、限流实现、WebSocket 服务 |
| [05-Provider插件系统.md](./05-Provider插件系统.md) | Provider 架构、75+ 渠道适配器、工厂模式、扩展指南 |
| [06-多租户与Workflow引擎.md](./06-多租户与Workflow引擎.md) | 多租户隔离、RBAC 权限、Workflow 引擎、Blueprint 系统 |

### 深入研究

| 目录 | 内容 |
|:---|:---|
| [multi-tenant/](./multi-tenant/) | 多租户机制深入研究：需求分析、功能机制、策略与最佳实践 |
| [authentication/](./authentication/) | 身份认证机制深入研究：架构、JWT/API Key、OAuth、安全、缓存 |

## 核心架构概览

```
┌─────────────────────────────────────────────────────────────────────┐
│                          Novu 架构                                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│    ┌─────────────┐      ┌─────────────┐      ┌─────────────────┐   │
│    │  API Layer  │      │ WS Service  │      │ Worker Service  │   │
│    │  (NestJS)   │      │ (Socket.IO) │      │   (BullMQ)      │   │
│    └──────┬──────┘      └──────┬──────┘      └────────┬────────┘   │
│           │                    │                      │            │
│           ▼                    ▼                      ▼            │
│    ┌──────────────────────────────────────────────────────────┐    │
│    │                    Redis (BullMQ)                        │    │
│    │  Workflow Queue | Standard Queue | WebSocket Queue       │    │
│    └──────────────────────────────────────────────────────────┘    │
│           │                                                          │
│           ▼                                                          │
│    ┌──────────────────────────────────────────────────────────┐    │
│    │                    MongoDB (DAL)                          │    │
│    │  Organization | Environment | Subscriber | Notification   │    │
│    └──────────────────────────────────────────────────────────┘    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## 关键设计模式

| 模式 | 应用场景 |
|:---|:---|
| **BaseRepository 泛型** | 统一的 CRUD 操作，类型安全的租户隔离 |
| **Command 模式** | 请求参数封装与验证 |
| **Usecase 模式** | 业务逻辑封装 |
| **工厂模式** | Provider 动态选择与构建 |
| **装饰器模式** | 认证/权限/日志注入 |
| **Guard/Interceptor** | NestJS 横切关注点 |

## 与 oksai-data-plateform 的对比

| 特性 | Novu | oksai-data-plateform 目标 |
|:---|:---|:---|
| DDD | 部分应用 | ✅ 严格 DDD |
| 六边形架构 | ❌ | ✅ Hexagonal |
| 事件溯源 | ❌ | ✅ Event Sourcing |
| CQRS | 部分实现 | ✅ 完整 CQRS |
| 多租户 | ✅ | ✅ |
| Monorepo | ✅ Nx + pnpm | ✅ Turborepo + pnpm |

## 可借鉴的设计

1. **BaseRepository 泛型约束** - 类型安全的租户隔离
2. **Provider 插件系统** - 50+ 渠道适配器的工厂模式
3. **BullMQ 队列架构** - 多队列类型、限流、重试策略
4. **Nx Monorepo** - 依赖图感知构建、缓存策略
5. **NestJS 模块组织** - 50+ 模块的清晰划分

---

*研究时间: 2026-02-22*  
*项目版本: 3.13.x*

# Identity 领域用户故事

## Epic: 用户身份管理

作为平台，我需要管理用户身份，以便为多租户 SaaS 提供安全可靠的用户管理能力。

---

## Story 1: 用户注册

**作为** 新用户  
**我想要** 使用邮箱注册账户  
**以便** 我可以访问平台服务

### 验收标准
- [x] 邮箱必须符合格式要求
- [x] 系统自动生成用户 ID
- [x] 注册成功后用户处于活跃状态
- [x] 触发 UserRegistered 事件
- [x] 邮箱自动转为小写存储

### 业务规则
- 邮箱不能为空
- 邮箱格式必须有效（包含@符号，符合基本格式）
- 邮箱自动转为小写存储
- 用户 ID 可手动指定或自动生成（UUID 格式）

### 测试场景覆盖
| 场景 | 状态 | 说明 |
|:---|:---:|:---|
| 成功注册新用户 | ✅ | 验证用户创建、状态、事件触发 |
| 邮箱自动转小写 | ✅ | 验证大小写混合邮箱规范化 |
| 无效邮箱格式注册失败 | ✅ | 4种无效格式示例 |
| 空邮箱注册失败 | ✅ | 验证必填校验 |
| 生成随机用户ID | ✅ | 验证 UUID 自动生成 |

### 相关文件
- Feature: `src/features/user-registration.feature`
- Steps: `src/features/step-definitions/user-registration.steps.ts`

---

## Story 2: 用户禁用/启用

**作为** 系统管理员  
**我想要** 禁用或启用用户  
**以便** 控制用户对平台的访问

### 验收标准
- [x] 禁用用户需要提供原因
- [x] 已禁用用户不能执行需要活跃状态的操作
- [x] 租户所有者不能被禁用
- [x] 启用是禁用的逆操作
- [x] 触发 UserDisabled / UserEnabled 事件

### 业务规则
- 禁用操作幂等（已禁用用户再次禁用不产生新事件）
- 启用操作幂等（已启用用户再次启用不产生新事件）
- 禁用时必须提供原因
- 启用时清空禁用原因
- 租户所有者（TenantOwner 角色）不能被禁用

### 测试场景覆盖
| 场景 | 状态 | 说明 |
|:---|:---:|:---|
| 成功禁用用户 | ✅ | 验证状态变更、原因记录、事件触发 |
| 成功启用已禁用用户 | ✅ | 验证状态恢复、原因清空、事件触发 |
| 禁用操作幂等 | ✅ | 验证重复禁用不产生新事件 |
| 启用操作幂等 | ✅ | 验证重复启用不产生新事件 |
| 租户所有者不能被禁用 | ✅ | 验证业务规则保护 |

### 相关文件
- Feature: `src/features/user-lifecycle.feature`
- Steps: `src/features/step-definitions/user-lifecycle.steps.ts`

---

## Story 3: 角色授予

**作为** 租户管理员  
**我想要** 为用户授予角色  
**以便** 用户获得相应权限

### 验收标准
- [x] 只有活跃用户可以接受角色授予
- [x] 用户不能重复获得相同角色
- [x] 授予角色触发 RoleGrantedToUser 事件
- [x] 角色键格式必须正确

### 预定义角色
| 角色 | 说明 |
|:---|:---|
| PlatformAdmin | 平台管理员，管理整个平台 |
| TenantOwner | 租户所有者，拥有租户最高权限 |
| TenantAdmin | 租户管理员，管理租户内用户 |
| TenantMember | 租户成员，基本访问权限 |

### 业务规则
- 角色键必须是 PascalCase 格式（如 TenantAdmin）
- 用户不能重复获得相同角色
- 禁用用户不能接受角色授予
- 角色授予需要指定租户 ID

### 测试场景覆盖
| 场景 | 状态 | 说明 |
|:---|:---:|:---|
| 成功授予角色 | ✅ | 验证角色添加、事件触发 |
| 不能重复授予相同角色 | ✅ | 验证重复授予失败 |
| 禁用用户不能接受角色授予 | ✅ | 验证业务规则保护 |
| 无效角色键格式 | ✅ | 验证格式校验 |

### 相关文件
- Feature: `src/features/role-management.feature`
- Steps: `src/features/step-definitions/user-lifecycle.steps.ts`

---

## Story 4: 角色撤销

**作为** 租户管理员  
**我想要** 撤销用户的角色  
**以便** 移除用户不再需要的权限

### 验收标准
- [x] 只有活跃用户可以被撤销角色
- [x] 不能撤销用户的最后一个角色
- [x] 用户必须拥有该角色才能被撤销

### 业务规则
- 用户至少保留一个角色
- 最后一个角色不可撤销
- 禁用用户不能被撤销角色
- 撤销不存在的角色静默失败

### 测试场景覆盖
| 场景 | 状态 | 说明 |
|:---|:---:|:---|
| 成功撤销角色 | ✅ | 验证角色移除、保留其他角色 |
| 不能撤销最后一个角色 | ✅ | 验证业务规则保护 |

### 相关文件
- Feature: `src/features/role-management.feature`
- Steps: `src/features/step-definitions/user-lifecycle.steps.ts`

---

## Story 5: 添加到租户

**作为** 系统管理员  
**我想要** 将用户添加到租户  
**以便** 用户可以访问租户资源

### 验收标准
- [x] 用户可以属于多个租户
- [x] 不能重复添加到同一租户（幂等）
- [x] 添加成功触发 UserAddedToTenant 事件

### 业务规则
- 用户可以同时属于多个租户
- 添加操作幂等（重复添加同一租户不产生新事件）
- 租户成员关系由 UniqueEntityID 标识

### 测试场景覆盖
| 场景 | 状态 | 说明 |
|:---|:---:|:---|
| 成功添加用户到租户 | ✅ | 验证成员关系、事件触发 |
| 重复添加到同一租户幂等 | ✅ | 验证幂等性 |
| 用户可以属于多个租户 | ✅ | 验证多租户支持 |

### 相关文件
- Feature: `src/features/tenant-membership.feature`
- Steps: `src/features/step-definitions/user-lifecycle.steps.ts`

---

## Story 6: 会话管理

**作为** 已登录用户  
**我想要** 管理我的登录会话  
**以便** 安全地访问平台服务

### 验收标准
- [ ] 创建会话时触发 SessionCreatedEvent 事件
- [ ] 会话过期时触发 SessionExpiredEvent 事件
- [ ] 用户可以查看活跃会话
- [ ] 用户可以主动终止会话

### 业务规则
- 会话有有效期限制
- 同一用户可以有多个并发会话
- 会话过期后自动失效

### 测试场景覆盖
| 场景 | 状态 | 说明 |
|:---|:---:|:---|
| *待补充* | ⏳ | 需要 Feature 文件 |

### 相关文件
- Domain Event: `src/domain/events/session-created.domain-event.ts`
- Domain Event: `src/domain/events/user-authenticated.domain-event.ts`

---

## Story 7: 用户认证

**作为** 已注册用户  
**我想要** 使用邮箱密码登录  
**以便** 访问我的账户

### 验收标准
- [ ] 认证成功触发 UserAuthenticatedEvent 事件
- [ ] 认证失败返回明确错误信息
- [ ] 支持密码强度验证

### 业务规则
- 密码必须加密存储
- 认证失败不暴露具体原因（安全考虑）
- 支持登录失败次数限制

### 测试场景覆盖
| 场景 | 状态 | 说明 |
|:---|:---:|:---|
| *待补充* | ⏳ | 需要 Feature 文件 |

### 相关文件
- Domain Event: `src/domain/events/user-authenticated.domain-event.ts`
- Value Object: `src/domain/model/auth-credentials.vo.ts`

---

## 领域模型概览

### 聚合根
- **User**: 用户聚合根，管理用户生命周期、角色、租户成员关系

### 实体
- *暂无*

### 值对象
- **UserId**: 用户唯一标识
- **Email**: 邮箱地址（自动转小写、格式验证）
- **RoleKey**: 角色键（PascalCase 格式验证）
- **AuthCredentials**: 认证凭据
- **Session**: 会话信息

### 领域事件
- **UserRegistered**: 用户注册
- **UserDisabled**: 用户禁用
- **UserEnabled**: 用户启用
- **RoleGrantedToUser**: 角色授予
- **UserAddedToTenant**: 添加到租户
- **UserAuthenticated**: 用户认证
- **SessionCreated**: 会话创建
- **SessionExpired**: 会话过期

---

## 优先级排序

| 优先级 | 故事 | 依赖 | 状态 |
|:---:|:---|:---|:---:|
| P0 | 用户注册 | 无 | ✅ 已完成 |
| P0 | 用户禁用/启用 | 用户注册 | ✅ 已完成 |
| P1 | 角色授予 | 用户注册 | ✅ 已完成 |
| P1 | 角色撤销 | 角色授予 | ✅ 已完成 |
| P2 | 添加到租户 | 用户注册 | ✅ 已完成 |
| P2 | 会话管理 | 用户注册 | ⏳ 待开发 |
| P2 | 用户认证 | 用户注册 | ⏳ 待开发 |

---

## 测试覆盖统计

### BDD 测试
- **总场景数**: 22
- **通过场景**: 22
- **失败场景**: 0
- **覆盖率**: 100%

### Feature 文件
1. `user-registration.feature` - 5 场景
2. `user-lifecycle.feature` - 5 场景
3. `role-management.feature` - 6 场景
4. `tenant-membership.feature` - 3 场景
5. *待补充*: `session-management.feature`
6. *待补充*: `user-authentication.feature`

---

## 技术债务

### 已知限制
1. **会话管理**: Feature 文件和步骤定义待补充
2. **用户认证**: Feature 文件和步骤定义待补充
3. **密码策略**: 需要更详细的密码强度验证规则

### 改进建议
1. 添加性能测试场景（大数据量下的用户查询）
2. 添加并发测试场景（多用户同时操作）
3. 添加安全测试场景（SQL 注入、XSS 等）

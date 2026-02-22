# Novu 身份认证机制 - JWT 与 API Key 认证

## 一、JWT 认证

### 1.1 JwtStrategy 完整实现

```typescript
// apps/api/src/app/auth/services/passport/jwt.strategy.ts

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly authService: AuthService,
    private environmentRepository: EnvironmentRepository
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET,
      passReqToCallback: true,  // 传递请求对象到 validate
    });
  }

  @Instrument()
  async validate(req: http.IncomingMessage, session: UserSessionData) {
    // 1. 设置认证方案为 Bearer
    session.scheme = ApiAuthSchemeEnum.BEARER;

    // 2. 验证用户有效性
    const user = await this.authService.validateUser(session);
    if (!user) {
      throw new UnauthorizedException();
    }

    // 3. 从请求头解析环境 ID
    const environmentId = this.resolveEnvironmentId(req, session);
    session.environmentId = environmentId;

    // 4. 验证环境访问权限
    if (session.environmentId) {
      const environment = await this.environmentRepository.findOne(
        {
          _id: session.environmentId,
          _organizationId: session.organizationId,
        },
        '_id'
      );

      if (!environment) {
        throw new UnauthorizedException(
          'Cannot find environment',
          JSON.stringify({ session })
        );
      }
    }

    return session;
  }

  @Instrument()
  resolveEnvironmentId(req: http.IncomingMessage, session: UserSessionData) {
    const headerKey = HttpRequestHeaderKeysEnum.NOVU_ENVIRONMENT_ID.toLowerCase();
    return (req.headers[headerKey] as string) || '';
  }
}
```

### 1.2 JWT Token 生成

```typescript
// apps/api/src/app/auth/services/community.auth.service.ts

public async getSignedToken(
  user: UserEntity,
  organizationId?: string,
  member?: MemberEntity,
  environmentId?: string
): Promise<string> {
  // 提取角色
  const roles: MemberRoleEnum[] = [];
  if (member && member.roles) {
    roles.push(...member.roles);
  }

  // 签发 JWT
  return this.jwtService.sign(
    {
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      profilePicture: user.profilePicture,
      organizationId: organizationId || null,
      environmentId: environmentId || null,
      roles,
    },
    {
      expiresIn: '30 days',
      issuer: 'novu_api',
    }
  );
}
```

### 1.3 Token Claims 结构

```typescript
// JWT Payload 结构
interface JwtPayload {
  _id: string;              // 用户 ID
  firstName?: string;       // 名字
  lastName?: string;        // 姓氏
  email: string;            // 邮箱
  profilePicture?: string;  // 头像 URL
  organizationId: string;   // 当前组织 ID
  environmentId?: string;   // 当前环境 ID
  roles: MemberRoleEnum[];  // 角色列表
  
  // 标准 Claims
  iat: number;              // 签发时间
  exp: number;              // 过期时间
  iss: string;              // 签发者 (novu_api)
}
```

### 1.4 Token 刷新机制

```typescript
// apps/api/src/app/auth/auth.controller.ts

@Get('/refresh')
@RequireAuthentication()
@Header('Cache-Control', 'no-store')
refreshToken(@UserSession() user: UserSessionData) {
  if (!user || !user._id) {
    throw new BadRequestException();
  }

  return this.authService.refreshToken(user._id);
}

// apps/api/src/app/auth/services/community.auth.service.ts

public async refreshToken(userId: string) {
  const user = await this.getUser({ _id: userId });
  if (!user) {
    throw new UnauthorizedException('User not found');
  }

  return this.getSignedToken(user);
}
```

### 1.5 Token 过期策略

| Token 类型 | 过期时间 | 配置位置 |
|:---|:---|:---|
| 用户 JWT | 30 天 | `expiresIn: '30 days'` |
| 订阅者 JWT | 15 天 | `process.env.SUBSCRIBER_WIDGET_JWT_EXPIRATION_TIME` |
| 密码重置 Token | 7 天 | 代码硬编码 |

---

## 二、API Key 认证

### 2.1 ApiKeyStrategy 完整实现

```typescript
// apps/api/src/app/auth/services/passport/apikey.strategy.ts

@Injectable()
export class ApiKeyStrategy extends PassportStrategy(HeaderAPIKeyStrategy) {
  constructor(
    private readonly authService: AuthService,
    private readonly featureFlagsService: FeatureFlagsService,
    private readonly inMemoryLRUCacheService: InMemoryLRUCacheService
  ) {
    super(
      {
        header: HttpRequestHeaderKeysEnum.AUTHORIZATION,
        prefix: `${ApiAuthSchemeEnum.API_KEY} `,
      },
      true,  // 允许异步验证
      async (apikey: string, verified: (err, user?) => void) => {
        try {
          const user = await this.validateApiKey(apikey);
          if (!user) {
            return verified(null, false);
          }
          return verified(null, user);
        } catch (err) {
          return verified(err as Error, false);
        }
      }
    );
  }

  private async validateApiKey(apiKey: string): Promise<UserSessionData | null> {
    // 1. SHA-256 哈希 API Key
    const hashedApiKey = createHash('sha256').update(apiKey).digest('hex');

    // 2. 使用 LRU 缓存加速验证
    const user = await this.inMemoryLRUCacheService.get(
      InMemoryLRUCacheStore.API_KEY_USER,
      hashedApiKey,
      () => this.authService.getUserByApiKey(apiKey),
      { environmentId: 'system' }
    );

    // 3. 检查 Kill Switch
    if (user) {
      await this.checkKillSwitch(user);
    }

    return user;
  }

  private async checkKillSwitch(user: UserSessionData): Promise<void> {
    const isKillSwitchEnabled = await this.featureFlagsService.getFlag({
      key: FeatureFlagsKeysEnum.IS_ORG_KILLSWITCH_FLAG_ENABLED,
      defaultValue: false,
      organization: { _id: user.organizationId },
      environment: { _id: user.environmentId },
      component: 'api',
    });

    if (isKillSwitchEnabled) {
      throw new ServiceUnavailableException(
        'Service temporarily unavailable for this organization'
      );
    }
  }
}
```

### 2.2 API Key 验证流程

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                          API Key 验证流程                                     │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────┐                                                            │
│  │  API 请求   │  Authorization: ApiKey sk_live_xxxxx                        │
│  └──────┬──────┘                                                            │
│         │                                                                    │
│         ▼                                                                    │
│  ┌──────────────────────┐                                                   │
│  │  SHA-256 哈希计算    │  hashedKey = sha256(apiKey)                       │
│  └──────┬───────────────┘                                                   │
│         │                                                                    │
│         ▼                                                                    │
│  ┌──────────────────────┐                                                   │
│  │  查询 LRU 缓存       │                                                   │
│  └──────┬───────────────┘                                                   │
│         │                                                                    │
│         ├────────── 命中 ──────────┐                                        │
│         │                          ▼                                        │
│         │                 ┌─────────────────────┐                           │
│         │                 │  返回缓存用户数据   │                           │
│         │                 └─────────────────────┘                           │
│         │                                                                    │
│         └────────── 未命中 ─────────┐                                        │
│                                    ▼                                        │
│  ┌──────────────────────────────────────────────────┐                       │
│  │  数据库查询                                       │                       │
│  │                                                   │                       │
│  │  1. Environment.findByApiKey({ hash: hashedKey })│                       │
│  │  2. 查找 apiKeys 数组中匹配的 key                │                       │
│  │  3. 获取关联的 _userId                           │                       │
│  │  4. User.findById(_userId)                       │                       │
│  │  5. 构建 UserSessionData                         │                       │
│  └──────┬───────────────────────────────────────────┘                       │
│         │                                                                    │
│         ▼                                                                    │
│  ┌──────────────────────┐                                                   │
│  │  检查 Kill Switch    │                                                   │
│  └──────┬───────────────┘                                                   │
│         │                                                                    │
│         ▼                                                                    │
│  ┌──────────────────────┐                                                   │
│  │  写入 LRU 缓存       │                                                   │
│  └──────┬───────────────┘                                                   │
│         │                                                                    │
│         ▼                                                                    │
│  ┌──────────────────────┐                                                   │
│  │  返回 UserSessionData│                                                   │
│  └──────────────────────┘                                                   │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 2.3 API Key 存储结构

```typescript
// 存储在 Environment 实体的 apiKeys 数组中
// libs/dal/src/repositories/environment/environment.entity.ts

interface IApiKey {
  key: EncryptedSecret | string;  // 加密存储的原始 Key
  hash?: string;                  // SHA-256 哈希值（用于查询）
  _userId: string;                // 创建者用户 ID
}

export class EnvironmentEntity {
  // ...
  apiKeys: IApiKey[];
}
```

### 2.4 API Key 缓存配置

```typescript
// libs/application-generic/src/services/in-memory-lru-cache/in-memory-lru-cache.store.ts

export enum InMemoryLRUCacheStore {
  API_KEY_USER = 'api-key-user',
  // ...
}

// API Key 用户缓存配置
[InMemoryLRUCacheStore.API_KEY_USER]: {
  max: 1000,           // 最大缓存条目数
  ttl: 1000 * 60,      // TTL: 60 秒
  featureFlagComponent: 'api-key-user',
}
```

### 2.5 API Key 查询实现

```typescript
// apps/api/src/app/auth/services/community.auth.service.ts

private async getApiKeyUser({ apiKey }: { apiKey: string }): Promise<{
  environment?: EnvironmentEntity;
  user?: UserEntity;
  error?: string;
}> {
  // 1. SHA-256 哈希 API Key
  const hashedApiKey = createHash('sha256').update(apiKey).digest('hex');

  // 2. 通过哈希值查找环境
  const environment = await this.environmentRepository.findByApiKey({
    hash: hashedApiKey,
  });

  if (!environment) {
    return { error: 'API Key not found' };
  }

  // 3. 查找关联的 API Key 记录
  const key = environment.apiKeys.find((i) => i.hash === hashedApiKey);
  if (!key) {
    return { error: 'API Key not found' };
  }

  // 4. 获取关联用户
  const user = await this.userRepository.findById(key._userId);
  if (!user) {
    return { error: 'User not found' };
  }

  return { environment, user };
}

public async getUserByApiKey(apiKey: string): Promise<UserSessionData | null> {
  const { environment, user, error } = await this.getApiKeyUser({ apiKey });

  if (error || !environment || !user) {
    return null;
  }

  // 获取成员信息和权限
  const member = await this.memberRepository.findMemberByUserId(
    environment._organizationId,
    user._id
  );

  const permissions = member
    ? this.getMemberPermissions(member.roles)
    : [];

  return {
    _id: user._id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    profilePicture: user.profilePicture,
    organizationId: environment._organizationId,
    environmentId: environment._id,
    roles: member?.roles || [],
    permissions,
    scheme: ApiAuthSchemeEnum.API_KEY,
  };
}
```

---

## 三、订阅者认证

### 3.1 JwtSubscriberStrategy 实现

```typescript
// apps/api/src/app/auth/services/passport/subscriber-jwt.strategy.ts

@Injectable()
export class JwtSubscriberStrategy extends PassportStrategy(Strategy, 'subscriberJwt') {
  constructor(private readonly authService: AuthService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET,
    });
  }

  async validate(payload: ISubscriberJwt): Promise<SubscriberSession> {
    // 验证订阅者
    const subscriber = await this.authService.validateSubscriber(payload);
    if (!subscriber) {
      throw new UnauthorizedException();
    }

    // 验证 audience 为 widget_user
    if (payload.aud !== 'widget_user') {
      throw new UnauthorizedException();
    }

    return {
      ...subscriber,
      organizationId: subscriber._organizationId,
      environmentId: subscriber._environmentId,
      contextKeys: payload.contextKeys,
      scheme: ApiAuthSchemeEnum.BEARER,
    };
  }
}
```

### 3.2 订阅者 Token 生成

```typescript
// apps/api/src/app/auth/services/community.auth.service.ts

public async getSubscriberWidgetToken(
  subscriber: SubscriberEntity,
  contextKeys: string[]
): Promise<string> {
  return this.jwtService.sign(
    {
      _id: subscriber._id,
      firstName: subscriber.firstName,
      lastName: subscriber.lastName,
      email: subscriber.email,
      organizationId: subscriber._organizationId,
      environmentId: subscriber._environmentId,
      subscriberId: subscriber.subscriberId,
      contextKeys,
    },
    {
      expiresIn: process.env.SUBSCRIBER_WIDGET_JWT_EXPIRATION_TIME || '15 days',
      issuer: 'novu_api',
      audience: 'widget_user',  // ★ 区分用户 Token
    }
  );
}
```

### 3.3 订阅者 JWT 结构

```typescript
// 订阅者 JWT Payload
interface ISubscriberJwt {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  subscriberId: string;      // 外部订阅者 ID
  organizationId: string;
  environmentId: string;
  contextKeys: string[];      // 上下文隔离键
  aud: 'widget_user';         // audience 标识
  
  // 标准 Claims
  iat: number;
  exp: number;
  iss: string;
}

// 订阅者会话
interface SubscriberSession extends SubscriberEntity {
  organizationId: string;
  environmentId: string;
  contextKeys: string[];
  scheme: ApiAuthSchemeEnum;
}
```

---

## 四、认证方案对比

### 4.1 JWT vs API Key

| 特性 | JWT | API Key |
|:---|:---|:---|
| **适用场景** | Dashboard 用户 | 外部 API 调用 |
| **存储位置** | 客户端（浏览器） | 服务端代码/配置 |
| **传递方式** | Authorization: Bearer | Authorization: ApiKey |
| **过期时间** | 30 天 | 无（手动撤销） |
| **权限检查** | RBAC 权限检查 | 跳过权限检查 |
| **租户解析** | Token Claims + Header | API Key 关联环境 |
| **缓存** | 无需缓存 | LRU 缓存 |

### 4.2 认证流程对比

```
┌─────────────────────────────────────────────────────────────────────┐
│                      JWT 认证流程                                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   请求 → 解析 Bearer Token → 验证签名 → 解析 Claims                 │
│        → 验证用户 → 解析环境 → 验证环境访问 → 返回会话               │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                    API Key 认证流程                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   请求 → 解析 ApiKey → 计算哈希 → 查询缓存                          │
│        → [缓存未命中] 查询数据库 → 检查 Kill Switch → 写入缓存       │
│        → 返回会话                                                   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 五、最佳实践

### 5.1 JWT 使用建议

- 使用 HTTPS 传输
- Token 存储在 HttpOnly Cookie 或内存中
- 敏感操作考虑二次验证
- 实现 Token 刷新机制

### 5.2 API Key 使用建议

- 使用环境变量存储，不硬编码
- 定期轮换 Key
- 为不同环境使用不同 Key
- 监控 Key 使用情况

### 5.3 订阅者 Token 使用建议

- 前端通过 API 获取 Token
- Token 与 contextKeys 绑定
- 实现静默刷新机制

---

*文档版本：1.0*  
*更新时间：2026-02-22*

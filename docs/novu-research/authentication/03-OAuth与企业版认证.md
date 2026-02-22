# Novu 身份认证机制 - OAuth 与企业版认证

## 一、GitHub OAuth

### 1.1 GitHubStrategy 实现

```typescript
// apps/api/src/app/auth/services/passport/github.strategy.ts

@Injectable()
export class GitHubStrategy extends PassportStrategy(githubPassport.Strategy, 'github') {
  constructor(private authService: AuthService) {
    super({
      clientID: process.env.GITHUB_OAUTH_CLIENT_ID,
      clientSecret: process.env.GITHUB_OAUTH_CLIENT_SECRET,
      callbackURL: `${process.env.API_ROOT_URL}/v1/auth/github/callback`,
      scope: ['user:email'],
      passReqToCallback: true,
      store: {
        // State Store 实现
        verify(req, state: string, meta: Metadata, callback) {
          callback(null, true, JSON.stringify(req.query));
        },
        store(req, meta: Metadata, callback: StateStoreStoreCallback) {
          callback(null, JSON.stringify(req.query));
        },
      },
    });
  }

  async validate(
    req,
    accessToken: string,
    refreshToken: string,
    githubProfile,
    done: (err, data) => void
  ) {
    try {
      const profile = {
        ...githubProfile._json,
        email: githubProfile.emails[0].value,
      };
      const parsedState = this.parseState(req);

      const response = await this.authService.authenticate(
        AuthProviderEnum.GITHUB,
        accessToken,
        refreshToken,
        profile,
        parsedState?.distinctId,
        {
          origin: parsedState?.source,
          invitationToken: parsedState?.invitationToken,
        }
      );

      done(null, {
        token: response.token,
        newUser: response.newUser,
      });
    } catch (err) {
      done(err, false);
    }
  }

  private parseState(req) {
    try {
      return JSON.parse(req.query.state);
    } catch (e) {
      return {};
    }
  }
}
```

### 1.2 OAuth 流程

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                          GitHub OAuth 流程                                   │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. 用户点击 "GitHub 登录"                                                    │
│     ┌─────────────┐                                                          │
│     │   前端      │                                                          │
│     └──────┬──────┘                                                          │
│            │                                                                  │
│            ▼                                                                  │
│  2. 重定向到 GitHub 授权页面                                                  │
│     GET https://github.com/login/oauth/authorize                              │
│        ?client_id=xxx                                                         │
│        &redirect_uri=xxx                                                      │
│        &scope=user:email                                                      │
│        &state={"source":"dashboard"}                                          │
│                                                                              │
│            ▼                                                                  │
│  3. 用户授权                                                                  │
│     ┌─────────────┐                                                          │
│     │  GitHub     │                                                          │
│     └──────┬──────┘                                                          │
│            │                                                                  │
│            ▼                                                                  │
│  4. GitHub 回调到 Novu                                                        │
│     GET /v1/auth/github/callback                                              │
│        ?code=xxx                                                              │
│        &state={"source":"dashboard"}                                          │
│                                                                              │
│            ▼                                                                  │
│  5. Passport GitHubStrategy 处理                                              │
│     ├── 使用 code 换取 access_token                                           │
│     ├── 使用 access_token 获取用户信息                                        │
│     └── 调用 validate() 方法                                                  │
│                                                                              │
│            ▼                                                                  │
│  6. 创建或关联用户                                                            │
│     ├── 查找邮箱对应的用户                                                    │
│     ├── 存在 → 更新信息，生成 Token                                           │
│     └── 不存在 → 创建用户，生成 Token                                         │
│                                                                              │
│            ▼                                                                  │
│  7. 重定向到前端                                                              │
│     GET https://web.novu.co/auth/login?token=xxx&newUser=true                 │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 1.3 OAuth 回调处理

```typescript
// apps/api/src/app/auth/auth.controller.ts

@Get('/github/callback')
@UseGuards(AuthGuard('github'))
async githubCallback(@Req() request, @Res() response) {
  const url = buildOauthRedirectUrl(request);
  return response.redirect(url);
}

// libs/application-generic/src/services/auth/shared.ts

export const buildOauthRedirectUrl = (request): string => {
  let url = `${process.env.FRONT_BASE_URL}/auth/login`;

  if (!request.user || !request.user.token) {
    return `${url}?error=AuthenticationError`;
  }

  const { redirectUrl } = JSON.parse(request.query.state);

  // 安全检查：只允许 localhost 重定向
  if (
    redirectUrl &&
    redirectUrl.startsWith('http://127.0.0.1:') &&
    !redirectUrl.includes('@')
  ) {
    url = redirectUrl;
  }

  url += `?token=${request.user.token}`;

  if (request.user.newUser) {
    url += '&newUser=true';
  }

  return url;
};
```

### 1.4 用户创建/关联

```typescript
// apps/api/src/app/auth/services/community.auth.service.ts

public async authenticate(
  authProvider: AuthProviderEnum,
  accessToken: string,
  refreshToken: string,
  profile: { name, login, email, avatar_url, id },
  distinctId: string,
  { origin, invitationToken }: AuthenticateContext = {}
) {
  const email = normalizeEmail(profile.email);
  let user = await this.userRepository.findByEmail(email);
  let newUser = false;

  if (!user) {
    // 创建新用户
    const firstName = profile.name
      ? profile.name.split(' ').slice(0, -1).join(' ')
      : profile.login;
    const lastName = profile.name
      ? profile.name.split(' ').slice(-1).join(' ')
      : null;

    user = await this.createUserUsecase.execute(
      CreateUserCommand.create({
        picture: profile.avatar_url,
        email,
        firstName,
        lastName,
        auth: {
          username: profile.login,
          profileId: profile.id,
          provider: authProvider,
          accessToken,
          refreshToken,
        },
      })
    );
    newUser = true;

    // 分析追踪
    if (distinctId) {
      this.analyticsService.alias(distinctId, user._id);
    }

    this.analyticsService.track('[Authentication] - Signup', user._id, {
      loginType: authProvider,
      origin,
      wasInvited: Boolean(invitationToken),
    });
  } else {
    // 更新现有用户的 GitHub 信息
    if (authProvider === AuthProviderEnum.GITHUB) {
      user = await this.updateUserUsername(user, profile, authProvider);
    }

    this.analyticsService.track('[Authentication] - Login', user._id, {
      loginType: authProvider,
    });
  }

  this.analyticsService.upsertUser(user, user._id);

  return {
    newUser,
    token: await this.generateUserToken(user),
  };
}
```

---

## 二、Clerk 集成（企业版）

### 2.1 Clerk 配置与启用

```typescript
// packages/shared/src/utils/env.ts

export const isClerkEnabled = () => {
  return isEEAuthEnabled() && getEEAuthProvider() === 'clerk';
};

export const isEEAuthEnabled = () => {
  return (
    process.env.NOVU_ENTERPRISE === 'true' ||
    process.env.CI_EE_TEST === 'true'
  );
};

export const getEEAuthProvider = (): EEAuthProvider => {
  const provider = process.env.EE_AUTH_PROVIDER as EEAuthProvider | undefined;
  return provider || 'clerk';
};
```

### 2.2 Clerk JWT Payload 结构

```typescript
// Clerk JWT Payload 结构
interface ClerkJwtPayload {
  _id: string;                    // Clerk 用户 ID
  org_id: string;                 // Clerk 组织 ID
  firstName: string;
  lastName: string;
  profilePicture: string;
  email: string;
  org_role: MemberRoleEnum;       // 组织角色
  org_permissions: string[];      // 组织权限
  externalId?: string;            // 外部用户 ID（用于关联）
  externalOrgId?: string;         // 外部组织 ID（用于关联）
}
```

### 2.3 Clerk 用户同步

```typescript
// 企业版 Clerk 策略通过 ee-auth 包动态加载
// 核心流程：将 Clerk 用户/组织与 Novu 内部实体关联

// 1. 通过 externalId 关联内部用户
// 2. 通过 externalOrgId 关联内部组织
// 3. 同步角色和权限

// 伪代码展示关联逻辑
async validate(request, payload: ClerkJwtPayload): Promise<UserSessionData> {
  // 调用链接服务，将 Clerk 实体映射到 Novu 实体
  const { userId, organizationId } = await this.linkInternalExternalEntities(
    request,
    payload
  );

  // 获取成员信息和权限
  const member = await this.memberRepository.findMemberByUserId(
    organizationId,
    userId
  );

  const permissions = member
    ? this.getMemberPermissions(member.roles)
    : [];

  return {
    _id: userId,                          // 内部用户 ID
    firstName: payload.firstName,
    lastName: payload.lastName,
    email: payload.email,
    organizationId,                        // 内部组织 ID
    roles: member?.roles || [],
    permissions,
    environmentId: this.getDefaultEnvironment(organizationId),
    scheme: ApiAuthSchemeEnum.BEARER,
  };
}
```

### 2.4 Clerk 模块动态加载

```typescript
// apps/api/src/app/auth/ee.auth.module.config.ts

export function getEEModuleConfig(): ModuleMetadata {
  const eeAuthPackage = require('@novu/ee-auth');
  const eeAuthModule = eeAuthPackage?.eeAuthModule;

  if (!eeAuthModule) {
    throw new PlatformException('ee-auth module is not loaded');
  }

  return {
    imports: [...eeAuthModule.imports],
    controllers: [...eeAuthModule.controllers],
    providers: [
      ...eeAuthModule.providers,
      // 复用的服务
      ApiKeyStrategy,
      JwtSubscriberStrategy,
      AuthService,
      cacheService,
      featureFlagsService,
      InMemoryLRUCacheService,
      RootEnvironmentGuard,
    ],
    exports: [
      ...eeAuthModule.exports,
      RootEnvironmentGuard,
      AuthService,
    ],
  };
}
```

---

## 三、Better Auth 集成（企业版）

### 3.1 Better Auth 配置

```typescript
// Better Auth 是自托管的企业认证方案
// 配置启用
export const isBetterAuthEnabled = () => {
  return (
    isEEAuthEnabled() && 
    getEEAuthProvider() === 'better-auth'
  );
};
```

### 3.2 Better Auth 路由特点

```typescript
// Better Auth 路由需要严格的 origin 验证
// CORS 配置中特殊处理

function isBetterAuthRoute(url: string): boolean {
  return url.startsWith('/v1/better-auth');
}

// Better Auth 路由不使用通配符 CORS
function enableWildcard(req: Request): boolean {
  return (
    (isDevelopmentEnvironment() ||
     isWidgetRoute(req.url) ||
     isInboxRoute(req.url) ||
     isBlueprintRoute(req.url)) &&
    !isBetterAuthRoute(req.url)  // ★ Better Auth 路由排除
  );
}
```

---

## 四、Keyless 模式

### 4.1 概述

Keyless 模式是一种无认证模式，用于特定场景（如演示、测试）：

```typescript
// 无认证方案的会话数据
interface KeylessSession extends UserSessionData {
  scheme: ApiAuthSchemeEnum.KEYLESS;
}

// 特定条件下跳过认证
if (isKeylessMode()) {
  return {
    _id: 'keyless-user',
    organizationId: 'keyless-org',
    environmentId: 'keyless-env',
    roles: [MemberRoleEnum.OWNER],
    permissions: ALL_PERMISSIONS,
    scheme: ApiAuthSchemeEnum.KEYLESS,
  };
}
```

---

## 五、组织与环境切换

### 5.1 跨组织切换

```typescript
// apps/api/src/app/auth/usecases/switch-organization/switch-organization.usecase.ts

@Injectable()
export class SwitchOrganization {
  constructor(
    private userRepository: UserRepository,
    private memberRepository: MemberRepository,
    private authService: AuthService
  ) {}

  async execute(command: SwitchOrganizationCommand) {
    // 1. 验证用户是否属于目标组织
    const isAuthenticated = await this.authService.isAuthenticatedForOrganization(
      command.userId,
      command.newOrganizationId
    );
    if (!isAuthenticated) {
      throw new UnauthorizedException(
        `Not authorized for organization ${command.newOrganizationId}`
      );
    }

    // 2. 获取成员信息
    const member = await this.memberRepository.findMemberByUserId(
      command.newOrganizationId,
      command.userId
    );
    if (!member) {
      throw new BadRequestException('Member not found');
    }

    // 3. 获取用户信息
    const user = await this.userRepository.findById(command.userId);
    if (!user) {
      throw new BadRequestException(`User ${command.userId} not found`);
    }

    // 4. 生成包含新组织信息的新 Token
    const token = await this.authService.getSignedToken(
      user,
      command.newOrganizationId,
      member
    );

    return token;
  }
}
```

### 5.2 环境切换

```typescript
// apps/api/src/app/auth/usecases/switch-environment/switch-environment.usecase.ts

@Injectable()
export class SwitchEnvironment {
  constructor(
    private environmentRepository: EnvironmentRepository,
    private memberRepository: MemberRepository,
    private userRepository: UserRepository,
    private authService: AuthService
  ) {}

  async execute(command: SwitchEnvironmentCommand) {
    // 1. 验证环境存在
    const environment = await this.environmentRepository.findOne({
      _id: command.newEnvironmentId,
    });
    if (!environment) {
      throw new NotFoundException('Environment not found');
    }

    // 2. 验证环境属于当前组织
    if (environment._organizationId !== command.organizationId) {
      throw new UnauthorizedException('Not authorized for organization');
    }

    // 3. 获取成员信息
    const member = await this.memberRepository.findMemberByUserId(
      command.organizationId,
      command.userId
    );
    if (!member) {
      throw new NotFoundException('Member is not found');
    }

    // 4. 获取用户信息
    const user = await this.userRepository.findById(command.userId);
    if (!user) {
      throw new NotFoundException('User is not found');
    }

    // 5. 生成包含新环境信息的新 Token
    const token = await this.authService.getSignedToken(
      user,
      command.organizationId,
      member,
      command.newEnvironmentId
    );

    return token;
  }
}
```

---

## 六、认证方式选择指南

| 场景 | 推荐认证方式 | 说明 |
|:---|:---|:---|
| Dashboard 用户登录 | JWT Bearer | 标准 Web 应用认证 |
| 外部 API 调用 | API Key | 服务间通信 |
| Widget/Inbox 访问 | 订阅者 JWT | 前端组件访问 |
| GitHub 登录 | GitHub OAuth | 社交登录 |
| 企业 SSO | Clerk/Better Auth | 企业级身份管理 |
| 演示/测试 | Keyless | 无认证模式 |

---

*文档版本：1.0*  
*更新时间：2026-02-22*

# Novu 身份认证机制 - Better Auth 集成（企业版）

## 一、Better Auth 概述

### 1.1 什么是 Better Auth

[Better Auth](https://www.better-auth.com/) 是一个开源的、自托管的企业级认证框架，专为现代 Web 应用设计。Novu 在企业自托管场景中使用 Better Auth 替代 Clerk，提供完整的身份认证解决方案。

### 1.2 Better Auth vs Clerk

| 特性 | Better Auth | Clerk |
|:---|:---|:---|
| 部署方式 | 自托管 | SaaS |
| 数据存储 | 自有数据库 | Clerk 托管 |
| 成本 | 开源免费 | 按用户收费 |
| SSO 支持 | ✓ | ✓ |
| 组织管理 | ✓ | ✓ |
| 自定义程度 | 高 | 中 |
| 运维复杂度 | 高 | 低 |

### 1.3 Novu 中的启用条件

```typescript
// packages/shared/src/utils/env.ts

export type EEAuthProvider = 'clerk' | 'better-auth';

export const isEEAuthEnabled = () => {
  return (
    process.env.NOVU_ENTERPRISE === 'true' ||
    process.env.CI_EE_TEST === 'true'
  );
};

export const isBetterAuthEnabled = () => {
  return isEEAuthEnabled() && getEEAuthProvider() === 'better-auth';
};

export const getEEAuthProvider = (): EEAuthProvider => {
  const provider = process.env.EE_AUTH_PROVIDER as EEAuthProvider | undefined;
  return provider || 'clerk';
};
```

---

## 二、架构设计

### 2.1 整体架构

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                     Better Auth 集成架构                                      │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   前端 (Dashboard)                      后端 (API + Better Auth Server)       │
│   ┌─────────────────────────┐          ┌─────────────────────────────────┐   │
│   │                         │          │                                 │   │
│   │  @clerk/clerk-react     │          │  /v1/better-auth/*              │   │
│   │  (别名替换)              │  ──────▶ │  Better Auth Server             │   │
│   │         ↓               │          │  (独立进程或嵌入)                │   │
│   │  better-auth/react      │          │                                 │   │
│   │                         │          │  ┌─────────────────────────┐    │   │
│   │  ┌─────────────────┐    │          │  │ Database (PostgreSQL/  │    │   │
│   │  │ AuthClient      │    │          │  │ MySQL/SQLite)           │    │   │
│   │  │ - signIn        │    │          │  └─────────────────────────┘    │   │
│   │  │ - signUp        │    │          │                                 │   │
│   │  │ - signOut       │    │          └─────────────────────────────────┘   │
│   │  │ - organization  │    │                       │                       │
│   │  │ - session       │    │                       ▼                       │
│   │  └─────────────────┘    │          ┌─────────────────────────────────┐   │
│   │                         │          │  Novu API                        │   │
│   │  ┌─────────────────┐    │          │  ┌─────────────────────────┐    │   │
│   │  │ AuthProvider    │    │  ◀─────  │  │ JwtStrategy             │    │   │
│   │  │ - useAuth       │    │  JWT     │  │ - 验证 Better Auth JWT  │    │   │
│   │  │ - useUser       │    │  Token   │  │ - 同步用户到 Novu DB    │    │   │
│   │  │ - useOrg        │    │          │  │ - 加载权限              │    │   │
│   │  └─────────────────┘    │          │  └─────────────────────────┘    │   │
│   │                         │          └─────────────────────────────────┘   │
│   └─────────────────────────┘                                                │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 前后端职责划分

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                          前后端职责划分                                        │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                          前端职责                                    │   │
│   ├─────────────────────────────────────────────────────────────────────┤   │
│   │                                                                      │   │
│   │   1. 认证 UI 组件                                                    │   │
│   │      ├── SignIn          - 登录表单                                  │   │
│   │      ├── SignUp          - 注册表单                                  │   │
│   │      ├── ForgotPassword  - 忘记密码                                  │   │
│   │      ├── ResetPassword   - 重置密码                                  │   │
│   │      ├── VerifyEmail     - 邮箱验证                                  │   │
│   │      ├── SSOSignIn       - SSO 登录                                  │   │
│   │      └── UserButton      - 用户菜单                                  │   │
│   │                                                                      │   │
│   │   2. 组织管理 UI 组件                                                │   │
│   │      ├── OrganizationCreate    - 创建组织                            │   │
│   │      ├── OrganizationSwitcher  - 切换组织                            │   │
│   │      ├── OrganizationList      - 组织列表                            │   │
│   │      └── TeamMembers           - 成员管理                            │   │
│   │                                                                      │   │
│   │   3. 认证状态管理                                                    │   │
│   │      ├── AuthProvider         - React Context Provider               │   │
│   │      ├── useAuth()            - 认证状态 Hook                        │   │
│   │      ├── useUser()            - 用户信息 Hook                        │   │
│   │      └── useOrganization()    - 组织信息 Hook                        │   │
│   │                                                                      │   │
│   │   4. 权限控制                                                        │   │
│   │      ├── Protect              - 权限保护组件                          │   │
│   │      └── has()                - 权限检查函数                          │   │
│   │                                                                      │   │
│   │   5. Token 管理                                                      │   │
│   │      └── localStorage         - 存储会话 Token                       │   │
│   │                                                                      │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                          后端职责                                    │   │
│   ├─────────────────────────────────────────────────────────────────────┤   │
│   │                                                                      │   │
│   │   1. Better Auth Server                                              │   │
│   │      ├── 用户注册/登录/登出                                          │   │
│   │      ├── 密码哈希/验证                                               │   │
│   │      ├── Session 管理                                                │   │
│   │      ├── JWT 签发                                                    │   │
│   │      ├── 组织 CRUD                                                   │   │
│   │      ├── 成员邀请                                                    │   │
│   │      └── SSO 集成                                                    │   │
│   │                                                                      │   │
│   │   2. Novu API (JWT 验证)                                             │   │
│   │      ├── 验证 Better Auth JWT                                        │   │
│   │      ├── 同步用户到 Novu 内部数据库                                  │   │
│   │      ├── 同步组织到 Novu 内部数据库                                  │   │
│   │      ├── 加载成员角色和权限                                          │   │
│   │      └── 构建 UserSessionData                                        │   │
│   │                                                                      │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 三、前端实现

### 3.1 Vite 构建配置（别名替换）

Novu 使用 Vite 的别名机制，在 Better Auth 模式下将 `@clerk/clerk-react` 替换为自定义实现：

```typescript
// apps/dashboard/vite.config.ts

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const isSelfHosted = env.VITE_SELF_HOSTED === 'true';
  const eeAuthProvider = env.VITE_EE_AUTH_PROVIDER || 'clerk';
  const isEnterprise = env.VITE_NOVU_ENTERPRISE === 'true';
  const isCommunitySelHosted = isSelfHosted && !isEnterprise;

  return {
    resolve: {
      alias: {
        // Better Auth 模式：替换 Clerk 为 Better Auth 实现
        ...(isCommunitySelHosted
          ? {
              '@clerk/clerk-react': path.resolve(__dirname, './src/utils/self-hosted/index.tsx'),
            }
          : eeAuthProvider === 'better-auth'
            ? {
                '@clerk/clerk-react': path.resolve(__dirname, './src/utils/better-auth/index.tsx'),
                '@/context/region': path.resolve(__dirname, './src/context/region/index.self-hosted.ts'),
                '@/components/side-navigation/organization-dropdown-clerk': path.resolve(
                  __dirname,
                  './src/utils/better-auth/components/organization-dropdown.tsx'
                ),
                '@/components/auth/create-organization': path.resolve(
                  __dirname,
                  './src/utils/better-auth/components/organization-create.tsx'
                ),
              }
            : {}),
        '@': path.resolve(__dirname, './src'),
      },
    },
  };
});
```

### 3.2 Better Auth 客户端配置

```typescript
// apps/dashboard/src/utils/better-auth/client.ts

import { ssoClient } from '@better-auth/sso/client';
import { organizationClient } from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';
import { API_HOSTNAME, BETTER_AUTH_BASE_URL } from '@/config';

// 构建完整 URL
const baseURL = BETTER_AUTH_BASE_URL || API_HOSTNAME || 'http://localhost:3000';
const fullBaseURL = `${baseURL}/v1/better-auth`;

/**
 * Better Auth React 客户端
 * - 集成组织插件
 * - 集成 SSO 插件
 * - 自动管理 Token
 */
export const authClient = createAuthClient({
  baseURL: fullBaseURL,
  plugins: [
    organizationClient(),  // 组织管理
    ssoClient(),           // SSO 支持
  ],
  fetchOptions: {
    credentials: 'include',  // 携带 Cookie
    auth: {
      type: 'Bearer',
      // 从 localStorage 获取 Token
      token: () => localStorage.getItem('better-auth-session-token') || '',
    },
    onSuccess: (ctx) => {
      // 从响应头获取新 Token 并存储
      const authToken = ctx.response.headers.get('set-auth-token');
      if (authToken) {
        localStorage.setItem('better-auth-session-token', authToken);
      }
    },
  },
});

export type AuthClient = typeof authClient;
```

### 3.3 认证 Provider（Clerk 兼容层）

为了保持与 Clerk API 的兼容性，Novu 实现了一个兼容层：

```typescript
// apps/dashboard/src/utils/better-auth/index.tsx

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authClient } from './client';

// 类型定义
type BetterAuthUser = {
  id: string;
  email: string;
  name: string;
  image?: string;
  emailVerified: boolean;
};

type BetterAuthOrganization = {
  id: string;
  name: string;
  slug: string;
};

type AuthContextType = {
  user: BetterAuthUser | null;
  organization: BetterAuthOrganization | null;
  memberRole: MemberRoleEnum | null;
  isLoaded: boolean;
  signOut: () => Promise<void>;
  getToken: () => Promise<string | null>;
  refreshSession: () => Promise<void>;
  has: (params: { permission: PermissionsEnum } | { role: MemberRoleEnum }) => boolean;
};

const AuthContext = createContext<AuthContextType | null>(null);

/**
 * ClerkProvider 兼容层
 * 使用 Better Auth 客户端实现 Clerk 的 API
 */
export function ClerkProvider({ children }: { children: React.ReactNode }) {
  // 获取 Session 数据
  const { data: sessionData, isPending, refetch } = authClient.useSession();
  const [organization, setOrganization] = useState<BetterAuthOrganization | undefined>(undefined);
  const [memberRole, setMemberRole] = useState<MemberRoleEnum | null>(null);

  const activeOrganizationId = sessionData?.session?.activeOrganizationId;
  const currentUserId = sessionData?.user?.id;

  // 加载组织详情和成员角色
  useEffect(() => {
    const fetchOrganization = async () => {
      if (activeOrganizationId && currentUserId) {
        try {
          const { data: fullOrgData } = await authClient.organization.getFullOrganization({
            query: { organizationId: activeOrganizationId },
          });

          if (fullOrgData) {
            setOrganization({
              id: fullOrgData.id,
              name: fullOrgData.name,
              slug: fullOrgData.slug,
            });

            // 查找当前用户的成员角色
            const currentMember = (fullOrgData as any).members?.find(
              (member: any) => member.userId === currentUserId
            );
            setMemberRole(currentMember?.role as MemberRoleEnum || null);
          }
        } catch (error) {
          console.error('Failed to fetch organization:', error);
        }
      }
    };

    fetchOrganization();
  }, [activeOrganizationId, currentUserId]);

  // 登出
  const signOut = useCallback(async () => {
    await authClient.signOut();
    localStorage.removeItem('better-auth-session-token');
    window.location.href = ROUTES.SIGN_IN;
  }, []);

  // 获取 Token
  const getToken = useCallback(async () => {
    return localStorage.getItem('better-auth-session-token');
  }, []);

  // 权限检查
  const has = useCallback(
    (params: { permission: PermissionsEnum } | { role: MemberRoleEnum }) => {
      if (!memberRole) return false;

      if ('permission' in params) {
        const userPermissions = ROLE_PERMISSIONS[memberRole] || [];
        return userPermissions.includes(params.permission);
      }

      if ('role' in params) {
        return memberRole === params.role;
      }

      return false;
    },
    [memberRole]
  );

  const value = useMemo(
    () => ({
      user: sessionData?.user ? {
        id: sessionData.user.id,
        email: sessionData.user.email,
        name: sessionData.user.name,
        image: sessionData.user.image || undefined,
        emailVerified: sessionData.user.emailVerified,
      } : null,
      organization: organization || null,
      memberRole,
      isLoaded: !isPending,
      signOut,
      getToken,
      refreshSession: async () => { await refetch(); },
      has,
    }),
    [sessionData, organization, memberRole, isPending, signOut, getToken, has]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// 导出兼容 Clerk 的 Hooks
export function useAuth() {
  const context = useContext(AuthContext);
  return {
    isLoaded: context?.isLoaded,
    isSignedIn: !!context?.user,
    userId: context?.user?.id,
    orgId: context?.organization?.id,
    signOut: context?.signOut,
    has: context?.has,
  };
}

export function useUser() {
  const context = useContext(AuthContext);
  return {
    user: context?.user ? {
      id: context.user.id,
      emailAddresses: [{ emailAddress: context.user.email }],
      primaryEmailAddress: { emailAddress: context.user.email },
      fullName: context.user.name,
      imageUrl: context.user.image,
    } : null,
    isLoaded: context?.isLoaded,
  };
}

export function useOrganization() {
  const context = useContext(AuthContext);
  return {
    organization: context?.organization ? {
      id: context.organization.id,
      name: context.organization.name,
      slug: context.organization.slug,
    } : null,
    isLoaded: context?.isLoaded,
  };
}
```

### 3.4 登录组件

```typescript
// apps/dashboard/src/utils/better-auth/components/sign-in.tsx

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authClient } from '../client';

export function SignIn() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showResendVerification, setShowResendVerification] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setShowResendVerification(false);
    setIsLoading(true);

    try {
      // 调用 Better Auth 登录 API
      const { data, error: authError } = await authClient.signIn.email({
        email,
        password,
      });

      if (authError) {
        // 邮箱未验证
        if (authError.status === 403) {
          setShowResendVerification(true);
          throw new Error('Please verify your email address before signing in.');
        }
        throw new Error(authError.message || 'Sign in failed');
      }

      if (!data?.token || !data?.user) {
        throw new Error('Sign in failed');
      }

      // 存储 Token
      localStorage.setItem('better-auth-session-token', data.token);

      // 检查是否有待处理的邀请
      const pendingInvitationId = sessionStorage.getItem('pendingInvitationId');
      if (pendingInvitationId) {
        window.location.href = `${ROUTES.INVITATION_ACCEPT}?id=${pendingInvitationId}`;
        return;
      }

      // 跳转到主页
      window.location.href = ROUTES.INBOX_USECASE;
    } catch (e: any) {
      setError(e.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  // 重发验证邮件
  const handleResendVerification = async () => {
    setIsLoading(true);
    try {
      await authClient.sendVerificationEmail({
        email,
        callbackURL: window.location.origin + ROUTES.SIGN_IN,
      });
      setError('Verification email sent! Please check your inbox.');
      setShowResendVerification(false);
    } catch (e: any) {
      setError(e.message || 'Failed to send verification email.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-md pt-12">
      <h2 className="mb-6 text-center text-xl font-semibold">Sign In</h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 邮箱输入 */}
        <div>
          <label htmlFor="email">Email</label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        
        {/* 密码输入 */}
        <div>
          <label htmlFor="password">Password</label>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <span onClick={() => navigate(ROUTES.FORGOT_PASSWORD)}>
            Forgot password?
          </span>
        </div>

        {/* 错误提示 */}
        {error && (
          <div>
            <p className="text-red-600">{error}</p>
            {showResendVerification && (
              <Button onClick={handleResendVerification}>
                Resend Verification Email
              </Button>
            )}
          </div>
        )}

        {/* 提交按钮 */}
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Signing In...' : 'Sign In'}
        </Button>
      </form>

      {/* SSO 入口（企业版） */}
      {IS_ENTERPRISE && (
        <Button onClick={() => navigate(ROUTES.SSO_SIGN_IN)}>
          Sign in with SSO
        </Button>
      )}
    </div>
  );
}
```

### 3.5 注册组件

```typescript
// apps/dashboard/src/utils/better-auth/components/sign-up.tsx

import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authClient } from '../client';

export function SignUp() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // 密码验证规则
  const validatePassword = (password: string) => {
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecialChar = /[#?!@$%^&*()-]/.test(password);
    const isLengthValid = password.length >= 8 && password.length <= 64;

    if (!isLengthValid) return 'Password must be between 8 and 64 characters';
    if (!hasUpperCase) return 'Password must contain at least one uppercase letter';
    if (!hasLowerCase) return 'Password must contain at least one lowercase letter';
    if (!hasNumber) return 'Password must contain at least one number';
    if (!hasSpecialChar) return 'Password must contain at least one special character';

    return null;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    // 验证密码
    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      setIsLoading(false);
      return;
    }

    try {
      // 调用 Better Auth 注册 API
      const { data, error: signUpError } = await authClient.signUp.email({
        email,
        password,
        name: `${firstName} ${lastName}`.trim(),
        callbackURL: window.location.origin + ROUTES.SIGN_IN,
      });

      if (signUpError) {
        throw new Error(signUpError.message || 'Sign up failed');
      }

      if (!data?.user) {
        throw new Error('Sign up failed');
      }

      // 如果需要邮箱验证
      if (!data.token) {
        navigate(`${ROUTES.VERIFY_EMAIL}?email=${encodeURIComponent(email)}`);
        return;
      }

      // 存储 Token
      localStorage.setItem('better-auth-session-token', data.token);

      // 跳转到组织创建页面
      navigate(ROUTES.SIGNUP_ORGANIZATION_LIST);
    } catch (e: any) {
      setError(e.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md pt-12">
      <h2 className="mb-6 text-center text-xl font-semibold">Create Account</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 姓名输入 */}
        <div>
          <label>First Name *</label>
          <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
        </div>
        <div>
          <label>Last Name</label>
          <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
        </div>
        
        {/* 邮箱输入 */}
        <div>
          <label>Email *</label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        
        {/* 密码输入 */}
        <div>
          <label>Password *</label>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <p className="text-xs">
            Min. 8 characters, include uppercase, lowercase, number, and special character.
          </p>
        </div>

        {/* 错误提示 */}
        {error && <p className="text-red-600">{error}</p>}

        {/* 提交按钮 */}
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Creating Account...' : 'Create Account'}
        </Button>
      </form>
    </div>
  );
}
```

### 3.6 组织管理组件

#### 组织切换器

```typescript
// apps/dashboard/src/utils/better-auth/components/organization-switcher.tsx

import { useEffect, useState } from 'react';
import { authClient } from '../client';

export function OrganizationSwitcher() {
  const [currentOrg, setCurrentOrg] = useState<any>(null);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // 获取当前 Session
      const { data: session } = await authClient.getSession();
      const activeOrgId = session?.session?.activeOrganizationId;

      // 获取组织列表
      const { data: orgs } = await authClient.organization.list();
      setOrganizations(orgs || []);

      // 设置当前组织
      if (activeOrgId) {
        const active = orgs?.find((org: any) => org.id === activeOrgId);
        setCurrentOrg(active);
      }
    } catch (e) {
      console.error('Failed to load organization data:', e);
    }
  };

  // 切换组织
  const handleSwitch = async (organizationId: string) => {
    try {
      await authClient.organization.setActive({ organizationId });
      setIsOpen(false);
      window.location.reload();  // 刷新页面以加载新组织数据
    } catch (e) {
      console.error('Failed to switch organization:', e);
    }
  };

  return (
    <div className="relative">
      <button onClick={() => setIsOpen(!isOpen)}>
        <span>{currentOrg?.name || 'Select Organization'}</span>
      </button>

      {isOpen && (
        <div className="dropdown-menu">
          {organizations.map((org) => (
            <button key={org.id} onClick={() => handleSwitch(org.id)}>
              <div className="font-medium">{org.name}</div>
              <div className="text-xs">{org.slug}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

#### 创建组织

```typescript
// apps/dashboard/src/utils/better-auth/components/organization-create.tsx

import { useState } from 'react';
import { authClient } from '../client';

function CreateOrganizationForm({ onSuccess }: { onSuccess: () => void }) {
  const [orgName, setOrgName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      // 创建组织
      const { data, error: createError } = await authClient.organization.create({
        name: orgName,
        slug: orgName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      });

      if (createError) {
        throw new Error(createError.message || 'Failed to create organization');
      }

      // 设置为活跃组织
      if (data?.id) {
        await authClient.organization.setActive({ organizationId: data.id });
        onSuccess();
      }
    } catch (e: any) {
      setError(e.message || 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <label>Organization name</label>
      <Input
        value={orgName}
        onChange={(e) => setOrgName(e.target.value)}
        placeholder="My Organization"
        required
        disabled={isLoading}
      />
      {error && <p className="text-red-600">{error}</p>}
      <Button type="submit" disabled={isLoading || !orgName.trim()}>
        {isLoading ? 'Creating...' : 'Create organization'}
      </Button>
    </form>
  );
}
```

### 3.7 SSO 登录组件

```typescript
// apps/dashboard/src/utils/better-auth/components/sso-sign-in.tsx

import { useState } from 'react';
import { authClient } from '../client';

export function SSOSignIn() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (!email) {
        throw new Error('Please enter your email address');
      }

      const domain = email.split('@')[1];
      if (!domain) {
        throw new Error('Please enter a valid email address');
      }

      // 发起 SSO 登录
      await authClient.signIn.sso(
        {
          providerId: 'enterprise-sso',
          callbackURL: window.location.origin + ROUTES.INBOX_USECASE,
        },
        {
          onSuccess: () => {
            window.location.href = ROUTES.INBOX_USECASE;
          },
          onError: (ctx: any) => {
            throw new Error(ctx.error.message || 'SSO sign in failed');
          },
        }
      );
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : 'An unexpected error occurred.';
      setError(errorMessage);
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-md pt-12">
      <h2>Sign In with SSO</h2>
      <form onSubmit={handleSubmit}>
        <label>Work Email</label>
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
          required
        />
        <p className="text-xs">
          Enter your work email to sign in with your organization's SSO provider
        </p>
        {error && <p className="text-red-600">{error}</p>}
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Redirecting...' : 'Continue with SSO'}
        </Button>
      </form>
    </div>
  );
}
```

### 3.8 权限保护组件

```typescript
// apps/dashboard/src/utils/better-auth/index.tsx

type ProtectProps = {
  children: React.ReactNode;
  permission?: PermissionsEnum;
  role?: MemberRoleEnum;
  condition?: (has: (params: { permission: PermissionsEnum } | { role: MemberRoleEnum }) => boolean) => boolean;
  fallback?: React.ReactNode;
};

/**
 * 权限保护组件
 * 用于根据权限/角色控制内容显示
 */
export function Protect({ children, permission, role, condition, fallback }: ProtectProps) {
  const { has, isLoaded } = useAuth();

  if (!isLoaded) return null;

  let hasAccess = true;

  if (permission) {
    hasAccess = has({ permission });
  } else if (role) {
    hasAccess = has({ role });
  } else if (condition) {
    hasAccess = condition(has);
  }

  if (!hasAccess) {
    return fallback ? <>{fallback}</> : null;
  }

  return <>{children}</>;
}

// 使用示例
<Protect permission={PermissionsEnum.WORKFLOW_WRITE}>
  <CreateWorkflowButton />
</Protect>

<Protect role={MemberRoleEnum.ADMIN}>
  <AdminSettings />
</Protect>

<Protect condition={(has) => has({ permission: PermissionsEnum.ORG_SETTINGS_WRITE }) || has({ role: MemberRoleEnum.OWNER })}>
  <DeleteOrganizationButton />
</Protect>
```

---

## 四、后端实现

### 4.1 Better Auth 路由处理

Better Auth 作为独立服务运行，通过 `/v1/better-auth/*` 路由代理：

```typescript
// apps/api/src/bootstrap.ts

export async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Better Auth 路由需要严格的 origin 验证
  app.use((req, res, next) => {
    if (req.path.startsWith('/v1/better-auth')) {
      // 不使用通配符 CORS
      return next();
    }
    return bodyParser.json()(req, res, next);
  });

  // ...
}
```

### 4.2 CORS 配置

```typescript
// apps/api/src/config/cors.config.ts

/**
 * Better Auth 路由需要严格的 origin 验证
 * 不能使用通配符，必须精确匹配
 */
function isBetterAuthRoute(url: string): boolean {
  return url.startsWith('/v1/better-auth');
}

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

### 4.3 JWT 验证（Novu API）

Better Auth 签发的 JWT 由 Novu API 验证：

```typescript
// 企业版通过 ee-auth 包动态加载 Better Auth JWT Strategy

// JWT Payload 结构
interface BetterAuthJwtPayload {
  _id: string;                    // Better Auth 用户 ID
  org_id: string;                 // Better Auth 组织 ID
  firstName: string;
  lastName: string;
  email: string;
  org_role: MemberRoleEnum;       // 组织角色
  org_permissions: string[];      // 组织权限
  externalId?: string;            // 外部用户 ID（用于关联）
  externalOrgId?: string;         // 外部组织 ID（用于关联）
}

// Strategy 验证逻辑
async validate(request, payload: BetterAuthJwtPayload): Promise<UserSessionData> {
  // 1. 链接 Better Auth 用户到 Novu 内部用户
  const { userId, organizationId } = await this.linkInternalExternalEntities(
    request,
    payload
  );

  // 2. 获取成员信息
  const member = await this.memberRepository.findMemberByUserId(
    organizationId,
    userId
  );

  // 3. 获取权限
  const permissions = member
    ? this.getMemberPermissions(member.roles)
    : [];

  // 4. 返回会话数据
  return {
    _id: userId,
    firstName: payload.firstName,
    lastName: payload.lastName,
    email: payload.email,
    organizationId,
    roles: member?.roles || [],
    permissions,
    environmentId: this.getDefaultEnvironment(organizationId),
    scheme: ApiAuthSchemeEnum.BEARER,
  };
}
```

### 4.4 用户同步机制

Better Auth 管理用户，Novu 需要同步用户数据：

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                          用户同步流程                                          │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   Better Auth DB                         Novu DB                             │
│   ┌─────────────────────┐               ┌─────────────────────┐             │
│   │ users               │               │ users               │             │
│   │ - id                │               │ - _id               │             │
│   │ - email             │               │ - email             │             │
│   │ - name              │    同步       │ - firstName         │             │
│   │ - image             │  ──────────▶  │ - lastName          │             │
│   │ - emailVerified     │               │ - profilePicture    │             │
│   └─────────────────────┘               │ - externalId        │             │
│                                         └─────────────────────┘             │
│                                                                              │
│   ┌─────────────────────┐               ┌─────────────────────┐             │
│   │ organizations       │               │ organizations       │             │
│   │ - id                │               │ - _id               │             │
│   │ - name              │    同步       │ - name              │             │
│   │ - slug              │  ──────────▶  │ - slug              │             │
│   └─────────────────────┘               │ - externalOrgId     │             │
│                                         └─────────────────────┘             │
│                                                                              │
│   同步时机：                                                                  │
│   1. JWT 验证时（首次访问）                                                   │
│   2. 组织切换时                                                               │
│   3. Webhook 事件（可选）                                                     │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 五、环境配置

### 5.1 前端环境变量

```bash
# .env

# 认证提供者选择
VITE_EE_AUTH_PROVIDER=better-auth

# Better Auth 服务地址
VITE_BETTER_AUTH_BASE_URL=http://localhost:3000

# 或使用相对路径（与 Novu API 同域）
VITE_API_HOSTNAME=https://api.example.com

# 自托管模式
VITE_SELF_HOSTED=true

# 企业版模式
VITE_NOVU_ENTERPRISE=true
```

### 5.2 后端环境变量

```bash
# .env

# 启用企业版
NOVU_ENTERPRISE=true

# 认证提供者
EE_AUTH_PROVIDER=better-auth

# Better Auth 数据库连接
BETTER_AUTH_DATABASE_URL=postgresql://user:pass@localhost:5432/better_auth

# JWT 密钥（与 Better Auth 共享）
JWT_SECRET=your-jwt-secret

# Better Auth 配置
BETTER_AUTH_SECRET=your-better-auth-secret
BETTER_AUTH_BASE_URL=https://api.example.com
```

---

## 六、完整组件清单

### 6.1 前端组件

| 组件 | 文件 | 功能 |
|:---|:---|:---|
| AuthClient | `client.ts` | Better Auth React 客户端 |
| ClerkProvider | `index.tsx` | 认证 Provider（兼容层） |
| SignIn | `components/sign-in.tsx` | 登录表单 |
| SignUp | `components/sign-up.tsx` | 注册表单 |
| ForgotPassword | `components/forgot-password.tsx` | 忘记密码 |
| ResetPassword | `components/reset-password.tsx` | 重置密码 |
| VerifyEmail | `components/verify-email.tsx` | 邮箱验证 |
| SSOSignIn | `components/sso-sign-in.tsx` | SSO 登录 |
| UserButton | `components/user-button.tsx` | 用户菜单 |
| UserProfile | `components/user-profile.tsx` | 用户资料 |
| OrganizationCreate | `components/organization-create.tsx` | 创建组织 |
| OrganizationSwitcher | `components/organization-switcher.tsx` | 切换组织 |
| OrganizationList | `components/organization-list.tsx` | 组织列表 |
| TeamMembers | `components/team-members.tsx` | 成员管理 |
| InvitationAccept | `components/invitation-accept.tsx` | 接受邀请 |
| Protect | `index.tsx` | 权限保护组件 |

### 6.2 前端 Hooks

| Hook | 功能 |
|:---|:---|
| `useAuth()` | 认证状态 |
| `useUser()` | 用户信息 |
| `useOrganization()` | 当前组织 |
| `useOrganizationList()` | 组织列表 |
| `useClerk()` | Clerk 兼容 API |

---

## 七、对比总结

### 7.1 Better Auth 集成优势

1. **完全自托管** - 数据完全掌握在自己手中
2. **无用户数限制** - 开源免费，不按用户收费
3. **高度可定制** - 可以修改源码满足特定需求
4. **与现有系统集成** - 支持多种数据库和 SSO 提供者

### 7.2 需要注意的点

1. **运维复杂度** - 需要自行维护 Better Auth 服务
2. **数据同步** - 需要处理 Better Auth 与 Novu 的用户数据同步
3. **安全责任** - 需要自行负责安全配置和更新

---

*文档版本：1.0*  
*更新时间：2026-02-22*

# Auth 模块技术规范

> 版本：1.0.0  
> 更新日期：2026-02-21

---

## 一、概述

### 1.1 模块定位

`@oksai/auth` 提供认证相关的基础设施：

- **密码哈希**：使用 PBKDF2 算法安全存储密码
- **JWT 令牌**：生成和验证 JWT 令牌
- **认证结果**：统一的认证结果封装

### 1.2 安全说明

> **注意**：当前实现为简化版本，用于测试和演示目的。生产环境应使用成熟的认证库（如 Passport.js, bcrypt, jose）。

---

## 二、架构设计

### 2.1 模块结构

```
@oksai/auth/
├── lib/
│   ├── password-hasher.ts          # 密码哈希
│   ├── jwt-token.service.ts        # JWT 令牌服务
│   └── authentication-result.ts    # 认证结果
├── spec/
│   └── auth.spec.ts
└── index.ts
```

### 2.2 认证流程

```
┌─────────────────────────────────────────────────────────────┐
│                      登录认证流程                            │
└─────────────────────────────────────────────────────────────┘

用户凭证 (email + password)
         │
         ▼
┌─────────────────────┐
│ PasswordHasher      │
│ .verify()           │
└─────────────────────┘
         │
         ├─ 密码正确 ──────────────────┐
         │                              │
         ▼                              ▼
┌─────────────────────┐      ┌─────────────────────┐
│ 认证失败            │      │ JwtTokenService     │
│ AuthenticationResult│      │ .generateToken()    │
│ .failure()          │      └─────────────────────┘
└─────────────────────┘               │
                                      ▼
                          ┌─────────────────────┐
                          │ 认证成功            │
                          │ AuthenticationResult│
                          │ .success()          │
                          └─────────────────────┘
```

---

## 三、使用方式

### 3.1 密码哈希

```typescript
import { PasswordHasher } from '@oksai/auth';

// 注册时 - 哈希密码
const hashedPassword = await PasswordHasher.hash('userPassword123');
// 存储 hashedPassword 到数据库

// 登录时 - 验证密码
const isValid = await PasswordHasher.verify('userPassword123', storedHash);
if (isValid) {
  // 密码正确
}
```

### 3.2 JWT 令牌

```typescript
import { JwtTokenService, TokenPayload } from '@oksai/auth';

const tokenService = new JwtTokenService('your-secret-key');

// 生成令牌
const payload: TokenPayload = {
  userId: 'user-123',
  tenantId: 'tenant-456',
  role: 'admin',  // 可选的额外声明
};

const token = tokenService.generateToken(payload, '7d'); // 7天过期

// 验证令牌
const result = tokenService.verifyToken(token);
if (result.isOk()) {
  const verified = result.value;
  console.log(verified.userId);  // 'user-123'
  console.log(verified.tenantId); // 'tenant-456'
} else {
  console.log('令牌无效或已过期');
}
```

### 3.3 认证结果

```typescript
import { AuthenticationResult } from '@oksai/auth';

// 成功
const success = AuthenticationResult.success({
  userId: 'user-123',
  accessToken: 'jwt-token',
  refreshToken: 'refresh-token',
});
// success.success === true

// 失败
const failure = AuthenticationResult.failure('用户名或密码错误');
// failure.success === false
// failure.error === '用户名或密码错误'
```

---

## 四、API 参考

### 4.1 PasswordHasher

```typescript
class PasswordHasher {
  /**
   * 哈希密码
   * 使用 PBKDF2 + 随机 salt
   * @returns 格式: "{salt}:{hash}"
   */
  static async hash(password: string): Promise<string>;

  /**
   * 验证密码
   * @returns 密码匹配返回 true
   */
  static async verify(password: string, hashedPassword: string): Promise<boolean>;
}
```

**哈希格式**：
- Salt: 16 字节随机数，hex 编码（32 字符）
- Hash: 64 字节 PBKDF2 输出，hex 编码（128 字符）
- 存储: `{salt}:{hash}`

### 4.2 JwtTokenService

```typescript
interface TokenPayload {
  userId: string;
  tenantId: string;
  [key: string]: unknown;  // 额外声明
}

class JwtTokenService {
  constructor(secret: string);

  /**
   * 生成 JWT 令牌
   * @param expiresIn - 过期时间，支持格式: '1h', '7d', '2w', '1m'
   */
  generateToken(payload: TokenPayload, expiresIn?: string): string;

  /**
   * 验证令牌
   * @returns SimpleResult<TokenPayload, Error>
   */
  verifyToken(token: string): SimpleResult<TokenPayload, Error>;
}

interface SimpleResult<T, E> {
  isOk(): boolean;
  isFail(): boolean;
  value: T | E;
}
```

**过期时间格式**：
| 格式 | 说明 | 计算方式 |
|------|------|----------|
| `1h` | 1 小时 | 3600 秒 |
| `7d` | 7 天 | 7 × 86400 秒 |
| `2w` | 2 周 | 2 × 604800 秒 |
| `1m` | 1 月 | 2592000 秒（30天） |

**验证错误**：
| 错误消息 | 原因 |
|----------|------|
| `无效的令牌格式` | 令牌不是 3 部分 |
| `无效的令牌签名` | 签名验证失败 |
| `令牌已过期` | exp 时间已过 |
| `令牌验证失败` | 其他解析错误 |

### 4.3 AuthenticationResult

```typescript
interface AuthenticationSuccess {
  success: true;
  userId: string;
  accessToken: string;
  refreshToken?: string;
}

interface AuthenticationFailure {
  success: false;
  error: string;
}

type AuthenticationResult = AuthenticationSuccess | AuthenticationFailure;

class AuthenticationResult {
  static success(data: {
    userId: string;
    accessToken: string;
    refreshToken?: string;
  }): AuthenticationSuccess;

  static failure(error: string): AuthenticationFailure;
}
```

---

## 五、测试覆盖

| 指标 | 覆盖率 |
|------|--------|
| Statements | 98.36% |
| Branches | 95.23% |
| Functions | 100% |
| Lines | 98.36% |

---

## 六、注意事项

1. **密钥管理**：生产环境应从环境变量或密钥管理服务获取密钥
2. **令牌过期**：建议设置合理的过期时间，短期令牌更安全
3. **密码强度**：应在应用层验证密码强度
4. **哈希算法**：生产环境推荐使用 bcrypt 或 argon2

---

## 七、与其他模块集成

### 7.1 与 @oksai/context 集成（多租户）

```typescript
const payload: TokenPayload = {
  userId: user.id,
  tenantId: tenantContext.tenantId,
  role: user.role,
};

const token = tokenService.generateToken(payload);
```

### 7.2 与 @oksai/config 集成

```typescript
// 从配置读取密钥
const config = app.get(ConfigService);
const tokenService = new JwtTokenService(
  config.get('JWT_SECRET')
);
```

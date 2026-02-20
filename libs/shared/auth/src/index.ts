/**
 * @oksai/auth
 *
 * 认证模块，提供密码哈希、令牌生成和验证功能。
 *
 * @packageDocumentation
 */

// 密码哈希
export { PasswordHasher } from './lib/password-hasher';

// 令牌
export { JwtTokenService, type ITokenService, type TokenPayload } from './lib/jwt-token.service';

// 认证结果
export { AuthenticationResult, type AuthResultData } from './lib/authentication-result';

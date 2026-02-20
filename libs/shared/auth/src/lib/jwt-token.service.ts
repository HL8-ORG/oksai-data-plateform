/**
 * 令牌负载
 */
export interface TokenPayload {
	/**
	 * 用户 ID
	 */
	userId: string;

	/**
	 * 租户 ID
	 */
	tenantId: string;

	/**
	 * 额外声明
	 */
	[key: string]: unknown;
}

/**
 * 令牌服务接口
 */
export interface ITokenService {
	/**
	 * 生成令牌
	 */
	generateToken(payload: TokenPayload, expiresIn?: string): string;

	/**
	 * 验证令牌
	 */
	verifyToken(token: string): Promise<TokenPayload>;
}

/**
 * JWT 令牌服务
 *
 * 提供基于 JWT 的令牌生成和验证功能。
 * 这是一个简化实现，生产环境应使用成熟的 JWT 库。
 *
 * @example
 * ```typescript
 * const tokenService = new JwtTokenService('my-secret-key');
 *
 * // 生成令牌
 * const token = tokenService.generateToken({
 *   userId: 'user-123',
 *   tenantId: 'tenant-456'
 * });
 *
 * // 验证令牌
 * const result = tokenService.verifyToken(token);
 * ```
 */

/**
 * 简单的 Result 类型
 */
interface SimpleResult<T, E> {
	isOk(): boolean;
	isFail(): boolean;
	value: T | E;
}

function ok<T>(value: T): SimpleResult<T, never> {
	return {
		isOk: () => true,
		isFail: () => false,
		value
	};
}

function fail<E>(error: E): SimpleResult<never, E> {
	return {
		isOk: () => false,
		isFail: () => true,
		value: error
	};
}

export class JwtTokenService {
	/**
	 * 密钥
	 * @private
	 */
	private readonly secret: string;

	/**
	 * 构造函数
	 *
	 * @param secret - JWT 密钥
	 */
	constructor(secret: string) {
		this.secret = secret;
	}

	/**
	 * 生成 JWT 令牌
	 *
	 * @param payload - 令牌负载
	 * @param expiresIn - 过期时间（如 '1h', '7d'）
	 * @returns JWT 令牌
	 */
	public generateToken(payload: TokenPayload, expiresIn?: string): string {
		const header = this.base64Encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
		const now = Math.floor(Date.now() / 1000);
		const exp = expiresIn ? now + this.parseExpiresIn(expiresIn) : now + 3600; // 默认 1 小时

		const body = {
			...payload,
			iat: now,
			exp
		};
		const bodyEncoded = this.base64Encode(JSON.stringify(body));
		const signature = this.sign(`${header}.${bodyEncoded}`);

		return `${header}.${bodyEncoded}.${signature}`;
	}

	/**
	 * 验证 JWT 令牌
	 *
	 * @param token - JWT 令牌
	 * @returns 验证结果
	 */
	public verifyToken(token: string): SimpleResult<TokenPayload, Error> {
		try {
			const parts = token.split('.');
			if (parts.length !== 3) {
				return fail(new Error('无效的令牌格式'));
			}

			const [header, body, signature] = parts;
			const expectedSignature = this.sign(`${header}.${body}`);

			if (signature !== expectedSignature) {
				return fail(new Error('无效的令牌签名'));
			}

			const payload = JSON.parse(this.base64Decode(body));

			if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
				return fail(new Error('令牌已过期'));
			}

			return ok(payload);
		} catch {
			return fail(new Error('令牌验证失败'));
		}
	}

	/**
	 * 解析过期时间字符串
	 *
	 * @param expiresIn - 过期时间字符串
	 * @returns 秒数
	 * @private
	 */
	private parseExpiresIn(expiresIn: string): number {
		const match = expiresIn.match(/^(\d+)([hdwm])$/);
		if (!match) {
			return 3600;
		}

		const value = parseInt(match[1], 10);
		const unit = match[2];

		switch (unit) {
			case 'h':
				return value * 3600;
			case 'd':
				return value * 86400;
			case 'w':
				return value * 604800;
			case 'm':
				return value * 2592000;
			default:
				return 3600;
		}
	}

	/**
	 * 签名
	 *
	 * @param data - 要签名的数据
	 * @returns 签名
	 * @private
	 */
	private sign(data: string): string {
		const crypto = require('crypto');
		return crypto.createHmac('sha256', this.secret).update(data).digest('base64url');
	}

	/**
	 * Base64 编码
	 *
	 * @param data - 要编码的数据
	 * @returns 编码后的字符串
	 * @private
	 */
	private base64Encode(data: string): string {
		return Buffer.from(data).toString('base64url');
	}

	/**
	 * Base64 解码
	 *
	 * @param data - 要解码的数据
	 * @returns 解码后的字符串
	 * @private
	 */
	private base64Decode(data: string): string {
		return Buffer.from(data, 'base64url').toString();
	}
}

/**
 * 认证结果
 *
 * 表示认证操作的结果。
 *
 * @example
 * ```typescript
 * // 成功结果
 * const success = AuthenticationResult.success({
 *   userId: 'user-123',
 *   accessToken: 'token-abc',
 *   refreshToken: 'refresh-xyz'
 * });
 *
 * // 失败结果
 * const failure = AuthenticationResult.failure('无效的凭据');
 * ```
 */
export interface AuthResultData {
	/**
	 * 是否成功
	 */
	success: boolean;

	/**
	 * 用户 ID
	 */
	userId?: string;

	/**
	 * 访问令牌
	 */
	accessToken?: string;

	/**
	 * 刷新令牌
	 */
	refreshToken?: string;

	/**
	 * 错误信息
	 */
	error?: string;
}

export class AuthenticationResult {
	/**
	 * 是否成功
	 */
	public readonly success: boolean;

	/**
	 * 用户 ID
	 */
	public readonly userId?: string;

	/**
	 * 访问令牌
	 */
	public readonly accessToken?: string;

	/**
	 * 刷新令牌
	 */
	public readonly refreshToken?: string;

	/**
	 * 错误信息
	 */
	public readonly error?: string;

	private constructor(data: AuthResultData) {
		this.success = data.success;
		this.userId = data.userId;
		this.accessToken = data.accessToken;
		this.refreshToken = data.refreshToken;
		this.error = data.error;
	}

	/**
	 * 创建成功结果
	 *
	 * @param data - 成功数据
	 * @returns 认证结果
	 */
	public static success(data: { userId: string; accessToken: string; refreshToken: string }): AuthenticationResult {
		return new AuthenticationResult({
			success: true,
			userId: data.userId,
			accessToken: data.accessToken,
			refreshToken: data.refreshToken
		});
	}

	/**
	 * 创建失败结果
	 *
	 * @param error - 错误信息
	 * @returns 认证结果
	 */
	public static failure(error: string): AuthenticationResult {
		return new AuthenticationResult({
			success: false,
			error
		});
	}
}

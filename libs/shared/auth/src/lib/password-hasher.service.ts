/**
 * 密码哈希器
 *
 * 提供密码哈希和验证功能。
 * 使用简单的哈希算法进行演示，生产环境应使用 bcrypt。
 *
 * @example
 * ```typescript
 * // 哈希密码
 * const hashedPassword = await PasswordHasher.hash('myPassword123');
 *
 * // 验证密码
 * const isValid = await PasswordHasher.verify('myPassword123', hashedPassword);
 * ```
 */
import * as crypto from 'crypto';

export class PasswordHasher {
	/**
	 * 哈希密码
	 *
	 * @param password - 明文密码
	 * @returns 哈希后的密码
	 */
	public static async hash(password: string): Promise<string> {
		const salt = crypto.randomBytes(16).toString('hex');
		const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha256').toString('hex');
		return `${salt}:${hash}`;
	}

	/**
	 * 验证密码
	 *
	 * @param password - 明文密码
	 * @param hashedPassword - 哈希后的密码
	 * @returns 如果密码匹配返回 true
	 */
	public static async verify(password: string, hashedPassword: string): Promise<boolean> {
		const [salt, storedHash] = hashedPassword.split(':');
		if (!salt || !storedHash) {
			return false;
		}

		const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha256').toString('hex');

		return hash === storedHash;
	}
}

import { BetterAuthError } from 'better-auth';

/**
 * 创建并抛出带有适配器名称前缀的 BetterAuthError
 *
 * @param message - BetterAuthError 的错误消息
 */
export function createAdapterError(message: string): never {
	throw new BetterAuthError(`[Mikro ORM Adapter] ${message}`);
}

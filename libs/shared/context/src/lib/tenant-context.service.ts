/**
 * 租户上下文服务
 *
 * 提供便捷的上下文访问接口。
 * 封装 AsyncLocalStorageProvider，提供业务友好的 API。
 *
 * @example
 * ```typescript
 * const provider = new AsyncLocalStorageProvider();
 * const service = new TenantContextService(provider);
 *
 * const context = TenantContext.create({
 *   tenantId: 'tenant-123',
 *   userId: 'user-456'
 * });
 *
 * service.run(context, () => {
 *   console.log(service.tenantId);  // 'tenant-123'
 *   console.log(service.userId);    // 'user-456'
 * });
 * ```
 */
import { Injectable } from '@nestjs/common';
import { TenantContext } from './tenant-context.vo';
import { AsyncLocalStorageProvider } from './async-local-storage.provider';

@Injectable()
export class TenantContextService {
	/**
	 * 构造函数
	 *
	 * @param provider - 异步本地存储提供者
	 */
	constructor(private readonly provider: AsyncLocalStorageProvider) {}

	/**
	 * 在上下文中运行函数
	 *
	 * @param context - 租户上下文
	 * @param fn - 要运行的函数
	 * @returns 函数返回值
	 */
	public run<T>(context: TenantContext, fn: () => T): T {
		return this.provider.run(context, fn);
	}

	/**
	 * 获取当前租户 ID
	 *
	 * @returns 租户 ID，如果没有上下文则返回空字符串
	 */
	public get tenantId(): string {
		return this.provider.get()?.tenantId ?? '';
	}

	/**
	 * 获取当前用户 ID
	 *
	 * @returns 用户 ID，如果没有则返回 undefined
	 */
	public get userId(): string | undefined {
		return this.provider.get()?.userId;
	}

	/**
	 * 获取当前关联 ID
	 *
	 * @returns 关联 ID，如果没有上下文则返回空字符串
	 */
	public get correlationId(): string {
		return this.provider.get()?.correlationId ?? '';
	}

	/**
	 * 获取完整上下文
	 *
	 * @returns 租户上下文对象，如果没有则返回 undefined
	 */
	public getContext(): TenantContext | undefined {
		return this.provider.get();
	}

	/**
	 * 获取当前上下文，如果没有则抛出异常
	 *
	 * @returns 租户上下文
	 * @throws Error 如果没有设置上下文
	 */
	public getContextOrThrow(): TenantContext {
		return this.provider.getOrThrow();
	}
}

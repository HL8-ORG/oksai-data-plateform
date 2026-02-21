/**
 * 异步本地存储提供者
 *
 * 基于 Node.js AsyncLocalStorage 实现的上下文存储。
 * 用于在异步调用链中传递租户上下文，无需显式传递参数。
 *
 * @example
 * ```typescript
 * const provider = new AsyncLocalStorageProvider();
 * const context = TenantContext.create({ tenantId: 'tenant-123' });
 *
 * provider.run(context, () => {
 *   // 在这个回调及所有异步调用中都可以访问上下文
 *   const currentContext = provider.get();
 *   console.log(currentContext?.tenantId); // 'tenant-123'
 * });
 * ```
 */
import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';
import { TenantContext } from './tenant-context.vo';

@Injectable()
export class AsyncLocalStorageProvider {
	/**
	 * 异步本地存储实例
	 * @private
	 */
	private readonly storage: AsyncLocalStorage<TenantContext>;

	constructor() {
		this.storage = new AsyncLocalStorage<TenantContext>();
	}

	/**
	 * 在上下文中运行函数
	 *
	 * @param context - 租户上下文
	 * @param fn - 要运行的函数
	 * @returns 函数返回值
	 */
	public run<T>(context: TenantContext, fn: () => T): T {
		return this.storage.run(context, fn);
	}

	/**
	 * 获取当前上下文
	 *
	 * @returns 当前租户上下文，如果没有则返回 undefined
	 */
	public get(): TenantContext | undefined {
		return this.storage.getStore();
	}

	/**
	 * 获取当前上下文，如果没有则抛出异常
	 *
	 * @returns 当前租户上下文
	 * @throws Error 如果没有设置上下文
	 */
	public getOrThrow(): TenantContext {
		const context = this.get();
		if (!context) {
			throw new Error('租户上下文未设置');
		}
		return context;
	}
}

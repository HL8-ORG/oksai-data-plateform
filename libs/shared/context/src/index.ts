/**
 * @oksai/context
 *
 * 多租户上下文管理模块，提供租户隔离和请求追踪能力。
 *
 * @packageDocumentation
 */

// 值对象
export { TenantContext, type TenantContextProps } from './lib/tenant-context.vo';

// 提供者
export { AsyncLocalStorageProvider } from './lib/async-local-storage.provider';

// 服务
export { TenantContextService } from './lib/tenant-context.service';

// Worker 上下文（用于后台任务）
export {
	type OksaiRequestContext,
	runWithOksaiContext,
	getOksaiRequestContextFromCurrent
} from './lib/worker-context';

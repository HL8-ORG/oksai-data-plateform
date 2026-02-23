/**
 * @oksai/database
 *
 * 数据库访问模块 - MikroORM 集成、租户感知仓储、事务管理
 *
 * @packageDocumentation
 */

// 配置
export { createMikroOrmConfig, registerMikroOrmConfig, type MikroOrmConfig } from './lib/config/mikro-orm.config';

// 模块
export { setupMikroOrmModule, createSchema, type SetupMikroOrmModuleOptions } from './lib/adapters/mikro-orm.module';

// 插件元数据聚合
export {
	composeMikroOrmOptionsFromPlugins,
	type ComposeMikroOrmOptionsFromPluginsInput
} from './lib/adapters/mikro-orm-options.adapter';

// 仓储
export {
	createTenantAwareRepository,
	type ID,
	type ITenantAwareEntity,
	type ITenantContextService,
	type ITenantAwareRepository
} from './lib/repositories/tenant-aware.repository';

// 服务
export { TenantAwareService } from './lib/services/tenant-aware.service';

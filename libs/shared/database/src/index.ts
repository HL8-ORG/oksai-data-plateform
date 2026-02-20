/**
 * @oksai/database
 *
 * 数据库访问模块，提供连接管理、事务管理和仓储基类。
 *
 * @packageDocumentation
 */

// 配置
export { DatabaseConfig, type DatabaseConfigProps } from './lib/database-config.vo';

// 连接池
export { ConnectionPool, type IConnectionPool } from './lib/connection-pool';

// 事务
export {
	TransactionManager,
	Transaction,
	type ITransactionManager,
	type ITransaction
} from './lib/transaction-manager';

// 仓储
export { RepositoryBase } from './lib/repository-base';

/**
 * @oksai/cqrs
 *
 * CQRS 模块，提供命令查询分离的基础设施。
 *
 * @packageDocumentation
 */

// 模块
export { OksaiCqrsModule, type CqrsModuleOptions, type CqrsPipelineOptions } from './lib/cqrs.module';

// 总线
export { CommandBus } from './lib/buses/command-bus';
export { QueryBus } from './lib/buses/query-bus';

// 接口
export { type ICommand, type IQuery, type ICommandHandler, type IQueryHandler } from './lib/interfaces';

// 装饰器
export { CommandHandler } from './lib/decorators/command-handler.decorator';
export { QueryHandler } from './lib/decorators/query-handler.decorator';

// Pipeline
export {
	// 核心类型
	type ICqrsPipe,
	type CqrsExecutionContext,
	type PipelineNext,
	createCqrsContext,
	composePipelines
} from './lib/pipeline';

// Pipes
export {
	// Audit
	AuditPipe,
	// Metrics
	MetricsPipe,
	DefaultMetricsCollector,
	type CqrsMetrics,
	type ICqrsMetricsCollector,
	// Validation
	ValidationPipe,
	UseValidationDto,
	type ValidationPipeOptions,
	CQRS_VALIDATION_DTO_KEY,
	// Authorization
	AuthorizationPipe,
	DefaultPermissionChecker,
	RequirePermission,
	type IPermissionChecker,
	CQRS_PERMISSION_ACTION_KEY
} from './lib/pipeline/pipes';

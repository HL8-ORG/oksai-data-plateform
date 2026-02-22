import { Module, type DynamicModule, type Provider } from '@nestjs/common';
import { CommandBus } from './buses/command-bus';
import { QueryBus } from './buses/query-bus';
import { ExplorerService } from './services/explorer.service';
import {
	AuditPipe,
	MetricsPipe,
	ValidationPipe,
	AuthorizationPipe,
	DefaultMetricsCollector,
	DefaultPermissionChecker,
	type ICqrsMetricsCollector,
	type IPermissionChecker,
	type ValidationPipeOptions
} from './pipeline';

/**
 * @description CQRS Pipeline 配置选项
 */
export interface CqrsPipelineOptions {
	/**
	 * @description 是否启用审计管道（默认 true）
	 */
	audit?: boolean;

	/**
	 * @description 是否启用指标管道（默认 true）
	 */
	metrics?: boolean;

	/**
	 * @description 自定义指标收集器（可选）
	 */
	metricsCollector?: Provider<ICqrsMetricsCollector>;

	/**
	 * @description 是否启用输入校验管道（默认 false）
	 */
	validation?: boolean | ValidationPipeOptions;

	/**
	 * @description 是否启用用例级鉴权管道（默认 false）
	 */
	authorization?: boolean;

	/**
	 * @description 自定义权限检查器（可选）
	 */
	permissionChecker?: Provider<IPermissionChecker>;
}

/**
 * @description CQRS 模块配置选项
 */
export interface CqrsModuleOptions {
	/**
	 * @description Pipeline 配置（可选，默认启用审计和指标）
	 */
	pipeline?: CqrsPipelineOptions;

	/**
	 * @description 是否为全局模块（默认 false）
	 */
	isGlobal?: boolean;
}

/**
 * @description CQRS 模块
 *
 * 能力：
 * - CommandBus / QueryBus
 * - @CommandHandler / @QueryHandler 的自动探测与注册
 * - Pipeline 横切能力（审计、指标、校验、鉴权）
 *
 * 强约束：
 * - 不提供 EventBus/Saga（集成事件通道请使用 `@oksai/eda`）
 * - tenantId/userId/requestId 必须来自 CLS
 *
 * Pipeline 执行顺序：
 * 1. ValidationPipe（输入校验）
 * 2. AuthorizationPipe（用例级鉴权）
 * 3. AuditPipe（审计日志）
 * 4. MetricsPipe（指标统计）
 * 5. Handler（业务逻辑）
 */
@Module({})
export class OksaiCqrsModule {
	/**
	 * @description 初始化 CQRS 模块（支持 pipeline 配置）
	 *
	 * @param options - 配置选项
	 * @returns DynamicModule
	 *
	 * @example
	 * ```typescript
	 * // 默认配置（启用审计和指标）
	 * OksaiCqrsModule.forRoot()
	 *
	 * // 完整配置
	 * OksaiCqrsModule.forRoot({
	 *   pipeline: {
	 *     audit: true,
	 *     metrics: true,
	 *     validation: true,
	 *     authorization: true
	 *   },
	 *   isGlobal: true
	 * })
	 * ```
	 */
	static forRoot(options: CqrsModuleOptions = {}): DynamicModule {
		const pipelineOpts = options.pipeline ?? {};
		const enableAudit = pipelineOpts.audit ?? true;
		const enableMetrics = pipelineOpts.metrics ?? true;
		const enableValidation = pipelineOpts.validation ?? false;
		const enableAuthorization = pipelineOpts.authorization ?? false;

		const providers: Provider[] = [CommandBus, QueryBus, ExplorerService];
		const pipeTokens: any[] = [];

		// 1. 输入校验管道（最先执行）
		if (enableValidation) {
			const validationOpts = typeof enableValidation === 'object' ? enableValidation : {};
			providers.push({
				provide: ValidationPipe,
				useFactory: () => new ValidationPipe(validationOpts)
			});
			pipeTokens.push(ValidationPipe);
		}

		// 2. 用例级鉴权管道
		if (enableAuthorization) {
			if (pipelineOpts.permissionChecker) {
				providers.push(pipelineOpts.permissionChecker);
			} else {
				providers.push({
					provide: 'CQRS_PERMISSION_CHECKER',
					useClass: DefaultPermissionChecker
				});
			}
			providers.push({
				provide: AuthorizationPipe,
				useFactory: (checker: IPermissionChecker) => new AuthorizationPipe(checker),
				inject: ['CQRS_PERMISSION_CHECKER']
			});
			pipeTokens.push(AuthorizationPipe);
		}

		// 3. 审计管道
		if (enableAudit) {
			providers.push(AuditPipe);
			pipeTokens.push(AuditPipe);
		}

		// 4. 指标管道
		if (enableMetrics) {
			if (pipelineOpts.metricsCollector) {
				providers.push(pipelineOpts.metricsCollector);
			} else {
				providers.push({
					provide: 'CQRS_METRICS_COLLECTOR',
					useClass: DefaultMetricsCollector
				});
			}
			providers.push({
				provide: MetricsPipe,
				useFactory: (collector: ICqrsMetricsCollector) => new MetricsPipe(collector),
				inject: ['CQRS_METRICS_COLLECTOR']
			});
			pipeTokens.push(MetricsPipe);
		}

		// 管道注册工厂（按顺序执行）
		providers.push({
			provide: 'CQRS_PIPELINE_INITIALIZER',
			useFactory: (commandBus: CommandBus, queryBus: QueryBus, ...pipes: any[]) => {
				if (pipes.length > 0) {
					commandBus.registerPipes(pipes.filter(Boolean));
					queryBus.registerPipes(pipes.filter(Boolean));
				}
				return 'initialized';
			},
			inject: [CommandBus, QueryBus, ...pipeTokens]
		});

		return {
			module: OksaiCqrsModule,
			global: options.isGlobal ?? false,
			providers,
			exports: [CommandBus, QueryBus]
		};
	}
}

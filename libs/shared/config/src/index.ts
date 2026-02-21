/**
 * @oksai/config
 *
 * 配置管理模块，提供环境变量和配置的访问接口。
 *
 * @packageDocumentation
 */

// 服务和模块
export {
	ConfigService,
	ConfigModule,
	type ConfigOptions,
	type ConfigModuleOptions,
	ConfigEnvError,
	env
} from './lib/config.service';

// 选项类型
export type {
	EnvStringOptions,
	EnvIntOptions,
	EnvFloatOptions,
	EnvBoolOptions,
	EnvEnumOptions,
	EnvUrlOptions,
	EnvJsonOptions,
	EnvListOptions,
	EnvDurationMsOptions
} from './lib/config-env';

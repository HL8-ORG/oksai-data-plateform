/**
 * @oksai/i18n
 *
 * 国际化模块 - 基于 nestjs-i18n 的多语言支持
 *
 * @packageDocumentation
 */

export { setupI18nModule, type SetupI18nModuleOptions } from './lib/setup-i18n-module';

// 直接透传 nestjs-i18n 常用能力
export {
	I18nValidationExceptionFilter,
	I18nValidationPipe,
	i18nValidationMessage,
} from 'nestjs-i18n';

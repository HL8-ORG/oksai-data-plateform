import rootConfig from '../../eslint.config.mjs';
import globals from 'globals';

/**
 * @oksai/platform-api ESLint 配置
 *
 * 应用层入口，无边界约束
 * 可启用 type-aware lint
 */
export default [
	...rootConfig,
	{
		files: ['src/**/*.ts'],
		languageOptions: {
			globals: {
				...globals.node,
				...globals.jest
			}
		}
	}
];

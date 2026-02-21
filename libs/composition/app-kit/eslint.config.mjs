import rootConfig from '../../../eslint.config.mjs';
import globals from 'globals';

/**
 * @oksai/app-kit ESLint 配置
 *
 * 装配层，无边界约束
 * 负责组合各能力模块
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

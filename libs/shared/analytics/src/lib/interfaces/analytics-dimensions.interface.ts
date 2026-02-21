import type { IFullAggregateMetadata } from '@oksai/aggregate-metadata';

/**
 * @description 分析维度值类型
 */
export type DimensionValue = string | number | boolean | Date;

/**
 * @description 分析维度映射
 */
export type Dimensions = Record<string, DimensionValue>;

/**
 * @description 分析维度计算器接口
 *
 * 负责从聚合根元数据中提取分析维度，用于：
 * - 数据分类和聚合
 * - 报表生成
 * - 数据统计分析
 */
export interface IAnalyticsDimensionCalculator {
	/**
	 * @description 计算分析维度
	 *
	 * @param aggregate - 聚合根元数据
	 * @returns 分析维度映射
	 */
	calculate(aggregate: IFullAggregateMetadata): Dimensions;

	/**
	 * @description 获取计算器名称
	 */
	getName(): string;

	/**
	 * @description 获取支持的维度键列表
	 */
	getSupportedDimensions(): string[];
}

/**
 * @description 维度计算器配置
 */
export interface DimensionCalculatorConfig {
	/**
	 * 维度键名
	 */
	key: string;

	/**
	 * 是否必需
	 */
	required?: boolean;

	/**
	 * 默认值
	 */
	defaultValue?: DimensionValue;

	/**
	 * 描述
	 */
	description?: string;
}

/**
 * @description 常用分析维度键
 */
export const CommonDimensions = {
	// 时间维度
	TIME_YEAR: 'time_year',
	TIME_MONTH: 'time_month',
	TIME_WEEK: 'time_week',
	TIME_DAY: 'time_day',
	TIME_HOUR: 'time_hour',
	TIME_QUARTER: 'time_quarter',

	// 地理维度
	GEO_COUNTRY: 'geo_country',
	GEO_REGION: 'geo_region',
	GEO_CITY: 'geo_city',

	// 业务维度
	BUSINESS_TYPE: 'business_type',
	BUSINESS_STATUS: 'business_status',
	BUSINESS_AMOUNT_RANGE: 'business_amount_range',
	BUSINESS_CURRENCY: 'business_currency',

	// 租户维度
	TENANT_ID: 'tenant_id',
	TENANT_TYPE: 'tenant_type',

	// 用户维度
	USER_ID: 'user_id',
	USER_ROLE: 'user_role'
} as const;

/**
 * @description 维度值范围配置
 */
export interface DimensionRange {
	/**
	 * 范围名称
	 */
	name: string;

	/**
	 * 最小值
	 */
	min?: number;

	/**
	 * 最大值
	 */
	max?: number;
}

/**
 * @description 金额范围预设
 */
export const AmountRanges: DimensionRange[] = [
	{ name: '0-100', min: 0, max: 100 },
	{ name: '100-500', min: 100, max: 500 },
	{ name: '500-1000', min: 500, max: 1000 },
	{ name: '1000-5000', min: 1000, max: 5000 },
	{ name: '5000+', min: 5000 }
];

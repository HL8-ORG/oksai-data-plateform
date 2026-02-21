import type { IFullAggregateMetadata } from '@oksai/aggregate-metadata';
import type {
	IAnalyticsDimensionCalculator,
	Dimensions
} from '../interfaces/analytics-dimensions.interface';
import { CommonDimensions } from '../interfaces/analytics-dimensions.interface';

/**
 * @description 时间维度计算器
 *
 * 从聚合根的时间戳中提取时间维度：
 * - 年、月、周、日、小时
 * - 季度
 *
 * @example
 * ```typescript
 * const calculator = new TimeDimensionCalculator();
 * const dimensions = calculator.calculate(aggregateMetadata);
 * // {
 * //   time_year: 2024,
 * //   time_month: 2,
 * //   time_day: 18,
 * //   ...
 * // }
 * ```
 */
export class TimeDimensionCalculator implements IAnalyticsDimensionCalculator {
	/**
	 * @description 获取计算器名称
	 */
	getName(): string {
		return 'TimeDimensionCalculator';
	}

	/**
	 * @description 获取支持的维度键列表
	 */
	getSupportedDimensions(): string[] {
		return [
			CommonDimensions.TIME_YEAR,
			CommonDimensions.TIME_MONTH,
			CommonDimensions.TIME_WEEK,
			CommonDimensions.TIME_DAY,
			CommonDimensions.TIME_HOUR,
			CommonDimensions.TIME_QUARTER
		];
	}

	/**
	 * @description 计算时间维度
	 */
	calculate(aggregate: IFullAggregateMetadata): Dimensions {
		const timestamp = aggregate.updatedAt || aggregate.createdAt || new Date();

		return {
			[CommonDimensions.TIME_YEAR]: timestamp.getFullYear(),
			[CommonDimensions.TIME_MONTH]: timestamp.getMonth() + 1,
			[CommonDimensions.TIME_WEEK]: this.getWeekNumber(timestamp),
			[CommonDimensions.TIME_DAY]: timestamp.getDate(),
			[CommonDimensions.TIME_HOUR]: timestamp.getHours(),
			[CommonDimensions.TIME_QUARTER]: this.getQuarter(timestamp)
		};
	}

	/**
	 * @description 获取周数（ISO 8601 标准）
	 */
	private getWeekNumber(date: Date): number {
		const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
		const dayNum = d.getUTCDay() || 7;
		d.setUTCDate(d.getUTCDate() + 4 - dayNum);
		const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
		return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
	}

	/**
	 * @description 获取季度
	 */
	private getQuarter(date: Date): number {
		const month = date.getMonth() + 1;
		return Math.ceil(month / 3);
	}
}

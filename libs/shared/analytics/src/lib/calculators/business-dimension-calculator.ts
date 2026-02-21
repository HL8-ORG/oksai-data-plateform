import type { IFullAggregateMetadata } from '@oksai/aggregate-metadata';
import type {
	IAnalyticsDimensionCalculator,
	Dimensions
} from '../interfaces/analytics-dimensions.interface';
import { CommonDimensions, AmountRanges } from '../interfaces/analytics-dimensions.interface';

/**
 * @description 业务维度计算器
 *
 * 从聚合根的业务数据中提取业务维度：
 * - 聚合类型
 * - 业务状态
 * - 金额范围
 * - 货币类型
 *
 * @example
 * ```typescript
 * const calculator = new BusinessDimensionCalculator();
 * const dimensions = calculator.calculate(aggregateMetadata);
 * // {
 * //   business_type: 'Billing',
 * //   business_status: 'PAID',
 * //   business_amount_range: '1000-5000',
 * //   ...
 * // }
 * ```
 */
export class BusinessDimensionCalculator implements IAnalyticsDimensionCalculator {
	/**
	 * @description 获取计算器名称
	 */
	getName(): string {
		return 'BusinessDimensionCalculator';
	}

	/**
	 * @description 获取支持的维度键列表
	 */
	getSupportedDimensions(): string[] {
		return [
			CommonDimensions.BUSINESS_TYPE,
			CommonDimensions.BUSINESS_STATUS,
			CommonDimensions.BUSINESS_AMOUNT_RANGE,
			CommonDimensions.BUSINESS_CURRENCY,
			CommonDimensions.TENANT_ID,
			CommonDimensions.TENANT_TYPE
		];
	}

	/**
	 * @description 计算业务维度
	 */
	calculate(aggregate: IFullAggregateMetadata): Dimensions {
		const dimensions: Dimensions = {
			[CommonDimensions.BUSINESS_TYPE]: aggregate.aggregateType,
			[CommonDimensions.TENANT_ID]: aggregate.tenantId
		};

		if (aggregate.analyzable?.analyticsDimensions) {
			const analyticsDims = aggregate.analyzable.analyticsDimensions;

			if (analyticsDims.status) {
				dimensions[CommonDimensions.BUSINESS_STATUS] = String(analyticsDims.status);
			}

			if (analyticsDims.amount !== undefined) {
				const amount = Number(analyticsDims.amount);
				dimensions[CommonDimensions.BUSINESS_AMOUNT_RANGE] = this.getAmountRange(amount);
			}

			if (analyticsDims.currency) {
				dimensions[CommonDimensions.BUSINESS_CURRENCY] = String(analyticsDims.currency);
			}

			if (analyticsDims.tenantType) {
				dimensions[CommonDimensions.TENANT_TYPE] = String(analyticsDims.tenantType);
			}
		}

		return dimensions;
	}

	/**
	 * @description 根据金额获取金额范围
	 */
	private getAmountRange(amount: number): string {
		for (const range of AmountRanges) {
			if (range.min !== undefined && range.max !== undefined) {
				if (amount >= range.min && amount < range.max) {
					return range.name;
				}
			} else if (range.min !== undefined) {
				if (amount >= range.min) {
					return range.name;
				}
			} else if (range.max !== undefined) {
				if (amount < range.max) {
					return range.name;
				}
			}
		}

		return 'unknown';
	}
}

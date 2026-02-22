import { Injectable, Logger } from '@nestjs/common';
import type { IFullAggregateMetadata } from '@oksai/aggregate-metadata';
import type { IAnalyticsDimensionCalculator, Dimensions } from '../interfaces/analytics-dimension.interface';
import { TimeDimensionCalculator } from '../calculators/time-dimension-calculator';
import { BusinessDimensionCalculator } from '../calculators/business-dimension-calculator';

/**
 * @description 分析维度计算服务
 *
 * NestJS 服务包装器，提供分析维度计算能力
 *
 * @example
 * ```typescript
 * @Injectable()
 * class MyService {
 *   constructor(private readonly dimensionCalculator: AnalyticsDimensionCalculatorService) {}
 *
 *   async calculateDimensions(aggregate: IFullAggregateMetadata) {
 *     const dimensions = await this.dimensionCalculator.calculate(aggregate);
 *     console.log(`时间维度: ${dimensions.time_year}-${dimensions.time_month}`);
 *   }
 * }
 * ```
 */
@Injectable()
export class AnalyticsDimensionCalculatorService {
	private readonly logger = new Logger(AnalyticsDimensionCalculatorService.name);
	private readonly calculators: Map<string, IAnalyticsDimensionCalculator>;

	constructor() {
		this.calculators = new Map();

		this.registerCalculator(new TimeDimensionCalculator());
		this.registerCalculator(new BusinessDimensionCalculator());

		this.logger.log(`分析维度计算服务已初始化，已注册 ${this.calculators.size} 个计算器`);
	}

	/**
	 * @description 注册维度计算器
	 *
	 * @param calculator - 计算器实例
	 */
	registerCalculator(calculator: IAnalyticsDimensionCalculator): void {
		this.calculators.set(calculator.getName(), calculator);
		this.logger.debug(`已注册维度计算器: ${calculator.getName()}`);
	}

	/**
	 * @description 计算聚合根的分析维度
	 *
	 * @param aggregate - 聚合根元数据
	 * @param calculatorNames - 指定使用的计算器名称（可选，默认使用所有）
	 * @returns 合并后的维度映射
	 */
	async calculate(aggregate: IFullAggregateMetadata, calculatorNames?: string[]): Promise<Dimensions> {
		try {
			const result: Dimensions = {};

			const calculators = calculatorNames
				? Array.from(this.calculators.values()).filter((c) => calculatorNames.includes(c.getName()))
				: Array.from(this.calculators.values());

			for (const calculator of calculators) {
				const dimensions = calculator.calculate(aggregate);
				Object.assign(result, dimensions);
			}

			this.logger.debug(
				`分析维度计算完成: ${aggregate.aggregateType}/${aggregate.aggregateId} - 维度数量: ${Object.keys(result).length}`
			);

			return result;
		} catch (error) {
			this.logger.error(`分析维度计算失败: ${error}`, error.stack);
			throw error;
		}
	}

	/**
	 * @description 批量计算分析维度
	 *
	 * @param aggregates - 聚合根元数据数组
	 * @param calculatorNames - 指定使用的计算器名称（可选）
	 * @returns 维度映射数组
	 */
	async calculateBatch(aggregates: IFullAggregateMetadata[], calculatorNames?: string[]): Promise<Dimensions[]> {
		const results: Dimensions[] = [];

		for (const aggregate of aggregates) {
			const dimensions = await this.calculate(aggregate, calculatorNames);
			results.push(dimensions);
		}

		this.logger.debug(`批量分析维度计算完成: ${results.length} 个聚合根`);

		return results;
	}

	/**
	 * @description 获取已注册的计算器列表
	 */
	getRegisteredCalculators(): string[] {
		return Array.from(this.calculators.keys());
	}

	/**
	 * @description 获取所有支持的维度键
	 */
	getAllSupportedDimensions(): string[] {
		const dimensions = new Set<string>();

		for (const calculator of this.calculators.values()) {
			calculator.getSupportedDimensions().forEach((dim) => dimensions.add(dim));
		}

		return Array.from(dimensions);
	}
}

import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsDimensionCalculatorService } from '../../lib/services/analytics-dimension-calculator.service';
import type { IFullAggregateMetadata } from '@oksai/aggregate-metadata';
import type { IAnalyticsDimensionCalculator, Dimensions } from '../../lib/interfaces/analytics-dimensions.interface';

/**
 * @description AnalyticsDimensionCalculatorService 单元测试
 *
 * 测试覆盖：
 * - 服务初始化和依赖注入
 * - 维度计算器的注册
 * - 单个聚合根维度计算
 * - 批量维度计算
 * - 错误处理
 */
describe('AnalyticsDimensionCalculatorService', () => {
	let service: AnalyticsDimensionCalculatorService;

	const mockAggregate: IFullAggregateMetadata = {
		aggregateType: 'Billing',
		aggregateId: 'billing-001',
		tenantId: 'tenant-123',
		createdAt: new Date('2024-02-15T10:30:00Z'),
		updatedAt: new Date('2024-02-15T12:00:00Z'),
		isDeleted: false,
		analyzable: {
			tags: ['test', 'unit-test'],
			category: 'subscription',
			analyticsDimensions: {
				status: 'PAID',
				amount: 1500,
				currency: 'CNY'
			},
			includeInAnalytics: true
		}
	};

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [AnalyticsDimensionCalculatorService]
		}).compile();

		service = module.get<AnalyticsDimensionCalculatorService>(AnalyticsDimensionCalculatorService);
	});

	describe('服务初始化', () => {
		it('应该成功创建服务实例', () => {
			expect(service).toBeDefined();
		});

		it('应该注册默认计算器（TimeDimensionCalculator 和 BusinessDimensionCalculator）', () => {
			const calculators = service.getRegisteredCalculators();

			expect(calculators).toContain('TimeDimensionCalculator');
			expect(calculators).toContain('BusinessDimensionCalculator');
			expect(calculators).toHaveLength(2);
		});
	});

	describe('获取支持的维度', () => {
		it('应该返回所有支持的维度键', () => {
			const dimensions = service.getAllSupportedDimensions();

			expect(dimensions).toContain('time_year');
			expect(dimensions).toContain('time_month');
			expect(dimensions).toContain('business_type');
			expect(dimensions).toContain('business_status');
		});
	});

	describe('维度计算', () => {
		it('应该计算单个聚合根的所有维度', async () => {
			const result = await service.calculate(mockAggregate);

			expect(result).toBeDefined();
			expect(result['time_year']).toBe(2024);
			expect(result['time_month']).toBe(2);
			expect(result['business_type']).toBe('Billing');
			expect(result['tenant_id']).toBe('tenant-123');
		});

		it('应该返回包含时间维度和业务维度的结果', async () => {
			const result = await service.calculate(mockAggregate);

			expect(result).toHaveProperty('time_year');
			expect(result).toHaveProperty('time_month');
			expect(result).toHaveProperty('time_week');
			expect(result).toHaveProperty('time_day');
			expect(result).toHaveProperty('time_hour');
			expect(result).toHaveProperty('time_quarter');
			expect(result).toHaveProperty('business_type');
		});

		it('应该从 analyzable 扩展中提取业务维度', async () => {
			const result = await service.calculate(mockAggregate);

			expect(result['business_status']).toBe('PAID');
			expect(result['business_amount_range']).toBeDefined();
			expect(result['business_currency']).toBe('CNY');
		});

		it('应该在没有 analyzable 扩展时返回基本维度', async () => {
			const basicAggregate: IFullAggregateMetadata = {
				aggregateType: 'TestType',
				aggregateId: 'test-001',
				tenantId: 'tenant-456',
				createdAt: new Date('2024-01-01'),
				updatedAt: new Date('2024-01-02'),
				isDeleted: false
			};

			const result = await service.calculate(basicAggregate);

			expect(result['business_type']).toBe('TestType');
			expect(result['tenant_id']).toBe('tenant-456');
			expect(result['time_year']).toBe(2024);
		});
	});

	describe('指定计算器计算', () => {
		it('应该只使用指定的计算器', async () => {
			const result = await service.calculate(mockAggregate, ['TimeDimensionCalculator']);

			expect(result).toHaveProperty('time_year');
			expect(result).toHaveProperty('time_month');
			expect(result).not.toHaveProperty('business_type');
		});

		it('应该使用多个指定的计算器', async () => {
			const result = await service.calculate(mockAggregate, [
				'TimeDimensionCalculator',
				'BusinessDimensionCalculator'
			]);

			expect(result).toHaveProperty('time_year');
			expect(result).toHaveProperty('business_type');
		});

		it('当指定不存在的计算器时应该返回空结果', async () => {
			const result = await service.calculate(mockAggregate, ['NonExistentCalculator']);

			expect(Object.keys(result)).toHaveLength(0);
		});
	});

	describe('批量计算', () => {
		it('应该批量计算多个聚合根的维度', async () => {
			const aggregates: IFullAggregateMetadata[] = [
				mockAggregate,
				{
					...mockAggregate,
					aggregateId: 'billing-002',
					tenantId: 'tenant-456'
				}
			];

			const results = await service.calculateBatch(aggregates);

			expect(results).toHaveLength(2);
			expect(results[0]).toHaveProperty('time_year');
			expect(results[1]).toHaveProperty('time_year');
		});

		it('批量计算时应该支持指定计算器', async () => {
			const aggregates: IFullAggregateMetadata[] = [mockAggregate];

			const results = await service.calculateBatch(aggregates, ['TimeDimensionCalculator']);

			expect(results).toHaveLength(1);
			expect(results[0]).toHaveProperty('time_year');
			expect(results[0]).not.toHaveProperty('business_type');
		});

		it('应该处理空数组', async () => {
			const results = await service.calculateBatch([]);

			expect(results).toHaveLength(0);
			expect(results).toEqual([]);
		});
	});

	describe('自定义计算器注册', () => {
		it('应该能够注册自定义计算器', () => {
			const customCalculator: IAnalyticsDimensionCalculator = {
				getName: () => 'CustomCalculator',
				getSupportedDimensions: () => ['custom_dim1', 'custom_dim2'],
				calculate: (aggregate: IFullAggregateMetadata): Dimensions => ({
					custom_dim1: 'value1',
					custom_dim2: aggregate.aggregateType
				})
			};

			service.registerCalculator(customCalculator);

			expect(service.getRegisteredCalculators()).toContain('CustomCalculator');
		});

		it('注册后自定义计算器应该参与计算', async () => {
			const customCalculator: IAnalyticsDimensionCalculator = {
				getName: () => 'CustomCalculator',
				getSupportedDimensions: () => ['custom_dimension'],
				calculate: (aggregate: IFullAggregateMetadata): Dimensions => ({
					custom_dimension: `custom_${aggregate.aggregateId}`
				})
			};

			service.registerCalculator(customCalculator);
			const result = await service.calculate(mockAggregate);

			expect(result['custom_dimension']).toBe('custom_billing-001');
		});

		it('应该更新支持的维度列表', () => {
			const customCalculator: IAnalyticsDimensionCalculator = {
				getName: () => 'CustomCalculator',
				getSupportedDimensions: () => ['new_dim_1', 'new_dim_2'],
				calculate: (): Dimensions => ({})
			};

			service.registerCalculator(customCalculator);
			const dimensions = service.getAllSupportedDimensions();

			expect(dimensions).toContain('new_dim_1');
			expect(dimensions).toContain('new_dim_2');
		});
	});

	describe('错误处理', () => {
		it('当计算器抛出异常时应该向上传递', async () => {
			const faultyCalculator: IAnalyticsDimensionCalculator = {
				getName: () => 'FaultyCalculator',
				getSupportedDimensions: () => ['faulty_dim'],
				calculate: (): Dimensions => {
					throw new Error('计算器内部错误');
				}
			};

			service.registerCalculator(faultyCalculator);

			await expect(service.calculate(mockAggregate, ['FaultyCalculator'])).rejects.toThrow('计算器内部错误');
		});
	});
});

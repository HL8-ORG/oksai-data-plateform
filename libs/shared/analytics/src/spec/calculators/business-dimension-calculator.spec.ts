import { BusinessDimensionCalculator } from '../../lib/calculators/business-dimension-calculator';
import type { IFullAggregateMetadata } from '@oksai/aggregate-metadata';
import { CommonDimensions } from '../../lib/interfaces/analytics-dimension.interface';

/**
 * @description BusinessDimensionCalculator 单元测试
 *
 * 测试覆盖：
 * - 业务维度的正确提取
 * - 金额范围的正确分类
 * - 缺失字段的处理
 * - 边界条件
 */
describe('BusinessDimensionCalculator', () => {
	let calculator: BusinessDimensionCalculator;

	beforeEach(() => {
		calculator = new BusinessDimensionCalculator();
	});

	describe('基本信息', () => {
		it('应该返回计算器名称', () => {
			expect(calculator.getName()).toBe('BusinessDimensionCalculator');
		});

		it('应该返回支持的维度键列表', () => {
			const supported = calculator.getSupportedDimensions();

			expect(supported).toContain(CommonDimensions.BUSINESS_TYPE);
			expect(supported).toContain(CommonDimensions.BUSINESS_STATUS);
			expect(supported).toContain(CommonDimensions.BUSINESS_AMOUNT_RANGE);
			expect(supported).toContain(CommonDimensions.BUSINESS_CURRENCY);
			expect(supported).toContain(CommonDimensions.TENANT_ID);
			expect(supported).toContain(CommonDimensions.TENANT_TYPE);
		});
	});

	describe('基础维度提取', () => {
		it('应该正确提取基础业务维度', () => {
			const aggregate: IFullAggregateMetadata = {
				aggregateType: 'Billing',
				aggregateId: 'billing-001',
				tenantId: 'tenant-123',
				createdAt: new Date(),
				updatedAt: new Date(),
				isDeleted: false
			};

			const dimensions = calculator.calculate(aggregate);

			expect(dimensions[CommonDimensions.BUSINESS_TYPE]).toBe('Billing');
			expect(dimensions[CommonDimensions.TENANT_ID]).toBe('tenant-123');
		});
	});

	describe('从可分析扩展提取维度', () => {
		it('应该正确提取业务状态', () => {
			const aggregate: IFullAggregateMetadata = {
				aggregateType: 'Billing',
				aggregateId: 'billing-002',
				tenantId: 'tenant-123',
				createdAt: new Date(),
				updatedAt: new Date(),
				isDeleted: false,
				analyzable: {
					tags: [],
					includeInAnalytics: true,
					analyticsDimensions: {
						status: 'PAID'
					}
				}
			};

			const dimensions = calculator.calculate(aggregate);

			expect(dimensions[CommonDimensions.BUSINESS_STATUS]).toBe('PAID');
		});

		it('应该正确提取货币类型', () => {
			const aggregate: IFullAggregateMetadata = {
				aggregateType: 'Billing',
				aggregateId: 'billing-003',
				tenantId: 'tenant-123',
				createdAt: new Date(),
				updatedAt: new Date(),
				isDeleted: false,
				analyzable: {
					tags: [],
					includeInAnalytics: true,
					analyticsDimensions: {
						currency: 'CNY'
					}
				}
			};

			const dimensions = calculator.calculate(aggregate);

			expect(dimensions[CommonDimensions.BUSINESS_CURRENCY]).toBe('CNY');
		});

		it('应该正确提取租户类型', () => {
			const aggregate: IFullAggregateMetadata = {
				aggregateType: 'Billing',
				aggregateId: 'billing-004',
				tenantId: 'tenant-123',
				createdAt: new Date(),
				updatedAt: new Date(),
				isDeleted: false,
				analyzable: {
					tags: [],
					includeInAnalytics: true,
					analyticsDimensions: {
						tenantType: 'ENTERPRISE'
					}
				}
			};

			const dimensions = calculator.calculate(aggregate);

			expect(dimensions[CommonDimensions.TENANT_TYPE]).toBe('ENTERPRISE');
		});
	});

	describe('金额范围分类', () => {
		it('应该正确分类 0-100 范围的金额', () => {
			const aggregate: IFullAggregateMetadata = {
				aggregateType: 'Billing',
				aggregateId: 'billing-005',
				tenantId: 'tenant-123',
				createdAt: new Date(),
				updatedAt: new Date(),
				isDeleted: false,
				analyzable: {
					tags: [],
					includeInAnalytics: true,
					analyticsDimensions: {
						amount: 50
					}
				}
			};

			const dimensions = calculator.calculate(aggregate);

			expect(dimensions[CommonDimensions.BUSINESS_AMOUNT_RANGE]).toBe('0-100');
		});

		it('应该正确分类 100-500 范围的金额', () => {
			const aggregate: IFullAggregateMetadata = {
				aggregateType: 'Billing',
				aggregateId: 'billing-006',
				tenantId: 'tenant-123',
				createdAt: new Date(),
				updatedAt: new Date(),
				isDeleted: false,
				analyzable: {
					tags: [],
					includeInAnalytics: true,
					analyticsDimensions: {
						amount: 300
					}
				}
			};

			const dimensions = calculator.calculate(aggregate);

			expect(dimensions[CommonDimensions.BUSINESS_AMOUNT_RANGE]).toBe('100-500');
		});

		it('应该正确分类 500-1000 范围的金额', () => {
			const aggregate: IFullAggregateMetadata = {
				aggregateType: 'Billing',
				aggregateId: 'billing-007',
				tenantId: 'tenant-123',
				createdAt: new Date(),
				updatedAt: new Date(),
				isDeleted: false,
				analyzable: {
					tags: [],
					includeInAnalytics: true,
					analyticsDimensions: {
						amount: 750
					}
				}
			};

			const dimensions = calculator.calculate(aggregate);

			expect(dimensions[CommonDimensions.BUSINESS_AMOUNT_RANGE]).toBe('500-1000');
		});

		it('应该正确分类 1000-5000 范围的金额', () => {
			const aggregate: IFullAggregateMetadata = {
				aggregateType: 'Billing',
				aggregateId: 'billing-008',
				tenantId: 'tenant-123',
				createdAt: new Date(),
				updatedAt: new Date(),
				isDeleted: false,
				analyzable: {
					tags: [],
					includeInAnalytics: true,
					analyticsDimensions: {
						amount: 2500
					}
				}
			};

			const dimensions = calculator.calculate(aggregate);

			expect(dimensions[CommonDimensions.BUSINESS_AMOUNT_RANGE]).toBe('1000-5000');
		});

		it('应该正确分类 5000+ 的金额', () => {
			const aggregate: IFullAggregateMetadata = {
				aggregateType: 'Billing',
				aggregateId: 'billing-009',
				tenantId: 'tenant-123',
				createdAt: new Date(),
				updatedAt: new Date(),
				isDeleted: false,
				analyzable: {
					tags: [],
					includeInAnalytics: true,
					analyticsDimensions: {
						amount: 10000
					}
				}
			};

			const dimensions = calculator.calculate(aggregate);

			expect(dimensions[CommonDimensions.BUSINESS_AMOUNT_RANGE]).toBe('5000+');
		});
	});

	describe('边界条件', () => {
		it('应该正确处理金额为 0 的情况', () => {
			const aggregate: IFullAggregateMetadata = {
				aggregateType: 'Billing',
				aggregateId: 'billing-010',
				tenantId: 'tenant-123',
				createdAt: new Date(),
				updatedAt: new Date(),
				isDeleted: false,
				analyzable: {
					tags: [],
					includeInAnalytics: true,
					analyticsDimensions: {
						amount: 0
					}
				}
			};

			const dimensions = calculator.calculate(aggregate);

			expect(dimensions[CommonDimensions.BUSINESS_AMOUNT_RANGE]).toBe('0-100');
		});

		it('应该正确处理边界值（100、500、1000、5000）', () => {
			const testCases = [
				{ amount: 99, expectedRange: '0-100' },
				{ amount: 100, expectedRange: '100-500' },
				{ amount: 101, expectedRange: '100-500' },
				{ amount: 499, expectedRange: '100-500' },
				{ amount: 500, expectedRange: '500-1000' },
				{ amount: 501, expectedRange: '500-1000' },
				{ amount: 999, expectedRange: '500-1000' },
				{ amount: 1000, expectedRange: '1000-5000' },
				{ amount: 1001, expectedRange: '1000-5000' },
				{ amount: 4999, expectedRange: '1000-5000' },
				{ amount: 5000, expectedRange: '5000+' },
				{ amount: 5001, expectedRange: '5000+' }
			];

			testCases.forEach(({ amount, expectedRange }) => {
				const aggregate: IFullAggregateMetadata = {
					aggregateType: 'Billing',
					aggregateId: `billing-amount-${amount}`,
					tenantId: 'tenant-123',
					createdAt: new Date(),
					updatedAt: new Date(),
					isDeleted: false,
					analyzable: {
						tags: [],
						includeInAnalytics: true,
						analyticsDimensions: { amount }
					}
				};

				const dimensions = calculator.calculate(aggregate);

				expect(dimensions[CommonDimensions.BUSINESS_AMOUNT_RANGE]).toBe(expectedRange);
			});
		});

		it('应该正确处理缺失可分析扩展的情况', () => {
			const aggregate: IFullAggregateMetadata = {
				aggregateType: 'Billing',
				aggregateId: 'billing-011',
				tenantId: 'tenant-123',
				createdAt: new Date(),
				updatedAt: new Date(),
				isDeleted: false
			};

			const dimensions = calculator.calculate(aggregate);

			expect(dimensions[CommonDimensions.BUSINESS_TYPE]).toBe('Billing');
			expect(dimensions[CommonDimensions.TENANT_ID]).toBe('tenant-123');
			expect(dimensions[CommonDimensions.BUSINESS_STATUS]).toBeUndefined();
			expect(dimensions[CommonDimensions.BUSINESS_AMOUNT_RANGE]).toBeUndefined();
		});

		it('应该正确处理字符串类型的金额', () => {
			const aggregate: IFullAggregateMetadata = {
				aggregateType: 'Billing',
				aggregateId: 'billing-012',
				tenantId: 'tenant-123',
				createdAt: new Date(),
				updatedAt: new Date(),
				isDeleted: false,
				analyzable: {
					tags: [],
					includeInAnalytics: true,
					analyticsDimensions: {
						amount: '1500'
					}
				}
			};

			const dimensions = calculator.calculate(aggregate);

			expect(dimensions[CommonDimensions.BUSINESS_AMOUNT_RANGE]).toBe('1000-5000');
		});
	});
});

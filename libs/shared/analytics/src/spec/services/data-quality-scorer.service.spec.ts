import { Test, TestingModule } from '@nestjs/testing';
import { DataQualityScorerService } from '../../lib/services/data-quality-scorer.service';
import type { IFullAggregateMetadata } from '@oksai/aggregate-metadata';

/**
 * @description DataQualityScorerService 单元测试
 *
 * 测试覆盖：
 * - 服务初始化和依赖注入
 * - 单个聚合根质量评分
 * - 批量质量评分
 * - 评分器信息获取
 * - 错误处理
 */
describe('DataQualityScorerService', () => {
	let service: DataQualityScorerService;

	const mockCompleteAggregate: IFullAggregateMetadata = {
		aggregateType: 'Billing',
		aggregateId: 'billing-001',
		tenantId: 'tenant-123',
		createdAt: new Date(),
		updatedAt: new Date(),
		createdBy: 'user-001',
		updatedBy: 'user-001',
		isDeleted: false,
		analyzable: {
			tags: ['high-value', 'paid'],
			category: 'subscription',
			analyticsDimensions: {
				amount: 1500,
				currency: 'CNY',
				status: 'PAID'
			},
			includeInAnalytics: true
		},
		aiEnabled: {
			embeddingStatus: 'SYNCED' as any,
			needsReembedding: false
		},
		syncable: {
			syncStatus: 'SYNCED' as any,
			externalIds: {},
			syncVersion: 1,
			needsSync: false
		}
	};

	const mockPartialAggregate: IFullAggregateMetadata = {
		aggregateType: 'Order',
		aggregateId: 'order-001',
		tenantId: 'tenant-456',
		createdAt: new Date(),
		updatedAt: new Date(),
		isDeleted: false
	};

	const mockLowQualityAggregate: IFullAggregateMetadata = {
		aggregateType: 'Test',
		aggregateId: '',
		tenantId: '',
		createdAt: new Date(),
		updatedAt: new Date(),
		isDeleted: false
	};

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [DataQualityScorerService]
		}).compile();

		service = module.get<DataQualityScorerService>(DataQualityScorerService);
	});

	describe('服务初始化', () => {
		it('应该成功创建服务实例', () => {
			expect(service).toBeDefined();
		});

		it('应该初始化默认评分器', () => {
			const info = service.getScorerInfo();

			expect(info.name).toBe('DefaultDataQualityScorer');
			expect(info.version).toBe('1.0.0');
		});
	});

	describe('获取评分器信息', () => {
		it('应该返回评分器名称', () => {
			const info = service.getScorerInfo();

			expect(info.name).toBeDefined();
			expect(typeof info.name).toBe('string');
		});

		it('应该返回评分器版本', () => {
			const info = service.getScorerInfo();

			expect(info.version).toBeDefined();
			expect(typeof info.version).toBe('string');
		});
	});

	describe('单个聚合根评分', () => {
		it('应该为完整的聚合根返回高分', async () => {
			const result = await service.score(mockCompleteAggregate);

			expect(result.totalScore).toBeGreaterThan(80);
			expect(result.dimensions).toBeDefined();
			expect(result.dimensions.length).toBeGreaterThan(0);
			expect(result.scoredAt).toBeInstanceOf(Date);
			expect(result.version).toBe('1.0.0');
		});

		it('应该为部分完成的聚合根返回中等分数', async () => {
			const result = await service.score(mockPartialAggregate);

			expect(result.totalScore).toBeGreaterThan(0);
			expect(result.totalScore).toBeLessThan(80);
		});

		it('应该为低质量的聚合根返回低分', async () => {
			const result = await service.score(mockLowQualityAggregate);

			expect(result.totalScore).toBeLessThan(60);
		});

		it('应该返回包含所有评分维度的结果', async () => {
			const result = await service.score(mockCompleteAggregate);

			const dimensionNames = result.dimensions.map((d) => d.name);

			expect(dimensionNames).toContain('基础完整性');
			expect(dimensionNames).toContain('分类准确性');
			expect(dimensionNames).toContain('分析维度完整性');
			expect(dimensionNames).toContain('审计完整性');
			expect(dimensionNames).toContain('扩展能力利用');
		});

		it('每个维度应该包含完整的评分信息', async () => {
			const result = await service.score(mockCompleteAggregate);

			for (const dim of result.dimensions) {
				expect(dim.name).toBeDefined();
				expect(dim.score).toBeGreaterThanOrEqual(0);
				expect(dim.score).toBeLessThanOrEqual(100);
				expect(dim.weight).toBeGreaterThan(0);
				expect(dim.weight).toBeLessThanOrEqual(1);
				expect(dim.weightedScore).toBe(dim.score * dim.weight);
				expect(dim.description).toBeDefined();
			}
		});

		it('应该为低分维度提供改进建议', async () => {
			const result = await service.score(mockPartialAggregate);

			const lowScoreDimensions = result.dimensions.filter((d) => d.score < 80);

			for (const dim of lowScoreDimensions) {
				if (dim.suggestions) {
					expect(dim.suggestions.length).toBeGreaterThan(0);
				}
			}
		});
	});

	describe('批量评分', () => {
		it('应该批量计算多个聚合根的质量分数', async () => {
			const aggregates = [mockCompleteAggregate, mockPartialAggregate];

			const results = await service.scoreBatch(aggregates);

			expect(results).toHaveLength(2);
			expect(results[0].totalScore).toBeGreaterThan(0);
			expect(results[1].totalScore).toBeGreaterThan(0);
		});

		it('批量评分结果应该与单个评分结果一致', async () => {
			const aggregates = [mockCompleteAggregate];

			const batchResult = await service.scoreBatch(aggregates);
			const singleResult = await service.score(mockCompleteAggregate);

			expect(batchResult[0].totalScore).toBe(singleResult.totalScore);
		});

		it('应该处理空数组', async () => {
			const results = await service.scoreBatch([]);

			expect(results).toHaveLength(0);
			expect(results).toEqual([]);
		});

		it('应该处理大型数组', async () => {
			const aggregates: IFullAggregateMetadata[] = [];
			for (let i = 0; i < 100; i++) {
				aggregates.push({
					...mockPartialAggregate,
					aggregateId: `test-${i}`
				});
			}

			const results = await service.scoreBatch(aggregates);

			expect(results).toHaveLength(100);
		});
	});

	describe('评分维度验证', () => {
		it('基础完整性维度应该检查必填字段', async () => {
			const result = await service.score(mockLowQualityAggregate);

			const integrityDim = result.dimensions.find((d) => d.name === '基础完整性');

			expect(integrityDim).toBeDefined();
			expect(integrityDim!.score).toBeLessThan(60);
		});

		it('分类准确性维度应该检查标签和分类', async () => {
			const aggregate: IFullAggregateMetadata = {
				...mockPartialAggregate,
				analyzable: {
					tags: [],
					includeInAnalytics: true
				}
			};

			const result = await service.score(aggregate);

			const classificationDim = result.dimensions.find((d) => d.name === '分类准确性');

			expect(classificationDim).toBeDefined();
			expect(classificationDim!.score).toBeLessThan(100);
		});

		it('分析维度完整性应该检查 analyticsDimensions', async () => {
			const aggregate: IFullAggregateMetadata = {
				...mockPartialAggregate,
				analyzable: {
					tags: ['test'],
					category: 'test',
					analyticsDimensions: {
						dim1: 'value1',
						dim2: 'value2',
						dim3: 'value3'
					},
					includeInAnalytics: true
				}
			};

			const result = await service.score(aggregate);

			const dimensionsDim = result.dimensions.find((d) => d.name === '分析维度完整性');

			expect(dimensionsDim).toBeDefined();
			expect(dimensionsDim!.score).toBe(60);
		});

		it('审计完整性维度应该检查审计字段', async () => {
			const result = await service.score(mockPartialAggregate);

			const auditDim = result.dimensions.find((d) => d.name === '审计完整性');

			expect(auditDim).toBeDefined();
			expect(auditDim!.score).toBeLessThan(100);
		});

		it('扩展能力利用维度应该检查扩展配置', async () => {
			const result = await service.score(mockCompleteAggregate);

			const extensionDim = result.dimensions.find((d) => d.name === '扩展能力利用');

			expect(extensionDim).toBeDefined();
			expect(extensionDim!.score).toBe(100);
		});
	});

	describe('错误处理', () => {
		it('应该处理缺少必填字段的聚合根', async () => {
			const incompleteAggregate = {
				aggregateType: 'Test'
			} as IFullAggregateMetadata;

			const result = await service.score(incompleteAggregate);

			expect(result).toBeDefined();
			expect(result.totalScore).toBeGreaterThanOrEqual(0);
		});

		it('应该处理 null 值的 analyzable', async () => {
			const aggregate: IFullAggregateMetadata = {
				...mockPartialAggregate,
				analyzable: undefined as any
			};

			const result = await service.score(aggregate);

			expect(result).toBeDefined();
		});

		it('应该处理空的 analyticsDimensions', async () => {
			const aggregate: IFullAggregateMetadata = {
				...mockPartialAggregate,
				analyzable: {
					tags: [],
					analyticsDimensions: {},
					includeInAnalytics: true
				}
			};

			const result = await service.score(aggregate);

			expect(result).toBeDefined();
		});
	});

	describe('分数边界条件', () => {
		it('总分应该在 0-100 范围内', async () => {
			const results = await service.scoreBatch([mockCompleteAggregate, mockLowQualityAggregate]);

			for (const result of results) {
				expect(result.totalScore).toBeGreaterThanOrEqual(0);
				expect(result.totalScore).toBeLessThanOrEqual(100);
			}
		});

		it('每个维度分数应该在 0-100 范围内', async () => {
			const result = await service.score(mockCompleteAggregate);

			for (const dim of result.dimensions) {
				expect(dim.score).toBeGreaterThanOrEqual(0);
				expect(dim.score).toBeLessThanOrEqual(100);
			}
		});

		it('权重总和应该为 1', async () => {
			const result = await service.score(mockCompleteAggregate);

			const totalWeight = result.dimensions.reduce((sum, dim) => sum + dim.weight, 0);

			expect(totalWeight).toBeCloseTo(1, 1);
		});
	});
});

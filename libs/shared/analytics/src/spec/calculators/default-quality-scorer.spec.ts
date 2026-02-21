import { DefaultDataQualityScorer } from '../../lib/calculators/default-quality-scorer';
import type { IFullAggregateMetadata } from '@oksai/aggregate-metadata';

/**
 * @description DefaultDataQualityScorer 单元测试
 *
 * 测试覆盖：
 * - 5 维度评分算法的正确性
 * - 严格模式的处理
 * - 改进建议的生成
 * - 边界条件处理
 */
describe('DefaultDataQualityScorer', () => {
	let scorer: DefaultDataQualityScorer;

	beforeEach(() => {
		scorer = new DefaultDataQualityScorer();
	});

	describe('基本信息', () => {
		it('应该返回评分器名称', () => {
			expect(scorer.getName()).toBe('DefaultDataQualityScorer');
		});

		it('应该返回评分器版本', () => {
			expect(scorer.getVersion()).toBe('1.0.0');
		});
	});

	describe('完整元数据的评分', () => {
		it('应该为完整的元数据给出高分', () => {
			const aggregate: IFullAggregateMetadata = {
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
				}
			};

			const result = scorer.calculateScore(aggregate);

			expect(result.totalScore).toBeGreaterThan(80);
			expect(result.dimensions).toHaveLength(5);
			expect(result.scoredAt).toBeInstanceOf(Date);
			expect(result.version).toBe('1.0.0');
		});

		it('应该为缺少扩展能力的元数据给出中等分数', () => {
			const aggregate: IFullAggregateMetadata = {
				aggregateType: 'Billing',
				aggregateId: 'billing-002',
				tenantId: 'tenant-123',
				createdAt: new Date(),
				updatedAt: new Date(),
				createdBy: 'user-001',
				isDeleted: false
			};

			const result = scorer.calculateScore(aggregate);

			expect(result.totalScore).toBeLessThan(80);
			expect(result.totalScore).toBeGreaterThan(40);
		});
	});

	describe('各维度评分', () => {
		it('应该正确评估基础完整性（缺失必填字段）', () => {
			const aggregate: IFullAggregateMetadata = {
				aggregateType: 'Test',
				aggregateId: '',
				tenantId: '',
				createdAt: new Date(),
				updatedAt: new Date(),
				isDeleted: false
			};

			const result = scorer.calculateScore(aggregate);
			const integrityDim = result.dimensions.find((d) => d.name === '基础完整性');

			expect(integrityDim).toBeDefined();
			expect(integrityDim!.score).toBeLessThan(60);
			expect(integrityDim!.suggestions).toContain('设置有效的聚合 ID');
			expect(integrityDim!.suggestions).toContain('设置有效的租户 ID');
		});

		it('应该正确评估分类准确性（缺失标签和分类）', () => {
			const aggregate: IFullAggregateMetadata = {
				aggregateType: 'Billing',
				aggregateId: 'billing-003',
				tenantId: 'tenant-123',
				createdAt: new Date(),
				updatedAt: new Date(),
				isDeleted: false,
				analyzable: {
					tags: [],
					includeInAnalytics: true
				}
			};

			const result = scorer.calculateScore(aggregate);
			const classificationDim = result.dimensions.find((d) => d.name === '分类准确性');

			expect(classificationDim).toBeDefined();
			expect(classificationDim!.score).toBeLessThan(50);
			expect(classificationDim!.suggestions).toContain('添加至少一个标签');
			expect(classificationDim!.suggestions).toContain('设置业务分类');
		});

		it('应该正确评估分析维度完整性', () => {
			const aggregate: IFullAggregateMetadata = {
				aggregateType: 'Billing',
				aggregateId: 'billing-004',
				tenantId: 'tenant-123',
				createdAt: new Date(),
				updatedAt: new Date(),
				isDeleted: false,
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

			const result = scorer.calculateScore(aggregate);
			const dimensionsDim = result.dimensions.find((d) => d.name === '分析维度完整性');

			expect(dimensionsDim).toBeDefined();
			expect(dimensionsDim!.score).toBe(60);
		});

		it('应该正确评估审计完整性', () => {
			const aggregate: IFullAggregateMetadata = {
				aggregateType: 'Billing',
				aggregateId: 'billing-005',
				tenantId: 'tenant-123',
				createdAt: new Date(),
				updatedAt: new Date(),
				isDeleted: false
			};

			const result = scorer.calculateScore(aggregate);
			const auditDim = result.dimensions.find((d) => d.name === '审计完整性');

			expect(auditDim).toBeDefined();
			expect(auditDim!.score).toBe(30);
			expect(auditDim!.suggestions).toContain('记录创建者信息');
			expect(auditDim!.suggestions).toContain('记录最后更新者信息');
		});

		it('应该正确评估扩展能力利用', () => {
			const aggregateWithAll: IFullAggregateMetadata = {
				aggregateType: 'Test',
				aggregateId: 'test-001',
				tenantId: 'tenant-123',
				createdAt: new Date(),
				updatedAt: new Date(),
				isDeleted: false,
				analyzable: { tags: [], includeInAnalytics: true },
				aiEnabled: { embeddingStatus: 'SYNCED' as any, needsReembedding: false },
				syncable: { syncStatus: 'SYNCED' as any, externalIds: {}, syncVersion: 1, needsSync: false }
			};

			const result = scorer.calculateScore(aggregateWithAll);
			const extensionDim = result.dimensions.find((d) => d.name === '扩展能力利用');

			expect(extensionDim).toBeDefined();
			expect(extensionDim!.score).toBe(100);
		});
	});

	describe('严格模式', () => {
		it('在严格模式下，缺失必填字段应返回 0 分', () => {
			const strictScorer = new DefaultDataQualityScorer({ strictMode: true });
			const aggregate: IFullAggregateMetadata = {
				aggregateType: 'Test',
				aggregateId: '',
				tenantId: 'tenant-123',
				createdAt: new Date(),
				updatedAt: new Date(),
				isDeleted: false
			};

			const result = strictScorer.calculateScore(aggregate);

			expect(result.totalScore).toBe(0);
		});

		it('在非严格模式下，缺失必填字段应返回低分但不为 0', () => {
			const aggregate: IFullAggregateMetadata = {
				aggregateType: 'Test',
				aggregateId: '',
				tenantId: 'tenant-123',
				createdAt: new Date(),
				updatedAt: new Date(),
				isDeleted: false
			};

			const result = scorer.calculateScore(aggregate);

			expect(result.totalScore).toBeGreaterThan(0);
			expect(result.totalScore).toBeLessThan(60);
		});
	});

	describe('批量评分', () => {
		it('应该正确批量计算质量分数', () => {
			const aggregates: IFullAggregateMetadata[] = [
				{
					aggregateType: 'Test',
					aggregateId: 'test-001',
					tenantId: 'tenant-123',
					createdAt: new Date(),
					updatedAt: new Date(),
					isDeleted: false
				},
				{
					aggregateType: 'Test',
					aggregateId: 'test-002',
					tenantId: 'tenant-123',
					createdAt: new Date(),
					updatedAt: new Date(),
					isDeleted: false
				}
			];

			const results = scorer.calculateScores(aggregates);

			expect(results).toHaveLength(2);
			expect(results[0].totalScore).toBeGreaterThan(0);
			expect(results[1].totalScore).toBeGreaterThan(0);
		});
	});

	describe('边界条件', () => {
		it('应该处理空的分析维度', () => {
			const aggregate: IFullAggregateMetadata = {
				aggregateType: 'Test',
				aggregateId: 'test-001',
				tenantId: 'tenant-123',
				createdAt: new Date(),
				updatedAt: new Date(),
				isDeleted: false,
				analyzable: {
					tags: [],
					analyticsDimensions: {},
					includeInAnalytics: true
				}
			};

			const result = scorer.calculateScore(aggregate);

			expect(result.totalScore).toBeGreaterThanOrEqual(0);
			expect(result.totalScore).toBeLessThanOrEqual(100);
		});

		it('应该处理已删除的聚合根', () => {
			const aggregate: IFullAggregateMetadata = {
				aggregateType: 'Test',
				aggregateId: 'test-001',
				tenantId: 'tenant-123',
				createdAt: new Date(),
				updatedAt: new Date(),
				createdBy: 'user-001',
				deletedAt: new Date(),
				deletedBy: 'user-001',
				isDeleted: true
			};

			const result = scorer.calculateScore(aggregate);

			expect(result.totalScore).toBeGreaterThan(0);
		});
	});
});

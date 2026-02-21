import { AggregateMetadataEntity } from '../../lib/read-model/aggregate-metadata.entity';

describe('AggregateMetadataEntity', () => {
	describe('构造与属性', () => {
		it('应该能够创建实例并设置主键', () => {
			const entity = new AggregateMetadataEntity();
			entity.tenantId = 'tenant-123';
			entity.aggregateType = 'Job';
			entity.aggregateId = 'job-456';

			expect(entity.tenantId).toBe('tenant-123');
			expect(entity.aggregateType).toBe('Job');
			expect(entity.aggregateId).toBe('job-456');
		});

		it('应该有默认的创建时间和更新时间', () => {
			const entity = new AggregateMetadataEntity();

			expect(entity.createdAt).toBeInstanceOf(Date);
			expect(entity.updatedAt).toBeInstanceOf(Date);
		});

		it('应该有默认的 isDeleted 为 false', () => {
			const entity = new AggregateMetadataEntity();

			expect(entity.isDeleted).toBe(false);
		});
	});

	describe('基础审计字段', () => {
		it('应该能够设置 createdBy 和 updatedBy', () => {
			const entity = new AggregateMetadataEntity();
			entity.createdBy = 'user-123';
			entity.updatedBy = 'user-456';

			expect(entity.createdBy).toBe('user-123');
			expect(entity.updatedBy).toBe('user-456');
		});

		it('应该能够设置 deletedAt 和 deletedBy', () => {
			const entity = new AggregateMetadataEntity();
			const now = new Date();
			entity.deletedAt = now;
			entity.deletedBy = 'user-789';
			entity.isDeleted = true;

			expect(entity.deletedAt).toBe(now);
			expect(entity.deletedBy).toBe('user-789');
			expect(entity.isDeleted).toBe(true);
		});

		it('createdBy 和 updatedBy 应该是可选的', () => {
			const entity = new AggregateMetadataEntity();

			expect(entity.createdBy).toBeUndefined();
			expect(entity.updatedBy).toBeUndefined();
		});
	});

	describe('可分析扩展字段', () => {
		it('应该能够设置 tags', () => {
			const entity = new AggregateMetadataEntity();
			entity.tags = ['important', 'urgent', 'review'];

			expect(entity.tags).toEqual(['important', 'urgent', 'review']);
		});

		it('应该能够设置 category', () => {
			const entity = new AggregateMetadataEntity();
			entity.category = 'billing';

			expect(entity.category).toBe('billing');
		});

		it('应该能够设置 analyticsDimensions', () => {
			const entity = new AggregateMetadataEntity();
			entity.analyticsDimensions = {
				region: 'cn-north',
				priority: 1,
				isActive: true,
			};

			expect(entity.analyticsDimensions?.region).toBe('cn-north');
			expect(entity.analyticsDimensions?.priority).toBe(1);
			expect(entity.analyticsDimensions?.isActive).toBe(true);
		});

		it('应该能够设置 qualityScore', () => {
			const entity = new AggregateMetadataEntity();
			entity.qualityScore = 85;

			expect(entity.qualityScore).toBe(85);
		});

		it('应该能够设置 includeInAnalytics', () => {
			const entity = new AggregateMetadataEntity();
			entity.includeInAnalytics = true;

			expect(entity.includeInAnalytics).toBe(true);
		});

		it('可分析字段应该是可选的', () => {
			const entity = new AggregateMetadataEntity();

			expect(entity.tags).toBeUndefined();
			expect(entity.category).toBeUndefined();
			expect(entity.analyticsDimensions).toBeUndefined();
			expect(entity.qualityScore).toBeUndefined();
			expect(entity.includeInAnalytics).toBeUndefined();
		});
	});

	describe('AI 能力扩展字段', () => {
		it('应该能够设置 embeddingStatus', () => {
			const entity = new AggregateMetadataEntity();
			entity.embeddingStatus = 'PENDING';

			expect(entity.embeddingStatus).toBe('PENDING');
		});

		it('应该能够设置 embeddingVersion', () => {
			const entity = new AggregateMetadataEntity();
			entity.embeddingVersion = 'v1.0.0';

			expect(entity.embeddingVersion).toBe('v1.0.0');
		});

		it('应该能够设置 embeddingId', () => {
			const entity = new AggregateMetadataEntity();
			entity.embeddingId = 'emb-123456';

			expect(entity.embeddingId).toBe('emb-123456');
		});

		it('应该能够设置 aiMetadata', () => {
			const entity = new AggregateMetadataEntity();
			entity.aiMetadata = {
				modelName: 'text-embedding-3',
				processedAt: new Date(),
				tokenCount: 1500,
			};

			expect(entity.aiMetadata?.modelName).toBe('text-embedding-3');
			expect(entity.aiMetadata?.tokenCount).toBe(1500);
		});

		it('AI 扩展字段应该是可选的', () => {
			const entity = new AggregateMetadataEntity();

			expect(entity.embeddingStatus).toBeUndefined();
			expect(entity.embeddingVersion).toBeUndefined();
			expect(entity.embeddingId).toBeUndefined();
			expect(entity.aiMetadata).toBeUndefined();
		});
	});

	describe('可同步扩展字段', () => {
		it('应该能够设置 externalIds', () => {
			const entity = new AggregateMetadataEntity();
			entity.externalIds = {
				erpId: 'ERP-001',
				crmId: 'CRM-002',
			};

			expect(entity.externalIds?.erpId).toBe('ERP-001');
			expect(entity.externalIds?.crmId).toBe('CRM-002');
		});

		it('应该能够设置 dataSource', () => {
			const entity = new AggregateMetadataEntity();
			entity.dataSource = 'external-erp';

			expect(entity.dataSource).toBe('external-erp');
		});

		it('应该能够设置 syncStatus', () => {
			const entity = new AggregateMetadataEntity();
			entity.syncStatus = 'SYNCED';

			expect(entity.syncStatus).toBe('SYNCED');
		});

		it('应该能够设置 lastSyncedAt', () => {
			const entity = new AggregateMetadataEntity();
			const syncTime = new Date('2026-01-15T10:30:00Z');
			entity.lastSyncedAt = syncTime;

			expect(entity.lastSyncedAt).toBe(syncTime);
		});

		it('应该能够设置 syncVersion', () => {
			const entity = new AggregateMetadataEntity();
			entity.syncVersion = 5;

			expect(entity.syncVersion).toBe(5);
		});

		it('应该能够设置 etlMetadata', () => {
			const entity = new AggregateMetadataEntity();
			entity.etlMetadata = {
				jobId: 'etl-job-123',
				processedAt: new Date(),
				version: '2.0.0',
			};

			expect(entity.etlMetadata?.jobId).toBe('etl-job-123');
			expect(entity.etlMetadata?.version).toBe('2.0.0');
		});

		it('可同步扩展字段应该是可选的', () => {
			const entity = new AggregateMetadataEntity();

			expect(entity.externalIds).toBeUndefined();
			expect(entity.dataSource).toBeUndefined();
			expect(entity.syncStatus).toBeUndefined();
			expect(entity.lastSyncedAt).toBeUndefined();
			expect(entity.syncVersion).toBeUndefined();
			expect(entity.etlMetadata).toBeUndefined();
		});
	});

	describe('完整场景', () => {
		it('应该能够创建一个完整的元数据实体', () => {
			const entity = new AggregateMetadataEntity();
			entity.tenantId = 'tenant-001';
			entity.aggregateType = 'Job';
			entity.aggregateId = 'job-001';
			entity.createdBy = 'user-001';
			entity.updatedBy = 'user-002';
			entity.tags = ['production', 'critical'];
			entity.category = 'data-processing';
			entity.qualityScore = 95;
			entity.includeInAnalytics = true;
			entity.embeddingStatus = 'SYNCED';
			entity.embeddingVersion = 'v1.0.0';
			entity.embeddingId = 'emb-001';
			entity.syncStatus = 'SYNCED';
			entity.syncVersion = 3;

			expect(entity.tenantId).toBe('tenant-001');
			expect(entity.aggregateType).toBe('Job');
			expect(entity.aggregateId).toBe('job-001');
			expect(entity.tags).toEqual(['production', 'critical']);
			expect(entity.embeddingStatus).toBe('SYNCED');
			expect(entity.syncVersion).toBe(3);
		});

		it('应该支持软删除场景', () => {
			const entity = new AggregateMetadataEntity();
			entity.tenantId = 'tenant-001';
			entity.aggregateType = 'Job';
			entity.aggregateId = 'job-001';
			entity.deletedAt = new Date();
			entity.deletedBy = 'admin-001';
			entity.isDeleted = true;

			expect(entity.isDeleted).toBe(true);
			expect(entity.deletedAt).toBeInstanceOf(Date);
			expect(entity.deletedBy).toBe('admin-001');
		});
	});
});

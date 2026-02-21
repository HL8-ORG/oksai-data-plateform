import {
	EmbeddingStatus,
	SyncStatus,
	type AIProcessingMetadata,
	type ETLMetadata
} from '../../lib/extensions/enums-and-interfaces';

describe('Extensions Enums and Interfaces', () => {
	describe('EmbeddingStatus', () => {
		it('应该定义 PENDING 状态', () => {
			expect(EmbeddingStatus.PENDING).toBe('PENDING');
		});

		it('应该定义 STALE 状态', () => {
			expect(EmbeddingStatus.STALE).toBe('STALE');
		});

		it('应该定义 SYNCED 状态', () => {
			expect(EmbeddingStatus.SYNCED).toBe('SYNCED');
		});

		it('应该定义 FAILED 状态', () => {
			expect(EmbeddingStatus.FAILED).toBe('FAILED');
		});

		it('应该有 4 个状态值', () => {
			expect(Object.keys(EmbeddingStatus)).toHaveLength(4);
		});
	});

	describe('SyncStatus', () => {
		it('应该定义 SYNCED 状态', () => {
			expect(SyncStatus.SYNCED).toBe('SYNCED');
		});

		it('应该定义 PENDING 状态', () => {
			expect(SyncStatus.PENDING).toBe('PENDING');
		});

		it('应该定义 FAILED 状态', () => {
			expect(SyncStatus.FAILED).toBe('FAILED');
		});

		it('应该有 3 个状态值', () => {
			expect(Object.keys(SyncStatus)).toHaveLength(3);
		});
	});

	describe('AIProcessingMetadata', () => {
		it('应该允许创建完整的元数据', () => {
			const metadata: AIProcessingMetadata = {
				modelName: 'gpt-4',
				processedAt: new Date(),
				processingTimeMs: 1000,
				tokenCount: 500,
				errorMessage: undefined,
				extra: { temperature: 0.7 }
			};

			expect(metadata.modelName).toBe('gpt-4');
			expect(metadata.tokenCount).toBe(500);
		});

		it('应该允许创建空的元数据', () => {
			const metadata: AIProcessingMetadata = {};

			expect(metadata.modelName).toBeUndefined();
			expect(metadata.processedAt).toBeUndefined();
		});
	});

	describe('ETLMetadata', () => {
		it('应该允许创建完整的 ETL 元数据', () => {
			const metadata: ETLMetadata = {
				jobId: 'job-123',
				processedAt: new Date(),
				version: '1.0.0',
				transformRules: ['rule1', 'rule2'],
				errorMessage: undefined,
				extra: { source: 'erp' }
			};

			expect(metadata.jobId).toBe('job-123');
			expect(metadata.transformRules).toHaveLength(2);
		});

		it('应该允许创建空的 ETL 元数据', () => {
			const metadata: ETLMetadata = {};

			expect(metadata.jobId).toBeUndefined();
			expect(metadata.version).toBeUndefined();
		});
	});
});

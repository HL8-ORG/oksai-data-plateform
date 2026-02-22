import type {
	IEmbeddingService,
	IVectorStore,
	VectorUpsertParams,
	VectorSearchParams,
	VectorDeleteParams,
	VectorData,
	EmbeddingServiceConfig,
	VectorStoreConfig
} from '../../lib/interfaces/embedding.interface';

describe('Embedding Interfaces', () => {
	describe('IEmbeddingService', () => {
		it('应该定义正确的接口结构', () => {
			const mockService: IEmbeddingService = {
				getModelName: () => 'test-model',
				getDimension: () => 1536,
				embed: async (text: string) => [0.1, 0.2, 0.3],
				embedBatch: async (texts: string[]) => [[0.1, 0.2, 0.3]]
			};

			expect(mockService.getModelName()).toBe('test-model');
			expect(mockService.getDimension()).toBe(1536);
		});
	});

	describe('IVectorStore', () => {
		it('应该定义正确的接口结构', () => {
			const mockStore: IVectorStore = {
				upsert: async (params: VectorUpsertParams) => {},
				upsertBatch: async (params: VectorUpsertParams[]) => {},
				search: async (params: VectorSearchParams) => [],
				delete: async (params: VectorDeleteParams) => {},
				get: async (id: string) => null
			};

			expect(mockStore).toBeDefined();
		});
	});

	describe('VectorUpsertParams', () => {
		it('应该支持所有字段', () => {
			const params: VectorUpsertParams = {
				id: 'emb-001',
				tenantId: 'tenant-001',
				aggregateType: 'Job',
				aggregateId: 'job-001',
				vector: [0.1, 0.2, 0.3],
				content: 'test content',
				metadata: { source: 'erp' }
			};

			expect(params.id).toBe('emb-001');
			expect(params.metadata?.source).toBe('erp');
		});

		it('metadata 应该是可选的', () => {
			const params: VectorUpsertParams = {
				id: 'emb-001',
				tenantId: 'tenant-001',
				aggregateType: 'Job',
				aggregateId: 'job-001',
				vector: [0.1, 0.2, 0.3],
				content: 'test content'
			};

			expect(params.metadata).toBeUndefined();
		});
	});

	describe('VectorSearchParams', () => {
		it('应该支持所有字段', () => {
			const params: VectorSearchParams = {
				tenantId: 'tenant-001',
				vector: [0.1, 0.2, 0.3],
				limit: 10,
				minScore: 0.8,
				aggregateType: 'Job',
				metadataFilter: { source: 'erp' }
			};

			expect(params.tenantId).toBe('tenant-001');
			expect(params.limit).toBe(10);
			expect(params.minScore).toBe(0.8);
		});

		it('可选字段应该正确工作', () => {
			const params: VectorSearchParams = {
				tenantId: 'tenant-001',
				vector: [0.1, 0.2, 0.3]
			};

			expect(params.limit).toBeUndefined();
			expect(params.minScore).toBeUndefined();
			expect(params.aggregateType).toBeUndefined();
		});
	});

	describe('VectorSearchResult', () => {
		it('应该定义正确的结构', () => {
			const result = {
				id: 'emb-001',
				aggregateType: 'Job',
				aggregateId: 'job-001',
				score: 0.95,
				content: 'test content',
				metadata: { source: 'erp' }
			};

			expect(result.score).toBe(0.95);
			expect(result.aggregateType).toBe('Job');
		});
	});

	describe('VectorDeleteParams', () => {
		it('应该定义正确的结构', () => {
			const params: VectorDeleteParams = {
				id: 'emb-001',
				tenantId: 'tenant-001'
			};

			expect(params.id).toBe('emb-001');
			expect(params.tenantId).toBe('tenant-001');
		});
	});

	describe('VectorData', () => {
		it('应该定义正确的结构', () => {
			const data: VectorData = {
				id: 'emb-001',
				tenantId: 'tenant-001',
				aggregateType: 'Job',
				aggregateId: 'job-001',
				vector: [0.1, 0.2, 0.3],
				content: 'test content',
				metadata: { source: 'erp' },
				createdAt: new Date('2026-01-01')
			};

			expect(data.id).toBe('emb-001');
			expect(data.createdAt).toBeInstanceOf(Date);
		});
	});

	describe('EmbeddingServiceConfig', () => {
		it('应该支持所有字段', () => {
			const config: EmbeddingServiceConfig = {
				modelName: 'text-embedding-3-small',
				dimension: 1536,
				batchSize: 100,
				timeout: 30000
			};

			expect(config.modelName).toBe('text-embedding-3-small');
			expect(config.dimension).toBe(1536);
		});

		it('可选字段应该正确工作', () => {
			const config: EmbeddingServiceConfig = {
				modelName: 'text-embedding-3-small',
				dimension: 1536
			};

			expect(config.batchSize).toBeUndefined();
			expect(config.timeout).toBeUndefined();
		});
	});

	describe('VectorStoreConfig', () => {
		it('应该支持所有字段', () => {
			const config: VectorStoreConfig = {
				similarityMetric: 'cosine',
				indexType: 'hnsw'
			};

			expect(config.similarityMetric).toBe('cosine');
			expect(config.indexType).toBe('hnsw');
		});

		it('所有字段应该是可选的', () => {
			const config: VectorStoreConfig = {};

			expect(config.similarityMetric).toBeUndefined();
			expect(config.indexType).toBeUndefined();
		});

		it('应该支持不同的相似度度量', () => {
			const metrics: Array<'cosine' | 'euclidean' | 'dot_product'> = ['cosine', 'euclidean', 'dot_product'];

			metrics.forEach((metric) => {
				const config: VectorStoreConfig = { similarityMetric: metric };
				expect(config.similarityMetric).toBe(metric);
			});
		});

		it('应该支持不同的索引类型', () => {
			const types: Array<'hnsw' | 'ivf' | 'flat'> = ['hnsw', 'ivf', 'flat'];

			types.forEach((type) => {
				const config: VectorStoreConfig = { indexType: type };
				expect(config.indexType).toBe(type);
			});
		});
	});
});

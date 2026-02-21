import { MockEmbeddingService, OpenAIEmbeddingService } from '../../lib/adapters/openai-embedding.service';

jest.mock('openai', () => ({
	OpenAI: jest.fn().mockImplementation(() => ({
		embeddings: {
			create: jest.fn()
		}
	}))
}));

describe('MockEmbeddingService', () => {
	let service: MockEmbeddingService;

	beforeEach(() => {
		service = new MockEmbeddingService();
	});

	describe('初始化', () => {
		it('应该使用默认配置创建', () => {
			expect(service.getModelName()).toBe('mock-embedding');
			expect(service.getDimension()).toBe(1536);
		});

		it('应该使用自定义配置创建', () => {
			const customService = new MockEmbeddingService({
				modelName: 'custom-model',
				dimension: 768
			});

			expect(customService.getModelName()).toBe('custom-model');
			expect(customService.getDimension()).toBe(768);
		});
	});

	describe('getModelName', () => {
		it('应该返回模型名称', () => {
			expect(service.getModelName()).toBe('mock-embedding');
		});
	});

	describe('getDimension', () => {
		it('应该返回向量维度', () => {
			expect(service.getDimension()).toBe(1536);
		});
	});

	describe('embed', () => {
		it('应该生成归一化的向量', async () => {
			const vector = await service.embed('test text');

			expect(vector).toHaveLength(1536);

			const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
			expect(magnitude).toBeCloseTo(1, 5);
		});

		it('不同文本应该生成不同的向量', async () => {
			const vector1 = await service.embed('text one');
			const vector2 = await service.embed('text two');

			expect(vector1).not.toEqual(vector2);
		});

		it('相同输入每次应该生成不同的向量（随机）', async () => {
			const vector1 = await service.embed('same text');
			const vector2 = await service.embed('same text');

			expect(vector1).not.toEqual(vector2);
		});
	});

	describe('embedBatch', () => {
		it('应该批量生成向量', async () => {
			const texts = ['text 1', 'text 2', 'text 3'];
			const vectors = await service.embedBatch(texts);

			expect(vectors).toHaveLength(3);
			vectors.forEach((v) => {
				expect(v).toHaveLength(1536);
			});
		});

		it('空数组应该返回空数组', async () => {
			const vectors = await service.embedBatch([]);

			expect(vectors).toHaveLength(0);
		});

		it('所有向量都应该是归一化的', async () => {
			const texts = ['text 1', 'text 2', 'text 3'];
			const vectors = await service.embedBatch(texts);

			vectors.forEach((vector) => {
				const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
				expect(magnitude).toBeCloseTo(1, 5);
			});
		});
	});
});

describe('OpenAIEmbeddingService', () => {
	describe('初始化', () => {
		it('应该使用默认配置', () => {
			const service = new OpenAIEmbeddingService({
				apiKey: 'test-key',
				modelName: 'text-embedding-3-small',
				dimension: 1536
			});

			expect(service.getModelName()).toBe('text-embedding-3-small');
			expect(service.getDimension()).toBe(1536);
		});

		it('应该使用自定义配置', () => {
			const service = new OpenAIEmbeddingService({
				apiKey: 'test-key',
				modelName: 'text-embedding-3-large',
				dimension: 3072,
				batchSize: 50,
				timeout: 60000
			});

			expect(service.getModelName()).toBe('text-embedding-3-large');
			expect(service.getDimension()).toBe(3072);
		});
	});

	describe('embed', () => {
		it('没有 OpenAI 客户端时应该抛出错误', async () => {
			const service = new OpenAIEmbeddingService({
				apiKey: 'invalid-key',
				modelName: 'text-embedding-3-small',
				dimension: 1536
			});

			await new Promise((resolve) => setTimeout(resolve, 100));

			await expect(service.embed('test')).rejects.toThrow('OpenAI client not initialized');
		});
	});

	describe('embedBatch', () => {
		it('没有 OpenAI 客户端时应该抛出错误', async () => {
			const service = new OpenAIEmbeddingService({
				apiKey: 'invalid-key',
				modelName: 'text-embedding-3-small',
				dimension: 1536
			});

			await new Promise((resolve) => setTimeout(resolve, 100));

			await expect(service.embedBatch(['test'])).rejects.toThrow('OpenAI client not initialized');
		});
	});
});

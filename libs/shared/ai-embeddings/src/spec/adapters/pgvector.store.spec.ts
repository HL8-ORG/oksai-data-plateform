import { PGVectorStore } from '../../lib/adapters/pgvector.store';

describe('PGVectorStore', () => {
	let store: PGVectorStore;
	let mockConnection: {
		execute: jest.Mock;
	};
	let mockEm: {
		getConnection: jest.Mock;
	};
	let mockOrm: {
		em: any;
	};

	beforeEach(() => {
		mockConnection = {
			execute: jest.fn()
		};
		mockEm = {
			getConnection: jest.fn().mockReturnValue(mockConnection)
		};
		mockOrm = {
			em: mockEm
		};
		store = new PGVectorStore(mockOrm as any);
	});

	describe('upsert', () => {
		it('应该执行 INSERT ON CONFLICT UPDATE 语句', async () => {
			await store.upsert({
				id: 'emb-001',
				tenantId: 'tenant-001',
				aggregateType: 'Job',
				aggregateId: 'job-001',
				vector: [0.1, 0.2, 0.3],
				content: 'test content'
			});

			expect(mockConnection.execute).toHaveBeenCalledTimes(1);
			const call = mockConnection.execute.mock.calls[0];
			expect(call[0]).toContain('INSERT INTO document_embeddings');
			expect(call[0]).toContain('ON CONFLICT');
		});

		it('应该包含元数据', async () => {
			await store.upsert({
				id: 'emb-001',
				tenantId: 'tenant-001',
				aggregateType: 'Job',
				aggregateId: 'job-001',
				vector: [0.1, 0.2, 0.3],
				content: 'test content',
				metadata: { source: 'erp' }
			});

			const params = mockConnection.execute.mock.calls[0][1];
			expect(params[6]).toContain('source');
		});
	});

	describe('upsertBatch', () => {
		it('应该批量存储向量', async () => {
			await store.upsertBatch([
				{
					id: 'emb-001',
					tenantId: 'tenant-001',
					aggregateType: 'Job',
					aggregateId: 'job-001',
					vector: [0.1],
					content: 'content 1'
				},
				{
					id: 'emb-002',
					tenantId: 'tenant-001',
					aggregateType: 'Job',
					aggregateId: 'job-002',
					vector: [0.2],
					content: 'content 2'
				}
			]);

			expect(mockConnection.execute).toHaveBeenCalledTimes(2);
		});

		it('空数组不应该执行任何操作', async () => {
			await store.upsertBatch([]);

			expect(mockConnection.execute).not.toHaveBeenCalled();
		});
	});

	describe('search', () => {
		it('应该执行相似度搜索', async () => {
			mockConnection.execute.mockResolvedValueOnce([
				{
					id: 'emb-001',
					aggregate_type: 'Job',
					aggregate_id: 'job-001',
					content: 'test content',
					metadata: null,
					score: '0.95'
				}
			]);

			const results = await store.search({
				tenantId: 'tenant-001',
				vector: [0.1, 0.2, 0.3]
			});

			expect(results).toHaveLength(1);
			expect(results[0].id).toBe('emb-001');
			expect(results[0].score).toBe(0.95);
		});

		it('应该使用聚合类型过滤', async () => {
			mockConnection.execute.mockResolvedValueOnce([]);

			await store.search({
				tenantId: 'tenant-001',
				vector: [0.1, 0.2, 0.3],
				aggregateType: 'Job'
			});

			const call = mockConnection.execute.mock.calls[0];
			expect(call[1]).toContain('Job');
		});

		it('应该使用元数据过滤', async () => {
			mockConnection.execute.mockResolvedValueOnce([]);

			await store.search({
				tenantId: 'tenant-001',
				vector: [0.1, 0.2, 0.3],
				metadataFilter: { source: 'erp' }
			});

			const call = mockConnection.execute.mock.calls[0];
			expect(call[0]).toContain("metadata->>'source'");
		});

		it('应该使用 limit 参数', async () => {
			mockConnection.execute.mockResolvedValueOnce([]);

			await store.search({
				tenantId: 'tenant-001',
				vector: [0.1, 0.2, 0.3],
				limit: 5
			});

			const call = mockConnection.execute.mock.calls[0];
			expect(call[1][call[1].length - 1]).toBe(5);
		});

		it('应该使用 minScore 过滤', async () => {
			mockConnection.execute.mockResolvedValueOnce([]);

			await store.search({
				tenantId: 'tenant-001',
				vector: [0.1, 0.2, 0.3],
				minScore: 0.8
			});

			const call = mockConnection.execute.mock.calls[0];
			expect(call[0]).toContain('HAVING');
			expect(call[0]).toContain('0.8');
		});

		it('没有结果时应该返回空数组', async () => {
			mockConnection.execute.mockResolvedValueOnce([]);

			const results = await store.search({
				tenantId: 'tenant-001',
				vector: [0.1, 0.2, 0.3]
			});

			expect(results).toEqual([]);
		});
	});

	describe('delete', () => {
		it('应该执行 DELETE 语句', async () => {
			await store.delete({
				id: 'emb-001',
				tenantId: 'tenant-001'
			});

			expect(mockConnection.execute).toHaveBeenCalledTimes(1);
			const call = mockConnection.execute.mock.calls[0];
			expect(call[0]).toContain('DELETE FROM document_embeddings');
		});
	});

	describe('get', () => {
		it('应该返回向量数据', async () => {
			mockConnection.execute.mockResolvedValueOnce([
				{
					id: 'emb-001',
					tenant_id: 'tenant-001',
					aggregate_type: 'Job',
					aggregate_id: 'job-001',
					embedding: '[0.1,0.2,0.3]',
					content: 'test content',
					metadata: null,
					created_at: new Date('2026-01-01')
				}
			]);

			const result = await store.get('emb-001');

			expect(result).not.toBeNull();
			expect(result?.id).toBe('emb-001');
			expect(result?.tenantId).toBe('tenant-001');
			expect(result?.vector).toEqual([0.1, 0.2, 0.3]);
		});

		it('找不到记录时应该返回 null', async () => {
			mockConnection.execute.mockResolvedValueOnce([]);

			const result = await store.get('nonexistent');

			expect(result).toBeNull();
		});
	});

	describe('deleteByAggregate', () => {
		it('应该按聚合删除向量', async () => {
			await store.deleteByAggregate('tenant-001', 'Job', 'job-001');

			expect(mockConnection.execute).toHaveBeenCalledTimes(1);
			const call = mockConnection.execute.mock.calls[0];
			expect(call[0]).toContain('DELETE FROM document_embeddings');
			expect(call[1]).toEqual(['tenant-001', 'Job', 'job-001']);
		});
	});

	describe('count', () => {
		it('应该返回向量数量', async () => {
			mockConnection.execute.mockResolvedValueOnce([{ count: '42' }]);

			const result = await store.count('tenant-001');

			expect(result).toBe(42);
		});

		it('应该按聚合类型过滤计数', async () => {
			mockConnection.execute.mockResolvedValueOnce([{ count: '15' }]);

			const result = await store.count('tenant-001', 'Job');

			expect(result).toBe(15);
			const call = mockConnection.execute.mock.calls[0];
			expect(call[1]).toEqual(['tenant-001', 'Job']);
		});

		it('没有记录时应该返回 0', async () => {
			mockConnection.execute.mockResolvedValueOnce([{ count: '0' }]);

			const result = await store.count('tenant-001');

			expect(result).toBe(0);
		});
	});
});

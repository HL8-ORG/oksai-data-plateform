import { AggregateMetadataQueryService } from '../../lib/services/aggregate-metadata-query.service';

describe('AggregateMetadataQueryService', () => {
	let service: AggregateMetadataQueryService;
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
		service = new AggregateMetadataQueryService(mockOrm as any);
	});

	describe('query', () => {
		it('应该查询并返回元数据列表', async () => {
			mockConnection.execute.mockResolvedValueOnce([{ count: '2' }]).mockResolvedValueOnce([
				{
					aggregate_type: 'Job',
					aggregate_id: 'job-001',
					tenant_id: 'tenant-001',
					created_at: new Date('2026-01-01'),
					updated_at: new Date('2026-01-02'),
					created_by: 'user-001',
					updated_by: 'user-002',
					deleted_at: null,
					deleted_by: null,
					is_deleted: false,
					tags: ['important'],
					category: 'billing',
					analytics_dimensions: null,
					quality_score: 90,
					include_in_analytics: true,
					embedding_status: null,
					embedding_version: null,
					embedding_id: null,
					ai_metadata: null,
					external_ids: null,
					data_source: null,
					sync_status: null,
					last_synced_at: null,
					sync_version: null,
					etl_metadata: null
				},
				{
					aggregate_type: 'User',
					aggregate_id: 'user-001',
					tenant_id: 'tenant-001',
					created_at: new Date('2026-01-01'),
					updated_at: new Date('2026-01-02'),
					created_by: null,
					updated_by: null,
					deleted_at: null,
					deleted_by: null,
					is_deleted: false,
					tags: null,
					category: null,
					analytics_dimensions: null,
					quality_score: null,
					include_in_analytics: null,
					embedding_status: null,
					embedding_version: null,
					embedding_id: null,
					ai_metadata: null,
					external_ids: null,
					data_source: null,
					sync_status: null,
					last_synced_at: null,
					sync_version: null,
					etl_metadata: null
				}
			]);

			const result = await service.query({
				tenantId: 'tenant-001',
				limit: 10,
				offset: 0
			});

			expect(result.total).toBe(2);
			expect(result.items).toHaveLength(2);
			expect(result.hasMore).toBe(false);
			expect(result.items[0].aggregateType).toBe('Job');
			expect(result.items[0].analyzable?.tags).toEqual(['important']);
		});

		it('应该在没有更多数据时返回 hasMore 为 false', async () => {
			mockConnection.execute.mockResolvedValueOnce([{ count: '5' }]).mockResolvedValueOnce([]);

			const result = await service.query({
				tenantId: 'tenant-001',
				limit: 10,
				offset: 10
			});

			expect(result.hasMore).toBe(false);
		});

		it('应该在有更多数据时返回 hasMore 为 true', async () => {
			mockConnection.execute.mockResolvedValueOnce([{ count: '25' }]).mockResolvedValueOnce([]);

			const result = await service.query({
				tenantId: 'tenant-001',
				limit: 10,
				offset: 0
			});

			expect(result.hasMore).toBe(true);
		});

		it('应该根据 aggregateType 过滤', async () => {
			mockConnection.execute.mockResolvedValueOnce([{ count: '1' }]).mockResolvedValueOnce([]);

			await service.query({
				tenantId: 'tenant-001',
				aggregateType: 'Job'
			});

			const call = mockConnection.execute.mock.calls[0];
			expect(call[1]).toContain('Job');
		});

		it('应该根据 aggregateId 过滤', async () => {
			mockConnection.execute.mockResolvedValueOnce([{ count: '1' }]).mockResolvedValueOnce([]);

			await service.query({
				tenantId: 'tenant-001',
				aggregateId: 'job-001'
			});

			const call = mockConnection.execute.mock.calls[0];
			expect(call[1]).toContain('job-001');
		});

		it('应该根据 category 过滤', async () => {
			mockConnection.execute.mockResolvedValueOnce([{ count: '1' }]).mockResolvedValueOnce([]);

			await service.query({
				tenantId: 'tenant-001',
				category: 'billing'
			});

			const call = mockConnection.execute.mock.calls[0];
			expect(call[1]).toContain('billing');
		});

		it('应该根据 createdAt 范围过滤', async () => {
			mockConnection.execute.mockResolvedValueOnce([{ count: '1' }]).mockResolvedValueOnce([]);

			const fromDate = new Date('2026-01-01');
			const toDate = new Date('2026-01-31');

			await service.query({
				tenantId: 'tenant-001',
				createdAtFrom: fromDate,
				createdAtTo: toDate
			});

			const call = mockConnection.execute.mock.calls[0];
			expect(call[1]).toContain(fromDate);
			expect(call[1]).toContain(toDate);
		});

		it('应该根据 tags 过滤', async () => {
			mockConnection.execute.mockResolvedValueOnce([{ count: '1' }]).mockResolvedValueOnce([]);

			await service.query({
				tenantId: 'tenant-001',
				tags: ['important', 'urgent']
			});

			const call = mockConnection.execute.mock.calls[0];
			expect(call[0]).toContain('tags ?|');
			expect(call[1]).toContain('important');
			expect(call[1]).toContain('urgent');
		});

		it('当 excludeDeleted 为 true 时应该排除已删除记录', async () => {
			mockConnection.execute.mockResolvedValueOnce([{ count: '0' }]).mockResolvedValueOnce([]);

			await service.query({
				tenantId: 'tenant-001',
				excludeDeleted: true
			});

			const call = mockConnection.execute.mock.calls[0];
			expect(call[0]).toContain('is_deleted = false');
		});

		it('当 excludeDeleted 为 false 时应该包含已删除记录', async () => {
			mockConnection.execute.mockResolvedValueOnce([{ count: '0' }]).mockResolvedValueOnce([]);

			await service.query({
				tenantId: 'tenant-001',
				excludeDeleted: false
			});

			const call = mockConnection.execute.mock.calls[0];
			expect(call[0]).not.toContain('is_deleted = false');
		});

		it('缺少 tenantId 时应该抛出错误', async () => {
			await expect(
				service.query({
					tenantId: ''
				})
			).rejects.toThrow('tenantId 是必填参数');
		});

		it('应该使用默认的分页参数', async () => {
			mockConnection.execute.mockResolvedValueOnce([{ count: '0' }]).mockResolvedValueOnce([]);

			await service.query({
				tenantId: 'tenant-001'
			});

			const dataCall = mockConnection.execute.mock.calls[1];
			expect(dataCall[1]).toContain(20);
			expect(dataCall[1]).toContain(0);
		});
	});

	describe('getById', () => {
		it('应该返回单个元数据', async () => {
			mockConnection.execute.mockResolvedValueOnce([
				{
					aggregate_type: 'Job',
					aggregate_id: 'job-001',
					tenant_id: 'tenant-001',
					created_at: new Date('2026-01-01'),
					updated_at: new Date('2026-01-02'),
					created_by: 'user-001',
					updated_by: null,
					deleted_at: null,
					deleted_by: null,
					is_deleted: false,
					tags: null,
					category: null,
					analytics_dimensions: null,
					quality_score: null,
					include_in_analytics: null,
					embedding_status: null,
					embedding_version: null,
					embedding_id: null,
					ai_metadata: null,
					external_ids: null,
					data_source: null,
					sync_status: null,
					last_synced_at: null,
					sync_version: null,
					etl_metadata: null
				}
			]);

			const result = await service.getById('tenant-001', 'Job', 'job-001');

			expect(result).not.toBeNull();
			expect(result?.aggregateType).toBe('Job');
			expect(result?.aggregateId).toBe('job-001');
			expect(result?.tenantId).toBe('tenant-001');
		});

		it('找不到记录时应该返回 null', async () => {
			mockConnection.execute.mockResolvedValueOnce([]);

			const result = await service.getById('tenant-001', 'Job', 'nonexistent');

			expect(result).toBeNull();
		});
	});

	describe('getAggregateTypes', () => {
		it('应该返回所有聚合类型', async () => {
			mockConnection.execute.mockResolvedValueOnce([
				{ aggregate_type: 'Job' },
				{ aggregate_type: 'User' },
				{ aggregate_type: 'Tenant' }
			]);

			const result = await service.getAggregateTypes('tenant-001');

			expect(result).toEqual(['Job', 'User', 'Tenant']);
		});

		it('没有记录时应该返回空数组', async () => {
			mockConnection.execute.mockResolvedValueOnce([]);

			const result = await service.getAggregateTypes('tenant-001');

			expect(result).toEqual([]);
		});
	});

	describe('getCategories', () => {
		it('应该返回所有分类', async () => {
			mockConnection.execute.mockResolvedValueOnce([{ category: 'analytics' }, { category: 'billing' }]);

			const result = await service.getCategories('tenant-001');

			expect(result).toEqual(['analytics', 'billing']);
		});

		it('应该根据聚合类型过滤', async () => {
			mockConnection.execute.mockResolvedValueOnce([{ category: 'data-processing' }]);

			const result = await service.getCategories('tenant-001', 'Job');

			expect(result).toEqual(['data-processing']);
			const call = mockConnection.execute.mock.calls[0];
			expect(call[0]).toContain('aggregate_type = ?');
			expect(call[1]).toContain('Job');
		});

		it('没有分类时应该返回空数组', async () => {
			mockConnection.execute.mockResolvedValueOnce([]);

			const result = await service.getCategories('tenant-001');

			expect(result).toEqual([]);
		});
	});

	describe('getTags', () => {
		it('应该返回所有标签', async () => {
			mockConnection.execute.mockResolvedValueOnce([{ tag: 'important' }, { tag: 'review' }, { tag: 'urgent' }]);

			const result = await service.getTags('tenant-001');

			expect(result).toEqual(['important', 'review', 'urgent']);
		});

		it('应该根据聚合类型过滤', async () => {
			mockConnection.execute.mockResolvedValueOnce([{ tag: 'production' }]);

			await service.getTags('tenant-001', 'Job');

			const call = mockConnection.execute.mock.calls[0];
			expect(call[0]).toContain('aggregate_type = ?');
			expect(call[1]).toContain('Job');
		});

		it('应该过滤空标签', async () => {
			mockConnection.execute.mockResolvedValueOnce([{ tag: 'valid' }, { tag: null }, { tag: '' }]);

			const result = await service.getTags('tenant-001');

			expect(result).toEqual(['valid']);
		});

		it('没有标签时应该返回空数组', async () => {
			mockConnection.execute.mockResolvedValueOnce([]);

			const result = await service.getTags('tenant-001');

			expect(result).toEqual([]);
		});
	});

	describe('mapRowToMetadata', () => {
		it('应该正确映射包含 analyzable 扩展的行', async () => {
			mockConnection.execute.mockResolvedValueOnce([
				{
					aggregate_type: 'Job',
					aggregate_id: 'job-001',
					tenant_id: 'tenant-001',
					created_at: new Date('2026-01-01'),
					updated_at: new Date('2026-01-02'),
					created_by: null,
					updated_by: null,
					deleted_at: null,
					deleted_by: null,
					is_deleted: false,
					tags: ['important', 'production'],
					category: 'billing',
					analytics_dimensions: { region: 'cn-north' },
					quality_score: 85,
					include_in_analytics: true,
					embedding_status: null,
					embedding_version: null,
					embedding_id: null,
					ai_metadata: null,
					external_ids: null,
					data_source: null,
					sync_status: null,
					last_synced_at: null,
					sync_version: null,
					etl_metadata: null
				}
			]);

			const result = await service.getById('tenant-001', 'Job', 'job-001');

			expect(result?.analyzable).toBeDefined();
			expect(result?.analyzable?.tags).toEqual(['important', 'production']);
			expect(result?.analyzable?.category).toBe('billing');
			expect(result?.analyzable?.analyticsDimensions).toEqual({ region: 'cn-north' });
			expect(result?.analyzable?.qualityScore).toBe(85);
			expect(result?.analyzable?.includeInAnalytics).toBe(true);
		});

		it('应该正确映射包含 aiEnabled 扩展的行', async () => {
			mockConnection.execute.mockResolvedValueOnce([
				{
					aggregate_type: 'Document',
					aggregate_id: 'doc-001',
					tenant_id: 'tenant-001',
					created_at: new Date('2026-01-01'),
					updated_at: new Date('2026-01-02'),
					created_by: null,
					updated_by: null,
					deleted_at: null,
					deleted_by: null,
					is_deleted: false,
					tags: null,
					category: null,
					analytics_dimensions: null,
					quality_score: null,
					include_in_analytics: null,
					embedding_status: 'SYNCED',
					embedding_version: 'v1.0.0',
					embedding_id: 'emb-001',
					ai_metadata: { modelName: 'text-embedding-3' },
					external_ids: null,
					data_source: null,
					sync_status: null,
					last_synced_at: null,
					sync_version: null,
					etl_metadata: null
				}
			]);

			const result = await service.getById('tenant-001', 'Document', 'doc-001');

			expect(result?.aiEnabled).toBeDefined();
			expect(result?.aiEnabled?.embeddingStatus).toBe('SYNCED');
			expect(result?.aiEnabled?.embeddingVersion).toBe('v1.0.0');
			expect(result?.aiEnabled?.embeddingId).toBe('emb-001');
			expect(result?.aiEnabled?.needsReembedding).toBe(false);
		});

		it('应该正确设置 needsReembedding 标志', async () => {
			const statusesNeedingReembedding = ['PENDING', 'STALE', 'FAILED'];

			for (const status of statusesNeedingReembedding) {
				mockConnection.execute.mockResolvedValueOnce([
					{
						aggregate_type: 'Doc',
						aggregate_id: 'doc-001',
						tenant_id: 'tenant-001',
						created_at: new Date(),
						updated_at: new Date(),
						created_by: null,
						updated_by: null,
						deleted_at: null,
						deleted_by: null,
						is_deleted: false,
						tags: null,
						category: null,
						analytics_dimensions: null,
						quality_score: null,
						include_in_analytics: null,
						embedding_status: status,
						embedding_version: null,
						embedding_id: null,
						ai_metadata: null,
						external_ids: null,
						data_source: null,
						sync_status: null,
						last_synced_at: null,
						sync_version: null,
						etl_metadata: null
					}
				]);

				const result = await service.getById('tenant-001', 'Doc', 'doc-001');
				expect(result?.aiEnabled?.needsReembedding).toBe(true);
			}
		});

		it('应该正确映射包含 syncable 扩展的行', async () => {
			mockConnection.execute.mockResolvedValueOnce([
				{
					aggregate_type: 'Order',
					aggregate_id: 'order-001',
					tenant_id: 'tenant-001',
					created_at: new Date('2026-01-01'),
					updated_at: new Date('2026-01-02'),
					created_by: null,
					updated_by: null,
					deleted_at: null,
					deleted_by: null,
					is_deleted: false,
					tags: null,
					category: null,
					analytics_dimensions: null,
					quality_score: null,
					include_in_analytics: null,
					embedding_status: null,
					embedding_version: null,
					embedding_id: null,
					ai_metadata: null,
					external_ids: { erpId: 'ERP-001' },
					data_source: 'erp-system',
					sync_status: 'SYNCED',
					last_synced_at: new Date('2026-01-15'),
					sync_version: 5,
					etl_metadata: { jobId: 'etl-001' }
				}
			]);

			const result = await service.getById('tenant-001', 'Order', 'order-001');

			expect(result?.syncable).toBeDefined();
			expect(result?.syncable?.externalIds).toEqual({ erpId: 'ERP-001' });
			expect(result?.syncable?.dataSource).toBe('erp-system');
			expect(result?.syncable?.syncStatus).toBe('SYNCED');
			expect(result?.syncable?.syncVersion).toBe(5);
			expect(result?.syncable?.needsSync).toBe(false);
		});

		it('应该正确设置 needsSync 标志', async () => {
			const statusesNeedingSync = ['PENDING', 'FAILED'];

			for (const status of statusesNeedingSync) {
				mockConnection.execute.mockResolvedValueOnce([
					{
						aggregate_type: 'Order',
						aggregate_id: 'order-001',
						tenant_id: 'tenant-001',
						created_at: new Date(),
						updated_at: new Date(),
						created_by: null,
						updated_by: null,
						deleted_at: null,
						deleted_by: null,
						is_deleted: false,
						tags: null,
						category: null,
						analytics_dimensions: null,
						quality_score: null,
						include_in_analytics: null,
						embedding_status: null,
						embedding_version: null,
						embedding_id: null,
						ai_metadata: null,
						external_ids: { erpId: 'ERP-001' },
						data_source: null,
						sync_status: status,
						last_synced_at: null,
						sync_version: 1,
						etl_metadata: null
					}
				]);

				const result = await service.getById('tenant-001', 'Order', 'order-001');
				expect(result?.syncable?.needsSync).toBe(true);
			}
		});
	});
});

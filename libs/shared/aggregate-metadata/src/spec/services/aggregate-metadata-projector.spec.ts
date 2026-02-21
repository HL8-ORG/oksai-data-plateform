import { AggregateMetadataProjector } from '../../lib/services/aggregate-metadata-projector';

describe('AggregateMetadataProjector', () => {
	let projector: AggregateMetadataProjector;
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
			execute: jest.fn().mockResolvedValue(undefined),
		};
		mockEm = {
			getConnection: jest.fn().mockReturnValue(mockConnection),
		};
		mockOrm = {
			em: mockEm,
		};
		projector = new AggregateMetadataProjector(mockOrm as any);
	});

	describe('upsert', () => {
		it('应该执行 INSERT ... ON CONFLICT UPDATE 语句', async () => {
			const metadata = {
				aggregateType: 'Job',
				aggregateId: 'job-001',
				tenantId: 'tenant-001',
				createdAt: new Date('2026-01-01'),
				updatedAt: new Date('2026-01-02'),
				createdBy: 'user-001',
				updatedBy: 'user-002',
				isDeleted: false,
			};

			await projector.upsert(metadata);

			expect(mockConnection.execute).toHaveBeenCalledTimes(1);
			const call = mockConnection.execute.mock.calls[0];
			expect(call[0]).toContain('INSERT INTO aggregate_metadata');
			expect(call[0]).toContain('ON CONFLICT');
		});

		it('应该包含所有主键字段', async () => {
			const metadata = {
				aggregateType: 'Job',
				aggregateId: 'job-001',
				tenantId: 'tenant-001',
				createdAt: new Date(),
				updatedAt: new Date(),
				isDeleted: false,
			};

			await projector.upsert(metadata);

			const params = mockConnection.execute.mock.calls[0][1];
			expect(params).toContain('tenant-001');
			expect(params).toContain('Job');
			expect(params).toContain('job-001');
		});

		it('应该包含审计字段', async () => {
			const metadata = {
				aggregateType: 'Job',
				aggregateId: 'job-001',
				tenantId: 'tenant-001',
				createdAt: new Date(),
				updatedAt: new Date(),
				createdBy: 'user-001',
				updatedBy: 'user-002',
				deletedAt: new Date(),
				deletedBy: 'admin-001',
				isDeleted: true,
			};

			await projector.upsert(metadata);

			const params = mockConnection.execute.mock.calls[0][1];
			expect(params).toContain('user-001');
			expect(params).toContain('user-002');
			expect(params).toContain('admin-001');
			expect(params).toContain(true);
		});

		it('应该包含 analyzable 扩展字段', async () => {
			const metadata = {
				aggregateType: 'Job',
				aggregateId: 'job-001',
				tenantId: 'tenant-001',
				createdAt: new Date(),
				updatedAt: new Date(),
				isDeleted: false,
				analyzable: {
					tags: ['important', 'production'],
					category: 'billing',
					analyticsDimensions: { region: 'cn-north' },
					qualityScore: 85,
					includeInAnalytics: true,
				},
			};

			await projector.upsert(metadata);

			const params = mockConnection.execute.mock.calls[0][1];
			expect(params).toContainEqual(['important', 'production']);
			expect(params).toContain('billing');
			expect(params).toContain(85);
		});

		it('应该包含 aiEnabled 扩展字段', async () => {
			const metadata = {
				aggregateType: 'Document',
				aggregateId: 'doc-001',
				tenantId: 'tenant-001',
				createdAt: new Date(),
				updatedAt: new Date(),
				isDeleted: false,
				aiEnabled: {
					embeddingStatus: 'SYNCED',
					embeddingVersion: 'v1.0.0',
					embeddingId: 'emb-001',
					aiMetadata: { modelName: 'text-embedding-3' },
				},
			};

			await projector.upsert(metadata);

			const params = mockConnection.execute.mock.calls[0][1];
			expect(params).toContain('SYNCED');
			expect(params).toContain('v1.0.0');
			expect(params).toContain('emb-001');
		});

		it('应该包含 syncable 扩展字段', async () => {
			const syncTime = new Date('2026-01-15');
			const metadata = {
				aggregateType: 'Order',
				aggregateId: 'order-001',
				tenantId: 'tenant-001',
				createdAt: new Date(),
				updatedAt: new Date(),
				isDeleted: false,
				syncable: {
					externalIds: { erpId: 'ERP-001' },
					dataSource: 'erp-system',
					syncStatus: 'SYNCED',
					lastSyncedAt: syncTime,
					syncVersion: 5,
					etlMetadata: { jobId: 'etl-001' },
				},
			};

			await projector.upsert(metadata);

			const params = mockConnection.execute.mock.calls[0][1];
			expect(params).toContain(5);
		});

		it('当可选字段未提供时应该使用 null', async () => {
			const metadata = {
				aggregateType: 'Job',
				aggregateId: 'job-001',
				tenantId: 'tenant-001',
				createdAt: new Date(),
				updatedAt: new Date(),
				isDeleted: false,
			};

			await projector.upsert(metadata);

			const params = mockConnection.execute.mock.calls[0][1];
			expect(params.filter((p: any) => p === null).length).toBeGreaterThan(0);
		});

		it('includeInAnalytics 默认为 true', async () => {
			const metadata = {
				aggregateType: 'Job',
				aggregateId: 'job-001',
				tenantId: 'tenant-001',
				createdAt: new Date(),
				updatedAt: new Date(),
				isDeleted: false,
				analyzable: {},
			};

			await projector.upsert(metadata);

			const params = mockConnection.execute.mock.calls[0][1];
			expect(params).toContain(true);
		});

		it('syncVersion 默认为 1', async () => {
			const metadata = {
				aggregateType: 'Job',
				aggregateId: 'job-001',
				tenantId: 'tenant-001',
				createdAt: new Date(),
				updatedAt: new Date(),
				isDeleted: false,
				syncable: {},
			};

			await projector.upsert(metadata);

			const params = mockConnection.execute.mock.calls[0][1];
			expect(params).toContain(1);
		});
	});

	describe('softDelete', () => {
		it('应该执行 UPDATE 语句设置 is_deleted = true', async () => {
			await projector.softDelete('tenant-001', 'Job', 'job-001', 'admin-001');

			expect(mockConnection.execute).toHaveBeenCalledTimes(1);
			const call = mockConnection.execute.mock.calls[0];
			expect(call[0]).toContain('UPDATE aggregate_metadata');
			expect(call[0]).toContain('is_deleted = true');
			expect(call[0]).toContain('deleted_at = NOW()');
		});

		it('应该包含所有主键参数', async () => {
			await projector.softDelete('tenant-001', 'Job', 'job-001', 'admin-001');

			const params = mockConnection.execute.mock.calls[0][1];
			expect(params[0]).toBe('tenant-001');
			expect(params[1]).toBe('Job');
			expect(params[2]).toBe('job-001');
		});

		it('应该包含 deletedBy 参数', async () => {
			await projector.softDelete('tenant-001', 'Job', 'job-001', 'admin-001');

			const params = mockConnection.execute.mock.calls[0][1];
			expect(params[3]).toBe('admin-001');
		});

		it('deletedBy 可以为空', async () => {
			await projector.softDelete('tenant-001', 'Job', 'job-001');

			const params = mockConnection.execute.mock.calls[0][1];
			expect(params[3]).toBeNull();
		});
	});

	describe('restore', () => {
		it('应该执行 UPDATE 语句设置 is_deleted = false', async () => {
			await projector.restore('tenant-001', 'Job', 'job-001');

			expect(mockConnection.execute).toHaveBeenCalledTimes(1);
			const call = mockConnection.execute.mock.calls[0];
			expect(call[0]).toContain('UPDATE aggregate_metadata');
			expect(call[0]).toContain('is_deleted = false');
			expect(call[0]).toContain('deleted_at = null');
			expect(call[0]).toContain('deleted_by = null');
		});

		it('应该包含所有主键参数', async () => {
			await projector.restore('tenant-001', 'Job', 'job-001');

			const params = mockConnection.execute.mock.calls[0][1];
			expect(params[0]).toBe('tenant-001');
			expect(params[1]).toBe('Job');
			expect(params[2]).toBe('job-001');
		});
	});
});

import { SyncableAggregateRoot, type SyncableAggregateRootProps } from '../../lib/extensions/syncable.aggregate-root';
import { SyncStatus } from '../../lib/extensions';

interface TestSyncableProps extends SyncableAggregateRootProps {
	data: string;
}

class TestSyncableAggregate extends SyncableAggregateRoot<TestSyncableProps> {
	get data(): string {
		return this.props.data;
	}

	setData(data: string): void {
		this.props.data = data;
		this.markSyncRequired();
	}

	static create(data: string = ''): TestSyncableAggregate {
		return new TestSyncableAggregate({ data });
	}
}

describe('SyncableAggregateRoot', () => {
	let aggregate: TestSyncableAggregate;

	beforeEach(() => {
		aggregate = TestSyncableAggregate.create();
	});

	describe('初始状态', () => {
		it('初始外部 ID 映射应该是空对象', () => {
			expect(aggregate.externalIds).toEqual({});
		});

		it('初始数据来源应该是 undefined', () => {
			expect(aggregate.dataSource).toBeUndefined();
		});

		it('初始同步状态应该是 SYNCED', () => {
			expect(aggregate.syncStatus).toBe(SyncStatus.SYNCED);
		});

		it('初始最后同步时间应该是 undefined', () => {
			expect(aggregate.lastSyncedAt).toBeUndefined();
		});

		it('初始同步版本应该是 1', () => {
			expect(aggregate.syncVersion).toBe(1);
		});

		it('初始 ETL 元数据应该是 undefined', () => {
			expect(aggregate.etlMetadata).toBeUndefined();
		});
	});

	describe('外部 ID 管理', () => {
		it('setExternalId 应该设置外部 ID', () => {
			aggregate.setExternalId('erp', 'ERP-123');

			expect(aggregate.getExternalId('erp')).toBe('ERP-123');
		});

		it('getExternalId 应该返回 undefined 当不存在时', () => {
			expect(aggregate.getExternalId('nonexistent')).toBeUndefined();
		});

		it('removeExternalId 应该移除外部 ID', () => {
			aggregate.setExternalId('erp', 'ERP-123');
			aggregate.removeExternalId('erp');

			expect(aggregate.getExternalId('erp')).toBeUndefined();
		});

		it('hasExternalId 应该正确判断是否存在', () => {
			expect(aggregate.hasExternalId('erp')).toBe(false);

			aggregate.setExternalId('erp', 'ERP-123');

			expect(aggregate.hasExternalId('erp')).toBe(true);
		});

		it('setExternalIds 应该批量设置外部 ID', () => {
			aggregate.setExternalIds({ erp: 'ERP-123', crm: 'CRM-456' });

			expect(aggregate.getExternalId('erp')).toBe('ERP-123');
			expect(aggregate.getExternalId('crm')).toBe('CRM-456');
		});

		it('externalIds getter 应该返回副本', () => {
			aggregate.setExternalId('erp', 'ERP-123');
			const ids = aggregate.externalIds;

			ids['new'] = 'NEW-789';

			expect(aggregate.getExternalId('new')).toBeUndefined();
		});
	});

	describe('数据源管理', () => {
		it('setDataSource 应该设置数据来源', () => {
			aggregate.setDataSource('external-api');

			expect(aggregate.dataSource).toBe('external-api');
		});
	});

	describe('同步状态管理', () => {
		it('markSyncRequired 应该将状态标记为 PENDING', () => {
			aggregate.markSyncRequired();

			expect(aggregate.syncStatus).toBe(SyncStatus.PENDING);
		});

		it('markSyncRequired 应该增加同步版本', () => {
			const initialVersion = aggregate.syncVersion;
			aggregate.markSyncRequired();

			expect(aggregate.syncVersion).toBe(initialVersion + 1);
		});

		it('markSyncRequired 应该是幂等的', () => {
			aggregate.markSyncRequired();
			aggregate.markSyncRequired();

			expect(aggregate.syncStatus).toBe(SyncStatus.PENDING);
			expect(aggregate.syncVersion).toBe(2);
		});

		it('markSynced 应该将状态标记为 SYNCED', () => {
			aggregate.markSyncRequired();
			aggregate.markSynced();

			expect(aggregate.syncStatus).toBe(SyncStatus.SYNCED);
		});

		it('markSynced 应该更新最后同步时间', () => {
			aggregate.markSynced();

			expect(aggregate.lastSyncedAt).toBeInstanceOf(Date);
		});

		it('markSyncFailed 应该将状态标记为 FAILED', () => {
			aggregate.markSyncFailed('连接失败');

			expect(aggregate.syncStatus).toBe(SyncStatus.FAILED);
		});

		it('markSyncFailed 应该记录错误信息', () => {
			aggregate.markSyncFailed('连接失败');

			expect(aggregate.etlMetadata?.errorMessage).toBe('连接失败');
			expect(aggregate.etlMetadata?.processedAt).toBeInstanceOf(Date);
		});
	});

	describe('needsSync', () => {
		it('SYNCED 状态不需要同步', () => {
			expect(aggregate.needsSync()).toBe(false);
		});

		it('PENDING 状态需要同步', () => {
			aggregate.markSyncRequired();

			expect(aggregate.needsSync()).toBe(true);
		});

		it('FAILED 状态需要同步', () => {
			aggregate.markSyncFailed('错误');

			expect(aggregate.needsSync()).toBe(true);
		});
	});

	describe('ETL 元数据管理', () => {
		it('setETLMetadata 应该设置 ETL 元数据', () => {
			aggregate.setETLMetadata({ jobId: 'job-123', version: '1.0.0' });

			expect(aggregate.etlMetadata?.jobId).toBe('job-123');
			expect(aggregate.etlMetadata?.version).toBe('1.0.0');
		});

		it('setETLMetadata 应该合并现有元数据', () => {
			aggregate.setETLMetadata({ jobId: 'job-123' });
			aggregate.setETLMetadata({ version: '1.0.0' });

			expect(aggregate.etlMetadata?.jobId).toBe('job-123');
			expect(aggregate.etlMetadata?.version).toBe('1.0.0');
		});
	});

	describe('getSyncInfo', () => {
		it('应该返回完整的同步信息', () => {
			aggregate.setExternalId('erp', 'ERP-123');
			aggregate.markSynced();

			const info = aggregate.getSyncInfo();

			expect(info.externalIds).toEqual({ erp: 'ERP-123' });
			expect(info.syncStatus).toBe(SyncStatus.SYNCED);
			expect(info.syncVersion).toBe(1);
			expect(info.needsSync).toBe(false);
			expect(info.lastSyncedAt).toBeInstanceOf(Date);
		});
	});
});

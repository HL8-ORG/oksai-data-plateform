import { AggregateRoot } from '@oksai/kernel';
import { SyncStatus, type ETLMetadata } from './enums-and-interfaces';

/**
 * 外部系统标识映射
 */
export type ExternalIdMap = Record<string, string>;

/**
 * 可同步聚合根属性
 */
export interface SyncableAggregateRootProps {
	[key: string]: unknown;
}

/**
 * 数据仓同步能力扩展聚合根基类
 *
 * 适用于需要与外部系统/数据仓同步的聚合根。
 * 继承此类的聚合根将获得外部系统标识管理、同步状态追踪和 ETL 元数据管理能力。
 *
 * @template TProps - 聚合根属性类型
 *
 * @example
 * ```typescript
 * // 外部系统集成数据聚合根
 * class IntegrationDataAggregate extends SyncableAggregateRoot<IntegrationProps> {
 *   updateFromExternal(externalId: string, data: unknown): void {
 *     // 业务逻辑...
 *     this.setExternalId('erp', externalId);
 *     this.markSynced();
 *   }
 * }
 * ```
 *
 * 使用场景：
 * - 异构系统对接
 * - 数据仓库同步
 * - 第三方平台集成
 */
export abstract class SyncableAggregateRoot<
	TProps extends SyncableAggregateRootProps = SyncableAggregateRootProps,
> extends AggregateRoot<TProps> {
	/**
	 * 外部系统标识映射（系统名 -> 外部 ID）
	 */
	protected _externalIds: ExternalIdMap = {};

	/**
	 * 数据来源
	 */
	protected _dataSource?: string;

	/**
	 * 同步状态
	 */
	protected _syncStatus: SyncStatus = SyncStatus.SYNCED;

	/**
	 * 最后同步时间
	 */
	protected _lastSyncedAt?: Date;

	/**
	 * 同步版本（用于增量同步）
	 */
	protected _syncVersion: number = 1;

	/**
	 * ETL 元数据
	 */
	protected _etlMetadata?: ETLMetadata;

	/**
	 * 设置外部系统 ID
	 *
	 * @param system - 外部系统名称
	 * @param externalId - 外部系统中的 ID
	 */
	setExternalId(system: string, externalId: string): void {
		this._externalIds[system] = externalId;
	}

	/**
	 * 获取外部系统 ID
	 *
	 * @param system - 外部系统名称
	 * @returns 外部系统中的 ID，如果不存在则返回 undefined
	 */
	getExternalId(system: string): string | undefined {
		return this._externalIds[system];
	}

	/**
	 * 移除外部系统 ID
	 *
	 * @param system - 外部系统名称
	 */
	removeExternalId(system: string): void {
		delete this._externalIds[system];
	}

	/**
	 * 检查是否有外部系统 ID
	 *
	 * @param system - 外部系统名称
	 * @returns 是否存在该系统的外部 ID
	 */
	hasExternalId(system: string): boolean {
		return system in this._externalIds;
	}

	/**
	 * 批量设置外部系统 ID
	 *
	 * @param externalIds - 外部系统 ID 映射
	 */
	setExternalIds(externalIds: ExternalIdMap): void {
		this._externalIds = {
			...this._externalIds,
			...externalIds,
		};
	}

	/**
	 * 设置数据来源
	 *
	 * @param source - 数据来源标识
	 */
	setDataSource(source: string): void {
		this._dataSource = source;
	}

	/**
	 * 标记需要同步
	 *
	 * 当本地数据变更后调用，表示需要同步到外部系统。
	 */
	markSyncRequired(): void {
		if (this._syncStatus !== SyncStatus.PENDING) {
			this._syncStatus = SyncStatus.PENDING;
			this._syncVersion += 1;
		}
	}

	/**
	 * 标记同步成功
	 *
	 * 当数据成功同步到外部系统后调用。
	 */
	markSynced(): void {
		this._syncStatus = SyncStatus.SYNCED;
		this._lastSyncedAt = new Date();
	}

	/**
	 * 标记同步失败
	 *
	 * @param errorMessage - 错误信息
	 */
	markSyncFailed(errorMessage: string): void {
		this._syncStatus = SyncStatus.FAILED;
		this._etlMetadata = {
			...this._etlMetadata,
			errorMessage,
			processedAt: new Date(),
		};
	}

	/**
	 * 检查是否需要同步
	 *
	 * @returns 是否需要同步
	 */
	needsSync(): boolean {
		return this._syncStatus === SyncStatus.PENDING || this._syncStatus === SyncStatus.FAILED;
	}

	/**
	 * 设置 ETL 元数据
	 *
	 * @param metadata - ETL 元数据
	 */
	setETLMetadata(metadata: Partial<ETLMetadata>): void {
		this._etlMetadata = {
			...this._etlMetadata,
			...metadata,
		};
	}

	/**
	 * 获取同步元数据信息
	 *
	 * @returns 同步元数据信息对象
	 */
	getSyncInfo(): {
		externalIds: ExternalIdMap;
		dataSource?: string;
		syncStatus: SyncStatus;
		lastSyncedAt?: Date;
		syncVersion: number;
		etlMetadata?: ETLMetadata;
		needsSync: boolean;
	} {
		return {
			externalIds: { ...this._externalIds },
			dataSource: this._dataSource,
			syncStatus: this._syncStatus,
			lastSyncedAt: this._lastSyncedAt,
			syncVersion: this._syncVersion,
			etlMetadata: this._etlMetadata,
			needsSync: this.needsSync(),
		};
	}

	/**
	 * 获取外部 ID 映射
	 */
	get externalIds(): ExternalIdMap {
		return { ...this._externalIds };
	}

	/**
	 * 获取数据来源
	 */
	get dataSource(): string | undefined {
		return this._dataSource;
	}

	/**
	 * 获取同步状态
	 */
	get syncStatus(): SyncStatus {
		return this._syncStatus;
	}

	/**
	 * 获取最后同步时间
	 */
	get lastSyncedAt(): Date | undefined {
		return this._lastSyncedAt;
	}

	/**
	 * 获取同步版本
	 */
	get syncVersion(): number {
		return this._syncVersion;
	}

	/**
	 * 获取 ETL 元数据
	 */
	get etlMetadata(): ETLMetadata | undefined {
		return this._etlMetadata;
	}
}

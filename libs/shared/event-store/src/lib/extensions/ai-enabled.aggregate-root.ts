import { AggregateRoot } from '@oksai/kernel';
import { EmbeddingStatus, type AIProcessingMetadata } from './index';

/**
 * AI 能力扩展聚合根属性
 */
export interface AIEnabledAggregateRootProps {
	[key: string]: unknown;
}

/**
 * AI 能力扩展聚合根基类
 *
 * 适用于需要 AI 嵌入、智能处理的聚合根。
 * 继承此类的聚合根将获得向量嵌入状态管理和 AI 处理元数据追踪能力。
 *
 * @template TProps - 聚合根属性类型
 * @template TEvent - 领域事件类型
 *
 * @example
 * ```typescript
 * // 文档聚合根（需要向量检索）
 * class DocumentAggregate extends AIEnabledAggregateRoot<DocumentProps, DocumentEvent> {
 *   private _content: string;
 *
 *   updateContent(newContent: string): void {
 *     this._content = newContent;
 *     this.markEmbeddingStale(); // 标记需要重新嵌入
 *   }
 * }
 * ```
 *
 * 使用场景：
 * - 文档、知识库（需要向量化检索）
 * - 内容生成（AI 辅助创作）
 * - 智能推荐（需要特征提取）
 */
export abstract class AIEnabledAggregateRoot<
	TProps extends AIEnabledAggregateRootProps = AIEnabledAggregateRootProps
> extends AggregateRoot<TProps> {
	/**
	 * 向量嵌入状态
	 */
	protected _embeddingStatus: EmbeddingStatus = EmbeddingStatus.PENDING;

	/**
	 * 嵌入向量版本（模型版本）
	 */
	protected _embeddingVersion?: string;

	/**
	 * 嵌入向量 ID（外部向量库引用）
	 */
	protected _embeddingId?: string;

	/**
	 * AI 处理元数据
	 */
	protected _aiMetadata?: AIProcessingMetadata;

	/**
	 * 标记需要重新生成嵌入
	 *
	 * 当聚合根内容发生变化时调用，表示向量嵌入已过期需要重新生成。
	 */
	markEmbeddingStale(): void {
		if (this._embeddingStatus !== EmbeddingStatus.STALE) {
			this._embeddingStatus = EmbeddingStatus.STALE;
		}
	}

	/**
	 * 标记嵌入生成失败
	 *
	 * @param errorMessage - 错误信息
	 */
	markEmbeddingFailed(errorMessage: string): void {
		this._embeddingStatus = EmbeddingStatus.FAILED;
		this._aiMetadata = {
			...this._aiMetadata,
			errorMessage,
			processedAt: new Date()
		};
	}

	/**
	 * 更新嵌入信息
	 *
	 * 当嵌入生成成功后调用，记录嵌入 ID 和版本信息。
	 *
	 * @param embeddingId - 嵌入向量 ID（外部向量库引用）
	 * @param version - 嵌入模型版本
	 * @param metadata - 可选的 AI 处理元数据
	 */
	updateEmbedding(embeddingId: string, version: string, metadata?: Partial<AIProcessingMetadata>): void {
		this._embeddingStatus = EmbeddingStatus.SYNCED;
		this._embeddingId = embeddingId;
		this._embeddingVersion = version;
		this._aiMetadata = {
			...this._aiMetadata,
			...metadata,
			processedAt: new Date(),
			errorMessage: undefined
		};
	}

	/**
	 * 检查是否需要重新嵌入
	 *
	 * @returns 是否需要重新生成嵌入向量
	 */
	needsReembedding(): boolean {
		return (
			this._embeddingStatus === EmbeddingStatus.STALE ||
			this._embeddingStatus === EmbeddingStatus.PENDING ||
			this._embeddingStatus === EmbeddingStatus.FAILED
		);
	}

	/**
	 * 设置 AI 处理元数据
	 *
	 * @param metadata - AI 处理元数据
	 */
	setAIMetadata(metadata: Partial<AIProcessingMetadata>): void {
		this._aiMetadata = {
			...this._aiMetadata,
			...metadata
		};
	}

	/**
	 * 获取 AI 元数据信息
	 *
	 * @returns AI 元数据信息对象
	 */
	getAIInfo(): {
		embeddingStatus: EmbeddingStatus;
		embeddingVersion?: string;
		embeddingId?: string;
		aiMetadata?: AIProcessingMetadata;
		needsReembedding: boolean;
	} {
		return {
			embeddingStatus: this._embeddingStatus,
			embeddingVersion: this._embeddingVersion,
			embeddingId: this._embeddingId,
			aiMetadata: this._aiMetadata,
			needsReembedding: this.needsReembedding()
		};
	}

	/**
	 * 获取嵌入状态
	 */
	get embeddingStatus(): EmbeddingStatus {
		return this._embeddingStatus;
	}

	/**
	 * 获取嵌入版本
	 */
	get embeddingVersion(): string | undefined {
		return this._embeddingVersion;
	}

	/**
	 * 获取嵌入 ID
	 */
	get embeddingId(): string | undefined {
		return this._embeddingId;
	}

	/**
	 * 获取 AI 元数据
	 */
	get aiMetadata(): AIProcessingMetadata | undefined {
		return this._aiMetadata;
	}
}

import {
	AIEnabledAggregateRoot,
	type AIEnabledAggregateRootProps
} from '../../lib/extensions/ai-enabled.aggregate-root';
import { EmbeddingStatus } from '../../lib/extensions/enums-and-interfaces';

interface TestDocumentProps extends AIEnabledAggregateRootProps {
	content: string;
}

class TestDocumentAggregate extends AIEnabledAggregateRoot<TestDocumentProps> {
	get content(): string {
		return this.props.content;
	}

	setContent(content: string): void {
		this.props.content = content;
		this.markEmbeddingStale();
	}

	static create(content: string = ''): TestDocumentAggregate {
		return new TestDocumentAggregate({ content });
	}
}

describe('AIEnabledAggregateRoot', () => {
	let aggregate: TestDocumentAggregate;

	beforeEach(() => {
		aggregate = TestDocumentAggregate.create();
	});

	describe('初始状态', () => {
		it('初始嵌入状态应该是 PENDING', () => {
			expect(aggregate.embeddingStatus).toBe(EmbeddingStatus.PENDING);
		});

		it('初始嵌入版本应该是 undefined', () => {
			expect(aggregate.embeddingVersion).toBeUndefined();
		});

		it('初始嵌入 ID 应该是 undefined', () => {
			expect(aggregate.embeddingId).toBeUndefined();
		});

		it('初始 AI 元数据应该是 undefined', () => {
			expect(aggregate.aiMetadata).toBeUndefined();
		});
	});

	describe('markEmbeddingStale', () => {
		it('应该将状态标记为 STALE', () => {
			aggregate.markEmbeddingStale();

			expect(aggregate.embeddingStatus).toBe(EmbeddingStatus.STALE);
		});

		it('重复调用应该保持幂等', () => {
			aggregate.markEmbeddingStale();
			aggregate.markEmbeddingStale();

			expect(aggregate.embeddingStatus).toBe(EmbeddingStatus.STALE);
		});
	});

	describe('markEmbeddingFailed', () => {
		it('应该将状态标记为 FAILED', () => {
			aggregate.markEmbeddingFailed('连接超时');

			expect(aggregate.embeddingStatus).toBe(EmbeddingStatus.FAILED);
		});

		it('应该记录错误信息', () => {
			aggregate.markEmbeddingFailed('连接超时');

			expect(aggregate.aiMetadata?.errorMessage).toBe('连接超时');
			expect(aggregate.aiMetadata?.processedAt).toBeInstanceOf(Date);
		});
	});

	describe('updateEmbedding', () => {
		it('应该将状态标记为 SYNCED', () => {
			aggregate.updateEmbedding('emb-123', 'v1.0.0');

			expect(aggregate.embeddingStatus).toBe(EmbeddingStatus.SYNCED);
		});

		it('应该记录嵌入信息', () => {
			aggregate.updateEmbedding('emb-123', 'v1.0.0', { modelName: 'text-embedding-3' });

			expect(aggregate.embeddingId).toBe('emb-123');
			expect(aggregate.embeddingVersion).toBe('v1.0.0');
			expect(aggregate.aiMetadata?.modelName).toBe('text-embedding-3');
		});

		it('应该清除错误信息', () => {
			aggregate.markEmbeddingFailed('错误');
			aggregate.updateEmbedding('emb-123', 'v1.0.0');

			expect(aggregate.aiMetadata?.errorMessage).toBeUndefined();
		});
	});

	describe('needsReembedding', () => {
		it('PENDING 状态应该需要重新嵌入', () => {
			expect(aggregate.needsReembedding()).toBe(true);
		});

		it('STALE 状态应该需要重新嵌入', () => {
			aggregate.markEmbeddingStale();

			expect(aggregate.needsReembedding()).toBe(true);
		});

		it('FAILED 状态应该需要重新嵌入', () => {
			aggregate.markEmbeddingFailed('错误');

			expect(aggregate.needsReembedding()).toBe(true);
		});

		it('SYNCED 状态不需要重新嵌入', () => {
			aggregate.updateEmbedding('emb-123', 'v1.0.0');

			expect(aggregate.needsReembedding()).toBe(false);
		});
	});

	describe('setAIMetadata', () => {
		it('应该设置 AI 元数据', () => {
			aggregate.setAIMetadata({ modelName: 'gpt-4', tokenCount: 100 });

			expect(aggregate.aiMetadata?.modelName).toBe('gpt-4');
			expect(aggregate.aiMetadata?.tokenCount).toBe(100);
		});

		it('应该合并现有元数据', () => {
			aggregate.setAIMetadata({ modelName: 'gpt-4' });
			aggregate.setAIMetadata({ tokenCount: 100 });

			expect(aggregate.aiMetadata?.modelName).toBe('gpt-4');
			expect(aggregate.aiMetadata?.tokenCount).toBe(100);
		});
	});

	describe('getAIInfo', () => {
		it('应该返回完整的 AI 信息', () => {
			aggregate.updateEmbedding('emb-123', 'v1.0.0');

			const info = aggregate.getAIInfo();

			expect(info.embeddingStatus).toBe(EmbeddingStatus.SYNCED);
			expect(info.embeddingId).toBe('emb-123');
			expect(info.embeddingVersion).toBe('v1.0.0');
			expect(info.needsReembedding).toBe(false);
		});
	});
});

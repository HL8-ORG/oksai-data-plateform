import { Injectable, Logger } from '@nestjs/common';
import type { IEmbeddingService, EmbeddingServiceConfig } from '../interfaces/embedding.interface';

/**
 * OpenAI Embeddings 服务适配器
 *
 * 使用 OpenAI API 生成文本嵌入向量
 */
@Injectable()
export class OpenAIEmbeddingService implements IEmbeddingService {
	private readonly logger = new Logger(OpenAIEmbeddingService.name);
	private readonly config: Required<EmbeddingServiceConfig>;
	private openaiClient: any;

	constructor(config: EmbeddingServiceConfig & { apiKey: string }) {
		this.config = {
			modelName: config.modelName || 'text-embedding-3-small',
			dimension: config.dimension || 1536,
			batchSize: config.batchSize || 100,
			timeout: config.timeout || 30000
		};

		this.initOpenAIClient(config.apiKey);
	}

	private async initOpenAIClient(apiKey: string): Promise<void> {
		try {
			const { OpenAI } = await import('openai');
			this.openaiClient = new OpenAI({
				apiKey,
				timeout: this.config.timeout
			});
			this.logger.log(`OpenAI client initialized with model: ${this.config.modelName}`);
		} catch (_error) {
			this.logger.warn('OpenAI package not installed. Embedding service will not work.');
			this.logger.warn('Install with: pnpm add openai');
		}
	}

	/**
	 * 获取模型名称
	 */
	getModelName(): string {
		return this.config.modelName;
	}

	/**
	 * 获取向量维度
	 */
	getDimension(): number {
		return this.config.dimension;
	}

	/**
	 * 生成单个文本的嵌入向量
	 */
	async embed(text: string): Promise<number[]> {
		if (!this.openaiClient) {
			throw new Error('OpenAI client not initialized. Please provide a valid API key.');
		}

		try {
			const response = await this.openaiClient.embeddings.create({
				model: this.config.modelName,
				input: text,
				dimensions: this.config.dimension
			});

			return response.data[0].embedding;
		} catch (error) {
			this.logger.error(`Failed to generate embedding: ${error}`);
			throw error;
		}
	}

	/**
	 * 批量生成嵌入向量
	 */
	async embedBatch(texts: string[]): Promise<number[][]> {
		if (!this.openaiClient) {
			throw new Error('OpenAI client not initialized. Please provide a valid API key.');
		}

		const results: number[][] = [];

		for (let i = 0; i < texts.length; i += this.config.batchSize) {
			const batch = texts.slice(i, i + this.config.batchSize);

			try {
				const response = await this.openaiClient.embeddings.create({
					model: this.config.modelName,
					input: batch,
					dimensions: this.config.dimension
				});

				const batchEmbeddings = response.data.map((item: any) => item.embedding);
				results.push(...batchEmbeddings);
			} catch (error) {
				this.logger.error(`Failed to generate batch embeddings: ${error}`);
				throw error;
			}
		}

		return results;
	}
}

/**
 * 模拟嵌入服务（用于开发和测试）
 *
 * 生成随机向量，不调用实际 API
 */
@Injectable()
export class MockEmbeddingService implements IEmbeddingService {
	private readonly config: Required<EmbeddingServiceConfig>;

	constructor(config?: Partial<EmbeddingServiceConfig>) {
		this.config = {
			modelName: config?.modelName || 'mock-embedding',
			dimension: config?.dimension || 1536,
			batchSize: config?.batchSize || 100,
			timeout: config?.timeout || 5000
		};
	}

	getModelName(): string {
		return this.config.modelName;
	}

	getDimension(): number {
		return this.config.dimension;
	}

	async embed(_text: string): Promise<number[]> {
		const vector = Array.from({ length: this.config.dimension }, () => Math.random() * 2 - 1);
		return this.normalizeVector(vector);
	}

	async embedBatch(texts: string[]): Promise<number[][]> {
		return Promise.all(texts.map(() => this.embed('')));
	}

	private normalizeVector(vector: number[]): number[] {
		const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
		return vector.map((val) => val / magnitude);
	}
}

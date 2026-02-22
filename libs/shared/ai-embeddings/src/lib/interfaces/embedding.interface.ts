/**
 * 向量嵌入服务接口
 *
 * 定义文本向量化能力的标准接口，支持多种嵌入模型（OpenAI、本地模型等）
 */
export interface IEmbeddingService {
	/**
	 * 获取嵌入模型名称
	 */
	getModelName(): string;

	/**
	 * 获取向量维度
	 */
	getDimension(): number;

	/**
	 * 生成单个文本的嵌入向量
	 *
	 * @param text - 输入文本
	 * @returns 嵌入向量
	 */
	embed(text: string): Promise<number[]>;

	/**
	 * 批量生成嵌入向量
	 *
	 * @param texts - 输入文本数组
	 * @returns 嵌入向量数组
	 */
	embedBatch(texts: string[]): Promise<number[][]>;
}

/**
 * 向量存储接口
 *
 * 定义向量存储和检索的标准接口，支持多种存储后端（PGVector、Pinecone 等）
 */
export interface IVectorStore {
	/**
	 * 存储向量
	 *
	 * @param params - 存储参数
	 */
	upsert(params: VectorUpsertParams): Promise<void>;

	/**
	 * 批量存储向量
	 *
	 * @param params - 存储参数数组
	 */
	upsertBatch(params: VectorUpsertParams[]): Promise<void>;

	/**
	 * 相似度搜索
	 *
	 * @param params - 搜索参数
	 * @returns 搜索结果
	 */
	search(params: VectorSearchParams): Promise<VectorSearchResult[]>;

	/**
	 * 删除向量
	 *
	 * @param params - 删除参数
	 */
	delete(params: VectorDeleteParams): Promise<void>;

	/**
	 * 获取向量
	 *
	 * @param id - 向量 ID
	 * @returns 向量数据或 null
	 */
	get(id: string): Promise<VectorData | null>;
}

/**
 * 向量存储参数
 */
export interface VectorUpsertParams {
	/**
	 * 向量 ID
	 */
	id: string;

	/**
	 * 租户 ID（多租户隔离）
	 */
	tenantId: string;

	/**
	 * 聚合类型
	 */
	aggregateType: string;

	/**
	 * 聚合 ID
	 */
	aggregateId: string;

	/**
	 * 嵌入向量
	 */
	vector: number[];

	/**
	 * 原始文本内容
	 */
	content: string;

	/**
	 * 元数据（可选）
	 */
	metadata?: Record<string, unknown>;
}

/**
 * 向量搜索参数
 */
export interface VectorSearchParams {
	/**
	 * 租户 ID（必填，多租户隔离）
	 */
	tenantId: string;

	/**
	 * 查询向量
	 */
	vector: number[];

	/**
	 * 返回结果数量
	 */
	limit?: number;

	/**
	 * 最小相似度阈值（0-1）
	 */
	minScore?: number;

	/**
	 * 聚合类型过滤（可选）
	 */
	aggregateType?: string;

	/**
	 * 元数据过滤（可选）
	 */
	metadataFilter?: Record<string, unknown>;
}

/**
 * 向量搜索结果
 */
export interface VectorSearchResult {
	/**
	 * 向量 ID
	 */
	id: string;

	/**
	 * 聚合类型
	 */
	aggregateType: string;

	/**
	 * 聚合 ID
	 */
	aggregateId: string;

	/**
	 * 相似度分数（0-1）
	 */
	score: number;

	/**
	 * 原始内容
	 */
	content: string;

	/**
	 * 元数据
	 */
	metadata?: Record<string, unknown>;
}

/**
 * 向量删除参数
 */
export interface VectorDeleteParams {
	/**
	 * 向量 ID
	 */
	id: string;

	/**
	 * 租户 ID
	 */
	tenantId: string;
}

/**
 * 向量数据
 */
export interface VectorData {
	/**
	 * 向量 ID
	 */
	id: string;

	/**
	 * 租户 ID
	 */
	tenantId: string;

	/**
	 * 聚合类型
	 */
	aggregateType: string;

	/**
	 * 聚合 ID
	 */
	aggregateId: string;

	/**
	 * 嵌入向量
	 */
	vector: number[];

	/**
	 * 原始内容
	 */
	content: string;

	/**
	 * 元数据
	 */
	metadata?: Record<string, unknown>;

	/**
	 * 创建时间
	 */
	createdAt: Date;
}

/**
 * 嵌入服务配置
 */
export interface EmbeddingServiceConfig {
	/**
	 * 模型名称
	 */
	modelName: string;

	/**
	 * 向量维度
	 */
	dimension: number;

	/**
	 * 批量处理大小
	 */
	batchSize?: number;

	/**
	 * 请求超时（毫秒）
	 */
	timeout?: number;
}

/**
 * 向量存储配置
 */
export interface VectorStoreConfig {
	/**
	 * 相似度算法
	 */
	similarityMetric?: 'cosine' | 'euclidean' | 'dot_product';

	/**
	 * 索引类型
	 */
	indexType?: 'hnsw' | 'ivf' | 'flat';
}

/**
 * 基础异常类
 *
 * 所有自定义异常的基类，提供统一的异常结构。
 */
export abstract class BaseException extends Error {
	/**
	 * 异常代码
	 */
	public readonly code: string;

	/**
	 * 额外上下文信息
	 */
	public readonly context?: Record<string, unknown>;

	constructor(message: string, code: string, options?: { cause?: Error; context?: Record<string, unknown> }) {
		super(message, options);
		this.code = code;
		this.context = options?.context;
		this.name = this.constructor.name;
	}
}

/**
 * 领域异常
 *
 * 表示领域层中发生的业务规则违反或领域逻辑错误。
 *
 * @example
 * ```typescript
 * throw new DomainException('任务不存在', 'JOB_NOT_FOUND');
 * throw new DomainException('任务已完成，无法修改', 'JOB_ALREADY_COMPLETED');
 * ```
 */
export class DomainException extends BaseException {
	constructor(message: string, code: string, options?: { cause?: Error; context?: Record<string, unknown> }) {
		super(message, code, options);
	}
}

/**
 * 应用异常
 *
 * 表示应用层中发生的用例执行错误或协调错误。
 *
 * @example
 * ```typescript
 * throw new ApplicationException('用例执行失败', 'USE_CASE_FAILED');
 * throw new ApplicationException('并发冲突', 'CONCURRENCY_CONFLICT');
 * ```
 */
export class ApplicationException extends BaseException {
	constructor(message: string, code: string, options?: { cause?: Error; context?: Record<string, unknown> }) {
		super(message, code, options);
	}
}

/**
 * 基础设施异常
 *
 * 表示基础设施层中发生的技术错误，如数据库、网络、文件系统等。
 *
 * @example
 * ```typescript
 * throw new InfrastructureException('数据库连接失败', 'DB_CONNECTION_FAILED');
 * throw new InfrastructureException('消息队列不可用', 'MQ_UNAVAILABLE');
 * ```
 */
export class InfrastructureException extends BaseException {
	constructor(message: string, code: string, options?: { cause?: Error; context?: Record<string, unknown> }) {
		super(message, code, options);
	}
}

/**
 * 验证错误项
 */
export interface ValidationError {
	/**
	 * 字段名称
	 */
	field: string;

	/**
	 * 错误消息
	 */
	message: string;
}

/**
 * 验证异常
 *
 * 表示输入验证失败，包含具体的字段和错误信息。
 *
 * @example
 * ```typescript
 * throw new ValidationException('用户名不能为空', 'name');
 * throw new ValidationException('验证失败', undefined, {
 *   errors: [
 *     { field: 'name', message: '名称不能为空' },
 *     { field: 'email', message: '邮箱格式不正确' }
 *   ]
 * });
 * ```
 */
export class ValidationException extends Error {
	/**
	 * 字段名称（单个验证错误时使用）
	 */
	public readonly field?: string;

	/**
	 * 验证错误列表
	 */
	public readonly errors?: ValidationError[];

	constructor(message: string, field?: string, options?: { errors?: ValidationError[] }) {
		super(message);
		this.name = 'ValidationException';
		this.field = field;
		this.errors = options?.errors;
	}
}

/**
 * 业务规则异常
 *
 * 表示业务规则被违反，但不属于领域层的核心不变量。
 *
 * @example
 * ```typescript
 * throw new BusinessRuleException('任务必须包含至少一个任务项');
 * throw new BusinessRuleException('超出预算限制', 'BUDGET_LIMIT_EXCEEDED');
 * ```
 */
export class BusinessRuleException extends Error {
	/**
	 * 规则名称
	 */
	public readonly rule?: string;

	constructor(message: string, rule?: string) {
		super(message);
		this.name = 'BusinessRuleException';
		this.rule = rule;
	}
}

/**
 * 未找到异常
 *
 * 表示请求的实体或资源不存在。
 *
 * @example
 * ```typescript
 * throw new NotFoundException('任务', 'job-123');
 * throw new NotFoundException('用户', 'user-456');
 * ```
 */
export class NotFoundException extends Error {
	/**
	 * 实体类型
	 */
	public readonly entityType: string;

	/**
	 * 实体标识符
	 */
	public readonly identifier: string;

	constructor(entityType: string, identifier: string) {
		super(`未找到${entityType}: ${identifier}`);
		this.name = 'NotFoundException';
		this.entityType = entityType;
		this.identifier = identifier;
	}
}

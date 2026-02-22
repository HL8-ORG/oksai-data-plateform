import { Injectable, BadRequestException } from '@nestjs/common';
import { validate, ValidationError } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import type { ICqrsPipe, CqrsExecutionContext } from '../pipeline';

/**
 * @description 验证管道配置选项
 */
export interface ValidationPipeOptions {
	/**
	 * @description 是否启用详细错误信息（默认 false）
	 */
	enableDebugMessages?: boolean;

	/**
	 * @description 是否禁止未知属性（默认 true）
	 */
	forbidUnknownValues?: boolean;

	/**
	 * @description 是否启用隐式类型转换（默认 true）
	 */
	transform?: boolean;
}

/**
 * @description Command/Query 元数据中存储校验类名的 key
 */
export const CQRS_VALIDATION_DTO_KEY = 'cqrs:validation_dto';

/**
 * @description 标记 Command/Query 的校验 DTO 类型
 *
 * 使用方式：
 * ```typescript
 * @UseValidationDto(CreateTenantDto)
 * export class CreateTenantCommand implements ICommand {
 *   type: 'CreateTenant' as const;
 *   name: string;
 * }
 * ```
 */
export function UseValidationDto(dtoClass: new (...args: unknown[]) => object): ClassDecorator {
	return (target: object) => {
		Reflect.defineMetadata(CQRS_VALIDATION_DTO_KEY, dtoClass, target);
	};
}

/**
 * @description 输入校验管道
 *
 * 说明：
 * - 使用 class-validator 和 class-transformer 进行输入校验
 * - 通过 @UseValidationDto 装饰器指定 Command/Query 的 DTO 类型
 * - 校验失败抛出 BadRequestException
 *
 * 强约束：
 * - 校验错误消息必须中文
 * - 不修改原始 payload
 */
@Injectable()
export class ValidationPipe implements ICqrsPipe {
	readonly name = 'ValidationPipe';

	constructor(private readonly options: ValidationPipeOptions = {}) {}

	async execute<TResult>(context: CqrsExecutionContext, next: () => Promise<TResult>): Promise<TResult> {
		const { payload } = context;

		// 获取 payload 构造函数上的 DTO 类型
		const payloadConstructor = payload.constructor as abstract new (...args: unknown[]) => unknown;
		const dtoClass = Reflect.getMetadata(CQRS_VALIDATION_DTO_KEY, payloadConstructor) as
			| (new (...args: unknown[]) => object)
			| undefined;

		// 如果没有指定 DTO 类型，跳过校验
		if (!dtoClass) {
			return next();
		}

		// 转换为 DTO 实例
		const dtoInstance =
			this.options.transform !== false
				? plainToInstance(dtoClass, payload)
				: Object.assign(new dtoClass(), payload);

		// 执行校验
		const errors = await validate(dtoInstance, {
			forbidUnknownValues: this.options.forbidUnknownValues !== false,
			validationError: {
				target: false,
				value: false
			}
		});

		if (errors.length > 0) {
			const messages = this.formatErrors(errors);
			throw new BadRequestException(`输入参数校验失败：${messages.join('；')}。`);
		}

		return next();
	}

	/**
	 * @description 格式化校验错误
	 */
	private formatErrors(errors: ValidationError[], parentPath = ''): string[] {
		const messages: string[] = [];

		for (const error of errors) {
			const propertyPath = parentPath ? `${parentPath}.${error.property}` : error.property;

			if (error.constraints) {
				const constraintMessages = Object.values(error.constraints).map((msg: string) => {
					// 转换常见英文错误消息为中文
					return this.translateErrorMessage(msg, propertyPath);
				});
				messages.push(...constraintMessages);
			}

			if (error.children && error.children.length > 0) {
				messages.push(...this.formatErrors(error.children, propertyPath));
			}
		}

		return messages;
	}

	/**
	 * @description 转换错误消息为中文
	 */
	private translateErrorMessage(message: string, property: string): string {
		const translations: Record<string, string> = {
			'should not be empty': `${property} 不能为空`,
			'should not be null': `${property} 不能为空`,
			'should not be undefined': `${property} 不能为空`,
			'must be a string': `${property} 必须是字符串`,
			'must be a number': `${property} 必须是数字`,
			'must be a boolean': `${property} 必须是布尔值`,
			'must be a date': `${property} 必须是日期`,
			'must be an email': `${property} 必须是有效的邮箱地址`,
			'must be longer than': `${property} 长度不足`,
			'must be shorter than': `${property} 长度超出限制`,
			'must be greater than': `${property} 值太小`,
			'must be less than': `${property} 值太大`,
			'must be a valid enum value': `${property} 必须是有效的枚举值`
		};

		for (const [key, translation] of Object.entries(translations)) {
			if (message.toLowerCase().includes(key.toLowerCase())) {
				return translation;
			}
		}

		return this.options.enableDebugMessages ? `${property}: ${message}` : `${property} 校验失败`;
	}
}

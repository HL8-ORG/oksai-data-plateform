/**
 * @oksai/exceptions
 *
 * 统一异常体系，提供领域驱动设计的异常类型。
 *
 * @packageDocumentation
 */

export {
	BaseException,
	DomainException,
	ApplicationException,
	InfrastructureException,
	ValidationException,
	type ValidationError,
	BusinessRuleException,
	NotFoundException
} from './lib/exceptions';

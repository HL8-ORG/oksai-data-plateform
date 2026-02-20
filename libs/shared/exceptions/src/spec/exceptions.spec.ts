/**
 * Exceptions 单元测试
 *
 * 测试统一异常体系
 */
import {
	DomainException,
	ApplicationException,
	InfrastructureException,
	ValidationException,
	BusinessRuleException,
	NotFoundException
} from '../index';

describe('Exceptions', () => {
	describe('DomainException', () => {
		it('应该创建领域异常', () => {
			// Act
			const error = new DomainException('任务不存在', 'JOB_NOT_FOUND');

			// Assert
			expect(error).toBeInstanceOf(Error);
			expect(error).toBeInstanceOf(DomainException);
			expect(error.message).toBe('任务不存在');
			expect(error.code).toBe('JOB_NOT_FOUND');
			expect(error.name).toBe('DomainException');
		});

		it('应该支持错误原因链', () => {
			// Arrange
			const cause = new Error('原始错误');

			// Act
			const error = new DomainException('操作失败', 'OPERATION_FAILED', { cause });

			// Assert
			expect(error.cause).toBe(cause);
		});

		it('应该支持额外上下文信息', () => {
			// Act
			const error = new DomainException('验证失败', 'VALIDATION_FAILED', {
				context: { field: 'name', value: '' }
			});

			// Assert
			expect(error.context).toEqual({ field: 'name', value: '' });
		});
	});

	describe('ApplicationException', () => {
		it('应该创建应用异常', () => {
			// Act
			const error = new ApplicationException('用例执行失败', 'USE_CASE_FAILED');

			// Assert
			expect(error).toBeInstanceOf(Error);
			expect(error).toBeInstanceOf(ApplicationException);
			expect(error.message).toBe('用例执行失败');
			expect(error.code).toBe('USE_CASE_FAILED');
			expect(error.name).toBe('ApplicationException');
		});
	});

	describe('InfrastructureException', () => {
		it('应该创建基础设施异常', () => {
			// Act
			const error = new InfrastructureException('数据库连接失败', 'DB_CONNECTION_FAILED');

			// Assert
			expect(error).toBeInstanceOf(Error);
			expect(error).toBeInstanceOf(InfrastructureException);
			expect(error.message).toBe('数据库连接失败');
			expect(error.code).toBe('DB_CONNECTION_FAILED');
			expect(error.name).toBe('InfrastructureException');
		});
	});

	describe('ValidationException', () => {
		it('应该创建验证异常', () => {
			// Act
			const error = new ValidationException('用户名不能为空', 'name');

			// Assert
			expect(error).toBeInstanceOf(Error);
			expect(error).toBeInstanceOf(ValidationException);
			expect(error.message).toBe('用户名不能为空');
			expect(error.field).toBe('name');
			expect(error.name).toBe('ValidationException');
		});

		it('应该支持多个验证错误', () => {
			// Act
			const error = new ValidationException('验证失败', undefined, {
				errors: [
					{ field: 'name', message: '名称不能为空' },
					{ field: 'email', message: '邮箱格式不正确' }
				]
			});

			// Assert
			expect(error.errors).toHaveLength(2);
		});
	});

	describe('BusinessRuleException', () => {
		it('应该创建业务规则异常', () => {
			// Act
			const error = new BusinessRuleException('任务必须包含至少一个任务项');

			// Assert
			expect(error).toBeInstanceOf(Error);
			expect(error).toBeInstanceOf(BusinessRuleException);
			expect(error.message).toBe('任务必须包含至少一个任务项');
			expect(error.name).toBe('BusinessRuleException');
		});

		it('应该支持规则名称', () => {
			// Act
			const error = new BusinessRuleException('超出预算限制', 'BUDGET_LIMIT_EXCEEDED');

			// Assert
			expect(error.rule).toBe('BUDGET_LIMIT_EXCEEDED');
		});
	});

	describe('NotFoundException', () => {
		it('应该创建未找到异常', () => {
			// Act
			const error = new NotFoundException('任务', 'job-123');

			// Assert
			expect(error).toBeInstanceOf(Error);
			expect(error).toBeInstanceOf(NotFoundException);
			expect(error.message).toBe('未找到任务: job-123');
			expect(error.entityType).toBe('任务');
			expect(error.identifier).toBe('job-123');
			expect(error.name).toBe('NotFoundException');
		});
	});

	describe('异常类型检查', () => {
		it('应该能区分不同类型的异常', () => {
			// Arrange
			const domainError = new DomainException('领域错误', 'DOMAIN_ERROR');
			const appError = new ApplicationException('应用错误', 'APP_ERROR');
			const infraError = new InfrastructureException('基础设施错误', 'INFRA_ERROR');

			// Act & Assert
			expect(domainError instanceof DomainException).toBe(true);
			expect(domainError instanceof ApplicationException).toBe(false);

			expect(appError instanceof ApplicationException).toBe(true);
			expect(appError instanceof InfrastructureException).toBe(false);

			expect(infraError instanceof InfrastructureException).toBe(true);
			expect(infraError instanceof DomainException).toBe(false);
		});
	});
});

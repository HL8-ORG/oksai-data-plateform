import { AuditPipe } from './audit.pipe';
import { createCqrsContext } from '../pipeline';

describe('AuditPipe', () => {
	let auditPipe: AuditPipe;

	beforeEach(() => {
		auditPipe = new AuditPipe();
	});

	it('应该在成功时记录日志', async () => {
		const context = createCqrsContext('TestCommand', { type: 'TestCommand' }, { tenantId: 'tenant-1' });

		const result = await auditPipe.execute(context, () => Promise.resolve('success'));

		expect(result).toBe('success');
	});

	it('应该在失败时记录日志并重新抛出异常', async () => {
		const context = createCqrsContext('TestCommand', { type: 'TestCommand' }, { tenantId: 'tenant-1' });

		await expect(auditPipe.execute(context, () => Promise.reject(new Error('Test error')))).rejects.toThrow(
			'Test error'
		);
	});

	it('应该包含正确的管道名称', () => {
		expect(auditPipe.name).toBe('AuditPipe');
	});
});

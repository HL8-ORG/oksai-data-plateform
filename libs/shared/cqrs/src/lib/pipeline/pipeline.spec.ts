import { createCqrsContext, composePipelines, type ICqrsPipe } from './pipeline';

describe('createCqrsContext', () => {
	it('应该创建包含所有字段的执行上下文', () => {
		const payload = { type: 'TestCommand' };
		const context = createCqrsContext('TestCommand', payload, {
			tenantId: 'tenant-1',
			userId: 'user-1',
			requestId: 'req-1'
		});

		expect(context.commandType).toBe('TestCommand');
		expect(context.payload).toBe(payload);
		expect(context.tenantId).toBe('tenant-1');
		expect(context.userId).toBe('user-1');
		expect(context.requestId).toBe('req-1');
		expect(context.startTime).toBeGreaterThan(0);
		expect(context.data).toEqual({});
	});

	it('应该支持空的 CLS 上下文', () => {
		const payload = { type: 'TestCommand' };
		const context = createCqrsContext('TestCommand', payload);

		expect(context.tenantId).toBeUndefined();
		expect(context.userId).toBeUndefined();
		expect(context.requestId).toBeUndefined();
	});
});

describe('composePipelines', () => {
	it('应该按顺序执行管道', async () => {
		const executionOrder: string[] = [];

		const pipe1: ICqrsPipe = {
			name: 'Pipe1',
			async execute(ctx, next) {
				executionOrder.push('pipe1-before');
				const result = await next();
				executionOrder.push('pipe1-after');
				return result;
			}
		};

		const pipe2: ICqrsPipe = {
			name: 'Pipe2',
			async execute(ctx, next) {
				executionOrder.push('pipe2-before');
				const result = await next();
				executionOrder.push('pipe2-after');
				return result;
			}
		};

		const finalHandler = jest.fn().mockResolvedValue('final-result');

		const pipeline = composePipelines([pipe1, pipe2], finalHandler);
		const context = createCqrsContext('TestCommand', { type: 'TestCommand' });

		const result = await pipeline(context);

		expect(result).toBe('final-result');
		expect(executionOrder).toEqual(['pipe1-before', 'pipe2-before', 'pipe2-after', 'pipe1-after']);
	});

	it('应该支持空管道数组', async () => {
		const finalHandler = jest.fn().mockResolvedValue('result');
		const pipeline = composePipelines([], finalHandler);
		const context = createCqrsContext('TestCommand', { type: 'TestCommand' });

		const result = await pipeline(context);

		expect(result).toBe('result');
		expect(finalHandler).toHaveBeenCalledWith(context);
	});

	it('应该正确传播异常', async () => {
		const pipe: ICqrsPipe = {
			name: 'ErrorPipe',
			async execute(ctx, next) {
				await next();
				throw new Error('Pipeline error');
			}
		};

		const finalHandler = jest.fn().mockResolvedValue('result');
		const pipeline = composePipelines([pipe], finalHandler);
		const context = createCqrsContext('TestCommand', { type: 'TestCommand' });

		await expect(pipeline(context)).rejects.toThrow('Pipeline error');
	});
});

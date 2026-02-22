jest.mock('@oksai/context', () => {
	const actual = jest.requireActual('@oksai/context');
	return {
		...actual,
		runWithOksaiContext: jest.fn((_ctx: unknown, fn: () => unknown) => fn())
	};
});

import { runWithOksaiContext } from '@oksai/context';
import { withOksaiWorkerContext, withOksaiWorkerContextFromJob } from './worker-context.util';

describe('withOksaiWorkerContext', () => {
	it('should call runWithOksaiContext with extracted context and forward handler return value', async () => {
		const handler = jest.fn(async (n: number) => n + 1);
		const wrapped = withOksaiWorkerContext((n: number) => ({ tenantId: `t-${n}`, requestId: `req-${n}` }), handler);

		const result = await wrapped(1);

		expect(result).toBe(2);
		expect(handler).toHaveBeenCalledWith(1);
		expect(runWithOksaiContext).toHaveBeenCalledWith({ tenantId: 't-1', requestId: 'req-1' }, expect.any(Function));
	});
});

describe('withOksaiWorkerContextFromJob', () => {
	it('should extract context from job fields by convention', async () => {
		const handler = jest.fn(async (_job: { tenantId: string; requestId: string }) => 'ok');
		const wrapped = withOksaiWorkerContextFromJob(handler);

		const result = await wrapped({ tenantId: 't-001', requestId: 'job-1' });

		expect(result).toBe('ok');
		expect(runWithOksaiContext).toHaveBeenCalledWith(
			{ tenantId: 't-001', requestId: 'job-1' },
			expect.any(Function)
		);
	});

	it('should support custom key mapping', async () => {
		const handler = jest.fn(async (_job: { tid: string; rid: string }) => 'ok');
		const wrapped = withOksaiWorkerContextFromJob(handler, { tenantIdKey: 'tid', requestIdKey: 'rid' });

		const result = await wrapped({ tid: 't-002', rid: 'job-2' });

		expect(result).toBe('ok');
		expect(runWithOksaiContext).toHaveBeenCalledWith(
			{ tenantId: 't-002', requestId: 'job-2' },
			expect.any(Function)
		);
	});
});

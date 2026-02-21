import { setupRequestIdResponseHeader } from '../lib/request-id/setup-request-id-response-header';

describe('setupRequestIdResponseHeader', () => {
	describe('没有 addHook 的实例', () => {
		it('应该正确处理没有 addHook 方法的实例', () => {
			const mockApp = {
				getHttpAdapter: () => ({
					getInstance: () => ({})
				})
			} as any;

			expect(() => setupRequestIdResponseHeader(mockApp)).not.toThrow();
		});

		it('应该正确处理 null 实例', () => {
			const mockApp = {
				getHttpAdapter: () => ({
					getInstance: () => null
				})
			} as any;

			expect(() => setupRequestIdResponseHeader(mockApp)).not.toThrow();
		});

		it('应该正确处理 addHook 不是函数的情况', () => {
			const mockApp = {
				getHttpAdapter: () => ({
					getInstance: () => ({ addHook: 'not-a-function' })
				})
			} as any;

			expect(() => setupRequestIdResponseHeader(mockApp)).not.toThrow();
		});
	});

	describe('默认 header 名称', () => {
		it('应该使用默认的 header 名称', () => {
			const mockApp = {
				getHttpAdapter: () => ({
					getInstance: () => ({})
				})
			} as any;

			setupRequestIdResponseHeader(mockApp);
		});
	});

	describe('自定义 header 名称', () => {
		it('应该支持自定义 header 名称', () => {
			const mockApp = {
				getHttpAdapter: () => ({
					getInstance: () => ({})
				})
			} as any;

			setupRequestIdResponseHeader(mockApp, { headerName: 'x-correlation-id' });
		});
	});

	describe('undefined 选项', () => {
		it('应该正确处理 undefined 选项', () => {
			const mockApp = {
				getHttpAdapter: () => ({
					getInstance: () => ({})
				})
			} as any;

			expect(() => setupRequestIdResponseHeader(mockApp, undefined)).not.toThrow();
		});
	});

	describe('Fastify addHook 回调', () => {
		it('应该注册 onSend hook', () => {
			let capturedHookName: string | undefined;
			const mockApp = {
				getHttpAdapter: () => ({
					getInstance: () => ({
						addHook: (name: string, fn: any) => {
							capturedHookName = name;
						}
					})
				})
			} as any;

			setupRequestIdResponseHeader(mockApp);

			expect(capturedHookName).toBe('onSend');
		});

		it('应该使用默认 header 名称 x-request-id', () => {
			let hookFn: any;
			const mockApp = {
				getHttpAdapter: () => ({
					getInstance: () => ({
						addHook: (_name: string, fn: any) => {
							hookFn = fn;
						}
					})
				})
			} as any;

			setupRequestIdResponseHeader(mockApp);

			const mockReq = { id: 'test-req-123' };
			const mockReply = {
				header: jest.fn()
			};
			const mockPayload = {};
			const mockDone = jest.fn();

			hookFn(mockReq, mockReply, mockPayload, mockDone);

			expect(mockReply.header).toHaveBeenCalledWith('x-request-id', 'test-req-123');
			expect(mockDone).toHaveBeenCalledWith(null, mockPayload);
		});

		it('应该使用自定义 header 名称', () => {
			let hookFn: any;
			const mockApp = {
				getHttpAdapter: () => ({
					getInstance: () => ({
						addHook: (_name: string, fn: any) => {
							hookFn = fn;
						}
					})
				})
			} as any;

			setupRequestIdResponseHeader(mockApp, { headerName: 'x-correlation-id' });

			const mockReq = { id: 'test-req-456' };
			const mockReply = {
				header: jest.fn()
			};
			const mockPayload = {};
			const mockDone = jest.fn();

			hookFn(mockReq, mockReply, mockPayload, mockDone);

			expect(mockReply.header).toHaveBeenCalledWith('x-correlation-id', 'test-req-456');
		});

		it('应该处理 undefined req.id', () => {
			let hookFn: any;
			const mockApp = {
				getHttpAdapter: () => ({
					getInstance: () => ({
						addHook: (_name: string, fn: any) => {
							hookFn = fn;
						}
					})
				})
			} as any;

			setupRequestIdResponseHeader(mockApp);

			const mockReq = {};
			const mockReply = {
				header: jest.fn()
			};
			const mockPayload = {};
			const mockDone = jest.fn();

			hookFn(mockReq, mockReply, mockPayload, mockDone);

			expect(mockReply.header).toHaveBeenCalledWith('x-request-id', 'unknown');
		});

		it('应该处理 null req.id', () => {
			let hookFn: any;
			const mockApp = {
				getHttpAdapter: () => ({
					getInstance: () => ({
						addHook: (_name: string, fn: any) => {
							hookFn = fn;
						}
					})
				})
			} as any;

			setupRequestIdResponseHeader(mockApp);

			const mockReq = { id: null };
			const mockReply = {
				header: jest.fn()
			};
			const mockPayload = {};
			const mockDone = jest.fn();

			hookFn(mockReq, mockReply, mockPayload, mockDone);

			expect(mockReply.header).toHaveBeenCalledWith('x-request-id', 'unknown');
		});

		it('应该将非字符串 req.id 转换为字符串', () => {
			let hookFn: any;
			const mockApp = {
				getHttpAdapter: () => ({
					getInstance: () => ({
						addHook: (_name: string, fn: any) => {
							hookFn = fn;
						}
					})
				})
			} as any;

			setupRequestIdResponseHeader(mockApp);

			const mockReq = { id: 12345 };
			const mockReply = {
				header: jest.fn()
			};
			const mockPayload = {};
			const mockDone = jest.fn();

			hookFn(mockReq, mockReply, mockPayload, mockDone);

			expect(mockReply.header).toHaveBeenCalledWith('x-request-id', '12345');
		});
	});
});

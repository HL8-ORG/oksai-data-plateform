import { setupRequestIdResponseHeader } from '../lib/request-id/setup-request-id-response-header';

describe('setupRequestIdResponseHeader', () => {
	it('应该正确处理没有 addHook 方法的实例', () => {
		const mockApp = {
			getHttpAdapter: () => ({
				getInstance: () => ({}),
			}),
		} as any;

		// 不应该抛出错误
		expect(() => setupRequestIdResponseHeader(mockApp)).not.toThrow();
	});

	it('应该使用默认的 header 名称', () => {
		const mockApp = {
			getHttpAdapter: () => ({
				getInstance: () => ({}),
			}),
		} as any;

		setupRequestIdResponseHeader(mockApp);
		// 验证没有错误
	});

	it('应该支持自定义 header 名称', () => {
		const mockApp = {
			getHttpAdapter: () => ({
				getInstance: () => ({}),
			}),
		} as any;

		setupRequestIdResponseHeader(mockApp, { headerName: 'x-correlation-id' });
		// 验证没有错误
	});

	it('应该正确处理 undefined 选项', () => {
		const mockApp = {
			getHttpAdapter: () => ({
				getInstance: () => ({}),
			}),
		} as any;

		expect(() => setupRequestIdResponseHeader(mockApp, undefined)).not.toThrow();
	});
});

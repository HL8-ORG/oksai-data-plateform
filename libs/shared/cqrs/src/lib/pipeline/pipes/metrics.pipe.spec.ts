import { MetricsPipe, DefaultMetricsCollector, type ICqrsMetricsCollector, type CqrsMetrics } from './metrics.pipe';
import { createCqrsContext } from '../pipeline';

describe('MetricsPipe', () => {
	let mockCollector: jest.Mocked<ICqrsMetricsCollector>;
	let metricsPipe: MetricsPipe;

	beforeEach(() => {
		mockCollector = {
			recordMetrics: jest.fn()
		};
		metricsPipe = new MetricsPipe(mockCollector);
	});

	it('应该在成功时记录指标', async () => {
		const context = createCqrsContext('TestCommand', { type: 'TestCommand' }, { tenantId: 'tenant-1' });

		const result = await metricsPipe.execute(context, () => Promise.resolve('success'));

		expect(result).toBe('success');
		expect(mockCollector.recordMetrics).toHaveBeenCalledWith(
			expect.objectContaining({
				commandType: 'TestCommand',
				status: 'success',
				tenantId: 'tenant-1'
			})
		);
	});

	it('应该在失败时记录指标', async () => {
		const context = createCqrsContext('TestCommand', { type: 'TestCommand' }, { tenantId: 'tenant-1' });

		await expect(metricsPipe.execute(context, () => Promise.reject(new Error('Test error')))).rejects.toThrow(
			'Test error'
		);

		expect(mockCollector.recordMetrics).toHaveBeenCalledWith(
			expect.objectContaining({
				commandType: 'TestCommand',
				status: 'error',
				errorType: 'Error'
			})
		);
	});

	it('应该包含正确的管道名称', () => {
		expect(metricsPipe.name).toBe('MetricsPipe');
	});
});

describe('DefaultMetricsCollector', () => {
	it('应该有 recordMetrics 方法', () => {
		const collector = new DefaultMetricsCollector();
		expect(() => collector.recordMetrics({} as CqrsMetrics)).not.toThrow();
	});
});

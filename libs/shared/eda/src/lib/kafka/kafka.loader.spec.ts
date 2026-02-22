describe('kafka.loader', () => {
	it('should throw a Chinese error message when kafkajs cannot be loaded', () => {
		jest.isolateModules(() => {
			jest.doMock('kafkajs', () => {
				throw new Error('MODULE_NOT_FOUND');
			});

			const loader = require('./kafka.loader') as typeof import('./kafka.loader');
			expect(() => loader.loadKafkaJs()).toThrow('Kafka 传输层启用失败：未安装或无法加载依赖 kafkajs。');
		});
	});
});

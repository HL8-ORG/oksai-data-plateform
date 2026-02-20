import { OKSAI_REDIS } from '../lib/tokens';

describe('tokens', () => {
	it('OKSAI_REDIS 应该是 Symbol', () => {
		expect(typeof OKSAI_REDIS).toBe('symbol');
	});

	it('OKSAI_REDIS 的描述应该正确', () => {
		expect(OKSAI_REDIS.description).toBe('OKSAI_REDIS');
	});
});

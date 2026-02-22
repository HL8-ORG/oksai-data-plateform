import { computeOutboxNextRetrySeconds } from './outbox-retry.util';

describe('computeOutboxNextRetrySeconds', () => {
	it('should compute exponential backoff with cap', () => {
		expect(computeOutboxNextRetrySeconds(0)).toBe(1);
		expect(computeOutboxNextRetrySeconds(1)).toBe(2);
		expect(computeOutboxNextRetrySeconds(2)).toBe(4);
		expect(computeOutboxNextRetrySeconds(5)).toBe(32);
		expect(computeOutboxNextRetrySeconds(20)).toBe(300);
	});
});

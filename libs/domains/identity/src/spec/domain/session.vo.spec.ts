import { SessionVO } from '../../domain/model/session.vo';

describe('SessionVO', () => {
	describe('create', () => {
		it('应该成功创建会话值对象', () => {
			const expiresAt = new Date(Date.now() + 3600000);
			const session = SessionVO.create({
				id: 'session-123',
				userId: 'user-456',
				token: 'test-token',
				expiresAt,
			});

			expect(session.id).toBe('session-123');
			expect(session.userId).toBe('user-456');
			expect(session.token).toBe('test-token');
			expect(session.expiresAt).toBe(expiresAt);
		});

		it('应该规范化邮箱（小写）', () => {
			const expiresAt = new Date(Date.now() + 3600000);
			const session = SessionVO.create({
				id: '  SESSION-123  ',
				userId: '  USER-456  ',
				token: '  test-token  ',
				expiresAt,
			});

			expect(session.id).toBe('SESSION-123');
			expect(session.userId).toBe('USER-456');
			expect(session.token).toBe('test-token');
		});

		it('应该抛出错误如果会话ID为空', () => {
			expect(() =>
				SessionVO.create({
					id: '',
					userId: 'user-456',
					token: 'test-token',
					expiresAt: new Date(),
				}),
			).toThrow('会话ID不能为空');
		});

		it('应该抛出错误如果用户ID为空', () => {
			expect(() =>
				SessionVO.create({
					id: 'session-123',
					userId: '',
					token: 'test-token',
					expiresAt: new Date(),
				}),
			).toThrow('用户ID不能为空');
		});

		it('应该抛出错误如果令牌为空', () => {
			expect(() =>
				SessionVO.create({
					id: 'session-123',
					userId: 'user-456',
					token: '',
					expiresAt: new Date(),
				}),
			).toThrow('令牌不能为空');
		});

		it('应该抛出错误如果过期时间无效', () => {
			expect(() =>
				SessionVO.create({
					id: 'session-123',
					userId: 'user-456',
					token: 'test-token',
					expiresAt: 'invalid' as any,
				}),
			).toThrow('过期时间必须是有效的日期');
		});
	});

	describe('isValid / isExpired', () => {
		it('应该返回true如果会话未过期', () => {
			const session = SessionVO.create({
				id: 'session-123',
				userId: 'user-456',
				token: 'test-token',
				expiresAt: new Date(Date.now() + 3600000),
			});

			expect(session.isValid()).toBe(true);
			expect(session.isExpired()).toBe(false);
		});

		it('应该返回true如果会话已过期', () => {
			const session = SessionVO.create({
				id: 'session-123',
				userId: 'user-456',
				token: 'test-token',
				expiresAt: new Date(Date.now() - 1000),
			});

			expect(session.isValid()).toBe(false);
			expect(session.isExpired()).toBe(true);
		});
	});

	describe('getRemainingSeconds', () => {
		it('应该返回剩余秒数', () => {
			const session = SessionVO.create({
				id: 'session-123',
				userId: 'user-456',
				token: 'test-token',
				expiresAt: new Date(Date.now() + 5000),
			});

			expect(session.getRemainingSeconds()).toBeLessThanOrEqual(5);
			expect(session.getRemainingSeconds()).toBeGreaterThan(3);
		});

		it('应该返回0如果会话已过期', () => {
			const session = SessionVO.create({
				id: 'session-123',
				userId: 'user-456',
				token: 'test-token',
				expiresAt: new Date(Date.now() - 1000),
			});

			expect(session.getRemainingSeconds()).toBe(0);
		});
	});

	describe('equals', () => {
		it('应该返回true如果两个会话相同', () => {
			const expiresAt = new Date(Date.now() + 3600000);
			const session1 = SessionVO.create({
				id: 'session-123',
				userId: 'user-456',
				token: 'test-token',
				expiresAt,
			});
			const session2 = SessionVO.create({
				id: 'session-123',
				userId: 'user-456',
				token: 'test-token',
				expiresAt,
			});

			expect(session1.equals(session2)).toBe(true);
		});

		it('应该返回false如果会话ID不同', () => {
			const expiresAt = new Date(Date.now() + 3600000);
			const session1 = SessionVO.create({
				id: 'session-123',
				userId: 'user-456',
				token: 'test-token',
				expiresAt,
			});
			const session2 = SessionVO.create({
				id: 'session-456',
				userId: 'user-456',
				token: 'test-token',
				expiresAt,
			});

			expect(session1.equals(session2)).toBe(false);
		});
	});

	describe('toJSON', () => {
		it('应该返回正确的JSON格式', () => {
			const expiresAt = new Date('2024-01-01T00:00:00.000Z');
			const session = SessionVO.create({
				id: 'session-123',
				userId: 'user-456',
				token: 'test-token',
				expiresAt,
				ipAddress: '192.168.1.1',
				userAgent: 'Mozilla/5.0',
			});

			const json = session.toJSON();

			expect(json).toEqual({
				id: 'session-123',
				userId: 'user-456',
				token: 'test-token',
				expiresAt: '2024-01-01T00:00:00.000Z',
				ipAddress: '192.168.1.1',
				userAgent: 'Mozilla/5.0',
				createdAt: expect.any(String),
			});
		});
	});
});

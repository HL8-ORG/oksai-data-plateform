import { QueryBus } from './query-bus';
import type { IQuery, IQueryHandler } from '../interfaces';

/**
 * @description 测试用查询类型
 */
interface ITestQuery extends IQuery {
	type: 'TestQuery';
	id: string;
}

describe('QueryBus', () => {
	let queryBus: QueryBus;

	beforeEach(() => {
		queryBus = new QueryBus();
	});

	describe('register', () => {
		it('应该成功注册查询处理器', () => {
			const handler: IQueryHandler<ITestQuery, string> = {
				execute: jest.fn().mockResolvedValue('result')
			};

			expect(() => queryBus.register('TestQuery', handler)).not.toThrow();
		});

		it('应该在重复注册时抛出错误', () => {
			const handler: IQueryHandler<ITestQuery, string> = {
				execute: jest.fn().mockResolvedValue('result')
			};

			queryBus.register('TestQuery', handler);

			expect(() => queryBus.register('TestQuery', handler)).toThrow('查询处理器重复注册：queryType=TestQuery。');
		});
	});

	describe('execute', () => {
		it('应该在找不到处理器时抛出错误', async () => {
			const query: ITestQuery = {
				type: 'TestQuery',
				id: '123'
			};

			await expect(queryBus.execute(query)).rejects.toThrow('未找到查询处理器：queryType=TestQuery。');
		});

		it('应该成功执行查询并返回结果', async () => {
			const expectedResult = { id: '123', name: 'Test' };
			const handler: IQueryHandler<ITestQuery, typeof expectedResult> = {
				execute: jest.fn().mockResolvedValue(expectedResult)
			};

			queryBus.register('TestQuery', handler);

			const query: ITestQuery = {
				type: 'TestQuery',
				id: '123'
			};

			const result = await queryBus.execute(query);

			expect(result).toEqual(expectedResult);
			expect(handler.execute).toHaveBeenCalledWith(query);
		});
	});

	describe('registerPipes', () => {
		it('应该成功注册管道', () => {
			const mockPipe = {
				name: 'TestPipe',
				execute: jest.fn((ctx, next) => next())
			};

			expect(() => queryBus.registerPipes([mockPipe as any])).not.toThrow();
		});
	});
});

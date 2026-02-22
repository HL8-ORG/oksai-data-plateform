import { CommandBus } from './command-bus';
import type { ICommand, ICommandHandler } from '../interfaces';

interface ITestCommand extends ICommand {
	type: 'TestCommand';
	data: string;
}

describe('CommandBus', () => {
	let commandBus: CommandBus;

	beforeEach(() => {
		commandBus = new CommandBus();
	});

	describe('register', () => {
		it('应该成功注册命令处理器', () => {
			const handler: ICommandHandler<ITestCommand> = {
				execute: jest.fn().mockResolvedValue(undefined)
			};

			expect(() => commandBus.register('TestCommand', handler)).not.toThrow();
		});

		it('应该在重复注册时抛出错误', () => {
			const handler: ICommandHandler<ITestCommand> = {
				execute: jest.fn().mockResolvedValue(undefined)
			};

			commandBus.register('TestCommand', handler);

			expect(() => commandBus.register('TestCommand', handler)).toThrow(
				'命令处理器重复注册：commandType=TestCommand。'
			);
		});
	});

	describe('execute', () => {
		it('应该在找不到处理器时抛出错误', async () => {
			const command: ITestCommand = {
				type: 'TestCommand',
				data: 'test'
			};

			await expect(commandBus.execute(command)).rejects.toThrow('未找到命令处理器：commandType=TestCommand。');
		});

		it('应该成功执行命令并返回结果', async () => {
			const expectedResult = { id: '123' };
			const handler: ICommandHandler<ITestCommand> = {
				execute: jest.fn().mockResolvedValue(expectedResult)
			};

			commandBus.register('TestCommand', handler);

			const command: ITestCommand = {
				type: 'TestCommand',
				data: 'test'
			};

			const result = await commandBus.execute(command);

			expect(result).toEqual(expectedResult);
			expect(handler.execute).toHaveBeenCalledWith(command);
		});
	});

	describe('registerPipes', () => {
		it('应该成功注册管道', () => {
			const mockPipe = {
				name: 'TestPipe',
				execute: jest.fn((ctx, next) => next())
			};

			expect(() => commandBus.registerPipes([mockPipe as any])).not.toThrow();
		});
	});
});

import { CommandHandler } from './command-handler.decorator';
import { OKSAI_COMMAND_HANDLER_METADATA } from './metadata.constants';

describe('CommandHandler', () => {
	it('应该在类上设置命令类型元数据', () => {
		@CommandHandler('CreateJob')
		class CreateJobHandler {
			async execute() {}
		}

		const metadata = Reflect.getMetadata(OKSAI_COMMAND_HANDLER_METADATA, CreateJobHandler);
		expect(metadata).toBe('CreateJob');
	});

	it('应该支持多个不同的命令类型', () => {
		@CommandHandler('CreateJob')
		class CreateJobHandler {
			async execute() {}
		}

		@CommandHandler('UpdateJob')
		class UpdateJobHandler {
			async execute() {}
		}

		const createMetadata = Reflect.getMetadata(OKSAI_COMMAND_HANDLER_METADATA, CreateJobHandler);
		const updateMetadata = Reflect.getMetadata(OKSAI_COMMAND_HANDLER_METADATA, UpdateJobHandler);

		expect(createMetadata).toBe('CreateJob');
		expect(updateMetadata).toBe('UpdateJob');
	});
});

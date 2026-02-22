import { QueryHandler } from './query-handler.decorator';
import { OKSAI_QUERY_HANDLER_METADATA } from './metadata.constants';

describe('QueryHandler', () => {
	it('应该在类上设置查询类型元数据', () => {
		@QueryHandler('GetJobById')
		class GetJobByIdHandler {
			async execute() {}
		}

		const metadata = Reflect.getMetadata(OKSAI_QUERY_HANDLER_METADATA, GetJobByIdHandler);
		expect(metadata).toBe('GetJobById');
	});

	it('应该支持多个不同的查询类型', () => {
		@QueryHandler('GetJobById')
		class GetJobByIdHandler {
			async execute() {}
		}

		@QueryHandler('ListJobs')
		class ListJobsHandler {
			async execute() {}
		}

		const getByIdMetadata = Reflect.getMetadata(OKSAI_QUERY_HANDLER_METADATA, GetJobByIdHandler);
		const listMetadata = Reflect.getMetadata(OKSAI_QUERY_HANDLER_METADATA, ListJobsHandler);

		expect(getByIdMetadata).toBe('GetJobById');
		expect(listMetadata).toBe('ListJobs');
	});
});

/**
 * AggregateRoot 基类单元测试
 *
 * 测试聚合根的领域事件管理能力
 */
import { AggregateRoot } from '../lib/aggregate-root';
import { UniqueEntityID } from '../lib/unique-entity-id';
import { DomainEvent } from '../lib/domain-event';

/**
 * 测试用领域事件
 */
interface TaskCreatedPayload {
	taskId: string;
	title: string;
}

class TaskCreatedEvent extends DomainEvent<TaskCreatedPayload> {
	constructor(payload: TaskCreatedPayload, aggregateId: UniqueEntityID) {
		super({
			eventName: 'TaskCreated',
			aggregateId,
			payload
		});
	}
}

interface TaskTitleChangedPayload {
	oldTitle: string;
	newTitle: string;
}

class TaskTitleChangedEvent extends DomainEvent<TaskTitleChangedPayload> {
	constructor(payload: TaskTitleChangedPayload, aggregateId: UniqueEntityID) {
		super({
			eventName: 'TaskTitleChanged',
			aggregateId,
			payload
		});
	}
}

/**
 * 测试用聚合根 - 任务
 */
interface TaskProps {
	title: string;
	description: string;
}

class Task extends AggregateRoot<TaskProps> {
	get title(): string {
		return this.props.title;
	}

	get description(): string {
		return this.props.description;
	}

	private constructor(props: TaskProps, id?: UniqueEntityID) {
		super(props, id);
	}

	static create(props: TaskProps, id?: UniqueEntityID): Task {
		const task = new Task(props, id);

		task.addDomainEvent(
			new TaskCreatedEvent(
				{
					taskId: task.id.toString(),
					title: props.title
				},
				task.id
			)
		);

		return task;
	}

	changeTitle(newTitle: string): void {
		const oldTitle = this.props.title;
		this.props.title = newTitle;

		this.addDomainEvent(
			new TaskTitleChangedEvent(
				{
					oldTitle,
					newTitle
				},
				this.id
			)
		);
	}
}

describe('AggregateRoot', () => {
	describe('继承 Entity', () => {
		it('应该有唯一标识符', () => {
			// Arrange & Act
			const task = Task.create({ title: '测试任务', description: '描述' });

			// Assert
			expect(task.id).toBeDefined();
		});

		it('应该能通过 ID 比较', () => {
			// Arrange
			const id = new UniqueEntityID('task-123');
			const task1 = Task.create({ title: '任务1', description: '描述' }, id);
			const task2 = Task.create({ title: '任务2', description: '描述' }, id);

			// Act & Assert
			expect(task1.equals(task2)).toBe(true);
		});
	});

	describe('领域事件管理', () => {
		it('应该能添加领域事件', () => {
			// Arrange & Act
			const task = Task.create({ title: '测试任务', description: '描述' });

			// Assert
			expect(task.domainEvents).toHaveLength(1);
		});

		it('应该能添加多个领域事件', () => {
			// Arrange
			const task = Task.create({ title: '原始标题', description: '描述' });

			// Act
			task.changeTitle('新标题');
			task.changeTitle('更新的标题');

			// Assert
			expect(task.domainEvents).toHaveLength(3); // 1 创建 + 2 标题变更
		});

		it('领域事件应该包含正确的聚合根 ID', () => {
			// Arrange
			const id = new UniqueEntityID('task-123');
			const task = Task.create({ title: '测试任务', description: '描述' }, id);

			// Act
			const events = task.domainEvents;

			// Assert
			expect(events[0].aggregateId.equals(id)).toBe(true);
		});

		it('应该能清除所有领域事件', () => {
			// Arrange
			const task = Task.create({ title: '测试任务', description: '描述' });
			task.changeTitle('新标题');

			// Act
			task.clearDomainEvents();

			// Assert
			expect(task.domainEvents).toHaveLength(0);
		});
	});

	describe('事件类型', () => {
		it('应该能识别不同类型的事件', () => {
			// Arrange
			const task = Task.create({ title: '测试任务', description: '描述' });

			// Act
			task.changeTitle('新标题');
			const events = task.domainEvents;

			// Assert
			expect(events[0].eventName).toBe('TaskCreated');
			expect(events[1].eventName).toBe('TaskTitleChanged');
		});

		it('事件 payload 应该包含正确的数据', () => {
			// Arrange
			const task = Task.create({ title: '测试任务', description: '描述' });

			// Act
			task.changeTitle('新标题');
			const events = task.domainEvents;

			// Assert
			const titleChangedEvent = events.find((e) => e.eventName === 'TaskTitleChanged');
			expect(titleChangedEvent?.payload.oldTitle).toBe('测试任务');
			expect(titleChangedEvent?.payload.newTitle).toBe('新标题');
		});
	});
});

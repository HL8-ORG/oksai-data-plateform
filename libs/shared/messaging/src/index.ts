/**
 * @oksai/messaging
 *
 * 消息队列模块，提供消息发送和接收功能。
 *
 * @packageDocumentation
 */

// 消息
export { Message, type IMessage } from './lib/message';

// 生产者
export { MessageProducer, type IMessageProducer } from './lib/message-producer';

// 消费者
export { MessageConsumer, type IMessageConsumer, type MessageHandler } from './lib/message-consumer';

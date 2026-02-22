# Novu Provider 插件系统研究报告

## 一、Provider 架构概览

### 1.1 目录结构

```
packages/providers/src/
├── base.provider.ts          # 抽象基类
├── index.ts                   # 主入口
├── lib/
│   ├── email/                 # Email 渠道 (20个 Provider)
│   │   ├── sendgrid/
│   │   ├── ses/
│   │   ├── mailgun/
│   │   └── ...
│   ├── sms/                   # SMS 渠道 (36个 Provider)
│   │   ├── twilio/
│   │   ├── sns/
│   │   └── ...
│   ├── push/                  # Push 渠道 (8个 Provider)
│   │   ├── fcm/
│   │   ├── apns/
│   │   └── ...
│   └── chat/                  # Chat 渠道 (11个 Provider)
│       ├── slack/
│       ├── discord/
│       └── ...
└── utils/
    └── types.ts              # Passthrough 类型
```

### 1.2 BaseProvider 基类设计

```typescript
export enum CasingEnum {
  CAMEL_CASE = 'camelCase',
  PASCAL_CASE = 'PascalCase',
  SNAKE_CASE = 'snake_case',
  KEBAB_CASE = 'kebab-case',
}

export abstract class BaseProvider {
  protected abstract casing: CasingEnum;
  protected keyCaseObject: Record<string, string> = {};

  protected transform<T_Output, T_Input, T_Data>(
    bridgeProviderData: WithPassthrough<T_Input>, 
    triggerProviderData: T_Data
  ): MergedPassthrough<T_Output>;
}
```

### 1.3 Provider 接口定义

```typescript
export interface IProvider {
  id: string;
  channelType: ChannelTypeEnum;
  verifySignature?: (params) => Promise<{...}>;
}

export interface IEmailProvider extends IProvider {
  channelType: ChannelTypeEnum.EMAIL;
  sendMessage(options: IEmailOptions, bridgeProviderData): Promise<ISendMessageSuccessResponse>;
  getMessageId?: (body: any) => string[];
  parseEventBody?: (body: any, identifier: string) => IEmailEventBody | undefined;
  checkIntegration?: (options: IEmailOptions) => Promise<ICheckIntegrationResponse>;
}
```

---

## 二、渠道类型与 Provider 列表

### 2.1 Email Providers（20个）

| Provider ID | 说明 |
|-------------|------|
| `sendgrid` | Twilio SendGrid |
| `ses` | AWS SES |
| `mailgun` | Mailgun |
| `mailjet` | Mailjet |
| `resend` | Resend |
| `postmark` | Postmark |
| `sendinblue` | Brevo |
| `mailersend` | MailerSend |
| `nodemailer` | Custom SMTP |
| `outlook365` | Microsoft Outlook |
| ... | 更多 |

### 2.2 SMS Providers（36个）

| Provider ID | 说明 |
|-------------|------|
| `twilio` | Twilio |
| `sns` | AWS SNS |
| `nexmo` | Vonage |
| `plivo` | Plivo |
| `telnyx` | Telnyx |
| `infobip-sms` | Infobip |
| `messagebird` | MessageBird |
| `azure-sms` | Azure SMS |
| ... | 更多 |

### 2.3 Push Providers（8个）

| Provider ID | 说明 |
|-------------|------|
| `fcm` | Firebase Cloud Messaging |
| `apns` | Apple Push Notification |
| `expo` | Expo Push |
| `one-signal` | OneSignal |
| `pusher-beams` | Pusher Beams |
| ... | 更多 |

### 2.4 Chat Providers（11个）

| Provider ID | 说明 |
|-------------|------|
| `slack` | Slack |
| `discord` | Discord |
| `msteams` | Microsoft Teams |
| `mattermost` | Mattermost |
| `whatsapp-business` | WhatsApp Business |
| ... | 更多 |

---

## 三、Provider 实现模式

### 3.1 标准 Provider 实现

```typescript
export class TwilioSmsProvider extends BaseProvider implements ISmsProvider {
  id = SmsProviderIdEnum.Twilio;
  channelType = ChannelTypeEnum.SMS;
  protected casing = CasingEnum.CAMEL_CASE;
  
  private twilioClient: Twilio;

  constructor(private config: {
    accountSid?: string;
    authToken?: string;
    from?: string;
  }) {
    super();
    this.twilioClient = new Twilio(config.accountSid, config.authToken);
  }

  async sendMessage(
    options: ISmsOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {}
  ): Promise<ISendMessageSuccessResponse> {
    const twilioResponse = await this.twilioClient.messages.create(
      this.transform(bridgeProviderData, {
        body: options.content,
        to: options.to,
        from: options.from || this.config.from,
      }).body
    );

    return {
      id: twilioResponse.sid,
      date: twilioResponse.dateCreated.toISOString(),
    };
  }
}
```

### 3.2 配置管理

```typescript
// SES Provider 配置
export interface SESConfig {
  from: string;
  region: string;
  senderName: string;
  accessKeyId: string;
  secretAccessKey: string;
  configurationSetName?: string;
}

// SendGrid Provider 配置
constructor(private config: {
  apiKey: string;
  from: string;
  senderName: string;
  ipPoolName?: string;
  webhookPublicKey?: string;
  region?: 'eu' | 'global';
})
```

---

## 四、Provider 工厂系统

### 4.1 工厂架构

```typescript
export class MailFactory implements IMailFactory {
  handlers: IMailHandler[] = [
    new SendgridHandler(),
    new MailgunHandler(),
    new SESHandler(),
    // ... 其他 Handler
  ];

  getHandler(integration, from?: string): IMailHandler {
    const handler = this.handlers.find(
      (handlerItem) => handlerItem.canHandle(integration.providerId, integration.channel)
    );
    
    if (!handler) throw new Error('Handler not found');
    handler.buildProvider({ ...integration.credentials, ...integration.configurations }, from);
    
    return handler;
  }
}
```

### 4.2 BaseHandler 实现

```typescript
export abstract class BaseHandler<T extends ChannelProvider> implements IHandler {
  protected provider: T;
  protected providerId: string;
  protected channelType: string;

  canHandle(providerId: string, channelType: ChannelTypeEnum): boolean {
    return providerId === this.providerId && channelType === this.channelType;
  }

  public getProvider(): T {
    return this.provider;
  }
}
```

---

## 五、扩展指南：添加新 Provider

### Step 1: 创建 Provider 文件

```typescript
// packages/providers/src/lib/email/my-provider/my-provider.provider.ts
export class MyProviderEmailProvider extends BaseProvider implements IEmailProvider {
  id = 'my-provider';
  channelType = ChannelTypeEnum.EMAIL;
  protected casing = CasingEnum.CAMEL_CASE;

  constructor(private config: { apiKey: string; from: string }) {
    super();
  }

  async sendMessage(options: IEmailOptions, bridgeProviderData = {}): Promise<ISendMessageSuccessResponse> {
    // 实现发送逻辑
  }
}
```

### Step 2: 注册到渠道索引

```typescript
// packages/providers/src/lib/email/index.ts
export * from './my-provider/my-provider.provider';
```

### Step 3: 添加 Provider ID 枚举

```typescript
// packages/shared/src/types/providers.ts
export enum EmailProviderIdEnum {
  MyProvider = 'my-provider',
}
```

### Step 4: 创建 Handler

```typescript
// libs/application-generic/src/factories/mail/handlers/my-provider.handler.ts
export class MyProviderHandler extends BaseEmailHandler {
  constructor() {
    super(EmailProviderIdEnum.MyProvider, ChannelTypeEnum.EMAIL);
  }

  buildProvider(credentials: ICredentials, from?: string) {
    this.provider = new MyProviderEmailProvider({
      apiKey: credentials.apiKey,
      from,
    });
  }
}
```

### Step 5: 注册 Handler 到工厂

```typescript
// libs/application-generic/src/factories/mail/mail.factory.ts
import { MyProviderHandler } from './handlers/my-provider.handler';

export class MailFactory implements IMailFactory {
  handlers: IMailHandler[] = [
    // ... 现有 Handler
    new MyProviderHandler(),
  ];
}
```

---

## 六、关键设计总结

| 特性 | 实现 |
|:---|:---|
| **模块化** | 每个 Provider 独立封装 |
| **统一接口** | 所有 Provider 实现相同接口 |
| **工厂模式** | 动态选择和构建 Provider |
| **代码生成器** | `nx g provider` 快速创建 |
| **类型安全** | 完整的 TypeScript 类型 |
| **Webhook 支持** | 签名验证和事件解析 |

---

*报告生成时间：2026-02-22*

export type Channel = "telegram" | "webpush" | "whatsapp";
export type ChannelStatus = "sent" | "failed" | "skipped" | "not_configured";

export type NotificationKind = "need_adam" | "message" | "journal" | "mood" | "test" | "reply" | "heart";

export type NotificationPayload = {
  kind: NotificationKind;
  title: string;
  body: string;
  /** App path, e.g. /admin/richieste */
  path: string;
  urgent?: boolean;
  requestId?: string;
  messageId?: string;
};

export type ChannelResult = { channel: Channel; status: ChannelStatus; detail?: string };

export interface NotificationProvider {
  channel: Channel;
  isConfigured(): boolean;
  send(payload: NotificationPayload, target: { userIds: string[] }): Promise<ChannelResult>;
}

export type UnixTimestampString = string;
export type ISODateString = string;

/**
 * Root `result.json` can be either a full account export (`TelegramFullExport`)
 * or a single chat export (`TelegramChat`).
 */
export type TelegramExport = TelegramFullExport | TelegramChat;

export interface TelegramFullExport {
  about?: string;
  personal_information?: PersonalInformation;
  profile_pictures?: UserProfilePhoto[];
  stories?: Story[];
  contacts?: SectionList<Contact>;
  frequent_contacts?: SectionList<FrequentContact>;
  sessions?: SectionList<Session>;
  web_sessions?: SectionList<WebSession>;
  other_data?: OtherData;
  chats?: SectionList<TelegramChat>;
  left_chats?: SectionList<TelegramChat>;
}

export interface SectionList<T> {
  about?: string;
  list: T[];
}

export interface PersonalInformation {
  user_id: number;
  phone_number: string;
  first_name: string;
  last_name: string;
  username?: string;
  bio?: string;
}

export interface UserProfilePhoto {
  date: ISODateString;
  date_unixtime: UnixTimestampString;
  photo: string;
}

export interface Story {
  date: ISODateString;
  date_unixtime: UnixTimestampString;
  expires: ISODateString;
  expires_unixtime: UnixTimestampString;
  pinned: boolean;
  media: string;
}

export interface Contact {
  first_name: string;
  last_name: string;
  phone_number: string;
  date?: ISODateString;
  date_unixtime?: UnixTimestampString;
}

export type FrequentContactCategory = "people" | "inline_bots" | "calls";

export type FrequentContactType =
  | "user"
  | "private_channel"
  | "private_group"
  | "private_supergroup"
  | "public_channel"
  | "public_supergroup";

export interface FrequentContact {
  id: number;
  category: FrequentContactCategory;
  type: FrequentContactType;
  name: string;
  rating: number;
}

export interface Session {
  last_active: ISODateString;
  last_active_unixtime: UnixTimestampString;
  last_ip: string;
  last_country: string;
  last_region: string;
  application_name: string;
  application_version: string;
  device_model: string;
  platform: string;
  system_version: string;
  created: ISODateString;
  created_unixtime: UnixTimestampString;
}

export interface WebSession {
  last_active: ISODateString;
  last_active_unixtime: UnixTimestampString;
  last_ip: string;
  last_region: string;
  bot_username: string;
  domain_name: string;
  browser: string;
  platform: string;
  created: ISODateString;
  created_unixtime: UnixTimestampString;
}

export interface OtherData {
  about_meta?: string;
  help?: string;
  changes_log?: ChangeEvent[];
  created_stickers?: StickerPack[];
  drafts?: CloudDraft[];
  drafts_about?: string;
  installed_stickers?: StickerPack[];
  ips?: Ip[];
  email_about?: string;
}

export interface StickerPack {
  url: string;
}

export interface CloudDraft {
  chat: string;
  chat_name: string;
  html: string;
}

export interface Ip {
  ip: string;
}

export type ChangeEventType =
  | "username_change"
  | "name_change"
  | "password_change"
  | "phone_change";

export interface ChangeEvent {
  app_id: number;
  country: string;
  event: ChangeEventType;
  ip: string;
  phone_country: string;
  session_age: string;
  timestamp: number;
  new_username?: string;
  old_username?: string;
  new_name?: string;
  old_name?: string;
  new_phone?: string;
  old_phone?: string;
  email?: string;
  new_email?: string;
  hint?: string;
}

export type ChatType =
  | "saved_messages"
  | "replies"
  | "personal_chat"
  | "bot_chat"
  | "private_group"
  | "private_supergroup"
  | "public_supergroup"
  | "private_channel"
  | "public_channel";

export interface TelegramChat {
  id: number;
  name?: string | null;
  type: ChatType;
  messages: TelegramMessage[];
}

export type MessageEntityType =
  | "unknown"
  | "mention"
  | "hashtag"
  | "bot_command"
  | "link"
  | "email"
  | "bold"
  | "italic"
  | "code"
  | "pre"
  | "plain"
  | "text_link"
  | "mention_name"
  | "phone"
  | "cashtag"
  | "underline"
  | "strikethrough"
  | "blockquote"
  | "bank_card"
  | "spoiler"
  | "custom_emoji";

export interface MessageEntity {
  type: MessageEntityType;
  text: string;
  href?: string;
  document_id?: string;
  language?: string;
  user_id?: number;
}

export type ServiceAction =
  | "create_group"
  | "edit_group_title"
  | "edit_group_photo"
  | "delete_group_photo"
  | "invite_members"
  | "remove_members"
  | "join_group_by_link"
  | "create_channel"
  | "migrate_to_supergroup"
  | "migrate_from_group"
  | "pin_message"
  | "clear_history"
  | "score_in_game"
  | "send_payment"
  | "phone_call"
  | "take_screenshot"
  | "attach_menu_bot_allowed"
  | "web_app_bot_allowed"
  | "allow_sending_messages"
  | "send_passport_values"
  | "joined_telegram"
  | "proximity_reached"
  | "requested_phone_number"
  | "group_call"
  | "invite_to_group_call"
  | "set_messages_ttl"
  | "group_call_scheduled"
  | "edit_chat_theme"
  | "join_group_by_request"
  | "send_webview_data"
  | "send_premium_gift"
  | "topic_created"
  | "topic_edit"
  | "suggest_profile_photo"
  | "requested_peer"
  | "gift_code_prize"
  | "giveaway_launch"
  | "set_chat_wallpaper"
  | "set_same_chat_wallpaper";

export type MediaType =
  | "sticker"
  | "video_message"
  | "voice_message"
  | "animation"
  | "video_file"
  | "audio_file";

export type NormalizedMediaKind = MediaType | "photo";

export type DiscardReason = "busy" | "disconnect" | "hangup" | "missed";

export type PassportValue =
  | "personal_details"
  | "passport"
  | "driver_license"
  | "identity_card"
  | "internal_passport"
  | "address_information"
  | "utility_bill"
  | "bank_statement"
  | "rental_agreement"
  | "passport_registration"
  | "temporary_registration"
  | "phone_number"
  | "email";

export interface Location {
  latitude: number;
  longitude: number;
}

export interface Invoice {
  title: string;
  description: string;
  amount: number;
  currency: string;
  receipt_message_id?: number;
}

export interface PollAnswer {
  text: string;
  voters: number;
  chosen: "true" | "false" | boolean;
}

export interface Poll {
  question: string;
  closed: "true" | "false" | boolean;
  total_voters: number;
  answers: PollAnswer[];
}

export interface Giveaway {
  quantity: number;
  months: number;
  until_date: ISODateString;
  channels: number[];
}

export type MessageText = string | (string | MessageEntity)[];

export interface BaseMessage {
  id: number;
  date: ISODateString;
  date_unixtime: UnixTimestampString;
  text: MessageText;
  text_entities?: MessageEntity[];
  edited?: ISODateString;
  edited_unixtime?: UnixTimestampString;
  reply_to_message_id?: number;
  photo?: string;
  width?: number | string;
  height?: number | string;
  file?: string;
  thumbnail?: string;
  duration_seconds?: number;
}

export interface TelegramRegularMessage extends BaseMessage {
  type: "message";
  from?: string | null;
  from_id?: string;
  author?: string;
  forwarded_from?: string | null;
  saved_from?: string | null;
  via_bot?: string;
  self_destruct_period_seconds?: number;
  media_type?: MediaType;
  title?: string;
  performer?: string;
  mime_type?: string;
  sticker_emoji?: string;
  contact_information?: Contact;
  contact_vcard?: string;
  location_information?: Location;
  live_location_period_seconds?: number;
  place_name?: string;
  address?: string;
  game_title?: string;
  game_description?: string;
  game_link?: string;
  invoice_information?: Invoice;
  poll?: Poll;
  giveaway_information?: Giveaway;
}

export interface TelegramServiceMessage extends BaseMessage {
  type: "service";
  action: ServiceAction;
  actor?: string | null;
  actor_id?: string;
  from?: string | null;
  from_id?: string;
  members?: (string | null)[];
  title?: string;
  inviter?: string;
  message_id?: number;
  game_message_id?: number;
  score?: number;
  amount?: number;
  currency?: string;
  invoice_message_id?: number;
  recurring?: "used" | "init";
  discard_reason?: DiscardReason;
  information_text?: string;
  reason_app_id?: number;
  reason_app_name?: string;
  reason_domain?: string;
  values?: PassportValue[];
  to_id?: number | string;
  to?: string;
  distance?: number;
  period?: number;
  schedule_date?: number;
  emoticon?: string;
  cost?: number;
  months?: number;
  new_title?: string;
  new_icon_emoji_id?: string;
  button_id?: number;
  peer_id?: number | string;
  gift_code?: string;
  boost_peer_id?: number | string;
  unclaimed?: boolean;
  via_giveaway?: boolean;
}

export type TelegramMessage = TelegramRegularMessage | TelegramServiceMessage;

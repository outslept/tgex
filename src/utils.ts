import type {
  NormalizedMediaKind,
  TelegramChat,
  TelegramExport,
  TelegramFullExport,
  TelegramMessage,
  TelegramRegularMessage,
  TelegramServiceMessage,
} from "./types.ts";

export interface ResolveOptions {
  /** Include `left_chats` when resolving from a full export (default: `true`) */
  includeLeftChats?: boolean | undefined;
}

export type ExportInput = TelegramExport | readonly TelegramChat[] | readonly TelegramMessage[];

export function isSingleChatExport(data: unknown): data is TelegramChat {
  return (
    typeof data === "object" && data !== null && Array.isArray((data as TelegramChat).messages)
  );
}

export function isFullExport(data: unknown): data is TelegramFullExport {
  return (
    typeof data === "object" &&
    data !== null &&
    !Array.isArray((data as TelegramChat).messages) &&
    ("chats" in data || "left_chats" in data || "personal_information" in data)
  );
}

export function isRegularMessage(message: TelegramMessage): message is TelegramRegularMessage {
  return message.type === "message";
}

export function isServiceMessage(message: TelegramMessage): message is TelegramServiceMessage {
  return message.type === "service";
}

export function resolveChats(exportData: TelegramExport, options?: ResolveOptions): TelegramChat[] {
  if (isSingleChatExport(exportData)) {
    return [exportData];
  }

  const includeLeft = options?.includeLeftChats ?? true;
  const chats = exportData.chats?.list;
  const leftChats = includeLeft ? exportData.left_chats?.list : undefined;

  if (chats !== undefined && chats.length > 0) {
    if (leftChats !== undefined && leftChats.length > 0) {
      return chats.concat(leftChats);
    }
    return chats;
  }
  if (leftChats !== undefined && leftChats.length > 0) {
    return leftChats;
  }
  return [];
}

function flattenChatMessages(chats: readonly TelegramChat[]): TelegramMessage[] {
  const chatCount = chats.length;
  if (chatCount === 0) return [];
  if (chatCount === 1) {
    const firstChat = chats[0];
    return firstChat !== undefined ? firstChat.messages : [];
  }

  const result: TelegramMessage[] = [];
  for (let i = 0; i < chatCount; i++) {
    const chat = chats[i];
    if (chat === undefined) continue;
    const msgs = chat.messages;
    for (let j = 0, len = msgs.length; j < len; j++) {
      const msg = msgs[j];
      if (msg !== undefined) {
        result.push(msg);
      }
    }
  }
  return result;
}

export function resolveMessages(input: ExportInput, options?: ResolveOptions): TelegramMessage[] {
  if (isSingleChatExport(input)) {
    return input.messages;
  }

  if (Array.isArray(input)) {
    const first = input[0];
    if (first === undefined) return [];
    if (!("messages" in first)) {
      return input as TelegramMessage[];
    }
    return flattenChatMessages(input as readonly TelegramChat[]);
  }

  const chats = resolveChats(input as TelegramExport, options);
  return flattenChatMessages(chats);
}

export function extractText(message: Pick<TelegramMessage, "text" | "text_entities">): string {
  const text = message.text;
  if (typeof text === "string") {
    return text;
  }
  if (Array.isArray(text)) {
    const len = text.length;
    if (len === 0) return "";
    if (len === 1) {
      const first = text[0];
      if (first === undefined) return "";
      return typeof first === "string" ? first : first.text;
    }
    let out = "";
    for (let i = 0; i < len; i++) {
      const part = text[i];
      if (part !== undefined) {
        out += typeof part === "string" ? part : part.text;
      }
    }
    return out;
  }
  const entities = message.text_entities;
  if (Array.isArray(entities)) {
    const len = entities.length;
    if (len === 0) return "";
    if (len === 1) {
      const first = entities[0];
      return first !== undefined ? first.text : "";
    }
    let out = "";
    for (let i = 0; i < len; i++) {
      const entity = entities[i];
      if (entity !== undefined) {
        out += entity.text;
      }
    }
    return out;
  }
  return "";
}

/**
 * Returns the normalized media kind (`"photo"` or `media_type`) for regular messages.
 */
export function getMediaKind(message: TelegramMessage): NormalizedMediaKind | undefined {
  if (message.type !== "message") return undefined;
  if (message.photo !== undefined) return "photo";
  return message.media_type;
}

const CHAR_SPACE = 32;
const CHAR_HASH = 35; // '#'
const CHAR_OPEN_PAREN = 40; // '('
const CHAR_MINUS = 45; // '-'
const CHAR_0 = 48; // '0'
const CHAR_9 = 57; // '9'
const CHAR_UPPER_F = 70; // 'F'
const CHAR_UNDERSCORE = 95; // '_'
const CHAR_LOWER_A = 97; // 'a'
const CHAR_LOWER_Z = 122; // 'z'

/**
 * Checks if a media path points to an exported file rather than Telegram's
 * `(File exceeds maximum size...)` or `(File not included...)` placeholder string.
 */
export function isMediaPathExported(path: string | undefined): path is string {
  if (!path || path.length === 0) return false;
  if (
    path.charCodeAt(0) === CHAR_OPEN_PAREN &&
    path.charCodeAt(1) === CHAR_UPPER_F &&
    path.startsWith("(File ")
  ) {
    return false;
  }
  return true;
}

export interface ParsedPeerId {
  type: string;
  id: string;
  raw: string;
}

export function parsePeerId(rawPeerId: string): ParsedPeerId {
  const len = rawPeerId.length;
  let start = 0;
  let end = len;

  while (start < end && rawPeerId.charCodeAt(start) <= CHAR_SPACE) start++;
  while (end > start && rawPeerId.charCodeAt(end - 1) <= CHAR_SPACE) end--;

  let i = start;
  while (i < end) {
    const c = rawPeerId.charCodeAt(i);
    const lower = c | 32;
    if ((lower >= CHAR_LOWER_A && lower <= CHAR_LOWER_Z) || c === CHAR_UNDERSCORE) {
      i++;
    } else {
      break;
    }
  }

  const typeEnd = i;
  if (typeEnd === start) {
    return { type: "unknown", id: rawPeerId, raw: rawPeerId };
  }

  while (i < end && rawPeerId.charCodeAt(i) === CHAR_SPACE) i++;
  if (i < end && rawPeerId.charCodeAt(i) === CHAR_HASH) i++;

  const idStart = i;
  if (i < end && rawPeerId.charCodeAt(i) === CHAR_MINUS) i++;

  if (i >= end) {
    return { type: "unknown", id: rawPeerId, raw: rawPeerId };
  }

  while (i < end) {
    const c = rawPeerId.charCodeAt(i);
    if (c < CHAR_0 || c > CHAR_9) {
      return { type: "unknown", id: rawPeerId, raw: rawPeerId };
    }
    i++;
  }

  return {
    type: rawPeerId.slice(start, typeEnd),
    id: rawPeerId.slice(idStart, end),
    raw: rawPeerId,
  };
}

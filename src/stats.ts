import type {
  TelegramChat,
  TelegramFullExport,
  TelegramMessage,
  TelegramRegularMessage,
} from "./types.ts";
import { type ExportInput, type ResolveOptions, isSingleChatExport } from "./utils.js";

export interface MediaCounts {
  photo: number;
  video_message: number;
  video_file: number;
  animation: number;
  voice_message: number;
  audio_file: number;
  sticker: number;
}

export function createMediaCounts(): MediaCounts {
  return {
    photo: 0,
    video_message: 0,
    video_file: 0,
    animation: 0,
    voice_message: 0,
    audio_file: 0,
    sticker: 0,
  };
}

export interface UserStats {
  id: string;
  name: string;
  messages: number;
  share: number;
  media: MediaCounts;
}

function createUserStats(id: string, name: string): UserStats {
  return {
    id,
    name,
    messages: 0,
    share: 0,
    media: createMediaCounts(),
  };
}

export interface ActivitySlot {
  /** 0 (Sunday) .. 6 (Saturday) */
  dayOfWeek: number;
  /** 0 .. 23 */
  hour: number;
  count: number;
}

export interface ExportStats {
  totalMessages: number;
  users: Map<string, UserStats>;
  mediaTotals: MediaCounts;
  /**
   * Contiguous 168-element array (7 days * 24 hours).
   * Index = `dayOfWeek * 24 + hour`.
   */
  activitySlots: Uint32Array;
  peakSlot: ActivitySlot | null;
}

export interface AnalyzeOptions extends ResolveOptions {
  filter?: ((message: TelegramRegularMessage) => boolean) | undefined;
}

interface AnalyzerState {
  totalMessages: number;
  users: Map<string, UserStats>;
  mediaTotals: MediaCounts;
  activitySlots: Uint32Array;
  sharedDate: Date;
  cachedQuarterHourBucket: number;
  cachedSlotIndex: number;
  filter: ((message: TelegramRegularMessage) => boolean) | undefined;
}

function incrementMedia(
  userMedia: MediaCounts,
  totalMedia: MediaCounts,
  m: TelegramRegularMessage,
): void {
  if (m.photo !== undefined) {
    userMedia.photo++;
    totalMedia.photo++;
    return;
  }
  const mediaType = m.media_type;
  if (mediaType === undefined) return;

  switch (mediaType) {
    case "sticker":
      userMedia.sticker++;
      totalMedia.sticker++;
      break;
    case "video_message":
      userMedia.video_message++;
      totalMedia.video_message++;
      break;
    case "video_file":
      userMedia.video_file++;
      totalMedia.video_file++;
      break;
    case "animation":
      userMedia.animation++;
      totalMedia.animation++;
      break;
    case "voice_message":
      userMedia.voice_message++;
      totalMedia.voice_message++;
      break;
    case "audio_file":
      userMedia.audio_file++;
      totalMedia.audio_file++;
      break;
  }
}

function processMessageBatch(messages: readonly TelegramMessage[], state: AnalyzerState): void {
  const { users, mediaTotals, activitySlots, sharedDate, filter } = state;

  let totalMessages = state.totalMessages;
  let cachedBucket = state.cachedQuarterHourBucket;
  let cachedSlotIdx = state.cachedSlotIndex;

  for (let i = 0, len = messages.length; i < len; i++) {
    const m = messages[i];
    if (m === undefined || m.type !== "message") continue;
    const fromId = m.from_id;
    if (!fromId) continue;
    if (filter !== undefined && !filter(m)) continue;

    totalMessages++;

    let user = users.get(fromId);
    if (user === undefined) {
      user = createUserStats(fromId, m.from || "");
      users.set(fromId, user);
    } else if (m.from) {
      user.name = m.from;
    }
    user.messages++;

    incrementMedia(user.media, mediaTotals, m);

    const unixSec = +m.date_unixtime;
    const bucket = (unixSec / 900) | 0;
    if (bucket !== cachedBucket) {
      cachedBucket = bucket;
      sharedDate.setTime(unixSec * 1000);
      cachedSlotIdx = sharedDate.getDay() * 24 + sharedDate.getHours();
    }
    activitySlots[cachedSlotIdx] = (activitySlots[cachedSlotIdx] ?? 0) + 1;
  }

  state.totalMessages = totalMessages;
  state.cachedQuarterHourBucket = cachedBucket;
  state.cachedSlotIndex = cachedSlotIdx;
}

/**
 * Analyzes messages from any Telegram export structure (Full Export, Single Chat,
 * Chat[], or Message[]) with zero per-message allocations in the hot path.
 */
export function analyzeExport(input: ExportInput, options?: AnalyzeOptions): ExportStats {
  const state: AnalyzerState = {
    totalMessages: 0,
    users: new Map<string, UserStats>(),
    mediaTotals: createMediaCounts(),
    activitySlots: new Uint32Array(168),
    sharedDate: new Date(0),
    cachedQuarterHourBucket: -1,
    cachedSlotIndex: 0,
    filter: options?.filter,
  };

  if (isSingleChatExport(input)) {
    processMessageBatch(input.messages, state);
  } else if (Array.isArray(input)) {
    const first = input[0];
    if (first !== undefined) {
      if ("messages" in first) {
        const chats = input as readonly TelegramChat[];
        for (let i = 0, len = chats.length; i < len; i++) {
          const chat = chats[i];
          if (chat !== undefined) {
            processMessageBatch(chat.messages, state);
          }
        }
      } else {
        processMessageBatch(input as readonly TelegramMessage[], state);
      }
    }
  } else {
    const full = input as TelegramFullExport;
    const chats = full.chats?.list;
    if (chats !== undefined) {
      for (let i = 0, len = chats.length; i < len; i++) {
        const chat = chats[i];
        if (chat !== undefined) {
          processMessageBatch(chat.messages, state);
        }
      }
    }
    if (options?.includeLeftChats ?? true) {
      const leftChats = full.left_chats?.list;
      if (leftChats !== undefined) {
        for (let i = 0, len = leftChats.length; i < len; i++) {
          const chat = leftChats[i];
          if (chat !== undefined) {
            processMessageBatch(chat.messages, state);
          }
        }
      }
    }
  }

  const total = state.totalMessages;
  if (total > 0) {
    for (const user of state.users.values()) {
      user.share = user.messages / total;
    }
  }

  const slots = state.activitySlots;
  let peakCount = 0;
  let peakIndex = -1;
  for (let i = 0; i < 168; i++) {
    const count = slots[i];
    if (count !== undefined && count > peakCount) {
      peakCount = count;
      peakIndex = i;
    }
  }

  const peakSlot: ActivitySlot | null =
    peakIndex !== -1
      ? {
          dayOfWeek: (peakIndex / 24) | 0,
          hour: peakIndex % 24,
          count: peakCount,
        }
      : null;

  return {
    totalMessages: total,
    users: state.users,
    mediaTotals: state.mediaTotals,
    activitySlots: slots,
    peakSlot,
  };
}

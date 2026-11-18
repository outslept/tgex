# tgex

Zero-dependency TypeScript utilities and analytics for Telegram Desktop JSON exports (`result.json`).

## Usage

```ts
import {
  type TelegramExport,
  analyzeExport,
  extractText,
  getMediaKind,
  isMediaPathExported,
  parsePeerId,
  resolveChats,
  resolveMessages,
} from "tgex";

const data: TelegramExport = JSON.parse(rawJson);

// Analytics (works with full export, single-chat export, Chat[], or Message[])
const stats = analyzeExport(data, {
  includeLeftChats: false,
  filter: (m) => !m.forwarded_from,
});

stats.totalMessages; // number
stats.mediaTotals.voice_message; // number
stats.peakSlot; // { dayOfWeek: 5, hour: 21, count: 1420 } | null
stats.activitySlots; // Uint32Array(168), index = dayOfWeek * 24 + hour

for (const user of stats.users.values()) {
  user.id; // "user123456"
  user.name; // "Alice"
  user.messages; // 4200
  user.share; // 0.642
  user.media.photo; // 128
}

// Normalization helpers
const chats = resolveChats(data, { includeLeftChats: true });
const messages = resolveMessages(data);

for (const m of messages) {
  const text = extractText(m); // flattens string | (string | MessageEntity)[]
  const kind = getMediaKind(m); // "photo" | "sticker" | "voice_message" | ...
  const hasFile = isMediaPathExported(m.file); // false on "(File not included...)"

  if (m.from_id) {
    const peer = parsePeerId(m.from_id); // { type: "user", id: "123456", raw: "user123456" }
  }
}
```

## API

```ts
// Analytics
function analyzeExport(input: ExportInput, options?: AnalyzeOptions): ExportStats;
function createMediaCounts(): MediaCounts;

type ExportInput = TelegramExport | readonly TelegramChat[] | readonly TelegramMessage[];

interface AnalyzeOptions extends ResolveOptions {
  filter?: (message: TelegramRegularMessage) => boolean;
}

interface ExportStats {
  totalMessages: number;
  users: Map<string, UserStats>;
  mediaTotals: MediaCounts;
  /** 7 days * 24 hours. Index = dayOfWeek * 24 + hour */
  activitySlots: Uint32Array;
  peakSlot: ActivitySlot | null;
}

interface UserStats {
  id: string;
  name: string;
  messages: number;
  share: number;
  media: MediaCounts;
}

interface MediaCounts {
  photo: number;
  video_message: number;
  video_file: number;
  animation: number;
  voice_message: number;
  audio_file: number;
  sticker: number;
}

interface ActivitySlot {
  dayOfWeek: number; // 0 (Sunday) .. 6 (Saturday)
  hour: number; // 0 .. 23
  count: number;
}

// Utilities
function resolveChats(exportData: TelegramExport, options?: ResolveOptions): TelegramChat[];
function resolveMessages(input: ExportInput, options?: ResolveOptions): TelegramMessage[];
function extractText(message: Pick<TelegramMessage, "text" | "text_entities">): string;
function getMediaKind(message: TelegramMessage): NormalizedMediaKind | undefined;
function isMediaPathExported(path: string | undefined): path is string;
function parsePeerId(rawPeerId: string): ParsedPeerId;

// Type Guards
function isSingleChatExport(data: unknown): data is TelegramChat;
function isFullExport(data: unknown): data is TelegramFullExport;
function isRegularMessage(message: TelegramMessage): message is TelegramRegularMessage;
function isServiceMessage(message: TelegramMessage): message is TelegramServiceMessage;
```

## License

MIT

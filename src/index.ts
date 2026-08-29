import { readFileSync } from "node:fs";
import { styleText } from "node:util";

interface Message {
  // "message" = real chat message, "service" = join/pin/call events.
  // Service entries carry from_id too, so this check is what keeps them out of
  // the stats - and out of totalMessages, which every percentage divides by.
  type: string;
  from_id?: string; // sender key "<type><id>", e.g. "user123456" - same person in every chat
  from?: string; // display name; absent on messages from deleted accounts
  photo?: string; // set on photo messages - photos are NOT one of media_type's values
  media_type?: string; // sticker | video_message | voice_message | animation | video_file | audio_file
  date_unixtime: string;
}

interface Chat {
  messages: Message[];
}

// result.json comes in two shapes: a single-chat export is a bare Chat, a full
// export nests chats under chats.list and left_chats.list. Dispatched in main().
interface Export {
  messages?: Message[];
  chats?: { list?: Chat[] };
  left_chats?: { list?: Chat[] };
}

interface UserStats {
  name: string;
  messages: number;
  media: Record<string, number>;
}

// { Friday: { 21: 140 } } - weekday → hour → message count.
type TimeStats = Record<string, Record<number, number>>;

// Output rows; keys are media_type values, except "photo" (see Message.photo).
const MEDIA = [
  ["Photos", "photo"],
  ["Video msgs", "video_message"],
  ["Video files", "video_file"],
  ["Animations", "animation"],
  ["Voice", "voice_message"],
  ["Audio", "audio_file"],
  ["Stickers", "sticker"],
] as const;

const pct = (n: number, d: number) => ((n / d) * 100).toFixed(1) + "%";
const bold = (s: string) => styleText("bold", s);

// the messages row is a share of the whole chat,
// media rows a share of that user's messages. One number, one meaning.
const row = (label: string, n: number, share: string) =>
  console.log(`  ${label.padEnd(11)}${String(n).padStart(6)}  ${share}`);

function analyze(messages: Message[]) {
  const userStats: Record<string, UserStats> = {};
  const timeStats: TimeStats = {};

  messages.forEach((message) => {
    if (message.type !== "message" || !message.from_id) return;
    const u = (userStats[message.from_id] ??= { name: "", messages: 0, media: {} });
    u.messages++;
    if (message.from) u.name = message.from;

    // photos are signalled by the photo field, all other
    // media by media_type.
    const kind = message.photo ? "photo" : message.media_type;
    if (kind) u.media[kind] = (u.media[kind] ?? 0) + 1;

    const date = new Date(parseInt(message.date_unixtime) * 1000);
    const day = date.toLocaleString("en-US", { weekday: "long" });
    const hour = date.getHours();
    const hours = (timeStats[day] ??= {});
    hours[hour] = (hours[hour] ?? 0) + 1;
  });

  return { userStats, timeStats };
}

function findPeakTime(timeStats: TimeStats) {
  const [maxMessages, peakDay, peakHour] =
    Object.entries(timeStats)
      .flatMap(([day, hours]) =>
        Object.entries(hours).map(([hour, count]): [number, string, number] => [count, day, +hour]),
      )
      .sort((a, b) => b[0] - a[0])[0] ?? ([0, "", -1] as [number, string, number]);
  return { peakDay, peakHour, maxMessages };
}

function main() {
  const data: Export = JSON.parse(readFileSync("result.json", "utf-8"));
  // single-chat export: messages sit on the root. full export: gather from
  // chats.list and left_chats.list - from_id is stable, so a user's messages
  // across chats aggregate into one row.
  const messages =
    data.messages ??
    [data.chats, data.left_chats].flatMap((cs) => cs?.list ?? []).flatMap((c) => c.messages);
  const { userStats, timeStats } = analyze(messages);
  const totalMessages = Object.values(userStats).reduce((n, u) => n + u.messages, 0);
  const { peakDay, peakHour, maxMessages } = findPeakTime(timeStats);

  console.log(bold(`Total ${totalMessages}`));

  for (const [user, stats] of Object.entries(userStats)) {
    console.log(`\n${bold(stats.name || user)}`);
    row("messages", stats.messages, pct(stats.messages, totalMessages));
    for (const [label, kind] of MEDIA) {
      const n = stats.media[kind] ?? 0;
      if (n) row(label, n, pct(n, stats.messages)); // zero rows stay off screen
    }
  }

  if (maxMessages) {
    console.log(
      `\n${bold("Peak")} ${peakDay} ${String(peakHour).padStart(2, "0")}:00–${String(peakHour + 1).padStart(2, "0")}  ${maxMessages}`,
    );
  }
}

main();

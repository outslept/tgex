import { readFileSync } from "node:fs";
import { styleText } from "node:util";

interface Message {
  type: "message" | "service";
  from_id?: string;
  from?: string | null; // null on deleted accounts
  photo?: string; // photos use this field, not media_type
  media_type?: string;
  date_unixtime: string;
}

interface Export {
  messages?: Message[];
  chats?: { list?: { messages: Message[] }[] };
  left_chats?: { list?: { messages: Message[] }[] };
}

const MEDIA = [
  ["Photos", "photo"],
  ["Video msgs", "video_message"],
  ["Video files", "video_file"],
  ["Animations", "animation"],
  ["Voice", "voice_message"],
  ["Audio", "audio_file"],
  ["Stickers", "sticker"],
] as const;

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const pct = (n: number, d: number) => `${((n / d) * 100).toFixed(1)}%`;
const pad2 = (n: number) => String(n).padStart(2, "0");
const bold = (s: string) => styleText("bold", s);
const row = (label: string, n: number, share: string) =>
  console.log(`  ${label.padEnd(11)}${String(n).padStart(6)}  ${share}`);

const data: Export = JSON.parse(readFileSync("result.json", "utf-8"));
// Single-chat export has root messages[]; full export nests them under chats/left_chats.
const messages =
  data.messages ??
  [data.chats, data.left_chats].flatMap((c) => c?.list ?? []).flatMap((c) => c.messages);

const users: Record<string, { name: string; messages: number; media: Record<string, number> }> = {};
const slots: Record<string, number> = {};
let total = 0;
let peakSlot = "";
let peakCount = 0;

for (const m of messages) {
  // Service actions (e.g. edit_group_photo) also carry from_id and photo.
  if (m.type !== "message" || !m.from_id) continue;
  total++;

  const u = (users[m.from_id] ??= { name: "", messages: 0, media: {} });
  u.messages++;
  if (m.from) u.name = m.from;

  const kind = m.photo ? "photo" : m.media_type;
  if (kind) u.media[kind] = (u.media[kind] ?? 0) + 1;

  const d = new Date(+m.date_unixtime * 1000);
  const h = d.getHours();
  const slot = `${DAYS[d.getDay()]} ${pad2(h)}:00–${pad2(h + 1)}:00`;
  if ((slots[slot] = (slots[slot] ?? 0) + 1) > peakCount) {
    peakCount = slots[slot];
    peakSlot = slot;
  }
}

console.log(bold(`Total ${total}`));

for (const [id, u] of Object.entries(users)) {
  console.log(`\n${bold(u.name || id)}`);
  row("messages", u.messages, pct(u.messages, total));
  for (const [label, kind] of MEDIA) {
    if (u.media[kind]) row(label, u.media[kind], pct(u.media[kind], u.messages));
  }
}

if (peakCount) console.log(`\n${bold("Peak")} ${peakSlot}  ${peakCount}`);

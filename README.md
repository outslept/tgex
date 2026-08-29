## chatlyzer

A lightweight tool for analyzing chat data from Telegram JSON exports.

## Introduction

**Chatlyzer** reads a Telegram `result.json` export and prints per-user
statistics:

- **Message counts** by user, with each user's share of the chat.
- **Media usage** — photos, video messages, video files, animations, voice
  messages, audio files, stickers.
- **Peak activity** — the busiest day and hour.

Zero dependencies; needs Node ≥ 20.12.

## Usage

1. Export from Telegram Desktop:
   - a single chat: open it → ⋮ → **Export chat history** → **Machine-readable JSON**
   - your whole account: **Settings → Advanced → Export Telegram Data**
2. Put `result.json` next to the script.
3. Run it:

```sh
npx tsx src/index.ts
```

Output:

```
Total 1234

Alice
  messages      500  40.5%
  photos        100  20.0%
  video msgs     10  2.0%

Bob
  messages      734  59.5%
  stickers      211  28.7%

Peak Friday 21:00–22:00  140
```

## Notes

- Full exports aggregate all chats, left ones included; single-chat exports work unchanged.
- Service messages (joins, pins, calls) are excluded from all counts.
- Timestamps are interpreted in your local timezone — peak hours depend on the machine you run it on.
- Public group and channel exports contain only your own messages (Telegram limitation).

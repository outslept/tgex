import { expect, test } from "vitest";
import {
  type MessageText,
  type TelegramChat,
  type TelegramFullExport,
  type TelegramMessage,
  type TelegramRegularMessage,
  type TelegramServiceMessage,
  analyzeExport,
  createMediaCounts,
  extractText,
  getMediaKind,
  isFullExport,
  isMediaPathExported,
  isRegularMessage,
  isServiceMessage,
  isSingleChatExport,
  parsePeerId,
  resolveChats,
  resolveMessages,
} from "../src/index.js";

function makeRegularMessage(
  overrides: Partial<TelegramRegularMessage> = {},
): TelegramRegularMessage {
  return {
    id: 1,
    type: "message",
    date: "2026-01-01T00:00:00",
    date_unixtime: "1700000000",
    from: "Alice",
    from_id: "user1",
    text: "hello",
    ...overrides,
  };
}

const serviceMessage: TelegramServiceMessage = {
  id: 2,
  type: "service",
  date: "2026-01-01T00:00:00",
  date_unixtime: "1700000010",
  action: "pin_message",
  text: "",
};

const primaryChat: TelegramChat = {
  id: 10,
  name: "General",
  type: "private_supergroup",
  messages: [makeRegularMessage({ id: 1, text: "first" }), serviceMessage],
};

const leftChat: TelegramChat = {
  id: 20,
  name: "Old Group",
  type: "private_group",
  messages: [makeRegularMessage({ id: 3, from: "Bob", from_id: "user2", text: "left msg" })],
};

const fullExport: TelegramFullExport = {
  chats: { list: [primaryChat] },
  left_chats: { list: [leftChat] },
};

test("type guards distinguish export and message variants", () => {
  expect(isSingleChatExport(primaryChat)).toBe(true);
  expect(isSingleChatExport(fullExport)).toBe(false);
  expect(isSingleChatExport(null)).toBe(false);
  expect(isSingleChatExport("invalid")).toBe(false);

  expect(isFullExport(fullExport)).toBe(true);
  expect(isFullExport({ left_chats: { list: [] } })).toBe(true);
  expect(isFullExport({ personal_information: { user_id: 1 } })).toBe(true);
  expect(isFullExport(primaryChat)).toBe(false);
  expect(isFullExport({})).toBe(false);
  expect(isFullExport(null)).toBe(false);

  const regular = makeRegularMessage();
  expect(isRegularMessage(regular)).toBe(true);
  expect(isRegularMessage(serviceMessage)).toBe(false);
  expect(isServiceMessage(serviceMessage)).toBe(true);
  expect(isServiceMessage(regular)).toBe(false);
});

test("resolveChats and resolveMessages handle all export shapes", () => {
  expect(resolveChats(primaryChat)).toEqual([primaryChat]);
  expect(resolveChats(fullExport)).toEqual([primaryChat, leftChat]);
  expect(resolveChats(fullExport, { includeLeftChats: false })).toEqual([primaryChat]);
  expect(resolveChats({ chats: { list: [primaryChat] } })).toEqual([primaryChat]);
  expect(resolveChats({ left_chats: { list: [leftChat] } })).toEqual([leftChat]);
  expect(resolveChats({})).toEqual([]);

  expect(resolveMessages(primaryChat)).toEqual(primaryChat.messages);
  expect(resolveMessages([])).toEqual([]);
  expect(resolveMessages(primaryChat.messages)).toEqual(primaryChat.messages);
  expect(resolveMessages([primaryChat])).toEqual(primaryChat.messages);
  expect(resolveMessages([primaryChat, leftChat])).toEqual([
    ...primaryChat.messages,
    ...leftChat.messages,
  ]);
  expect(resolveMessages(fullExport)).toEqual([...primaryChat.messages, ...leftChat.messages]);
  expect(resolveMessages(fullExport, { includeLeftChats: false })).toEqual(primaryChat.messages);
  expect(resolveMessages({})).toEqual([]);
});

test("extractText flattens strings, mixed arrays, and fallback text_entities", () => {
  expect(extractText({ text: "plain text" })).toBe("plain text");
  expect(extractText({ text: [] })).toBe("");
  expect(extractText({ text: ["single"] })).toBe("single");
  expect(extractText({ text: [{ type: "bold", text: "bold-only" }] })).toBe("bold-only");
  expect(
    extractText({
      text: ["Hello ", { type: "bold", text: "world" }, "!"],
    }),
  ).toBe("Hello world!");

  const emptyText = undefined as unknown as MessageText;
  expect(extractText({ text: emptyText })).toBe("");
  expect(extractText({ text: emptyText, text_entities: [] })).toBe("");
  expect(
    extractText({
      text: emptyText,
      text_entities: [{ type: "plain", text: "one" }],
    }),
  ).toBe("one");
  expect(
    extractText({
      text: emptyText,
      text_entities: [
        { type: "plain", text: "foo " },
        { type: "code", text: "bar" },
      ],
    }),
  ).toBe("foo bar");
});

test("getMediaKind and isMediaPathExported classify media accurately", () => {
  expect(getMediaKind(serviceMessage)).toBeUndefined();
  expect(getMediaKind(makeRegularMessage())).toBeUndefined();
  expect(getMediaKind(makeRegularMessage({ photo: "photos/1.jpg" }))).toBe("photo");
  expect(getMediaKind(makeRegularMessage({ media_type: "sticker" }))).toBe("sticker");

  expect(isMediaPathExported(undefined)).toBe(false);
  expect(isMediaPathExported("")).toBe(false);
  expect(
    isMediaPathExported("(File not included. Change data exporting settings to download.)"),
  ).toBe(false);
  expect(
    isMediaPathExported("(File exceeds maximum size. Change data exporting settings to download.)"),
  ).toBe(false);
  expect(isMediaPathExported("(Folder)/photo.jpg")).toBe(true);
  expect(isMediaPathExported("photos/photo_1@01-01-2026.jpg")).toBe(true);
});

test("parsePeerId parses valid peer identifiers and falls back to unknown", () => {
  expect(parsePeerId("user12345")).toEqual({
    type: "user",
    id: "12345",
    raw: "user12345",
  });
  expect(parsePeerId("  channel #98765  ")).toEqual({
    type: "channel",
    id: "98765",
    raw: "  channel #98765  ",
  });
  expect(parsePeerId("Private_Chat -42")).toEqual({
    type: "Private_Chat",
    id: "-42",
    raw: "Private_Chat -42",
  });

  for (const invalid of ["", "12345", "user", "user #", "user -", "user12a3"]) {
    expect(parsePeerId(invalid)).toEqual({
      type: "unknown",
      id: invalid,
      raw: invalid,
    });
  }
});

test("analyzeExport aggregates users, media counts, activity slots, and filters", () => {
  const peakUnix = 1_700_000_000;
  const sameBucketUnix = peakUnix + 120;
  const otherBucketUnix = peakUnix + 3600;

  const messages: TelegramMessage[] = [
    serviceMessage,
    makeRegularMessage({ id: 10, from_id: "" }),
    makeRegularMessage({
      id: 11,
      from: null,
      from_id: "user1",
      date_unixtime: String(peakUnix),
      photo: "photos/pic.jpg",
    }),
    makeRegularMessage({
      id: 12,
      from: "Alice",
      from_id: "user1",
      date_unixtime: String(sameBucketUnix),
      media_type: "sticker",
    }),
    makeRegularMessage({
      id: 13,
      from: "Alice",
      from_id: "user1",
      date_unixtime: String(sameBucketUnix),
      media_type: "video_message",
    }),
    makeRegularMessage({
      id: 14,
      from: "Bob",
      from_id: "user2",
      date_unixtime: String(otherBucketUnix),
      media_type: "video_file",
    }),
    makeRegularMessage({
      id: 15,
      from: "Bob",
      from_id: "user2",
      date_unixtime: String(otherBucketUnix),
      media_type: "animation",
    }),
    makeRegularMessage({
      id: 16,
      from: "Bob",
      from_id: "user2",
      date_unixtime: String(otherBucketUnix),
      media_type: "voice_message",
    }),
    makeRegularMessage({
      id: 17,
      from: "Bob",
      from_id: "user2",
      date_unixtime: String(otherBucketUnix),
      media_type: "audio_file",
    }),
    makeRegularMessage({
      id: 18,
      from: "Bob",
      from_id: "user2",
      date_unixtime: String(peakUnix),
    }),
  ];

  const stats = analyzeExport(messages);
  expect(stats.totalMessages).toBe(8);
  expect(stats.mediaTotals).toEqual({
    photo: 1,
    sticker: 1,
    video_message: 1,
    video_file: 1,
    animation: 1,
    voice_message: 1,
    audio_file: 1,
  });

  const alice = stats.users.get("user1");
  const bob = stats.users.get("user2");
  expect(alice).toEqual({
    id: "user1",
    name: "Alice",
    messages: 3,
    share: 3 / 8,
    media: {
      ...createMediaCounts(),
      photo: 1,
      sticker: 1,
      video_message: 1,
    },
  });
  expect(bob?.messages).toBe(5);
  expect(bob?.share).toBe(5 / 8);

  const expectedDate = new Date(peakUnix * 1000);
  expect(stats.peakSlot).toEqual({
    dayOfWeek: expectedDate.getDay(),
    hour: expectedDate.getHours(),
    count: 4,
  });

  const filtered = analyzeExport(messages, {
    filter: (m) => m.from_id === "user1",
  });
  expect(filtered.totalMessages).toBe(3);
  expect(filtered.users.size).toBe(1);
});

test("analyzeExport supports single chat, chat arrays, full exports, and empty inputs", () => {
  expect(analyzeExport(primaryChat).totalMessages).toBe(1);
  expect(analyzeExport([primaryChat, leftChat]).totalMessages).toBe(2);
  expect(analyzeExport(fullExport).totalMessages).toBe(2);
  expect(analyzeExport(fullExport, { includeLeftChats: false }).totalMessages).toBe(1);

  const empty = analyzeExport([]);
  expect(empty.totalMessages).toBe(0);
  expect(empty.peakSlot).toBeNull();
  expect(empty.users.size).toBe(0);
});

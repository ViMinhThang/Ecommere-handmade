import { ChatMessage } from "@/types";

export function formatMessageTime(value: Date | string) {
  return new Date(value).toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function getTextPayload(message: ChatMessage): string {
  const text = message.payload["text"];
  return typeof text === "string" ? text : "";
}

export function getImagePayload(message: ChatMessage) {
  const imagePath = message.payload["imagePath"];
  const caption = message.payload["caption"];
  return {
    imagePath: typeof imagePath === "string" ? imagePath : "",
    caption: typeof caption === "string" ? caption : "",
  };
}

export function mergeUniqueMessages(messages: ChatMessage[]) {
  const map = new Map<string, ChatMessage>();
  for (const message of messages) {
    map.set(message.id, message);
  }
  return Array.from(map.values()).sort(
    (first, second) =>
      new Date(first.createdAt).getTime() - new Date(second.createdAt).getTime(),
  );
}

export function appendMessageToMap(
  current: Record<string, ChatMessage[]>,
  conversationId: string,
  message: ChatMessage,
) {
  return {
    ...current,
    [conversationId]: mergeUniqueMessages([
      ...(current[conversationId] ?? []),
      message,
    ]),
  };
}

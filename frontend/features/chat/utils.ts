import { ChatMessage, QuoteSnapshot } from "@/types";

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function getCustomOrderOfferPayload(message: ChatMessage): {
  text: string;
  customOrderId: string;
  quoteSnapshot: QuoteSnapshot;
} | null {
  if (message.type !== "CUSTOM_ORDER_OFFER") {
    return null;
  }

  const customOrderId = message.payload["customOrderId"];
  const quoteSnapshot = message.payload["quoteSnapshot"];

  if (typeof customOrderId !== "string" || !isRecord(quoteSnapshot)) {
    return null;
  }

  return {
    text: getTextPayload(message),
    customOrderId,
    quoteSnapshot: quoteSnapshot as QuoteSnapshot,
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

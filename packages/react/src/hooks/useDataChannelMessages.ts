import { useEffect, useMemo, useState, useCallback } from "react";
import type { Peer } from "@conference-kit/core";
import { useDataChannel } from "./useDataChannel";

const makeId = () => {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  const rand = Math.random().toString(36).slice(2, 10);
  const time = Date.now().toString(36);
  return `${time}-${rand}`;
};

type Options = {
  limit?: number;
};

type MessageEntry = {
  id: string;
  direction: "in" | "out";
  payload: unknown;
};

export function useDataChannelMessages(peer: Peer | null, options?: Options) {
  const limit = options?.limit ?? 50;
  const channel = useDataChannel(peer);
  const [messages, setMessages] = useState<MessageEntry[]>([]);

  useEffect(() => {
    if (channel.lastMessage === null || channel.lastMessage === undefined)
      return;
    setMessages((prev) => {
      const next = [
        {
          id: makeId(),
          direction: "in" as const,
          payload: channel.lastMessage,
        },
        ...prev,
      ];
      return next.slice(0, limit);
    });
  }, [channel.lastMessage, limit]);

  const sendMessage = useCallback(
    (payload: string | ArrayBufferView | ArrayBuffer | Blob) => {
      channel.send(payload);
      setMessages((prev) => {
        const next = [
          { id: makeId(), direction: "out" as const, payload },
          ...prev,
        ];
        return next.slice(0, limit);
      });
    },
    [channel, limit]
  );

  const state = useMemo(
    () => ({
      ready: channel.ready,
      error: channel.error,
      messages,
      sendMessage,
    }),
    [channel.error, channel.ready, messages, sendMessage]
  );

  return state;
}

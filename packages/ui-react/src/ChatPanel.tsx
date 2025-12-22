import type { ChangeEvent, FC, FormEvent } from "react";
import { useState } from "react";
import { ChatIcon } from "./icons";

export type ChatMessage = {
  id: string;
  direction: "in" | "out";
  text: string;
};

export type ChatPanelProps = {
  messages: ChatMessage[];
  ready: boolean;
  onSend: (text: string) => void;
};

export const ChatPanel: FC<ChatPanelProps> = ({
  messages,
  ready,
  onSend,
}: ChatPanelProps) => {
  const [text, setText] = useState("ping");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    onSend(text.trim());
    setText("");
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 grid gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-slate-100 font-semibold">
          <ChatIcon className="h-5 w-5" /> Data Channel
        </div>
        <span
          className={`text-xs px-2 py-1 rounded-full ${
            ready
              ? "bg-emerald-100 text-emerald-800"
              : "bg-slate-200 text-slate-700"
          }`}
        >
          {ready ? "Open" : "Closed"}
        </span>
      </div>
      <form className="flex gap-2" onSubmit={submit}>
        <input
          className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
          value={text}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            setText(e.target.value)
          }
          placeholder="Message"
        />
        <button
          type="submit"
          disabled={!ready}
          className="px-3 py-2 rounded-lg bg-emerald-600 text-slate-50 font-semibold disabled:opacity-50"
        >
          Send
        </button>
      </form>
      <div className="max-h-64 overflow-auto grid gap-2">
        {messages.length === 0 && (
          <div className="text-slate-400 text-sm">No messages yet</div>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-center justify-between rounded-lg px-3 py-2 border ${
              msg.direction === "in"
                ? "bg-slate-800 border-slate-700"
                : "bg-emerald-50 border-emerald-200"
            }`}
          >
            <span className="text-sm text-slate-100">{msg.text}</span>
            <span className="text-xs text-slate-500">
              {msg.direction === "in" ? "In" : "Out"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

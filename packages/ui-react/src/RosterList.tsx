import type { FC } from "react";
import type { RosterEntry } from "./types";

export const RosterList: FC<{ roster: RosterEntry[]; selfId?: string }> = ({
  roster,
  selfId,
}) => {
  return (
    <div className="grid gap-2">
      {roster.length === 0 && (
        <div className="text-slate-400 text-sm">No peers joined yet</div>
      )}
      {roster.map((entry) => {
        const tone =
          entry.id === selfId
            ? "bg-emerald-100 text-emerald-900"
            : "bg-slate-800 text-slate-200";
        return (
          <div
            key={entry.id}
            className={`flex items-center justify-between rounded-lg border border-slate-800 px-3 py-2 ${tone}`}
          >
            <span className="font-semibold truncate">
              {entry.label ?? entry.id}
            </span>
            <span className="text-xs opacity-80">
              {entry.id === selfId ? "You" : entry.status ?? "Peer"}
            </span>
          </div>
        );
      })}
    </div>
  );
};

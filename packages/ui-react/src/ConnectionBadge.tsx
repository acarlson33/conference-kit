import type { FC } from "react";
import { SignalIcon, WifiOffIcon } from "./icons";
import type { ConnectionStatus } from "./types";

export const ConnectionBadge: FC<{ status: ConnectionStatus }> = ({
  status,
}) => {
  const signalTone =
    status.signaling === "open"
      ? "bg-emerald-100 text-emerald-800"
      : "bg-amber-100 text-amber-800";
  const mediaTone =
    status.media === "ready"
      ? "bg-emerald-100 text-emerald-800"
      : status.media === "requesting"
      ? "bg-amber-100 text-amber-800"
      : "bg-slate-200 text-slate-700";
  const dataTone =
    status.data === "ready"
      ? "bg-emerald-100 text-emerald-800"
      : "bg-slate-200 text-slate-700";

  return (
    <div className="flex flex-wrap gap-2 text-sm">
      <span
        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 ${signalTone}`}
      >
        <SignalIcon className="h-4 w-4" />
        Signal {status.signaling ?? "idle"}
      </span>
      <span
        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 ${mediaTone}`}
      >
        <WifiOffIcon className="h-4 w-4" />
        Media {status.media ?? "off"}
      </span>
      <span
        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 ${dataTone}`}
      >
        <SignalIcon className="h-4 w-4" />
        Data {status.data ?? "idle"}
      </span>
    </div>
  );
};

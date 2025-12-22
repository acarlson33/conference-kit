import type { FC } from "react";
import type { ParticipantView } from "./types";

export const ParticipantTile: FC<{ participant: ParticipantView }> = ({
  participant,
}) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 grid gap-2">
      <div className="flex items-center justify-between gap-2 text-sm text-slate-200">
        <div className="font-semibold truncate">
          {participant.label ?? participant.id}
        </div>
        <span className="text-xs text-slate-400">
          {participant.connectionState ?? "new"}
        </span>
      </div>
      <video
        className="w-full aspect-video rounded-lg bg-slate-950"
        muted={participant.isLocal}
        autoPlay
        playsInline
        ref={(el) => {
          if (!el) return;
          if (participant.stream && el.srcObject !== participant.stream) {
            el.srcObject = participant.stream;
          }
          if (!participant.stream && el.srcObject) {
            el.srcObject = null;
          }
        }}
      />
      <div className="flex items-center gap-3 text-xs text-slate-400">
        <span
          className={
            participant.mutedAudio ? "text-amber-400" : "text-emerald-300"
          }
        >
          {participant.mutedAudio ? "Audio muted" : "Audio on"}
        </span>
        <span
          className={
            participant.mutedVideo ? "text-amber-400" : "text-emerald-300"
          }
        >
          {participant.mutedVideo ? "Video muted" : "Video on"}
        </span>
      </div>
    </div>
  );
};

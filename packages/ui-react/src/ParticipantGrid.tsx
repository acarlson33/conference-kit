import type { FC } from "react";
import type { ParticipantView } from "./types";
import { ParticipantTile } from "./ParticipantTile";

export const ParticipantGrid: FC<{ participants: ParticipantView[] }> = ({
  participants,
}) => {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {participants.map((p) => (
        <ParticipantTile key={p.id} participant={p} />
      ))}
      {participants.length === 0 && (
        <div className="text-slate-400 text-sm">Waiting for participants…</div>
      )}
    </div>
  );
};

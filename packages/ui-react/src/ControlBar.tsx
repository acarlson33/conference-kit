import type { FC, ReactNode } from "react";
import { ChatIcon, MicIcon, PhoneIcon, ScreenIcon, VideoIcon } from "./icons";

export type ControlBarProps = {
  joined?: boolean;
  mediaReady?: boolean;
  audioMuted?: boolean;
  videoMuted?: boolean;
  screenSharing?: boolean;
  onJoin?: () => void;
  onLeave?: () => void;
  onToggleAudio?: () => void;
  onToggleVideo?: () => void;
  onToggleScreen?: () => void;
  onReset?: () => void;
  extraRight?: ReactNode;
};

const buttonBase =
  "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold border transition";

export const ControlBar: FC<ControlBarProps> = ({
  joined,
  mediaReady,
  audioMuted,
  videoMuted,
  screenSharing,
  onJoin,
  onLeave,
  onToggleAudio,
  onToggleVideo,
  onToggleScreen,
  onReset,
  extraRight,
}: ControlBarProps) => {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 border border-slate-800 rounded-xl px-4 py-3">
      <div className="flex flex-wrap gap-2">
        <button
          className={`${buttonBase} border-emerald-500 text-emerald-100 bg-emerald-600/80 hover:bg-emerald-600`}
          disabled={joined}
          onClick={onJoin}
        >
          <VideoIcon className="h-4 w-4" /> Join
        </button>
        <button
          className={`${buttonBase} border-slate-700 text-slate-100 bg-slate-800 hover:bg-slate-700`}
          disabled={!joined}
          onClick={onLeave}
        >
          <PhoneIcon className="h-4 w-4" /> Leave
        </button>
        <button
          className={`${buttonBase} border-slate-700 text-slate-100 bg-slate-800 hover:bg-slate-700`}
          disabled={!joined || !mediaReady}
          onClick={onToggleAudio}
        >
          <MicIcon className="h-4 w-4" /> {audioMuted ? "Unmute" : "Mute"}
        </button>
        <button
          className={`${buttonBase} border-slate-700 text-slate-100 bg-slate-800 hover:bg-slate-700`}
          disabled={!joined || !mediaReady}
          onClick={onToggleVideo}
        >
          <VideoIcon className="h-4 w-4" />{" "}
          {videoMuted ? "Start video" : "Stop video"}
        </button>
        <button
          className={`${buttonBase} border-slate-700 text-slate-100 bg-slate-800 hover:bg-slate-700`}
          disabled={!joined}
          onClick={onToggleScreen}
        >
          <ScreenIcon className="h-4 w-4" />{" "}
          {screenSharing ? "Stop share" : "Share screen"}
        </button>
        <button
          className={`${buttonBase} border-slate-700 text-slate-300 hover:bg-slate-800`}
          onClick={onReset}
        >
          <ChatIcon className="h-4 w-4" /> Reset
        </button>
      </div>
      {extraRight ? (
        <div className="flex items-center gap-2">{extraRight}</div>
      ) : null}
    </div>
  );
};

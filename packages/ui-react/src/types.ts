export type ParticipantView = {
  id: string;
  label?: string;
  stream?: MediaStream | null;
  connectionState?: RTCPeerConnectionState;
  iceState?: RTCIceConnectionState;
  mutedAudio?: boolean;
  mutedVideo?: boolean;
  isLocal?: boolean;
};

export type RosterEntry = {
  id: string;
  label?: string;
  status?: "self" | "peer" | "connecting";
};

export type ControlHandlers = {
  onJoin?: () => void;
  onLeave?: () => void;
  onMuteAudio?: (mute: boolean) => void;
  onMuteVideo?: (mute: boolean) => void;
  onScreenShare?: (enable: boolean) => void;
  onReset?: () => void;
};

export type ConnectionStatus = {
  signaling?: "idle" | "connecting" | "open" | "closed";
  media?: "off" | "requesting" | "ready";
  data?: "idle" | "ready";
};

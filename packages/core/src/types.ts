export type PeerSide = "initiator" | "responder";

export type SignalData = RTCSessionDescriptionInit | RTCIceCandidateInit;

export interface PeerConfig {
  side: PeerSide;
  stream?: MediaStream;
  config?: RTCConfiguration;
  channelLabel?: string;
  trickle?: boolean;
  enableDataChannel?: boolean;
}

export interface PeerEvents {
  signal: SignalData;
  connect: void;
  close: void;
  error: Error;
  stream: MediaStream;
  data: ArrayBuffer | string;
  track: MediaStreamTrack;
  iceStateChange: RTCIceConnectionState;
  connectionStateChange: RTCPeerConnectionState;
}

type EventKey = keyof PeerEvents;

export type PeerEventHandler<K extends EventKey> = (
  payload: PeerEvents[K]
) => void;

export interface TypedEventEmitter {
  on<K extends EventKey>(event: K, handler: PeerEventHandler<K>): void;
  off<K extends EventKey>(event: K, handler: PeerEventHandler<K>): void;
  once<K extends EventKey>(event: K, handler: PeerEventHandler<K>): void;
}

export interface PeerControls extends TypedEventEmitter {
  addStream(stream: MediaStream): void;
  removeStream(stream: MediaStream): void;
  addTrack(track: MediaStreamTrack, stream: MediaStream): void;
  removeTrack(sender: RTCRtpSender): void;
  replaceTrack(
    oldTrack: MediaStreamTrack,
    newTrack: MediaStreamTrack,
    stream: MediaStream
  ): void;
  signal(data: SignalData): Promise<void>;
  send(data: string | ArrayBufferView | ArrayBuffer | Blob): void;
  destroy(): void;
  getConnectionState(): RTCPeerConnectionState;
}

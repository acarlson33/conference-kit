declare module "@webrtc-kit/core" {
  export type PeerSide = "initiator" | "responder";
  export type SignalData = RTCSessionDescriptionInit | RTCIceCandidateInit;

  export interface PeerEventHandler {
    (payload: any): void;
  }

  export interface Peer {
    on(event: string, handler: PeerEventHandler): void;
    off(event: string, handler: PeerEventHandler): void;
    destroy(): void;
    addStream(stream: MediaStream): void;
    removeStream(stream: MediaStream): void;
    signal(data: SignalData): Promise<void>;
  }

  export const Peer: {
    new (config: {
      side: PeerSide;
      stream?: MediaStream;
      config?: RTCConfiguration;
      channelLabel?: string;
      trickle?: boolean;
      enableDataChannel?: boolean;
    }): Peer;
  };
}

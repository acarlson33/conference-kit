import { ref, onMounted, onUnmounted, computed, watch } from "vue";
import { Peer, type PeerSide, type SignalData } from "@conference-kit/core";
import { SignalingClient } from "./signaling";

export type MeshParticipant = {
  id: string;
  peer: Peer;
  remoteStream: MediaStream | null;
  connectionState: RTCPeerConnectionState;
  iceState: RTCIceConnectionState;
};

export type UseMeshRoomOptions = {
  peerId: string;
  room: string;
  signalingUrl: string;
  mediaConstraints?: MediaStreamConstraints;
  rtcConfig?: RTCConfiguration;
  trickle?: boolean;
  autoReconnect?: boolean;
  features?: { enableDataChannel?: boolean };
};

export function useMeshRoom(options: UseMeshRoomOptions) {
  const {
    peerId,
    room,
    signalingUrl,
    mediaConstraints,
    rtcConfig,
    trickle,
    autoReconnect,
  } = options;

  const localStream = ref<MediaStream | null>(null);
  const requesting = ref(false);
  const mediaError = ref<Error | null>(null);
  const previousStream = ref<MediaStream | null>(null);

  const roster = ref<string[]>([]);
  const participants = ref<MeshParticipant[]>([]);
  const error = ref<Error | null>(null);

  const signaling = new SignalingClient({
    url: signalingUrl,
    peerId,
    room,
    autoReconnect,
  });

  const enableDataChannel = options.features?.enableDataChannel ?? true;

  const peers = new Map<string, Peer>();

  const sideForPeer = (otherId: string): PeerSide =>
    peerId > otherId ? "initiator" : "responder";

  const requestStream = async () => {
    try {
      requesting.value = true;
      const constraints = mediaConstraints ?? { audio: true, video: true };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStream.value = stream;
      mediaError.value = null;
    } catch (err) {
      mediaError.value = err as Error;
      localStream.value = null;
    } finally {
      requesting.value = false;
    }
  };

  const stopStream = () => {
    localStream.value?.getTracks().forEach((t) => t.stop());
    localStream.value = null;
  };

  const destroyPeer = (id: string) => {
    const peer = peers.get(id);
    if (peer) {
      peer.destroy();
      peers.delete(id);
    }
    participants.value = participants.value.filter((p) => p.id !== id);
  };

  const upsertParticipant = (id: string, patch: Partial<MeshParticipant>) => {
    const existing = participants.value.find((p) => p.id === id);
    if (!existing) {
      participants.value = [
        ...participants.value,
        {
          id,
          peer: patch.peer as MeshParticipant["peer"],
          remoteStream: patch.remoteStream ?? null,
          connectionState: patch.connectionState ?? "new",
          iceState: patch.iceState ?? "new",
        },
      ];
      return;
    }
    participants.value = participants.value.map((p) =>
      p.id === id ? { ...p, ...patch } : p
    );
  };

  const ensurePeer = (id: string, side?: PeerSide) => {
    if (id === peerId) return null;
    const existing = peers.get(id);
    if (existing) return existing;
    const peer = new Peer({
      side: side ?? sideForPeer(id),
      stream: localStream.value ?? undefined,
      config: rtcConfig,
      trickle,
      enableDataChannel,
    });
    peers.set(id, peer);
    upsertParticipant(id, {
      peer,
      remoteStream: null,
      connectionState: "new",
      iceState: "new",
    });

    const handlers = {
      signal: (data: SignalData) => signaling.sendSignal(id, data),
      stream: (remote: MediaStream) =>
        upsertParticipant(id, { remoteStream: remote }),
      error: (err: Error) => (error.value = err),
      connectionStateChange: (state: RTCPeerConnectionState) =>
        upsertParticipant(id, { connectionState: state }),
      iceStateChange: (state: RTCIceConnectionState) =>
        upsertParticipant(id, { iceState: state }),
      close: () => destroyPeer(id),
    };

    peer.on("signal", handlers.signal);
    peer.on("stream", handlers.stream);
    peer.on("error", handlers.error);
    peer.on("connectionStateChange", handlers.connectionStateChange);
    peer.on("iceStateChange", handlers.iceStateChange);
    peer.on("close", handlers.close);

    return peer;
  };

  const handlePresence = (payload: {
    peers: string[];
    peerId: string;
    room?: string | null;
    action: "join" | "leave";
  }) => {
    roster.value = payload.peers;
    payload.peers.filter((id) => id !== peerId).forEach((id) => ensurePeer(id));
    participants.value = participants.value.filter((p) =>
      payload.peers.includes(p.id)
    );
    Array.from(peers.keys()).forEach((id) => {
      if (!payload.peers.includes(id)) destroyPeer(id);
    });
  };

  const handleSignal = ({ from, data }: { from: string; data: unknown }) => {
    const peer = ensurePeer(from, sideForPeer(from));
    void peer?.signal(data as SignalData);
  };

  onMounted(() => {
    signaling.on("presence", handlePresence as any);
    signaling.on("signal", handleSignal as any);
    signaling.connect();
  });

  onUnmounted(() => {
    signaling.off("presence", handlePresence as any);
    signaling.off("signal", handleSignal as any);
    Array.from(peers.values()).forEach((p) => p.destroy());
    peers.clear();
    stopStream();
    signaling.close();
  });

  const leave = () => {
    Array.from(peers.values()).forEach((p) => p.destroy());
    peers.clear();
    participants.value = [];
    roster.value = [];
    stopStream();
    signaling.close();
  };

  const ready = computed(() => Boolean(localStream.value));

  watch(
    () => localStream.value,
    (next, prev) => {
      if (prev === next) return;
      Array.from(peers.values()).forEach((peer) => {
        if (prev) peer.removeStream(prev);
        if (next) peer.addStream(next);
      });
      previousStream.value = next ?? null;
    }
  );

  return {
    localStream,
    requesting,
    ready,
    mediaError,
    participants,
    roster,
    requestStream,
    stopStream,
    leave,
    error,
  } as const;
}

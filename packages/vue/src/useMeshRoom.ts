import { ref, onMounted, onUnmounted, computed, watch } from "vue";
import { Peer, type PeerSide, type SignalData } from "@conference-kit/core";
import { SignalingClient } from "./signaling";
import { mergeFeatures, type FeatureConfig } from "./features";

export type MeshParticipant = {
  id: string;
  peer: Peer;
  remoteStream: MediaStream | null;
  connectionState: RTCPeerConnectionState;
  iceState: RTCIceConnectionState;
};

export type UseMeshRoomOptions = {
  peerId: string;
  displayName?: string;
  room: string;
  signalingUrl: string;
  isHost?: boolean;
  mediaConstraints?: MediaStreamConstraints;
  rtcConfig?: RTCConfiguration;
  trickle?: boolean;
  autoReconnect?: boolean;
  features?: FeatureConfig;
};

export function useMeshRoom(options: UseMeshRoomOptions) {
  const {
    peerId,
    displayName: initialDisplayName,
    room,
    signalingUrl,
    isHost,
    mediaConstraints,
    rtcConfig,
    trickle,
    autoReconnect,
  } = options;

  const features = mergeFeatures(options.features ?? {});

  const localStream = ref<MediaStream | null>(null);
  const requesting = ref(false);
  const mediaError = ref<Error | null>(null);
  const previousStream = ref<MediaStream | null>(null);

  const roster = ref<string[]>([]);
  const participants = ref<MeshParticipant[]>([]);
  const error = ref<Error | null>(null);
  const waitingList = ref<string[]>([]);
  const peerDisplayNames = ref<Record<string, string>>({});
  const inWaitingRoom = ref(features.enableWaitingRoom && !isHost);
  const activeSpeakerId = ref<string | null>(null);
  const raisedHands = ref<Set<string>>(new Set());
  const signalingStatus = ref<"idle" | "connecting" | "open" | "closed">(
    "idle"
  );

  const signaling = new SignalingClient({
    url: signalingUrl,
    peerId,
    displayName: initialDisplayName,
    room,
    isHost,
    enableWaitingRoom: features.enableWaitingRoom,
    autoReconnect,
  });

  const peers = new Map<string, Peer>();

  // Active speaker detection state
  const analyzers = new Map<
    string,
    {
      ctx: AudioContext;
      analyser: AnalyserNode;
      source: MediaStreamAudioSourceNode;
    }
  >();
  let activeCandidate: string | null = null;
  let activeSince = 0;
  let silenceSince = 0;
  let speakerInterval: ReturnType<typeof setInterval> | null = null;

  const sideForPeer = (otherId: string): PeerSide =>
    peerId > otherId ? "initiator" : "responder";

  const requestStream = async () => {
    const wantsAudio = Boolean(mediaConstraints?.audio);
    const wantsVideo = Boolean(mediaConstraints?.video);

    if (!wantsAudio && !wantsVideo) {
      localStream.value = null;
      requesting.value = false;
      mediaError.value = null;
      return null;
    }

    if (typeof window !== "undefined") {
      const host = window.location.hostname;
      const isLocal =
        host === "localhost" || host === "127.0.0.1" || host === "::1";
      const isSecure = window.isSecureContext;
      if (!isSecure && !isLocal) {
        mediaError.value = new Error(
          "Media devices require a secure origin (https) or localhost."
        );
        return null;
      }
    }

    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      mediaError.value = new Error(
        "Media devices are not available in this environment"
      );
      return null;
    }

    try {
      requesting.value = true;
      mediaError.value = null;
      const constraints = mediaConstraints ?? { audio: true, video: true };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStream.value = stream;
      return stream;
    } catch (err) {
      mediaError.value = err as Error;
      localStream.value = null;
      return null;
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
    const changed = Object.keys(patch).some(
      (key) =>
        patch[key as keyof MeshParticipant] !==
        existing[key as keyof MeshParticipant]
    );
    if (!changed) return;
    participants.value = participants.value.map((p) =>
      p.id === id ? { ...p, ...patch } : p
    );
  };

  const ensurePeer = (id: string, side?: PeerSide) => {
    if (id === peerId) return null;
    if (features.enableWaitingRoom && inWaitingRoom.value) return null;
    const existing = peers.get(id);
    if (existing) return existing;
    const peer = new Peer({
      side: side ?? sideForPeer(id),
      stream: localStream.value ?? undefined,
      config: rtcConfig,
      trickle,
      enableDataChannel: features.enableDataChannel,
    } as any);
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
    displayName?: string;
    peerDisplayNames?: Record<string, string>;
    room?: string | null;
    action: "join" | "leave";
  }) => {
    if (payload.peerDisplayNames) {
      peerDisplayNames.value = payload.peerDisplayNames;
    }
    const ids = payload.peers;
    if (
      roster.value.length !== ids.length ||
      !roster.value.every((id, i) => id === ids[i])
    ) {
      roster.value = ids;
    }
    ids.filter((id) => id !== peerId).forEach((id) => ensurePeer(id));
    const filtered = participants.value.filter((p) => ids.includes(p.id));
    if (filtered.length !== participants.value.length) {
      participants.value = filtered;
    }
    Array.from(peers.keys()).forEach((id) => {
      if (!ids.includes(id)) destroyPeer(id);
    });
  };

  const handleControl = ({
    action,
    data,
  }: {
    action: string;
    data?: unknown;
  }) => {
    if (action === "waiting-list") {
      const waiting = ((data as any)?.waiting as string[]) ?? [];
      if (
        waitingList.value.length !== waiting.length ||
        !waitingList.value.every((id, i) => id === waiting[i])
      ) {
        waitingList.value = waiting;
      }
      return;
    }
    if (action === "waiting") {
      inWaitingRoom.value = true;
      return;
    }
    if (action === "admitted") {
      inWaitingRoom.value = false;
      return;
    }
    if (action === "rejected") {
      inWaitingRoom.value = false;
      error.value = new Error("Rejected by host");
      return;
    }
    if (action === "raise-hand") {
      const peer = ((data as any)?.peerId as string) ?? null;
      if (!peer) return;
      if (!raisedHands.value.has(peer)) {
        const next = new Set(raisedHands.value);
        next.add(peer);
        raisedHands.value = next;
      }
      return;
    }
    if (action === "hand-lowered") {
      const peer = ((data as any)?.peerId as string) ?? null;
      if (!peer) return;
      if (raisedHands.value.has(peer)) {
        const next = new Set(raisedHands.value);
        next.delete(peer);
        raisedHands.value = next;
      }
      return;
    }
    if (action === "display-name-changed") {
      const names =
        ((data as any)?.peerDisplayNames as Record<string, string>) ?? null;
      if (names) {
        peerDisplayNames.value = names;
      }
      return;
    }
    if (action === "host-blocked") {
      error.value = new Error("A host is already present in this room.");
      signalingStatus.value = "closed";
      return;
    }
  };

  const handleSignal = ({ from, data }: { from: string; data: unknown }) => {
    const peer = ensurePeer(from, sideForPeer(from));
    void peer?.signal(data as SignalData);
  };

  const handleOpen = () => {
    signalingStatus.value = "open";
  };

  const handleClose = () => {
    signalingStatus.value = "closed";
  };

  const handleError = (err: Error) => {
    if (error.value?.message !== err.message) {
      error.value = err;
    }
  };

  // Active speaker detection
  const ensureAnalyzer = (id: string, stream: MediaStream) => {
    if (analyzers.has(id)) return;
    const ctx = new AudioContext();
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    analyzers.set(id, { ctx, analyser, source });
  };

  const cleanupAnalyzers = () => {
    analyzers.forEach((entry) => {
      entry.source.disconnect();
      entry.analyser.disconnect();
      entry.ctx.close();
    });
    analyzers.clear();
    activeCandidate = null;
    activeSince = 0;
    silenceSince = 0;
  };

  const startActiveSpeakerDetection = () => {
    if (!features.enableActiveSpeaker || speakerInterval) return;

    const minHoldMs = 700;
    const minLevel = 18;
    const silenceHoldMs = 1200;

    speakerInterval = setInterval(() => {
      let loudestId: string | null = null;
      let loudest = 0;
      analyzers.forEach((entry, id) => {
        const data = new Uint8Array(entry.analyser.frequencyBinCount);
        entry.analyser.getByteFrequencyData(data);
        const avg = data.reduce((acc, v) => acc + v, 0) / data.length;
        if (avg > loudest) {
          loudest = avg;
          loudestId = avg > minLevel ? id : null;
        }
      });

      const now = performance.now();
      if (loudestId !== activeCandidate) {
        activeCandidate = loudestId;
        activeSince = now;
      }

      const heldLongEnough = now - activeSince >= minHoldMs;
      if (heldLongEnough && activeSpeakerId.value !== activeCandidate) {
        activeSpeakerId.value = activeCandidate;
      }

      if (!loudestId) {
        if (!silenceSince) silenceSince = now;
        const silentLongEnough = now - silenceSince >= silenceHoldMs;
        if (silentLongEnough && activeSpeakerId.value !== null) {
          activeSpeakerId.value = null;
        }
      } else {
        silenceSince = 0;
      }
    }, 400);
  };

  const stopActiveSpeakerDetection = () => {
    if (speakerInterval) {
      clearInterval(speakerInterval);
      speakerInterval = null;
    }
    cleanupAnalyzers();
    activeSpeakerId.value = null;
  };

  // Watch participants for active speaker detection
  watch(
    () => participants.value,
    (currentParticipants) => {
      if (!features.enableActiveSpeaker || signalingStatus.value !== "open")
        return;

      currentParticipants.forEach((p) => {
        if (p.remoteStream) ensureAnalyzer(p.id, p.remoteStream);
      });

      analyzers.forEach((_value, id) => {
        const stillPresent = currentParticipants.find(
          (p) => p.id === id && p.remoteStream
        );
        if (!stillPresent) {
          const entry = analyzers.get(id);
          entry?.source.disconnect();
          entry?.analyser.disconnect();
          entry?.ctx.close();
          analyzers.delete(id);
        }
      });
    }
  );

  // Watch signaling status for active speaker detection
  watch(
    () => signalingStatus.value,
    (status) => {
      if (features.enableActiveSpeaker && status === "open") {
        startActiveSpeakerDetection();
      } else {
        stopActiveSpeakerDetection();
      }
    }
  );

  onMounted(() => {
    signalingStatus.value = "connecting";
    signaling.on("presence", handlePresence as any);
    signaling.on("signal", handleSignal as any);
    signaling.on("control", handleControl as any);
    signaling.on("open", handleOpen as any);
    signaling.on("close", handleClose as any);
    signaling.on("error", handleError as any);
    signaling.connect();
  });

  onUnmounted(() => {
    signaling.off("presence", handlePresence as any);
    signaling.off("signal", handleSignal as any);
    signaling.off("control", handleControl as any);
    signaling.off("open", handleOpen as any);
    signaling.off("close", handleClose as any);
    signaling.off("error", handleError as any);
    Array.from(peers.values()).forEach((p) => p.destroy());
    peers.clear();
    stopActiveSpeakerDetection();
    stopStream();
    signaling.close();
  });

  const leave = () => {
    Array.from(peers.values()).forEach((p) => p.destroy());
    peers.clear();
    participants.value = [];
    roster.value = [];
    waitingList.value = [];
    inWaitingRoom.value = false;
    raisedHands.value = new Set();
    stopActiveSpeakerDetection();
    stopStream();
    signaling.close();
  };

  const admitPeer = (id: string) => {
    if (!features.enableWaitingRoom || !isHost) return;
    signaling.sendControl("admit", { peerId: id });
  };

  const rejectPeer = (id: string) => {
    if (!features.enableWaitingRoom || !isHost) return;
    signaling.sendControl("reject", { peerId: id });
  };

  const raiseHand = () => {
    if (!features.enableHostControls) return;
    signaling.sendControl("raise-hand", { peerId });
  };

  const lowerHand = (targetPeerId?: string) => {
    if (!features.enableHostControls) return;
    const peerTarget = targetPeerId ?? peerId;
    signaling.sendControl("hand-lowered", { peerId: peerTarget });
  };

  const setDisplayName = (displayName: string) => {
    signaling.setDisplayName(displayName);
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
    waitingList,
    inWaitingRoom,
    activeSpeakerId,
    raisedHands,
    peerDisplayNames,
    signalingStatus,
    admitPeer,
    rejectPeer,
    raiseHand,
    lowerHand,
    setDisplayName,
    requestStream,
    stopStream,
    leave,
    error,
  } as const;
}

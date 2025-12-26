import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Peer, type PeerSide, type SignalData } from "@conference-kit/core";
import { mergeFeatures, type FeatureConfig } from "../config/features";
import { useMediaStream } from "./useMediaStream";
import { SignalingClient } from "../signaling/SignalingClient";

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
    room,
    signalingUrl,
    isHost,
    mediaConstraints,
    rtcConfig,
    trickle,
    autoReconnect,
  } = options;

  const features = useMemo(
    () => mergeFeatures(options.features),
    [options.features]
  );

  const {
    stream: localStream,
    ready,
    requesting,
    error: mediaError,
    requestStream,
    stopStream,
  } = useMediaStream({ constraints: mediaConstraints });

  const signaling = useMemo(
    () =>
      new SignalingClient({
        url: signalingUrl,
        peerId,
        room,
        isHost,
        enableWaitingRoom: features.enableWaitingRoom,
        autoReconnect,
      }),
    [
      autoReconnect,
      features.enableWaitingRoom,
      isHost,
      peerId,
      room,
      signalingUrl,
    ]
  );

  const peers = useRef<Map<string, Peer>>(new Map());
  const previousStream = useRef<MediaStream | null>(null);
  const [roster, setRoster] = useState<string[]>([]);
  const [participants, setParticipants] = useState<MeshParticipant[]>([]);
  const [error, setError] = useState<Error | null>(null);
  const [waitingList, setWaitingList] = useState<string[]>([]);
  const [inWaitingRoom, setInWaitingRoom] = useState(
    features.enableWaitingRoom && !isHost
  );
  const [activeSpeakerId, setActiveSpeakerId] = useState<string | null>(null);
  const [raisedHands, setRaisedHands] = useState<Set<string>>(new Set());
  const [signalingStatus, setSignalingStatus] = useState<
    "idle" | "connecting" | "open" | "closed"
  >("idle");

  const sideForPeer = useCallback(
    (otherId: string): PeerSide => {
      return peerId > otherId ? "initiator" : "responder";
    },
    [peerId]
  );

  const destroyPeer = useCallback((id: string) => {
    const peer = peers.current.get(id);
    if (peer) {
      peer.destroy();
      peers.current.delete(id);
    }
    setParticipants((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const upsertParticipant = useCallback(
    (id: string, patch: Partial<MeshParticipant>) => {
      setParticipants((prev) => {
        const existing = prev.find((p) => p.id === id);
        if (!existing) {
          return [
            ...prev,
            {
              id,
              peer: patch.peer as MeshParticipant["peer"],
              remoteStream: patch.remoteStream ?? null,
              connectionState: patch.connectionState ?? "new",
              iceState: patch.iceState ?? "new",
            },
          ];
        }
        // Check if anything actually changed to avoid unnecessary re-renders
        const changed = Object.keys(patch).some(
          (key) =>
            patch[key as keyof MeshParticipant] !==
            existing[key as keyof MeshParticipant]
        );
        if (!changed) return prev;
        return prev.map((p) => (p.id === id ? { ...p, ...patch } : p));
      });
    },
    []
  );

  const inWaitingRoomRef = useRef(inWaitingRoom);
  inWaitingRoomRef.current = inWaitingRoom;

  const ensurePeer = useCallback(
    (id: string, side?: PeerSide) => {
      if (id === peerId) return null;
      if (features.enableWaitingRoom && inWaitingRoomRef.current) return null;
      const existing = peers.current.get(id);
      if (existing) return existing;
      // enableDataChannel is supported in the runtime PeerConfig but may lag in published typings; cast to satisfy TS.
      const peerConfig: any = {
        side: side ?? sideForPeer(id),
        stream: localStream ?? undefined,
        config: rtcConfig,
        trickle,
        enableDataChannel: features.enableDataChannel,
      };
      const peer = new Peer(peerConfig);
      peers.current.set(id, peer);
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
        error: (err: Error) => setError(err),
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
    },
    [
      destroyPeer,
      features.enableDataChannel,
      features.enableWaitingRoom,
      localStream,
      peerId,
      rtcConfig,
      sideForPeer,
      signaling,
      trickle,
      upsertParticipant,
    ]
  );

  useEffect(() => {
    setSignalingStatus("connecting");
    signaling.connect();
    return () => signaling.close();
  }, [signaling]);

  useEffect(() => {
    const handleOpen = () => setSignalingStatus("open");
    const handleClose = () => setSignalingStatus("closed");
    const handleError = (err: Error) => {
      // Only set error if it's a new error message to prevent rapid re-renders
      setError((prev) => {
        if (prev?.message === err.message) return prev;
        return err;
      });
    };

    signaling.on("open", handleOpen as any);
    signaling.on("close", handleClose as any);
    signaling.on("error", handleError as any);

    return () => {
      signaling.off("open", handleOpen as any);
      signaling.off("close", handleClose as any);
      signaling.off("error", handleError as any);
    };
  }, [signaling]);

  useEffect(() => {
    const onPresence = (payload: {
      peers: string[];
      peerId: string;
      room?: string | null;
      action: "join" | "leave";
    }) => {
      const ids = payload.peers;
      // Only update roster if changed
      setRoster((prev) => {
        if (
          prev.length === ids.length &&
          prev.every((id, i) => id === ids[i])
        ) {
          return prev;
        }
        return ids;
      });
      ids.filter((id) => id !== peerId).forEach((id) => ensurePeer(id));
      // Remove peers no longer present
      setParticipants((prev) => {
        const filtered = prev.filter((p) => ids.includes(p.id));
        return filtered.length === prev.length ? prev : filtered;
      });
      Array.from(peers.current.keys()).forEach((id) => {
        if (!ids.includes(id)) destroyPeer(id);
      });
    };
    signaling.on("presence", onPresence as any);
    return () => signaling.off("presence", onPresence as any);
  }, [destroyPeer, ensurePeer, peerId, signaling]);

  useEffect(() => {
    const onControl = ({ action, data }: { action: string; data?: any }) => {
      if (action === "waiting-list") {
        const waiting = (data?.waiting as string[]) ?? [];
        setWaitingList((prev) => {
          if (
            prev.length === waiting.length &&
            prev.every((id, i) => id === waiting[i])
          ) {
            return prev;
          }
          return waiting;
        });
        return;
      }
      if (action === "waiting") {
        setInWaitingRoom(true);
        return;
      }
      if (action === "admitted") {
        setInWaitingRoom(false);
        return;
      }
      if (action === "rejected") {
        setInWaitingRoom(false);
        setError(new Error("Rejected by host"));
        return;
      }
      if (action === "raise-hand") {
        const peer = (data?.peerId as string) ?? null;
        if (!peer) return;
        setRaisedHands((prev) => {
          if (prev.has(peer)) return prev;
          const next = new Set(prev);
          next.add(peer);
          return next;
        });
        return;
      }
      if (action === "hand-lowered") {
        const peer = (data?.peerId as string) ?? null;
        if (!peer) return;
        setRaisedHands((prev) => {
          if (!prev.has(peer)) return prev;
          const next = new Set(prev);
          next.delete(peer);
          return next;
        });
        return;
      }
    };
    signaling.on("control", onControl as any);
    return () => signaling.off("control", onControl as any);
  }, [signaling]);

  useEffect(() => {
    const onSignal = ({ from, data }: { from: string; data: unknown }) => {
      const peer = ensurePeer(from, sideForPeer(from));
      void peer?.signal(data as SignalData);
    };
    signaling.on("signal", onSignal as any);
    return () => signaling.off("signal", onSignal as any);
  }, [ensurePeer, signaling, sideForPeer]);

  const leave = useCallback(() => {
    Array.from(peers.current.values()).forEach((p) => p.destroy());
    peers.current.clear();
    setParticipants([]);
    setRoster([]);
    setWaitingList([]);
    setInWaitingRoom(false);
    setRaisedHands(new Set());
    stopStream();
    signaling.close();
  }, [signaling, stopStream]);

  const admitPeer = useCallback(
    (id: string) => {
      if (!features.enableWaitingRoom || !isHost) return;
      signaling.sendControl("admit", { peerId: id });
    },
    [features.enableWaitingRoom, isHost, signaling]
  );

  const rejectPeer = useCallback(
    (id: string) => {
      if (!features.enableWaitingRoom || !isHost) return;
      signaling.sendControl("reject", { peerId: id });
    },
    [features.enableWaitingRoom, isHost, signaling]
  );

  const raiseHand = useCallback(() => {
    if (!features.enableHostControls) return;
    signaling.sendControl("raise-hand", { peerId });
  }, [features.enableHostControls, peerId, signaling]);

  const lowerHand = useCallback(() => {
    if (!features.enableHostControls) return;
    signaling.sendControl("hand-lowered", { peerId });
  }, [features.enableHostControls, peerId, signaling]);

  useEffect(() => {
    if (previousStream.current === localStream) return;
    const prev = previousStream.current;
    peers.current.forEach((peer) => {
      if (prev) peer.removeStream(prev);
      if (localStream) peer.addStream(localStream);
    });
    previousStream.current = localStream ?? null;
  }, [localStream]);

  const analyzers = useRef<
    Map<
      string,
      {
        ctx: AudioContext;
        analyser: AnalyserNode;
        source: MediaStreamAudioSourceNode;
      }
    >
  >(new Map());
  const activeCandidate = useRef<string | null>(null);
  const activeSince = useRef<number>(0);
  const silenceSince = useRef<number>(0);

  // Separate effect to manage analyzers based on participants
  // This runs when participants change but doesn't recreate the interval
  useEffect(() => {
    if (!features.enableActiveSpeaker || signalingStatus !== "open") return;

    const ensureAnalyzer = (id: string, stream: MediaStream) => {
      if (analyzers.current.has(id)) return;
      const ctx = new AudioContext();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyzers.current.set(id, { ctx, analyser, source });
    };

    participants.forEach((p) => {
      if (p.remoteStream) ensureAnalyzer(p.id, p.remoteStream);
    });

    // Cleanup analyzers for participants no longer present
    analyzers.current.forEach((_value, id) => {
      const stillPresent = participants.find(
        (p) => p.id === id && p.remoteStream
      );
      if (!stillPresent) {
        const entry = analyzers.current.get(id);
        entry?.source.disconnect();
        entry?.analyser.disconnect();
        entry?.ctx.close();
        analyzers.current.delete(id);
      }
    });
  }, [features.enableActiveSpeaker, participants, signalingStatus]);

  // Separate effect for the interval - only depends on feature flag and signaling status
  useEffect(() => {
    if (!features.enableActiveSpeaker || signalingStatus !== "open") {
      setActiveSpeakerId((prev) => (prev === null ? prev : null));
      analyzers.current.forEach((entry) => {
        entry.source.disconnect();
        entry.analyser.disconnect();
        entry.ctx.close();
      });
      analyzers.current.clear();
      activeCandidate.current = null;
      activeSince.current = 0;
      silenceSince.current = 0;
      return;
    }

    const minHoldMs = 700;
    const minLevel = 18;
    const silenceHoldMs = 1200;
    const interval = window.setInterval(() => {
      let loudestId: string | null = null;
      let loudest = 0;
      analyzers.current.forEach((entry, id) => {
        const data = new Uint8Array(entry.analyser.frequencyBinCount);
        entry.analyser.getByteFrequencyData(data);
        const avg = data.reduce((acc, v) => acc + v, 0) / data.length;
        if (avg > loudest) {
          loudest = avg;
          loudestId = avg > minLevel ? id : null;
        }
      });

      const now = performance.now();
      if (loudestId !== activeCandidate.current) {
        activeCandidate.current = loudestId;
        activeSince.current = now;
      }

      const heldLongEnough = now - activeSince.current >= minHoldMs;
      if (heldLongEnough) {
        setActiveSpeakerId((prev) =>
          prev === activeCandidate.current ? prev : activeCandidate.current
        );
      }

      if (!loudestId) {
        if (!silenceSince.current) silenceSince.current = now;
        const silentLongEnough = now - silenceSince.current >= silenceHoldMs;
        if (silentLongEnough) {
          setActiveSpeakerId((prev) => (prev === null ? prev : null));
        }
      } else {
        silenceSince.current = 0;
      }
    }, 400);

    return () => {
      window.clearInterval(interval);
      analyzers.current.forEach((entry) => {
        entry.source.disconnect();
        entry.analyser.disconnect();
        entry.ctx.close();
      });
      analyzers.current.clear();
      activeCandidate.current = null;
      activeSince.current = 0;
      silenceSince.current = 0;
    };
  }, [features.enableActiveSpeaker, signalingStatus]);

  return useMemo(
    () => ({
      localStream,
      ready,
      requesting,
      mediaError,
      participants,
      roster,
      waitingList,
      inWaitingRoom,
      activeSpeakerId,
      raisedHands,
      signalingStatus,
      admitPeer,
      rejectPeer,
      raiseHand,
      lowerHand,
      requestStream,
      stopStream,
      leave,
      error,
    }),
    [
      localStream,
      ready,
      requesting,
      mediaError,
      participants,
      roster,
      waitingList,
      inWaitingRoom,
      activeSpeakerId,
      raisedHands,
      signalingStatus,
      admitPeer,
      rejectPeer,
      raiseHand,
      lowerHand,
      requestStream,
      stopStream,
      leave,
      error,
    ]
  );
}

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
        autoReconnect,
      }),
    [autoReconnect, peerId, room, signalingUrl]
  );

  const peers = useRef<Map<string, Peer>>(new Map());
  const previousStream = useRef<MediaStream | null>(null);
  const [roster, setRoster] = useState<string[]>([]);
  const [participants, setParticipants] = useState<MeshParticipant[]>([]);
  const [error, setError] = useState<Error | null>(null);
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
        return prev.map((p) => (p.id === id ? { ...p, ...patch } : p));
      });
    },
    []
  );

  const ensurePeer = useCallback(
    (id: string, side?: PeerSide) => {
      if (id === peerId) return null;
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
    const handleError = (err: Error) => setError(err);

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
      setRoster(ids);
      ids.filter((id) => id !== peerId).forEach((id) => ensurePeer(id));
      // Remove peers no longer present
      setParticipants((prev) => prev.filter((p) => ids.includes(p.id)));
      Array.from(peers.current.keys()).forEach((id) => {
        if (!ids.includes(id)) destroyPeer(id);
      });
    };
    signaling.on("presence", onPresence as any);
    return () => signaling.off("presence", onPresence as any);
  }, [destroyPeer, ensurePeer, peerId, signaling]);

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
    stopStream();
    signaling.close();
  }, [signaling, stopStream]);

  useEffect(() => {
    if (previousStream.current === localStream) return;
    const prev = previousStream.current;
    peers.current.forEach((peer) => {
      if (prev) peer.removeStream(prev);
      if (localStream) peer.addStream(localStream);
    });
    previousStream.current = localStream ?? null;
  }, [localStream]);

  return {
    localStream,
    ready,
    requesting,
    mediaError,
    participants,
    roster,
    signalingStatus,
    requestStream,
    stopStream,
    leave,
    error,
  } as const;
}

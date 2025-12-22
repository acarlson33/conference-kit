import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Peer, type PeerSide, type SignalData } from "@webrtc-kit/core";

export type UseWebRTCOptions = {
  side: PeerSide;
  stream?: MediaStream | null;
  config?: RTCConfiguration;
  channelLabel?: string;
  trickle?: boolean;
  onSignal?: (data: SignalData) => void;
  enabled?: boolean;
};

export function useWebRTC(options: UseWebRTCOptions) {
  const {
    side,
    stream,
    config,
    channelLabel,
    trickle = true,
    onSignal,
    enabled = true,
  } = options;
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [connectionState, setConnectionState] =
    useState<RTCPeerConnectionState>("new");
  const [iceState, setIceState] = useState<RTCIceConnectionState>("new");
  const [error, setError] = useState<Error | null>(null);
  const [peerInstance, setPeerInstance] = useState<Peer | null>(null);
  const peerRef = useRef<Peer | null>(null);
  const creationFailed = useRef(false);
  const onSignalRef = useRef<typeof onSignal>();

  useEffect(() => {
    onSignalRef.current = onSignal;
  }, [onSignal]);

  const isClient = useMemo(() => typeof window !== "undefined", []);

  useEffect(() => {
    if (!isClient || !enabled) {
      peerRef.current?.destroy();
      peerRef.current = null;
      setPeerInstance(null);
      creationFailed.current = false;
      return undefined;
    }

    if (peerRef.current || creationFailed.current) {
      return () => undefined;
    }

    try {
      const peer = new Peer({
        side,
        stream: stream ?? undefined,
        config,
        channelLabel,
        trickle,
      });
      peerRef.current = peer;
      setPeerInstance(peer);
      setError(null);

      const handlers = {
        signal: (data: SignalData) => onSignalRef.current?.(data),
        stream: (remote: MediaStream) => setRemoteStream(remote),
        error: (err: Error) => setError(err),
        connectionStateChange: (state: RTCPeerConnectionState) =>
          setConnectionState(state),
        iceStateChange: (state: RTCIceConnectionState) => setIceState(state),
      };

      peer.on("signal", handlers.signal);
      peer.on("stream", handlers.stream);
      peer.on("error", handlers.error);
      peer.on("connectionStateChange", handlers.connectionStateChange);
      peer.on("iceStateChange", handlers.iceStateChange);

      return () => {
        peer.off("signal", handlers.signal);
        peer.off("stream", handlers.stream);
        peer.off("error", handlers.error);
        peer.off("connectionStateChange", handlers.connectionStateChange);
        peer.off("iceStateChange", handlers.iceStateChange);
        peer.destroy();
        peerRef.current = null;
        setPeerInstance(null);
        creationFailed.current = false;
      };
    } catch (err) {
      creationFailed.current = true;
      setError(err as Error);
      return () => undefined;
    }
  }, [channelLabel, config, enabled, isClient, side, stream, trickle]);

  const signal = useCallback(async (data: SignalData) => {
    if (!peerRef.current) return;
    await peerRef.current.signal(data);
  }, []);

  const sendData = useCallback(
    (payload: string | ArrayBufferView | ArrayBuffer | Blob) => {
      if (!peerRef.current) throw new Error("Peer not ready");
      peerRef.current.send(payload);
    },
    []
  );

  const destroy = useCallback(() => {
    peerRef.current?.destroy();
    peerRef.current = null;
    creationFailed.current = false;
    setPeerInstance(null);
  }, []);

  return {
    peer: peerInstance,
    remoteStream,
    connectionState,
    iceState,
    error,
    signal,
    sendData,
    destroy,
  } as const;
}

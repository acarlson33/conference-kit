import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { type PeerSide, type SignalData } from "@conference-kit/core";
import { useMediaStream } from "./useMediaStream";
import { useWebRTC } from "./useWebRTC";
import { SignalingClient } from "../signaling/SignalingClient";

type CallState = "idle" | "calling" | "ringing" | "connected" | "ended";

type UseCallOptions = {
  peerId: string;
  signalingUrl: string;
  room?: string | null;
  autoReconnect?: boolean;
  mediaConstraints?: MediaStreamConstraints;
  rtcConfig?: RTCConfiguration;
  trickle?: boolean;
};

type IncomingSignal = { from: string; data: SignalData };

export type ReturnTypeUseCall = ReturnType<typeof useCall>;

export function useCall(options: UseCallOptions) {
  const {
    peerId,
    signalingUrl,
    room,
    autoReconnect = true,
    mediaConstraints,
    rtcConfig,
    trickle,
  } = options;

  const {
    stream: localStream,
    ready,
    requesting,
    error: mediaError,
    requestStream,
    stopStream,
  } = useMediaStream({ constraints: mediaConstraints });

  const [callState, setCallState] = useState<CallState>("idle");
  const [targetId, setTargetId] = useState<string | null>(null);
  const [side, setSide] = useState<PeerSide>("initiator");
  const [callError, setCallError] = useState<Error | null>(null);
  const pendingSignals = useRef<SignalData[]>([]);
  const pendingOutbound = useRef<SignalData[]>([]);

  const shouldEnablePeer = targetId !== null || callState !== "idle";

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

  useEffect(() => {
    signaling.connect();
    return () => signaling.close();
  }, [signaling]);

  const {
    peer,
    remoteStream,
    connectionState,
    iceState,
    error: webrtcError,
    signal,
    sendData,
    destroy,
  } = useWebRTC({
    side,
    stream: localStream ?? undefined,
    config: rtcConfig,
    trickle,
    enabled: shouldEnablePeer,
    onSignal: (data) => {
      if (!targetId) {
        pendingOutbound.current.push(data);
        return;
      }
      signaling.sendSignal(targetId, data);
    },
  });

  useEffect(() => {
    if (!webrtcError) return;
    destroy();
    setCallState("idle");
    setTargetId(null);
    pendingSignals.current = [];
    pendingOutbound.current = [];
    stopStream();
  }, [destroy, stopStream, webrtcError]);

  useEffect(() => {
    if (!targetId) return;
    if (!pendingOutbound.current.length) return;
    for (const msg of pendingOutbound.current) {
      signaling.sendSignal(targetId, msg);
    }
    pendingOutbound.current = [];
  }, [signaling, targetId]);

  useEffect(() => {
    if (!peer) return;
    if (pendingSignals.current.length === 0) return;
    for (const msg of pendingSignals.current) {
      void signal(msg);
    }
    pendingSignals.current = [];
  }, [peer, signal]);

  const handleIncoming = useCallback(
    ({ from, data }: IncomingSignal) => {
      setTargetId((prev) => prev ?? from);
      if (callState === "idle") setCallState("ringing");
      if (callState === "ended") setCallState("ringing");

      // If peer not ready yet, queue and ensure responder side
      if (!peer) {
        pendingSignals.current.push(data);
        setSide("responder");
        return;
      }

      void signal(data);
    },
    [callState, peer, signal]
  );

  useEffect(() => {
    const onSignal = ({ from, data }: { from: string; data: unknown }) =>
      handleIncoming({ from, data: data as SignalData });
    signaling.on("signal", onSignal);
    return () => signaling.off("signal", onSignal);
  }, [handleIncoming, signaling]);

  const call = useCallback(
    async (to: string) => {
      setTargetId(to);
      setSide("initiator");
      setCallState("calling");
      try {
        if (!ready && !requesting) {
          await requestStream();
        }
      } catch (error) {
        setCallError(error as Error);
      }
    },
    [ready, requesting, requestStream]
  );

  const answer = useCallback(async () => {
    setSide("responder");
    setCallState("connected");
    try {
      if (!ready && !requesting) {
        await requestStream();
      }
    } catch (error) {
      setCallError(error as Error);
    }
  }, [ready, requesting, requestStream]);

  const hangUp = useCallback(() => {
    destroy();
    setCallState("idle");
    setTargetId(null);
    stopStream();
  }, [destroy, stopStream]);

  const reset = useCallback(() => {
    destroy();
    pendingSignals.current = [];
    pendingOutbound.current = [];
    setCallState("idle");
    setTargetId(null);
    setSide("initiator");
    setCallError(null);
    stopStream();
  }, [destroy, stopStream]);

  const muteAudio = useCallback(
    (muted: boolean) => {
      localStream?.getAudioTracks().forEach((track) => {
        track.enabled = !muted;
      });
    },
    [localStream]
  );

  const muteVideo = useCallback(
    (muted: boolean) => {
      localStream?.getVideoTracks().forEach((track) => {
        track.enabled = !muted;
      });
    },
    [localStream]
  );

  const currentError = callError ?? webrtcError ?? mediaError ?? null;

  return {
    peer,
    callState,
    connectionState,
    iceState,
    localStream,
    remoteStream,
    ready,
    requesting,
    error: currentError,
    call,
    answer,
    hangUp,
    reset,
    muteAudio,
    muteVideo,
    sendData: useCallback(
      (payload: string | ArrayBufferView | ArrayBuffer | Blob) => {
        try {
          if (!peer) return;
          peer.send(payload);
        } catch (error) {
          setCallError(error as Error);
        }
      },
      [peer]
    ),
  } as const;
}

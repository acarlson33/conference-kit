import { useCallback, useEffect, useState } from "react";
import type { Peer } from "@conference-kit/core";

export type UseDataChannelState = {
  ready: boolean;
  lastMessage: unknown;
  error: Error | null;
};

export function useDataChannel(peer: Peer | null) {
  const [state, setState] = useState<UseDataChannelState>({
    ready: false,
    lastMessage: null,
    error: null,
  });

  useEffect(() => {
    if (!peer) return;

    const handleConnect = () => setState((prev) => ({ ...prev, ready: true }));
    const handleData = (data: unknown) =>
      setState((prev) => ({ ...prev, lastMessage: data }));
    const handleError = (error: Error) =>
      setState((prev) => ({ ...prev, error }));
    const handleClose = () => setState((prev) => ({ ...prev, ready: false }));

    peer.on("connect", handleConnect);
    peer.on("data", handleData as any);
    peer.on("error", handleError);
    peer.on("close", handleClose);

    return () => {
      peer.off("connect", handleConnect);
      peer.off("data", handleData as any);
      peer.off("error", handleError);
      peer.off("close", handleClose);
    };
  }, [peer]);

  const send = useCallback(
    (payload: string | ArrayBufferView | ArrayBuffer | Blob) => {
      if (!peer) throw new Error("Peer not ready");
      peer.send(payload);
    },
    [peer]
  );

  return { ...state, send } as const;
}

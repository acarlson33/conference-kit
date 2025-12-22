import { useMemo } from "react";
import type { ReturnTypeUseCall } from "./useCall";

type UseCallStateOptions = {
  hasTarget?: boolean;
};

type CallStateView = {
  callLabel: string;
  connLabel: string;
  iceLabel: string;
  canCall: boolean;
  canAnswer: boolean;
  canHangUp: boolean;
  canReset: boolean;
  inCall: boolean;
  errorMessage: string | null;
};

export function useCallState(
  call: ReturnTypeUseCall,
  options: UseCallStateOptions = {}
): CallStateView {
  const hasTarget = options.hasTarget ?? false;

  return useMemo(() => {
    const callLabel = call.callState;
    const connLabel = call.connectionState;
    const iceLabel = call.iceState;
    const canCall = hasTarget && call.callState === "idle";
    const canAnswer = call.callState === "ringing";
    const canHangUp = call.callState !== "idle";
    const canReset = true;
    const inCall = call.callState === "connected";
    const errorMessage = call.error?.message ?? null;

    return {
      callLabel,
      connLabel,
      iceLabel,
      canCall,
      canAnswer,
      canHangUp,
      canReset,
      inCall,
      errorMessage,
    };
  }, [
    call.callState,
    call.connectionState,
    call.error,
    call.iceState,
    hasTarget,
  ]);
}

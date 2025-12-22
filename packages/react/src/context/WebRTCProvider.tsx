import { createContext, useContext } from "react";
import type { SignalData } from "@webrtc-kit/core";

export type WebRTCContextValue = {
  onSignal?: (data: SignalData) => void;
  config?: RTCConfiguration;
  trickle?: boolean;
};

const WebRTCContext = createContext<WebRTCContextValue | undefined>(undefined);

export type WebRTCProviderProps = WebRTCContextValue & {
  children: React.ReactNode;
};

export function WebRTCProvider({
  children,
  onSignal,
  config,
  trickle,
}: WebRTCProviderProps) {
  return (
    <WebRTCContext.Provider value={{ onSignal, config, trickle }}>
      {children}
    </WebRTCContext.Provider>
  );
}

export function useWebRTCContext() {
  const value = useContext(WebRTCContext);
  if (!value)
    throw new Error("useWebRTCContext must be used within a WebRTCProvider");
  return value;
}

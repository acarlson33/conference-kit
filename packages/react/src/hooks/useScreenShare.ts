import { useCallback, useState, useRef, useEffect } from "react";
import { mergeFeatures, type FeatureConfig } from "../config/features";

export function useScreenShare(options?: FeatureConfig) {
  const features = mergeFeatures(options);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const active = useRef<MediaStream | null>(null);

  const start = useCallback(async () => {
    if (!features.enableScreenShare) {
      setError(new Error("Screen share is disabled by configuration"));
      return null;
    }
    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getDisplayMedia
    ) {
      setError(new Error("Screen share is not supported in this environment"));
      return null;
    }
    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });
      active.current = displayStream;
      setStream(displayStream);
      setError(null);
      return displayStream;
    } catch (err) {
      setError(err as Error);
      return null;
    }
  }, [features.enableScreenShare]);

  const stop = useCallback(() => {
    active.current?.getTracks().forEach((t) => t.stop());
    active.current = null;
    setStream(null);
  }, []);

  useEffect(() => () => stop(), [stop]);

  return { stream, start, stop, error } as const;
}

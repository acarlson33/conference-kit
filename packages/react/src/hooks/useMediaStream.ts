import { useCallback, useEffect, useRef, useState } from "react";

type UseMediaStreamState = {
  stream: MediaStream | null;
  ready: boolean;
  requesting: boolean;
  error: Error | null;
};

type UseMediaStreamOptions = {
  constraints?: MediaStreamConstraints;
};

export function useMediaStream(options?: UseMediaStreamOptions) {
  const { constraints = { audio: true, video: true } } = options || {};
  const [state, setState] = useState<UseMediaStreamState>({
    stream: null,
    ready: false,
    requesting: false,
    error: null,
  });
  const mounted = useRef(true);

  useEffect(() => {
    return () => {
      mounted.current = false;
      if (state.stream) {
        state.stream.getTracks().forEach((track) => track.stop());
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopStream = useCallback(() => {
    setState((prev) => {
      prev.stream?.getTracks().forEach((t) => t.stop());
      return { ...prev, stream: null, ready: false };
    });
  }, []);

  const requestStream = useCallback(async () => {
    const wantsAudio = Boolean(constraints && constraints.audio);
    const wantsVideo = Boolean(constraints && constraints.video);

    if (!wantsAudio && !wantsVideo) {
      setState((prev) => ({
        ...prev,
        stream: null,
        ready: true,
        requesting: false,
        error: null,
      }));
      return null;
    }

    if (typeof window !== "undefined") {
      const host = window.location.hostname;
      const isLocal =
        host === "localhost" || host === "127.0.0.1" || host === "::1";
      const isSecure = window.isSecureContext;
      if (!isSecure && !isLocal) {
        setState((prev) => ({
          ...prev,
          error: new Error(
            "Media devices require a secure origin (https) or localhost. Use https or the Chrome flag --unsafely-treat-insecure-origin-as-secure."
          ),
        }));
        return null;
      }
    }

    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      setState((prev) => ({
        ...prev,
        error: new Error("Media devices are not available in this environment"),
      }));
      return null;
    }

    setState((prev) => ({ ...prev, requesting: true, error: null }));

    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (!mounted.current) return null;
      setState({ stream, ready: true, requesting: false, error: null });
      return stream;
    } catch (error) {
      if (!mounted.current) return null;
      setState({
        stream: null,
        ready: false,
        requesting: false,
        error: error as Error,
      });
      return null;
    }
  }, [constraints]);

  return { ...state, requestStream, stopStream } as const;
}

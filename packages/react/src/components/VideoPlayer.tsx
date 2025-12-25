import { useEffect, useRef } from "react";

export type VideoPlayerProps = React.VideoHTMLAttributes<HTMLVideoElement> & {
  stream?: MediaStream | null;
};

export function VideoPlayer({
  stream,
  autoPlay = true,
  playsInline = true,
  muted,
  ...props
}: VideoPlayerProps) {
  const ref = useRef<HTMLVideoElement | null>(null);
  const prevStream = useRef<MediaStream | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Avoid resetting srcObject if the exact same MediaStream instance is already attached.
    if (stream && prevStream.current !== stream) {
      el.srcObject = stream;
      prevStream.current = stream;
    }

    // Kick playback on mobile where autoplay can be flaky even when muted.
    if (stream) {
      el.play().catch(() => {
        /* ignore autoplay rejection; user gesture will resume */
      });
    }

    return () => {
      if (el) {
        el.srcObject = null;
        prevStream.current = null;
      }
    };
  }, [stream]);

  return (
    <video
      ref={ref}
      autoPlay={autoPlay}
      playsInline={playsInline}
      muted={muted ?? stream == null}
      {...props}
    />
  );
}

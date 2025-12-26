import { useEffect, useRef, memo } from "react";

export type VideoPlayerProps = React.VideoHTMLAttributes<HTMLVideoElement> & {
  stream?: MediaStream | null;
};

export const VideoPlayer = memo(function VideoPlayer({
  stream,
  autoPlay = true,
  playsInline = true,
  muted,
  ...props
}: VideoPlayerProps) {
  const ref = useRef<HTMLVideoElement | null>(null);
  const attachedStream = useRef<MediaStream | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Only update srcObject when stream actually changes (by reference).
    // Avoid clearing on unmount to prevent flicker during parent re-renders.
    if (stream !== attachedStream.current) {
      el.srcObject = stream ?? null;
      attachedStream.current = stream ?? null;

      // Kick playback on mobile where autoplay can be flaky even when muted.
      if (stream) {
        el.play().catch(() => {
          /* ignore autoplay rejection; user gesture will resume */
        });
      }
    }
  }, [stream]);

  // Only clear srcObject when component is truly unmounting, not on re-renders.
  useEffect(() => {
    const el = ref.current;
    return () => {
      if (el) {
        el.srcObject = null;
        attachedStream.current = null;
      }
    };
  }, []);

  return (
    <video
      ref={ref}
      autoPlay={autoPlay}
      playsInline={playsInline}
      muted={muted ?? stream == null}
      {...props}
    />
  );
});

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

  useEffect(() => {
    if (!ref.current || !stream) return;
    ref.current.srcObject = stream;
    return () => {
      if (ref.current) ref.current.srcObject = null;
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

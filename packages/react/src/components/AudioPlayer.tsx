import { useEffect, useRef } from "react";

export type AudioPlayerProps = React.AudioHTMLAttributes<HTMLAudioElement> & {
  stream?: MediaStream | null;
};

export function AudioPlayer({
  stream,
  autoPlay = true,
  ...props
}: AudioPlayerProps) {
  const ref = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!ref.current || !stream) return;
    ref.current.srcObject = stream;
    return () => {
      if (ref.current) ref.current.srcObject = null;
    };
  }, [stream]);

  return <audio ref={ref} autoPlay={autoPlay} {...props} />;
}

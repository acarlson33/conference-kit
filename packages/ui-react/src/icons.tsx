import type { SVGProps } from "react";

export const VideoIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    {...props}
  >
    <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5h7A2.5 2.5 0 0 1 15 7.5v9A2.5 2.5 0 0 1 12.5 19h-7A2.5 2.5 0 0 1 3 16.5v-9Z" />
    <path d="M15 10.5 20.5 7v10l-5.5-3V10.5Z" />
  </svg>
);

export const MicIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    {...props}
  >
    <rect x="7" y="4" width="10" height="12" rx="3" />
    <path d="M5 11v1a7 7 0 0 0 14 0v-1" />
    <path d="M12 19v2" />
  </svg>
);

export const PhoneIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    {...props}
  >
    <path d="M5 4h4l1.5 4-2 1a10 10 0 0 0 5.5 5.5l1-2L19 15v4a2 2 0 0 1-2 2 14 14 0 0 1-14-14 2 2 0 0 1 2-2Z" />
  </svg>
);

export const ScreenIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    {...props}
  >
    <rect x="3" y="5" width="18" height="12" rx="2" />
    <path d="M8 19h8" />
  </svg>
);

export const ChatIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    {...props}
  >
    <path d="M5 5h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H9l-4 3v-5H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" />
  </svg>
);

export const SignalIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    {...props}
  >
    <path d="M4 18h2v-4H4v4Zm5 0h2V8H9v10Zm5 0h2V4h-2v14Zm5 0h2v-7h-2v7Z" />
  </svg>
);

export const WifiOffIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    {...props}
  >
    <path d="m3 3 18 18M7.5 7.1A13 13 0 0 1 12 6c1.9 0 3.7.4 5.4 1.2M5 10.2A10 10 0 0 1 12 8c1.6 0 3.2.3 4.6 1M7 13.3A7 7 0 0 1 12 12c1.4 0 2.6.3 3.8.9M9.5 16.4A3.5 3.5 0 0 1 12 16c.5 0 1 .1 1.5.3" />
  </svg>
);

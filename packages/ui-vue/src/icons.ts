import { h, type FunctionalComponent, type SVGAttributes } from "vue";

function makeIcon(path: string): FunctionalComponent<SVGAttributes> {
  return (props) =>
    h(
      "svg",
      {
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        strokeWidth: 1.6,
        ...props,
      },
      [h("path", { d: path })]
    );
}

export const SignalIcon = makeIcon(
  "M4 18h2v-4H4v4Zm5 0h2V8H9v10Zm5 0h2V4h-2v14Zm5 0h2v-7h-2v7Z"
);
export const WifiOffIcon = makeIcon(
  "m3 3 18 18M7.5 7.1A13 13 0 0 1 12 6c1.9 0 3.7.4 5.4 1.2M5 10.2A10 10 0 0 1 12 8c1.6 0 3.2.3 4.6 1M7 13.3A7 7 0 0 1 12 12c1.4 0 2.6.3 3.8.9M9.5 16.4A3.5 3.5 0 0 1 12 16c.5 0 1 .1 1.5.3"
);
export const MicIcon = makeIcon(
  "M7 4a5 5 0 1 1 10 0v6a5 5 0 1 1-10 0V4Z M5 11v1a7 7 0 0 0 14 0v-1 M12 19v2"
);
export const VideoIcon = makeIcon(
  "M3 7.5A2.5 2.5 0 0 1 5.5 5h7A2.5 2.5 0 0 1 15 7.5v9A2.5 2.5 0 0 1 12.5 19h-7A2.5 2.5 0 0 1 3 16.5v-9Z M15 10.5 20.5 7v10l-5.5-3V10.5Z"
);
export const PhoneIcon = makeIcon(
  "M5 4h4l1.5 4-2 1a10 10 0 0 0 5.5 5.5l1-2L19 15v4a2 2 0 0 1-2 2 14 14 0 0 1-14-14 2 2 0 0 1 2-2Z"
);
export const ScreenIcon = makeIcon("M3 5h18v12H3z M8 19h8");
export const ChatIcon = makeIcon(
  "M5 5h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H9l-4 3v-5H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z"
);

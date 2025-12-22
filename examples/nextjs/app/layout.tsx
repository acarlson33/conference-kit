export const metadata = {
  title: "WebRTC Next Example",
  description: "Simple WebRTC call example with Bun signaling",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

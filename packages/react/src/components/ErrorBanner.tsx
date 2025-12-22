type ErrorBannerProps = {
  message: string;
};

export function ErrorBanner({ message }: ErrorBannerProps) {
  return (
    <div
      style={{
        background: "#fef2f2",
        color: "#991b1b",
        padding: "8px 12px",
        borderRadius: 8,
        border: "1px solid #fecdd3",
        fontSize: 14,
      }}
    >
      {message}
    </div>
  );
}

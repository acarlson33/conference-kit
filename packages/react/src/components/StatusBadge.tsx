type StatusBadgeProps = {
  label: string;
  tone?: "neutral" | "success" | "warn" | "error";
};

const toneStyles: Record<NonNullable<StatusBadgeProps["tone"]>, string> = {
  neutral: "#e5e7eb",
  success: "#d1fae5",
  warn: "#fef3c7",
  error: "#fee2e2",
};

const toneText: Record<NonNullable<StatusBadgeProps["tone"]>, string> = {
  neutral: "#111827",
  success: "#065f46",
  warn: "#92400e",
  error: "#991b1b",
};

export function StatusBadge({ label, tone = "neutral" }: StatusBadgeProps) {
  const bg = toneStyles[tone];
  const color = toneText[tone];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "4px 8px",
        borderRadius: 999,
        background: bg,
        color,
        fontSize: 12,
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: 0.3,
      }}
    >
      {label}
    </span>
  );
}

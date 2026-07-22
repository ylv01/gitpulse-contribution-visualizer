interface SignalDotProps {
  size?: number;
  color?: string;
  className?: string;
}
export default function SignalDot({
  size = 22,
  color = "#28d7ff",
  className = "",
}: SignalDotProps) {
  return (
    <svg
      aria-hidden="true"
      className={`animated-signal-dot ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="12" cy="12" r="7" fill={color} opacity="0.08">
        <animate attributeName="r" values="6;10;6" dur="3.6s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.04;0.22;0.04" dur="3.6s" repeatCount="indefinite" />
      </circle>
      <circle cx="12" cy="12" r="3" fill={color} opacity="0.45">
        <animate attributeName="r" values="2.4;3.7;2.4" dur="3.6s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.42;1;0.42" dur="3.6s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

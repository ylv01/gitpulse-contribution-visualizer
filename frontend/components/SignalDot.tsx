"use client";

import { useId } from "react";

interface SignalDotProps {
  size?: number;
  color?: string;
  className?: string;
}
export default function SignalDot({
  size = 18,
  color = "#28d7ff",
  className = "",
}: SignalDotProps) {
  const id = useId().replace(/:/g, "");
  const ambientGlowId = `signal-ambient-${id}`;
  const nearGlowId = `signal-near-${id}`;

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
      <defs>
        <filter id={ambientGlowId} x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="2.1" />
        </filter>
        <filter id={nearGlowId} x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="0.75" />
        </filter>
      </defs>

      <circle cx="12" cy="12" r="3.1" fill={color} opacity="0.2" filter={`url(#${ambientGlowId})`}>
        <animate attributeName="r" values="2.8;3.55;2.8" dur="3.6s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.12;0.32;0.12" dur="3.6s" repeatCount="indefinite" />
      </circle>
      <circle cx="12" cy="12" r="2.35" fill={color} opacity="0.5" filter={`url(#${nearGlowId})`}>
        <animate attributeName="r" values="2.1;2.55;2.1" dur="3.6s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.36;0.72;0.36" dur="3.6s" repeatCount="indefinite" />
      </circle>
      <circle cx="12" cy="12" r="1.25" fill="#eaffff" opacity="0.92">
        <animate attributeName="r" values="1.1;1.35;1.1" dur="3.6s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.78;1;0.78" dur="3.6s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

import type { ReactNode } from "react";

interface ChartFrameProps {
  eyebrow: string;
  title: string;
  description: string;
  accent?: "cyan" | "violet";
  children: ReactNode;
  className?: string;
}

export default function ChartFrame({
  eyebrow,
  title,
  description,
  accent = "cyan",
  children,
  className = "",
}: ChartFrameProps) {
  return (
    <section className={`chart-card glass-panel relative overflow-hidden rounded-2xl p-5 sm:p-6 ${className}`}>
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <p className={`tech-label mb-1.5 text-[10px] font-bold uppercase ${accent === "cyan" ? "text-cyan" : "text-violet-400"}`}>
            {eyebrow}
          </p>
          <h2 className="text-base font-semibold tracking-tight text-slate-100 sm:text-lg">{title}</h2>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">{description}</p>
        </div>
        <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${accent === "cyan" ? "bg-cyan shadow-[0_0_12px_#28d7ff]" : "bg-violet-500 shadow-[0_0_12px_#8b5cf6]"}`} />
      </div>
      {children}
    </section>
  );
}


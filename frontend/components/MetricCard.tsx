import type { LucideIcon } from "lucide-react";

interface MetricCardProps {
  label: string;
  value: string;
  note: string;
  icon: LucideIcon;
  accent: "cyan" | "blue" | "violet";
}

const accents = {
  cyan: "border-cyan/15 bg-cyan/[0.055] text-cyan",
  blue: "border-blue-500/15 bg-blue-500/[0.055] text-blue-400",
  violet: "border-violet-500/15 bg-violet-500/[0.055] text-violet-400",
};

export default function MetricCard({ label, value, note, icon: Icon, accent }: MetricCardProps) {
  return (
    <div className="glass-panel group rounded-2xl p-4 transition duration-300 hover:-translate-y-0.5 hover:border-white/[0.13] sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="tech-label text-[9px] font-bold uppercase text-slate-600">{label}</p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-100 sm:text-[28px]">{value}</p>
          <p className="mt-1 text-[11px] text-slate-600">{note}</p>
        </div>
        <div className={`rounded-xl border p-2.5 ${accents[accent]}`}>
          <Icon size={17} strokeWidth={1.8} />
        </div>
      </div>
    </div>
  );
}


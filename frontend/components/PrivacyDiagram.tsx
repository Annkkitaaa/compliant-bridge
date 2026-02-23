"use client";
import { Eye, EyeOff, Lock, Shield, ChevronRight } from "lucide-react";

const layers = [
  {
    role: "Public",
    icon: Eye,
    color: "from-slate-600 to-slate-700",
    ringColor: "ring-slate-200",
    bg: "bg-slate-50",
    textColor: "text-slate-600",
    sees: ["Tx hash", "Pass / Fail", "Chain", "Timestamp"],
    hidden: 4,
    barWidth: "25%",
    barColor: "bg-slate-400",
  },
  {
    role: "Institution",
    icon: Shield,
    color: "from-blue-600 to-blue-700",
    ringColor: "ring-blue-200",
    bg: "bg-blue-50",
    textColor: "text-blue-600",
    sees: ["Own tier", "Own balance", "Own attestation", "Bridge status"],
    hidden: 2,
    barWidth: "60%",
    barColor: "bg-blue-500",
  },
  {
    role: "Regulator",
    icon: Eye,
    color: "from-amber-500 to-amber-600",
    ringColor: "ring-amber-200",
    bg: "bg-amber-50",
    textColor: "text-amber-600",
    sees: ["All check results", "All amounts", "Full identity", "Full history"],
    hidden: 0,
    barWidth: "100%",
    barColor: "bg-amber-500",
  },
];

export default function PrivacyDiagram() {
  return (
    <div className="bg-white/10 backdrop-blur-sm border border-white/15 rounded-2xl p-5 mt-4">
      <p className="text-xs font-bold uppercase tracking-widest text-white/50 mb-4 text-center">
        Three-Layer Privacy Model
      </p>

      <div className="flex items-stretch gap-2">
        {layers.map((layer, idx) => {
          const Icon = layer.icon;
          return (
            <div key={layer.role} className="flex-1 flex flex-col gap-2">
              {/* Header */}
              <div className={`rounded-xl p-3 bg-gradient-to-br ${layer.color} text-white`}>
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="w-3.5 h-3.5" />
                  <span className="text-xs font-bold uppercase tracking-wide">{layer.role}</span>
                </div>
                {/* Data access bar */}
                <div className="h-1.5 rounded-full bg-white/20 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-white/70 transition-all"
                    style={{ width: layer.barWidth }}
                  />
                </div>
                <p className="text-xs text-white/60 mt-1">{layer.barWidth} data access</p>
              </div>

              {/* Sees */}
              <div className="flex-1 space-y-1">
                {layer.sees.map(item => (
                  <div key={item} className="flex items-center gap-1.5 text-xs text-white/70">
                    <span className="w-1 h-1 rounded-full bg-white/50 flex-shrink-0" />
                    {item}
                  </div>
                ))}
                {layer.hidden > 0 && (
                  <div className="flex items-center gap-1.5 text-xs text-white/30">
                    <Lock className="w-2.5 h-2.5" />
                    +{layer.hidden} hidden
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Arrow legend */}
      <div className="mt-4 flex items-center justify-center gap-2 text-xs text-white/40">
        <span>More privacy</span>
        <div className="flex items-center gap-0.5">
          {[...Array(5)].map((_, i) => (
            <ChevronRight key={i} className="w-3 h-3" />
          ))}
        </div>
        <span>More visibility</span>
      </div>
    </div>
  );
}

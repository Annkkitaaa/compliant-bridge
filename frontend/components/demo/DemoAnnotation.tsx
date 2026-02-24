"use client";
import { Sparkles } from "lucide-react";
import { useDemoContext } from "@/context/DemoContext";
import { DEMO_STEPS, type DemoTabId } from "@/lib/demoScript";
import ChainlinkTooltip from "./ChainlinkTooltip";

export default function DemoAnnotation({ forTab }: { forTab: DemoTabId }) {
  const { demoMode, currentStep } = useDemoContext();
  if (!demoMode) return null;

  const step = DEMO_STEPS[currentStep];
  if (step.tab !== forTab) return null;

  return (
    <div className="mb-5 rounded-xl border border-amber-400/40 px-4 py-3.5 flex items-start gap-3"
      style={{ background: "linear-gradient(135deg, rgba(251,191,36,0.08) 0%, rgba(245,158,11,0.05) 100%)" }}
    >
      <div className="w-7 h-7 rounded-full bg-amber-400/20 border border-amber-400/40 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className="text-xs font-bold text-amber-300 uppercase tracking-widest">
            {step.subtitle}
          </span>
          <span className="text-white/30">·</span>
          <span className="text-sm font-semibold text-white/90">{step.title}</span>
        </div>
        <p className="text-xs text-amber-200/70 leading-relaxed">{step.annotation}</p>
        <p className="text-xs text-slate-400/80 mt-1 italic">{step.action}</p>
      </div>
      {step.techName && step.techDetail && (
        <div className="flex-shrink-0">
          <ChainlinkTooltip name={step.techName} description={step.techDetail}>
            <span className="text-xs text-amber-400/60 font-medium whitespace-nowrap hidden sm:inline">
              {step.techName.split("·")[0].trim()}
            </span>
          </ChainlinkTooltip>
        </div>
      )}
    </div>
  );
}

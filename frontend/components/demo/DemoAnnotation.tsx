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
    <div
      className="mb-5 rounded-xl px-4 py-3.5 flex items-start gap-3 demo-annotation-enter"
      style={{
        background: "linear-gradient(135deg, rgba(245,172,55,0.07) 0%, rgba(245,172,55,0.03) 100%)",
        border: "1px solid rgba(245,172,55,0.3)",
      }}
    >
      <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{ background: "rgba(245,172,55,0.15)", border: "1px solid rgba(245,172,55,0.35)" }}
      >
        <Sparkles className="w-3.5 h-3.5 text-[#F5AC37]" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className="text-xs font-bold text-[#F5AC37] uppercase tracking-widest">
            {step.subtitle}
          </span>
          <span className="text-[#252840]">·</span>
          <span className="text-sm font-semibold text-white/90">{step.title}</span>
        </div>
        <p className="text-xs text-[#F5AC37]/70 leading-relaxed">{step.annotation}</p>
        <p className="text-xs text-[#4A5568] mt-1 italic">{step.action}</p>
      </div>
      {step.techName && step.techDetail && (
        <div className="flex-shrink-0">
          <ChainlinkTooltip name={step.techName} description={step.techDetail}>
            <span className="text-xs text-[#F5AC37]/60 font-medium whitespace-nowrap hidden sm:inline">
              {step.techName.split("·")[0].trim()}
            </span>
          </ChainlinkTooltip>
        </div>
      )}
    </div>
  );
}

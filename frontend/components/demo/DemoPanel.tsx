"use client";
import { ChevronLeft, ChevronRight, Play, Square } from "lucide-react";
import { useDemoContext } from "@/context/DemoContext";
import { DEMO_STEPS } from "@/lib/demoScript";
import ChainlinkTooltip from "./ChainlinkTooltip";

export default function DemoPanel() {
  const { demoMode, toggleDemo, currentStep, nextStep, prevStep, setStep } = useDemoContext();
  if (!demoMode) return null;

  const step    = DEMO_STEPS[currentStep];
  const isFirst = currentStep === 0;
  const isLast  = currentStep === DEMO_STEPS.length - 1;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/10"
      style={{
        background: "linear-gradient(135deg, #0a1628 0%, #0f2040 60%, #1a3a6f 100%)",
        boxShadow:  "0 -4px 32px rgba(0,0,0,0.5)",
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-4">

        {/* Dot progress */}
        <div className="flex-shrink-0 flex items-center gap-1.5">
          {DEMO_STEPS.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              title={DEMO_STEPS[i].title}
              className={[
                "rounded-full transition-all duration-200 focus:outline-none",
                i === currentStep
                  ? "w-6 h-2.5 bg-amber-400 shadow shadow-amber-400/50"
                  : i < currentStep
                  ? "w-2.5 h-2.5 bg-emerald-400/70 hover:bg-emerald-400"
                  : "w-2.5 h-2.5 bg-white/20 hover:bg-white/40",
              ].join(" ")}
            />
          ))}
        </div>

        {/* Step label + description */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-amber-400 font-bold uppercase tracking-widest flex-shrink-0">
              {step.subtitle}
            </span>
            <span className="text-white font-bold text-sm truncate">{step.title}</span>
            {step.techName && step.techDetail && (
              <ChainlinkTooltip name={step.techName} description={step.techDetail}>
                <span className="text-xs text-blue-300/60 font-medium hidden md:inline">
                  {step.techName}
                </span>
              </ChainlinkTooltip>
            )}
          </div>
          <p className="text-blue-200/60 text-xs mt-0.5 truncate hidden sm:block">
            {step.action}
          </p>
        </div>

        {/* Nav */}
        <div className="flex-shrink-0 flex items-center gap-2">
          <button
            onClick={prevStep}
            disabled={isFirst}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/8 hover:bg-white/15 text-white/60 hover:text-white text-xs font-medium transition-all disabled:opacity-25 disabled:cursor-not-allowed border border-white/10"
          >
            <ChevronLeft className="w-3.5 h-3.5" /> Prev
          </button>

          <button
            onClick={nextStep}
            disabled={isLast}
            className="flex items-center gap-1 px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all disabled:opacity-25 disabled:cursor-not-allowed shadow-lg shadow-blue-600/30"
          >
            Next <ChevronRight className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={toggleDemo}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/8 hover:bg-white/15 text-white/40 hover:text-white/70 text-xs transition-all border border-white/10 ml-1"
            title="Exit demo mode"
          >
            <Square className="w-3 h-3" />
            <span className="hidden sm:inline">Exit</span>
          </button>
        </div>

        {/* Live indicator */}
        <div className="flex-shrink-0 hidden lg:flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-400/20 rounded-lg px-2.5 py-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 pulse inline-block" />
          <span className="text-xs text-emerald-400 font-semibold">Live · Sepolia</span>
        </div>
      </div>
    </div>
  );
}

// Thin toggle button for the header
export function DemoToggle() {
  const { demoMode, toggleDemo } = useDemoContext();
  return (
    <button
      onClick={toggleDemo}
      className={[
        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all duration-200",
        demoMode
          ? "bg-amber-400 border-amber-300 text-amber-900 shadow-lg shadow-amber-400/40"
          : "bg-white/10 border-white/20 text-white/70 hover:bg-white/20 hover:text-white",
      ].join(" ")}
    >
      {demoMode ? <Square className="w-3 h-3" /> : <Play className="w-3 h-3" />}
      {demoMode ? "Exit Demo" : "▶ Demo Mode"}
    </button>
  );
}

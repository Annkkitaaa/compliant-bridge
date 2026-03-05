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
      className="fixed bottom-0 left-0 right-0 z-40"
      style={{
        background: "rgba(13,14,18,0.96)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderTop: "1px solid #1F2235",
        boxShadow: "0 -8px 40px rgba(0,0,0,0.6), 0 -1px 0 rgba(55,91,210,0.1)",
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
              className="rounded-full transition-all duration-200 focus:outline-none"
              style={i === currentStep
                ? { width: 24, height: 10, background: "#F5AC37", boxShadow: "0 0 8px rgba(245,172,55,0.5)" }
                : i < currentStep
                ? { width: 10, height: 10, background: "rgba(22,199,132,0.7)" }
                : { width: 10, height: 10, background: "#252840" }
              }
            />
          ))}
        </div>

        {/* Step label */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-[#F5AC37] font-bold uppercase tracking-widest flex-shrink-0">
              {step.subtitle}
            </span>
            <span className="text-white font-bold text-sm truncate">{step.title}</span>
            {step.techName && step.techDetail && (
              <ChainlinkTooltip name={step.techName} description={step.techDetail}>
                <span className="text-xs text-[#375BD2] font-medium hidden md:inline">
                  {step.techName}
                </span>
              </ChainlinkTooltip>
            )}
          </div>
          <p className="text-[#4A5568] text-xs mt-0.5 truncate hidden sm:block">
            {step.action}
          </p>
        </div>

        {/* Nav */}
        <div className="flex-shrink-0 flex items-center gap-2">
          <button
            onClick={prevStep} disabled={isFirst}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-25 disabled:cursor-not-allowed"
            style={{ background: "#13151A", border: "1px solid #1F2235", color: "#8892A4" }}
          >
            <ChevronLeft className="w-3.5 h-3.5" /> Prev
          </button>

          <button
            onClick={nextStep} disabled={isLast}
            className="flex items-center gap-1 px-4 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-25 disabled:cursor-not-allowed"
            style={{ background: "#375BD2", color: "white", boxShadow: "0 0 16px rgba(55,91,210,0.4)" }}
          >
            Next <ChevronRight className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={toggleDemo}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs transition-all ml-1"
            style={{ background: "#13151A", border: "1px solid #1F2235", color: "#4A5568" }}
            title="Exit demo mode"
          >
            <Square className="w-3 h-3" />
            <span className="hidden sm:inline">Exit</span>
          </button>
        </div>

        {/* Live indicator */}
        <div className="flex-shrink-0 hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
          style={{ background: "rgba(22,199,132,0.08)", border: "1px solid rgba(22,199,132,0.2)" }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#16C784] pulse inline-block" />
          <span className="text-xs text-[#16C784] font-semibold">Live · Sepolia</span>
        </div>
      </div>
    </div>
  );
}

// Thin toggle button for the navbar
export function DemoToggle() {
  const { demoMode, toggleDemo } = useDemoContext();
  return (
    <button
      onClick={toggleDemo}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all duration-200"
      style={demoMode
        ? { background: "#F5AC37", borderColor: "#F5AC37", color: "black", boxShadow: "0 0 16px rgba(245,172,55,0.4)" }
        : { background: "transparent", borderColor: "#1F2235", color: "#8892A4" }
      }
    >
      {demoMode ? <Square className="w-3 h-3" /> : <Play className="w-3 h-3" />}
      {demoMode ? "Exit Demo" : "▶ Demo Mode"}
    </button>
  );
}

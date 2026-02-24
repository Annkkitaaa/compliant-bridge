"use client";
import { CheckCircle } from "lucide-react";
import { useDemoContext } from "@/context/DemoContext";
import { DEMO_STEPS, FLOW_BAR_STEPS } from "@/lib/demoScript";

// Static style maps — no dynamic Tailwind interpolation
const RING: Record<"active" | "done" | "pending", string> = {
  active:  "bg-blue-600 border-blue-400 shadow-lg shadow-blue-500/40 ring-2 ring-blue-400/30",
  done:    "bg-emerald-600 border-emerald-400",
  pending: "bg-white/8 border-white/20",
};
const NUM: Record<"active" | "done" | "pending", string> = {
  active:  "text-white",
  done:    "text-white",
  pending: "text-white/30",
};
const LBL: Record<"active" | "done" | "pending", string> = {
  active:  "text-white font-bold",
  done:    "text-emerald-300 font-semibold",
  pending: "text-white/30 font-normal",
};
const SUB: Record<"active" | "done" | "pending", string> = {
  active:  "text-blue-300",
  done:    "text-emerald-400/60",
  pending: "text-white/15",
};
const LINE: Record<"done" | "pending", string> = {
  done:    "bg-emerald-400/50",
  pending: "bg-white/12",
};

type StepState = "active" | "done" | "pending";

export default function FlowBar() {
  const { demoMode, currentStep } = useDemoContext();
  if (!demoMode) return null;

  const flowStep = DEMO_STEPS[currentStep]?.flowStep ?? 0;
  const allActive = flowStep === -1;

  return (
    <div className="mt-4 rounded-2xl border border-white/10 px-5 py-4"
      style={{ background: "rgba(255,255,255,0.06)", backdropFilter: "blur(8px)" }}
    >
      <p className="text-xs font-bold uppercase tracking-widest text-white/35 mb-4 text-center">
        Chainlink Technology Pipeline
      </p>

      <div className="flex items-start">
        {FLOW_BAR_STEPS.map((step, i) => {
          const state: StepState = allActive
            ? "done"
            : i < flowStep  ? "done"
            : i === flowStep ? "active"
            : "pending";

          return (
            <div key={step.label} className="flex items-center flex-1">
              {/* Node */}
              <div className="flex flex-col items-center gap-1.5 flex-shrink-0 w-16 sm:w-20">
                <div className={`w-9 h-9 rounded-full border-2 flex items-center justify-center transition-all duration-500 ${RING[state]}`}>
                  {state === "done"
                    ? <CheckCircle className={`w-4 h-4 ${NUM[state]}`} />
                    : <span className={`text-sm font-bold ${NUM[state]}`}>{i + 1}</span>
                  }
                </div>
                <p className={`text-xs text-center transition-colors duration-300 leading-tight ${LBL[state]}`}>
                  {step.label}
                </p>
                <p className={`text-xs text-center leading-tight ${SUB[state]}`}>
                  {step.sublabel}
                </p>
              </div>

              {/* Connector */}
              {i < FLOW_BAR_STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-1 rounded-full transition-colors duration-500 ${
                  LINE[state === "pending" ? "pending" : "done"]
                }`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

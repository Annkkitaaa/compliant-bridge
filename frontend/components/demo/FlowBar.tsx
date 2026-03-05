"use client";
import { CheckCircle } from "lucide-react";
import { useDemoContext } from "@/context/DemoContext";
import { DEMO_STEPS, FLOW_BAR_STEPS } from "@/lib/demoScript";

type StepState = "active" | "done" | "pending";

const NODE_STYLE: Record<StepState, React.CSSProperties> = {
  active:  { background: "#375BD2", border: "2px solid #5B7FE8", boxShadow: "0 0 20px rgba(55,91,210,0.5)" },
  done:    { background: "#16C784", border: "2px solid rgba(22,199,132,0.7)" },
  pending: { background: "transparent", border: "2px solid #1F2235" },
};

const NUM_COLOR: Record<StepState, string> = {
  active: "text-white",
  done:   "text-white",
  pending: "text-[#4A5568]",
};

const LBL_STYLE: Record<StepState, React.CSSProperties> = {
  active:  { color: "#FFFFFF", fontWeight: 700 },
  done:    { color: "#16C784", fontWeight: 600 },
  pending: { color: "#4A5568", fontWeight: 400 },
};

const SUB_COLOR: Record<StepState, string> = {
  active:  "text-[#5B7FE8]",
  done:    "text-[#16C784]/60",
  pending: "text-[#252840]",
};

export default function FlowBar() {
  const { demoMode, currentStep } = useDemoContext();
  if (!demoMode) return null;

  const flowStep  = DEMO_STEPS[currentStep]?.flowStep ?? 0;
  const allActive = flowStep === -1;

  return (
    <div className="mt-0 mb-4 rounded-2xl px-5 py-4"
      style={{ background: "#13151A", border: "1px solid #1F2235" }}
    >
      <p className="text-[10px] font-bold uppercase tracking-widest text-[#4A5568] mb-4 text-center">
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
                <div className="w-9 h-9 rounded-full flex items-center justify-center transition-all duration-500"
                  style={NODE_STYLE[state]}
                >
                  {state === "done"
                    ? <CheckCircle className="w-4 h-4 text-white" />
                    : <span className={`text-sm font-bold ${NUM_COLOR[state]}`}>{i + 1}</span>
                  }
                </div>
                <p className="text-xs text-center transition-colors duration-300 leading-tight"
                  style={LBL_STYLE[state]}
                >
                  {step.label}
                </p>
                <p className={`text-xs text-center leading-tight ${SUB_COLOR[state]}`}>
                  {step.sublabel}
                </p>
              </div>

              {/* Connector */}
              {i < FLOW_BAR_STEPS.length - 1 && (
                <div className="flex-1 h-0.5 mx-1 rounded-full transition-colors duration-500 overflow-hidden relative"
                  style={{ background: state === "pending" ? "#1F2235" : "rgba(22,199,132,0.4)" }}
                >
                  {state === "active" && (
                    <div className="absolute inset-0 rounded-full"
                      style={{
                        background: "linear-gradient(90deg, transparent, rgba(55,91,210,0.8), transparent)",
                        animation: "flow-line 2s ease-in-out infinite",
                      }}
                    />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

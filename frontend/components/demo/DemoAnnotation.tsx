"use client";
import { MapPin, Eye, ArrowRight, ChevronRight, ChevronLeft } from "lucide-react";
import { useDemoContext } from "@/context/DemoContext";
import { DEMO_STEPS, type DemoTabId } from "@/lib/demoScript";

export default function DemoAnnotation({ forTab }: { forTab: DemoTabId }) {
  const { demoMode, currentStep, nextStep, prevStep } = useDemoContext();
  if (!demoMode) return null;

  const step = DEMO_STEPS[currentStep];
  if (step.tab !== forTab) return null;

  const isFirst = currentStep === 0;
  const isLast  = currentStep === DEMO_STEPS.length - 1;

  return (
    <div
      className="mb-6 rounded-2xl overflow-hidden demo-annotation-enter"
      style={{
        background: "linear-gradient(135deg, #0F1420 0%, #0D1018 100%)",
        border: "1px solid rgba(55,91,210,0.35)",
        boxShadow: "0 0 0 1px rgba(55,91,210,0.08), 0 8px 32px rgba(0,0,0,0.4), 0 0 40px rgba(55,91,210,0.06)",
      }}
    >
      {/* Header bar */}
      <div
        className="flex items-center justify-between px-4 py-2.5"
        style={{
          background: "rgba(55,91,210,0.1)",
          borderBottom: "1px solid rgba(55,91,210,0.2)",
        }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: "#375BD2", boxShadow: "0 0 12px rgba(55,91,210,0.5)" }}
          >
            <MapPin className="w-3 h-3 text-white" />
          </div>
          <span className="text-xs font-bold uppercase tracking-widest text-[#5B7FE8]">
            Tour Guide
          </span>
          <span className="text-[#1F2235] text-xs">·</span>
          <span
            className="text-xs font-bold px-2 py-0.5 rounded-full"
            style={{ background: "rgba(245,172,55,0.15)", color: "#F5AC37", border: "1px solid rgba(245,172,55,0.3)" }}
          >
            {step.subtitle}
          </span>
          <span className="text-sm font-semibold text-white/80 hidden sm:inline">{step.title}</span>
        </div>

        {/* Mini nav */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={prevStep}
            disabled={isFirst}
            className="w-6 h-6 rounded-md flex items-center justify-center transition-all disabled:opacity-25 disabled:cursor-not-allowed"
            style={{ background: "#13151A", border: "1px solid #1F2235" }}
          >
            <ChevronLeft className="w-3.5 h-3.5 text-[#8892A4]" />
          </button>
          <button
            onClick={nextStep}
            disabled={isLast}
            className="w-6 h-6 rounded-md flex items-center justify-center transition-all disabled:opacity-25 disabled:cursor-not-allowed"
            style={{ background: "#375BD2", border: "1px solid rgba(55,91,210,0.5)" }}
          >
            <ChevronRight className="w-3.5 h-3.5 text-white" />
          </button>
        </div>
      </div>

      {/* Body — 3 columns */}
      <div className="px-4 pt-4 pb-4 grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* Column 1 — What's happening */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div
              className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(55,91,210,0.2)", border: "1px solid rgba(55,91,210,0.4)" }}
            >
              <span className="text-[8px] font-black text-[#5B7FE8]">?</span>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#375BD2]">
              What&apos;s Happening
            </span>
          </div>
          <p className="text-xs text-[#8892A4] leading-relaxed">
            {step.tour.happening}
          </p>
        </div>

        {/* Column 2 — Look for */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div
              className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(22,199,132,0.15)", border: "1px solid rgba(22,199,132,0.3)" }}
            >
              <Eye className="w-2.5 h-2.5 text-[#16C784]" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#16C784]">
              Look For
            </span>
          </div>
          <ul className="space-y-1.5">
            {step.tour.observe.map((bullet, i) => (
              <li key={i} className="flex items-start gap-1.5">
                <span
                  className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-black flex-shrink-0 mt-0.5"
                  style={{ background: "rgba(22,199,132,0.15)", color: "#16C784" }}
                >
                  {i + 1}
                </span>
                <span className="text-xs text-[#8892A4] leading-relaxed">{bullet}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Column 3 — What's next + action */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div
              className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(245,172,55,0.15)", border: "1px solid rgba(245,172,55,0.3)" }}
            >
              <ArrowRight className="w-2.5 h-2.5 text-[#F5AC37]" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#F5AC37]">
              {isLast ? "You&apos;re Done" : "What&apos;s Next"}
            </span>
          </div>
          <p className="text-xs text-[#8892A4] leading-relaxed mb-3">
            {step.tour.next}
          </p>

          {/* Action callout */}
          <div
            className="rounded-lg px-3 py-2"
            style={{ background: "rgba(245,172,55,0.06)", border: "1px solid rgba(245,172,55,0.2)" }}
          >
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#F5AC37] mb-0.5">
              Your Action
            </p>
            <p className="text-xs text-[#F5AC37]/70">{step.action}</p>
          </div>
        </div>
      </div>

      {/* Tech footer */}
      {step.techName && (
        <div
          className="px-4 py-2 flex items-center justify-between"
          style={{ borderTop: "1px solid rgba(55,91,210,0.1)", background: "rgba(0,0,0,0.2)" }}
        >
          <span className="text-[10px] text-[#252840] font-medium">Powered by</span>
          <span className="text-[10px] font-bold text-[#375BD2]/60">{step.techName}</span>
        </div>
      )}
    </div>
  );
}

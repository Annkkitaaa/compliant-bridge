"use client";
import { useState, useEffect } from "react";
import { Shield, Play, Square } from "lucide-react";
import { useDemoContext } from "@/context/DemoContext";

export default function Navbar() {
  const { demoMode, toggleDemo } = useDemoContext();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "border-b border-[#1F2235] shadow-[0_4px_32px_rgba(0,0,0,0.5)]"
          : "border-b border-transparent"
      }`}
      style={{
        background: scrolled
          ? "rgba(13,14,18,0.92)"
          : "rgba(13,14,18,0.6)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{
                background: "rgba(55,91,210,0.2)",
                border: "1px solid rgba(55,91,210,0.4)",
                boxShadow: "0 0 12px rgba(55,91,210,0.3)",
              }}
            >
              <Shield className="w-4 h-4 text-[#5B7FE8]" />
            </div>
            <span className="font-bold text-white text-[15px] tracking-tight">
              Compliant<span className="text-[#375BD2]">Bridge</span>
            </span>
          </div>

          {/* Right cluster */}
          <div className="flex items-center gap-3">
            {/* Powered by Chainlink badge */}
            <div
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold"
              style={{
                background: "rgba(55,91,210,0.1)",
                border: "1px solid rgba(55,91,210,0.25)",
                color: "#8892A4",
              }}
            >
              <div className="w-1.5 h-1.5 rounded-full bg-[#375BD2]" />
              Powered by Chainlink
            </div>

            {/* Demo toggle */}
            <button
              onClick={toggleDemo}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all duration-200 ${
                demoMode
                  ? "bg-[#F5AC37] border-[#F5AC37] text-black shadow-[0_0_16px_rgba(245,172,55,0.4)]"
                  : "bg-transparent border-[#1F2235] text-[#8892A4] hover:border-[#375BD2] hover:text-white"
              }`}
            >
              {demoMode ? <Square className="w-3 h-3" /> : <Play className="w-3 h-3" />}
              {demoMode ? "Exit Demo" : "Demo Mode"}
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}

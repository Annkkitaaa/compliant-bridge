"use client";
import { useState } from "react";
import { Link2 } from "lucide-react";

interface Props {
  name:        string;
  description: string;
  children?:   React.ReactNode;
}

export default function ChainlinkTooltip({ name, description, children }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <span className="relative inline-flex items-center gap-1.5">
      {children}
      <button
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onClick={() => setOpen(o => !o)}
        className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-500/20 hover:bg-blue-500/40 border border-blue-400/30 transition-all cursor-help flex-shrink-0"
        title={name}
      >
        <Link2 className="w-2.5 h-2.5 text-blue-300" />
      </button>

      {open && (
        <div
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 z-50 w-72 pointer-events-none"
          style={{ filter: "drop-shadow(0 8px 24px rgba(0,0,0,0.4))" }}
        >
          <div
            className="rounded-xl border border-blue-400/30 p-4"
            style={{ background: "linear-gradient(135deg, #0f1f3d 0%, #1a3a6f 100%)" }}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-5 h-5 rounded-full bg-blue-500/30 border border-blue-400/40 flex items-center justify-center flex-shrink-0">
                <Link2 className="w-3 h-3 text-blue-300" />
              </div>
              <p className="text-xs font-bold text-blue-200 tracking-wide">{name}</p>
            </div>
            <p className="text-xs text-blue-100/75 leading-relaxed">{description}</p>
          </div>
          {/* Arrow */}
          <div
            className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 border-r border-b border-blue-400/30"
            style={{ background: "#1a3a6f" }}
          />
        </div>
      )}
    </span>
  );
}

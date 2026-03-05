import { Lock, Cpu, ArrowRight, Globe } from "lucide-react";

const STEPS = [
  {
    num:   "01",
    icon:  Lock,
    title: "CRE Confidential Check",
    desc:  "Chainlink CRE executes KYC, sanctions, and jurisdiction checks inside a TEE. Raw identity data never leaves the enclave.",
    tech:  "Chainlink CRE · Confidential HTTP",
    color: "#375BD2",
    glow:  "rgba(55,91,210,0.25)",
  },
  {
    num:   "02",
    icon:  Cpu,
    title: "On-Chain Attestation",
    desc:  "A pass/fail attestation with tier, jurisdiction, and expiry is written to ComplianceGateway on Sepolia by the DON.",
    tech:  "Chainlink CRE · EVMClient",
    color: "#5B7FE8",
    glow:  "rgba(91,127,232,0.25)",
  },
  {
    num:   "03",
    icon:  ArrowRight,
    title: "CCIP Bridge",
    desc:  "AttestationSender uses Chainlink CCIP to relay the attestation to any destination chain. Contract pays LINK fees.",
    tech:  "Chainlink CCIP",
    color: "#7B5CF8",
    glow:  "rgba(123,92,248,0.25)",
  },
  {
    num:   "04",
    icon:  Globe,
    title: "Destination Chain",
    desc:  "AttestationReceiver stores the attestation. ComplianceToken enforces it on every transfer — cross-chain, instantly.",
    tech:  "ComplianceToken · ComplianceGateway",
    color: "#16C784",
    glow:  "rgba(22,199,132,0.25)",
  },
] as const;

export default function HowItWorks() {
  return (
    <section className="py-24 relative"
      style={{ background: "linear-gradient(180deg, #0D0E12 0%, #0F1118 100%)" }}
    >
      {/* Section header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-4"
            style={{ background: "rgba(55,91,210,0.08)", border: "1px solid rgba(55,91,210,0.2)" }}
          >
            <span className="text-xs font-bold uppercase tracking-widest text-[#375BD2]">
              How It Works
            </span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight mb-4">
            Compliance verified once.
            <span className="text-[#8892A4]"> Enforced everywhere.</span>
          </h2>
          <p className="text-[#8892A4] max-w-xl mx-auto text-[15px]">
            Four steps from identity check to cross-chain token transfer — all powered by Chainlink.
          </p>
        </div>

        {/* Steps grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 relative">
          {/* Connecting line (desktop) */}
          <div
            className="absolute top-[52px] left-[calc(25%+40px)] right-[calc(25%+40px)] h-px hidden lg:block"
            style={{ background: "linear-gradient(90deg, rgba(55,91,210,0.4) 0%, rgba(123,92,248,0.4) 50%, rgba(22,199,132,0.4) 100%)" }}
          />

          {STEPS.map((step, idx) => {
            const Icon = step.icon;
            return (
              <div key={step.num} className="relative group">
                {/* Arrow between cards (mobile/tablet) */}
                {idx < STEPS.length - 1 && (
                  <div className="lg:hidden absolute -right-3 top-12 z-10">
                    <ArrowRight className="w-4 h-4 text-[#1F2235]" />
                  </div>
                )}

                <div
                  className="card-glow p-6 h-full flex flex-col gap-4 transition-all duration-300"
                  style={{ "--hover-glow": step.glow } as React.CSSProperties}
                >
                  {/* Icon + number */}
                  <div className="flex items-start justify-between">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300"
                      style={{
                        background: `rgba(${step.color === "#375BD2" ? "55,91,210" : step.color === "#5B7FE8" ? "91,127,232" : step.color === "#7B5CF8" ? "123,92,248" : "22,199,132"},0.15)`,
                        border: `1px solid rgba(${step.color === "#375BD2" ? "55,91,210" : step.color === "#5B7FE8" ? "91,127,232" : step.color === "#7B5CF8" ? "123,92,248" : "22,199,132"},0.3)`,
                        boxShadow: `0 0 20px ${step.glow}`,
                      }}
                    >
                      <Icon className="w-5 h-5" style={{ color: step.color }} />
                    </div>
                    <span
                      className="text-4xl font-black opacity-10 leading-none"
                      style={{ color: step.color }}
                    >
                      {step.num}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="text-white font-bold text-[15px] leading-snug">
                    {step.title}
                  </h3>

                  {/* Description */}
                  <p className="text-[#8892A4] text-[13px] leading-relaxed flex-1">
                    {step.desc}
                  </p>

                  {/* Tech badge */}
                  <div
                    className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1.5 rounded-lg self-start"
                    style={{
                      color: step.color,
                      background: `rgba(${step.color === "#375BD2" ? "55,91,210" : step.color === "#5B7FE8" ? "91,127,232" : step.color === "#7B5CF8" ? "123,92,248" : "22,199,132"},0.1)`,
                      border: `1px solid rgba(${step.color === "#375BD2" ? "55,91,210" : step.color === "#5B7FE8" ? "91,127,232" : step.color === "#7B5CF8" ? "123,92,248" : "22,199,132"},0.2)`,
                    }}
                  >
                    {step.tech}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

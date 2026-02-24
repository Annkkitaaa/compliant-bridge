"use client";
import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { DEMO_STEPS, type DemoTabId } from "@/lib/demoScript";

export type { DemoTabId };
export type TabId = DemoTabId; // re-export for page.tsx

interface DemoContextValue {
  demoMode:     boolean;
  toggleDemo:   () => void;
  currentStep:  number;
  setStep:      (n: number) => void;
  nextStep:     () => void;
  prevStep:     () => void;
  activeTab:    TabId;
  setActiveTab: (t: TabId) => void;
}

const DemoContext = createContext<DemoContextValue>({
  demoMode:    false,
  toggleDemo:  () => {},
  currentStep: 0,
  setStep:     () => {},
  nextStep:    () => {},
  prevStep:    () => {},
  activeTab:   "public",
  setActiveTab: () => {},
});

export function DemoProvider({ children }: { children: ReactNode }) {
  const [demoMode,    setDemoMode]    = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [activeTab,   setActiveTab]   = useState<TabId>("public");

  const toggleDemo = useCallback(() => {
    setDemoMode(d => {
      if (!d) { setCurrentStep(0); setActiveTab("public"); }
      return !d;
    });
  }, []);

  const setStep = useCallback((n: number) => {
    const clamped = Math.max(0, Math.min(n, DEMO_STEPS.length - 1));
    setCurrentStep(clamped);
    setActiveTab(DEMO_STEPS[clamped].tab);
  }, []);

  const nextStep = useCallback(() => {
    setCurrentStep(s => {
      const next = Math.min(s + 1, DEMO_STEPS.length - 1);
      setActiveTab(DEMO_STEPS[next].tab);
      return next;
    });
  }, []);

  const prevStep = useCallback(() => {
    setCurrentStep(s => {
      const prev = Math.max(s - 1, 0);
      setActiveTab(DEMO_STEPS[prev].tab);
      return prev;
    });
  }, []);

  return (
    <DemoContext.Provider value={{
      demoMode, toggleDemo,
      currentStep, setStep, nextStep, prevStep,
      activeTab, setActiveTab,
    }}>
      {children}
    </DemoContext.Provider>
  );
}

export function useDemoContext() {
  return useContext(DemoContext);
}

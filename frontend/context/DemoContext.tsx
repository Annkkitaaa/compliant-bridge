"use client";
import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
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

  // Sync activeTab with currentStep whenever step changes in demo mode.
  // useEffect avoids calling setState inside a state-updater (React 18 batching glitch).
  useEffect(() => {
    if (demoMode) {
      setActiveTab(DEMO_STEPS[currentStep].tab);
    }
  }, [demoMode, currentStep]);

  const toggleDemo = useCallback(() => {
    setDemoMode(d => {
      // Reset BOTH entering and exiting — so exit always returns to clean state
      setCurrentStep(0);
      setActiveTab("public");
      return !d;
    });
  }, []);

  // Step updaters only change currentStep; useEffect above syncs the tab
  const setStep = useCallback((n: number) => {
    setCurrentStep(Math.max(0, Math.min(n, DEMO_STEPS.length - 1)));
  }, []);

  const nextStep = useCallback(() => {
    setCurrentStep(s => Math.min(s + 1, DEMO_STEPS.length - 1));
  }, []);

  const prevStep = useCallback(() => {
    setCurrentStep(s => Math.max(s - 1, 0));
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

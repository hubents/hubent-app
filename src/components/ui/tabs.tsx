"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface Tab {
  value: string;
  label: string;
  content: React.ReactNode;
}

interface TabsProps {
  tabs: Tab[];
  defaultValue?: string;
  className?: string;
}

const Tabs = ({ tabs, defaultValue, className }: TabsProps) => {
  const [activeTab, setActiveTab] = React.useState(defaultValue || tabs[0]?.value);

  return (
    <div className={cn("w-full", className)}>
      <div className="border-b border-[var(--border)]">
        <nav className="flex gap-1" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={cn(
                "relative px-4 py-2.5 text-sm font-medium transition-colors duration-200",
                activeTab === tab.value
                  ? "text-[var(--primary)]"
                  : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              )}
            >
              {tab.label}
              {activeTab === tab.value && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--primary)] animate-in slide-in-from-left-2 duration-200" />
              )}
            </button>
          ))}
        </nav>
      </div>
      <div className="mt-4">
        {tabs.map((tab) => (
          <div
            key={tab.value}
            className={cn(
              "animate-in fade-in-50 duration-200",
              activeTab === tab.value ? "block" : "hidden"
            )}
          >
            {tab.content}
          </div>
        ))}
      </div>
    </div>
  );
};

export { Tabs };

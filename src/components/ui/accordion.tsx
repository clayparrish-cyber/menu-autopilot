"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

interface AccordionProps {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  badge?: ReactNode;
  className?: string;
}

export function Accordion({ title, children, defaultOpen = false, badge, className = "" }: AccordionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={`border border-gray-200 rounded-xl overflow-hidden ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-5 py-4 bg-white hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-900">{title}</span>
          {badge}
        </div>
        <ChevronDown
          className={`h-4 w-4 text-gray-500 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>
      {isOpen && (
        <div className="px-5 py-4 border-t border-gray-100 bg-gray-50">
          {children}
        </div>
      )}
    </div>
  );
}

interface AccordionGroupProps {
  children: ReactNode;
  className?: string;
}

export function AccordionGroup({ children, className = "" }: AccordionGroupProps) {
  return <div className={`space-y-3 ${className}`}>{children}</div>;
}

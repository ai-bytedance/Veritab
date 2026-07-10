import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";

interface Option {
  value: string;
  label: string;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  focusRingColorClassName?: string; // e.g., "focus:border-rose-500 focus:ring-rose-50/50"
  activeBgClassName?: string; // e.g., "bg-rose-50/50" or "bg-indigo-50/50"
  activeTextClassName?: string; // e.g., "text-indigo-750" or "text-indigo-750"
  disabled?: boolean;
  triggerClassName?: string;
}

export default function CustomSelect({
  value,
  onChange,
  options,
  focusRingColorClassName = "focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100/50",
  activeBgClassName = "bg-indigo-50/80",
  activeTextClassName = "text-indigo-700",
  disabled = false,
  triggerClassName = "w-full flex items-center justify-between rounded-xl border border-slate-200 bg-white pl-3 pr-2.5 py-2.5 text-xs text-slate-800 outline-none transition-all cursor-pointer font-bold shadow-3xs hover:border-slate-300 text-left disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed",
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const selectedOption = options.find((opt) => opt.value === value) || options[0];

  return (
    <div className="relative w-full text-left" ref={containerRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`${triggerClassName} ${focusRingColorClassName}`}
      >
        <span className="truncate pr-2">
          {selectedOption ? selectedOption.label : "请选择"}
        </span>
        <ChevronDown
          className={`h-3.5 w-3.5 text-slate-400 shrink-0 transition-transform duration-200 ${
            isOpen ? "transform rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-1.5 w-full max-h-60 overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg z-50 animate-slide-up origin-top text-left">
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-4 py-2.5 text-xs font-bold text-left transition-colors cursor-pointer ${
                  isSelected
                    ? `${activeBgClassName} ${activeTextClassName}`
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <span className="truncate pr-2">{option.label}</span>
                {isSelected && (
                  <Check className="h-3.5 w-3.5 shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

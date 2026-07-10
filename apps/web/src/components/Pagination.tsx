/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { ChevronLeft, ChevronRight, MoreHorizontal, ChevronDown, Check } from "lucide-react";

interface PaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  themeColor?: "indigo" | "rose" | "slate";
}

export default function Pagination({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  themeColor = "indigo",
}: PaginationProps) {
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const activePage = Math.min(currentPage, totalPages);

  const [isSelectOpen, setIsSelectOpen] = React.useState(false);
  const selectRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsSelectOpen(false);
      }
    }
    if (isSelectOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isSelectOpen]);

  // Theme configuration
  const themeClasses = {
    indigo: {
      activeBg: "bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-600",
      activeText: "text-indigo-600 bg-indigo-50 border-indigo-200",
      focusBorder: "focus:border-indigo-500",
      hoverBg: "hover:bg-indigo-50 hover:text-indigo-600",
    },
    rose: {
      activeBg: "bg-rose-600 hover:bg-rose-700 text-white border-rose-600",
      activeText: "text-rose-600 bg-rose-50 border-rose-200",
      focusBorder: "focus:border-rose-500",
      hoverBg: "hover:bg-rose-50 hover:text-rose-600",
    },
    slate: {
      activeBg: "bg-slate-800 hover:bg-slate-950 text-white border-slate-800",
      activeText: "text-slate-800 bg-slate-100 border-slate-300",
      focusBorder: "focus:border-slate-500",
      hoverBg: "hover:bg-slate-100 hover:text-slate-800",
    },
  }[themeColor];

  const selectThemeClasses = {
    indigo: {
      optionActive: "bg-indigo-50 text-indigo-700 font-bold",
      optionHover: "hover:bg-indigo-50/50 hover:text-indigo-600",
      triggerActive: "border-indigo-500 bg-white ring-2 ring-indigo-100/50",
      checkColor: "text-indigo-600",
    },
    rose: {
      optionActive: "bg-rose-50 text-rose-700 font-bold",
      optionHover: "hover:bg-rose-50/50 hover:text-rose-600",
      triggerActive: "border-rose-500 bg-white ring-2 ring-rose-100/50",
      checkColor: "text-rose-600",
    },
    slate: {
      optionActive: "bg-slate-100 text-slate-800 font-bold",
      optionHover: "hover:bg-slate-50 hover:text-slate-800",
      triggerActive: "border-slate-500 bg-white ring-2 ring-slate-100",
      checkColor: "text-slate-800",
    },
  }[themeColor];

  // Generate page numbers to display with ellipsis
  const getPageNumbers = () => {
    const pages: (number | "ellipsis")[] = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always include page 1
      pages.push(1);

      const leftBoundary = Math.max(2, activePage - 1);
      const rightBoundary = Math.min(totalPages - 1, activePage + 1);

      if (leftBoundary > 2) {
        pages.push("ellipsis");
      }

      for (let i = leftBoundary; i <= rightBoundary; i++) {
        pages.push(i);
      }

      if (rightBoundary < totalPages - 1) {
        pages.push("ellipsis");
      }

      // Always include last page
      pages.push(totalPages);
    }

    return pages;
  };

  const pages = getPageNumbers();

  return (
    <div className="border-t border-slate-100 pt-4 pb-1 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
      {/* Items Count and Size Selector */}
      <div className="flex items-center gap-3">
        <span className="font-medium text-slate-500">
          共 <span className="font-bold text-slate-800">{totalItems}</span> 条数据
        </span>
        {onPageSizeChange && (
          <div className="flex items-center gap-1.5 border-l border-slate-200 pl-3">
            <span className="text-[11px] text-slate-400">单页显示:</span>
            <div ref={selectRef} className="relative select-none">
              <button
                type="button"
                onClick={() => setIsSelectOpen(!isSelectOpen)}
                className={`flex items-center gap-1 bg-slate-50/60 hover:bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-700 font-bold transition-all cursor-pointer outline-none ${
                  isSelectOpen ? selectThemeClasses.triggerActive : ""
                }`}
              >
                <span>{pageSize} 条/页</span>
                <ChevronDown
                  className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-200 shrink-0 ${
                    isSelectOpen ? "transform rotate-180 text-indigo-500" : ""
                  }`}
                />
              </button>

              {isSelectOpen && (
                <div className="absolute bottom-full mb-1 left-0 z-50 min-w-[100px] bg-white border border-slate-150 rounded-xl shadow-xl py-1 flex flex-col animate-fade-in animate-duration-150">
                  {[5, 10, 15, 20, 30, 50].map((size) => {
                    const isSelected = size === pageSize;
                    return (
                      <button
                        key={size}
                        type="button"
                        onClick={() => {
                          onPageSizeChange(size);
                          setIsSelectOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-[11px] font-medium transition-colors cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? selectThemeClasses.optionActive
                            : `text-slate-600 ${selectThemeClasses.optionHover}`
                        }`}
                      >
                        <span>{size} 条/页</span>
                        {isSelected && <Check className={`h-3 w-3 shrink-0 ${selectThemeClasses.checkColor}`} />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center gap-1.5 select-none">
        {/* Previous Page Button */}
        <button
          onClick={() => onPageChange(Math.max(1, activePage - 1))}
          disabled={activePage === 1}
          className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 disabled:opacity-35 disabled:hover:bg-transparent disabled:text-slate-400 cursor-pointer disabled:cursor-not-allowed transition-all"
          title="上一页"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {/* Page Numeric Buttons */}
        {pages.map((page, idx) => {
          if (page === "ellipsis") {
            return (
              <span
                key={`ellipsis-${idx}`}
                className="w-8 h-8 flex items-center justify-center text-slate-400"
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </span>
            );
          }

          const isCurrent = page === activePage;
          return (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                isCurrent
                  ? themeClasses.activeBg
                  : `border-slate-200 bg-white text-slate-600 ${themeClasses.hoverBg}`
              }`}
            >
              {page}
            </button>
          );
        })}

        {/* Next Page Button */}
        <button
          onClick={() => onPageChange(Math.min(totalPages, activePage + 1))}
          disabled={activePage === totalPages}
          className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 disabled:opacity-35 disabled:hover:bg-transparent disabled:text-slate-400 cursor-pointer disabled:cursor-not-allowed transition-all"
          title="下一页"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

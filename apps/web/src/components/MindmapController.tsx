/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from "react";
import {
  Keyboard as KeyboardIcon,
  Maximize2 as MaximizeIcon,
  Minimize2 as MinimizeIcon,
  Compass as CompassIcon,
  RotateCcw as RotateCcwIcon,
  Sparkles as SparklesIcon,
  Trash2 as TrashIcon,
  CheckSquare as CheckIcon,
  LayoutGrid,
  LayoutList
} from "lucide-react";

interface MindmapControllerProps {
  scale: number;
  onScaleChange: (scale: number) => void;
  onFitScreen: () => void;
  isCompact: boolean;
  onToggleCompact: () => void;
  totalCompletedCount: number;
  totalStepsCount: number;
  isFullscreen?: boolean;
}

export default function MindmapController({
  scale,
  onScaleChange,
  onFitScreen,
  isCompact,
  onToggleCompact,
  totalCompletedCount,
  totalStepsCount,
  isFullscreen = false
}: MindmapControllerProps) {
  const [showShortcuts, setShowShortcuts] = useState<boolean>(false);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem("veritab_xmind_controller_collapsed");
      return stored !== null ? stored === "true" : true;
    } catch (e) {
      return true;
    }
  });
  const containerRef = useRef<HTMLDivElement>(null);

  // Close shortcuts popup if clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowShortcuts(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleToggleCollapsed = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem("veritab_xmind_controller_collapsed", String(next));
      } catch (e) {}
      return next;
    });
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onScaleChange(Number(e.target.value));
  };

  if (isCollapsed) {
    return (
      <div ref={containerRef} className={`${isFullscreen ? "fixed z-[600]" : "absolute z-[40]"} bottom-6 left-6 flex items-center gap-2 font-sans select-none pointer-events-auto`}>
        <button
          type="button"
          onClick={handleToggleCollapsed}
          className="flex items-center gap-2 bg-slate-900/95 hover:bg-slate-800 text-white border border-slate-800 px-3.5 py-2 rounded-xl shadow-2xl transition-all cursor-pointer hover:scale-[1.03] active:scale-95 duration-200"
          title="展开脑图工具面板"
        >
          <span className="text-[11px] font-black tracking-wide">控制面板</span>
          <span className="text-indigo-400 font-extrabold text-xs ml-0.5">展开 »</span>
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`${isFullscreen ? "fixed z-[600]" : "absolute z-[40]"} bottom-6 left-6 flex items-end gap-3 select-none pointer-events-auto font-sans`}>

      {/* Integrated Unified console bar */}
      <div className="flex items-center bg-slate-950/90 backdrop-blur-md text-white rounded-2xl shadow-2xl border border-slate-800/80 p-2 px-3.5 gap-4 max-w-[92vw]">

        {/* Collapse Button */}
        <button
          type="button"
          onClick={handleToggleCollapsed}
          className="px-2.5 py-1 h-7.5 flex items-center justify-center gap-1 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer border border-slate-800 bg-slate-900/50"
          title="收起工具栏"
        >
          <span className="text-[10px] font-bold">« 收起</span>
        </button>

        {/* Separator */}
        <div className="w-[1px] h-4 bg-slate-800 shrink-0" />

        {/* Zoom Slider Panel */}
        <div className="relative flex items-center gap-2.5 group/slider shrink-0">
          <span className="text-[10.5px] font-black text-slate-400 min-w-[32px] text-right">{scale}%</span>
          <div className="relative flex items-center w-[85px] sm:w-[100px]">
            <input
              type="range"
              min="50"
              max="150"
              value={scale}
              onChange={handleSliderChange}
              className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 hover:accent-indigo-400"
              style={{
                background: `linear-gradient(to right, #6366f1 0%, #6366f1 ${((scale - 50) / 100) * 100}%, #1e293b ${((scale - 50) / 100) * 100}%, #1e293b 100%)`
              }}
            />
          </div>
        </div>

        {/* View adjustments */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onFitScreen}
            className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-800 text-slate-400 hover:text-indigo-400 transition-colors cursor-pointer border border-transparent hover:border-slate-800 bg-slate-900/20"
            title="自适应居中视图 (✥)"
          >
            <CompassIcon className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* Separator */}
        <div className="w-[1px] h-4 bg-slate-800 shrink-0" />

        {/* Unified actions button dock */}
        <div className="flex items-center shrink-0">
          {/* Toggle compact / comfortable */}
          <button
            type="button"
            onClick={onToggleCompact}
            className={`p-1.5 px-3 h-8 flex items-center gap-1.5 text-[10.5px] font-black rounded-xl transition-all cursor-pointer border shrink-0 ${
              isCompact
                ? "bg-indigo-600 border-indigo-500 text-white hover:bg-indigo-500 shadow-md shadow-indigo-900/20"
                : "bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300"
            }`}
            title={isCompact ? "切换到舒适大图模式" : "切换到极简紧凑布局"}
          >
            {isCompact ? (
              <>
                <LayoutGrid className="h-3.5 w-3.5 text-white" />
                <span>紧凑</span>
              </>
            ) : (
              <>
                <LayoutList className="h-3.5 w-3.5 text-indigo-400" />
                <span>舒适</span>
              </>
            )}
          </button>
        </div>

        {/* Separator */}
        <div className="w-[1px] h-4 bg-slate-800 shrink-0" />

        {/* Keyboard popover switch */}
        <button
          type="button"
          onClick={() => setShowShortcuts(!showShortcuts)}
          className={`w-8 h-8 flex items-center justify-center rounded-xl transition-all cursor-pointer shrink-0 border ${
            showShortcuts
              ? "bg-indigo-600 border-indigo-500 text-white font-extrabold shadow-md shadow-indigo-900/20"
              : "bg-slate-900/20 border-transparent hover:bg-slate-800 text-slate-400 hover:text-white hover:border-slate-800"
          }`}
          title="键盘快捷键指南 (⌨️)"
        >
          <KeyboardIcon className="h-4.5 w-4.5" />
        </button>
      </div>

      {/* Shortcuts Guide Overlay */}
      {showShortcuts && (
        <div className="absolute bottom-[60px] left-0 bg-white border-[2.5px] border-slate-800 rounded-2xl shadow-2xl p-5 w-full max-w-[calc(100vw-2rem)] sm:w-[420px] text-left animate-in fade-in-50 slide-in-from-bottom-2 duration-150 text-slate-800">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
            <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
              <SparklesIcon className="h-4 w-4 text-indigo-600 animate-pulse" />
              <span>回归快捷键指南 (脑图操作)</span>
            </h4>
            <span className="text-[9px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-black select-none">
              闭环快捷操作
            </span>
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-3.5">
            {/* Left Column */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-500 font-extrabold">展开/收起选中项</span>
                <kbd className="bg-slate-100 border border-slate-300 shadow-3xs rounded-md p-0.5 px-2 font-mono text-[10px] text-slate-700 font-extrabold">/</kbd>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-500 font-extrabold">新增同级用例</span>
                <kbd className="bg-slate-100 border border-slate-300 shadow-3xs rounded-md p-0.5 px-2 font-mono text-[10px] text-slate-700 font-extrabold">Enter / C</kbd>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-500 font-extrabold">新增用例步骤</span>
                <kbd className="bg-slate-100 border border-slate-300 shadow-3xs rounded-md p-0.5 px-2 font-mono text-[10px] text-slate-700 font-extrabold">Tab</kbd>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-500 font-extrabold">上下切换选中节点</span>
                <kbd className="bg-slate-100 border border-slate-300 shadow-3xs rounded-md p-0.5 px-2 font-mono text-[10px] text-slate-700 font-extrabold">↑ / ↓</kbd>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-2.5 border-l border-slate-100 pl-4">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-500 font-extrabold">新增同级目录 (M)</span>
                <kbd className="bg-slate-100 border border-slate-300 shadow-3xs rounded-md p-0.5 px-2 font-mono text-[10px] text-slate-700 font-extrabold">M</kbd>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-500 font-extrabold">新增下级目录</span>
                <kbd className="bg-slate-100 border border-slate-300 shadow-3xs rounded-md p-0.5 px-2 font-mono text-[10px] text-slate-700 font-extrabold">Shift + M</kbd>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-500 font-extrabold">彻底删除选中项</span>
                <kbd className="bg-slate-100 border border-slate-300 shadow-3xs rounded-md p-0.5 px-2 font-mono text-[10px] text-slate-700 font-extrabold">Backspace / Del</kbd>
              </div>
            </div>
          </div>

          <div className="mt-4 border-t border-slate-100 pt-2.5 flex items-center justify-between text-[10px] text-slate-400 font-semibold">
            <span>双击节点或按回车可以进行编辑修改</span>
            <span>Esc 键退出全屏模式</span>
          </div>
        </div>
      )}

    </div>
  );
}

import React, { useState, useEffect, useRef } from "react";
import { GripVertical, MoreHorizontal, Plus, Trash2, Copy, ArrowUp, ArrowDown } from "lucide-react";

interface StepRow {
  step: string;
  expected: string;
}

interface EditableStepsTableProps {
  steps: string;
  expectedResult: string;
  onChange: (steps: string, expectedResult: string) => void;
}

interface AutoResizeTextareaProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  id?: string;
  placeholder?: string;
  className?: string;
}

function AutoResizeTextarea({ value, onChange, id, placeholder, className }: AutoResizeTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.max(textarea.scrollHeight, 44)}px`;
    }
  };

  useEffect(() => {
    adjustHeight();
  }, [value]);

  return (
    <textarea
      id={id}
      ref={textareaRef}
      value={value}
      onChange={(e) => {
        onChange(e);
        adjustHeight();
      }}
      placeholder={placeholder}
      className={className}
    />
  );
}

export default function EditableStepsTable({
  steps,
  expectedResult,
  onChange,
}: EditableStepsTableProps) {
  const [rows, setRows] = useState<StepRow[]>([]);
  const [activeMenuIndex, setActiveMenuIndex] = useState<number | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Parse strings into list of objects on mount or when steps/expected change externally
  useEffect(() => {
    const rawSteps = steps ? steps.split("\n") : [];
    const rawExpects = expectedResult ? expectedResult.split("\n") : [];
    const maxLen = Math.max(rawSteps.length, rawExpects.length, 1);

    const parsedRows = Array.from({ length: maxLen }, (_, i) => ({
      step: rawSteps[i] || "",
      expected: rawExpects[i] || "",
    }));

    // Deep equal check to avoid infinite loops
    const currentSerialized = JSON.stringify(rows);
    const nextSerialized = JSON.stringify(parsedRows);
    if (currentSerialized !== nextSerialized) {
      setRows(parsedRows);
    }
  }, [steps, expectedResult]);

  // Click outside to close actions menu
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenuIndex(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Update specific field and trigger change upward
  const handleCellChange = (index: number, key: keyof StepRow, value: string) => {
    const updated = [...rows];
    updated[index][key] = value.replace(/\n/g, " "); // Keep as single line in cell to avoid splitting issues
    setRows(updated);
    notifyChanges(updated);
  };

  const notifyChanges = (currentRows: StepRow[]) => {
    const stepsStr = currentRows.map((r) => r.step.trim()).join("\n");
    const expectsStr = currentRows.map((r) => r.expected.trim()).join("\n");
    onChange(stepsStr, expectsStr);
  };

  // Add row at bottom
  const handleAddRow = () => {
    const updated = [...rows, { step: "", expected: "" }];
    setRows(updated);
    notifyChanges(updated);
  };

  // Duplicate current row
  const handleDuplicateRow = (index: number) => {
    const updated = [...rows];
    updated.splice(index + 1, 0, { ...updated[index] });
    setRows(updated);
    setActiveMenuIndex(null);
    notifyChanges(updated);
  };

  // Insert blank above
  const handleInsertAbove = (index: number) => {
    const updated = [...rows];
    updated.splice(index, 0, { step: "", expected: "" });
    setRows(updated);
    setActiveMenuIndex(null);
    notifyChanges(updated);
  };

  // Insert blank below
  const handleInsertBelow = (index: number) => {
    const updated = [...rows];
    updated.splice(index + 1, 0, { step: "", expected: "" });
    setRows(updated);
    setActiveMenuIndex(null);
    notifyChanges(updated);
  };

  // Delete row
  const handleDeleteRow = (index: number) => {
    if (rows.length <= 1) {
      // Just clear the row instead of deleting if it's the last one
      const updated = [{ step: "", expected: "" }];
      setRows(updated);
      setActiveMenuIndex(null);
      notifyChanges(updated);
      return;
    }
    const updated = rows.filter((_, i) => i !== index);
    setRows(updated);
    setActiveMenuIndex(null);
    notifyChanges(updated);
  };

  // HTML5 Drag and Drop events
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
    // For transparent drag preview setup
    e.dataTransfer.setData("text/plain", index.toString());
  };

  const handleDragOver = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) return;

    const updated = [...rows];
    const draggedItem = updated[draggedIndex];
    updated.splice(draggedIndex, 1);
    updated.splice(targetIndex, 0, draggedItem);

    setDraggedIndex(targetIndex);
    setRows(updated);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    notifyChanges(rows);
  };

  return (
    <div className="border border-slate-200/70 rounded-2xl bg-white overflow-hidden shadow-xs relative">
      {/* Table Headings */}
      <div className="grid grid-cols-12 gap-2 bg-slate-50/50 px-4 py-2 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-wider select-none">
        <div className="col-span-1 text-center flex items-center justify-center">序号</div>
        <div className="col-span-6 flex items-center">用例步骤</div>
        <div className="col-span-4 flex items-center">预期结果</div>
        <div className="col-span-1 text-center flex items-center justify-center">操作</div>
      </div>

      {/* Rows Container */}
      <div className="divide-y divide-slate-100 max-h-[440px] overflow-y-auto custom-scrollbar">
        {rows.map((row, index) => {
          const isDragged = draggedIndex === index;
          return (
            <div
              key={index}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              className={`grid grid-cols-12 gap-2 px-4 py-2.5 items-center transition-colors hover:bg-indigo-50/10 ${
                isDragged ? "bg-indigo-50 border-y border-indigo-150 opacity-50" : ""
              }`}
            >
              {/* Drag control & Badge */}
              <div className="col-span-1 flex items-center justify-center gap-2 select-none">
                <span className="p-1 cursor-grab text-slate-350 hover:text-slate-500 active:cursor-grabbing">
                  <GripVertical className="h-3.5 w-3.5" />
                </span>
                <span className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-mono font-black text-slate-500">
                  {index + 1}
                </span>
              </div>

              {/* Step Input */}
              <div className="col-span-6">
                <AutoResizeTextarea
                  id={`step-textarea-${index}`}
                  value={row.step}
                  onChange={(e) => handleCellChange(index, "step", e.currentTarget.value)}
                  placeholder="请输入步骤描述..."
                  className="w-full bg-slate-50/50 border border-slate-200/85 rounded-xl px-2.5 py-1.5 text-xs text-slate-700 focus:bg-white focus:border-indigo-400 outline-none transition-all font-medium resize-none min-h-[44px] custom-scrollbar leading-relaxed"
                />
              </div>

              {/* Expected Result Input */}
              <div className="col-span-4">
                <AutoResizeTextarea
                  id={`expected-textarea-${index}`}
                  value={row.expected}
                  onChange={(e) => handleCellChange(index, "expected", e.currentTarget.value)}
                  placeholder="请输入预期结果..."
                  className="w-full bg-slate-50/50 border border-slate-200/85 rounded-xl px-2.5 py-1.5 text-xs text-slate-700 focus:bg-white focus:border-indigo-400 outline-none transition-all font-medium resize-none min-h-[44px] custom-scrollbar leading-relaxed"
                />
              </div>

              {/* Operations with more dropdown */}
              <div className="col-span-1 flex items-center justify-center relative">
                <button
                  id={`row-menu-btn-${index}`}
                  type="button"
                  onClick={() => setActiveMenuIndex(index === activeMenuIndex ? null : index)}
                  className="p-1.5 rounded-lg border border-slate-200/40 text-slate-500 hover:text-indigo-600 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </button>

                {/* Dropdown popup */}
                {activeMenuIndex === index && (
                  <div
                    id={`row-dropdown-popup-${index}`}
                    ref={menuRef}
                    className={`absolute right-0 ${
                      index >= rows.length - 2 && rows.length >= 3 ? "bottom-8 mb-1" : "top-8 mt-1"
                    } w-32 bg-white rounded-xl shadow-lg border border-slate-150 py-1.5 z-40 animate-fade-in text-left text-xs font-semibold`}
                  >
                    <button
                      id={`row-dup-btn-${index}`}
                      type="button"
                      onClick={() => handleDuplicateRow(index)}
                      className="w-full px-3 py-1.5 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 transition-colors flex items-center gap-2 cursor-pointer"
                    >
                      <Copy className="h-3.5 w-3.5 text-slate-400" />
                      <span>复制</span>
                    </button>
                    <button
                      id={`row-insert-above-btn-${index}`}
                      type="button"
                      onClick={() => handleInsertAbove(index)}
                      className="w-full px-3 py-1.5 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 transition-colors flex items-center gap-2 cursor-pointer"
                    >
                      <ArrowUp className="h-3.5 w-3.5 text-slate-400" />
                      <span>在上方插入</span>
                    </button>
                    <button
                      id={`row-insert-below-btn-${index}`}
                      type="button"
                      onClick={() => handleInsertBelow(index)}
                      className="w-full px-3 py-1.5 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 transition-colors flex items-center gap-2 cursor-pointer"
                    >
                      <ArrowDown className="h-3.5 w-3.5 text-slate-400" />
                      <span>在下方插入</span>
                    </button>
                    <div className="border-t border-slate-100 my-1"></div>
                    <button
                      id={`row-delete-btn-${index}`}
                      type="button"
                      onClick={() => handleDeleteRow(index)}
                      className="w-full px-3 py-1.5 text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2 cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-red-400" />
                      <span>删除步骤</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add blank step button */}
      <div className="px-4 py-2 border-t border-slate-100 bg-slate-50/20">
        <button
          id="add-step-btn"
          type="button"
          onClick={handleAddRow}
          className="flex items-center gap-1.5 text-indigo-600 hover:text-indigo-700 text-xs font-bold transition-colors cursor-pointer select-none"
        >
          <Plus className="h-4 w-4" />
          <span>添加步骤</span>
        </button>
      </div>
    </div>
  );
}

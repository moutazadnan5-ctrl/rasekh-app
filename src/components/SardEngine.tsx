import { useState, useEffect } from 'react';

interface SardEngineProps {
  startPage: number;
  endPage: number;
  mistakes: number;
  onCalculate: (matana: number) => void;
}

export default function SardEngine({ startPage, endPage, mistakes, onCalculate }: SardEngineProps) {
  const calculateMatana = () => {
    const totalPages = endPage - startPage + 1;
    if (totalPages <= 0) return 0;
    
    // Formula: (1 - (mistakes / (totalPages * 5))) * 100
    // Assuming 5 mistakes per page is 0% strength
    const strength = Math.max(0, (1 - (mistakes / (totalPages * 5))) * 100);
    return Math.round(strength);
  };

  useEffect(() => {
    onCalculate(calculateMatana());
  }, [startPage, endPage, mistakes]);

  return (
    <div className="p-4 bg-white/5 rounded-xl border border-white/5 space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-[10px] text-white/40 mb-1 uppercase">من صفحة</label>
          <input 
            type="number" 
            min="1" 
            max="604" 
            className="w-full input-field bg-surface text-center"
            value={startPage}
            readOnly
          />
        </div>
        <div>
          <label className="block text-[10px] text-white/40 mb-1 uppercase">إلى صفحة</label>
          <input 
            type="number" 
            min="1" 
            max="604" 
            className="w-full input-field bg-surface text-center"
            value={endPage}
            readOnly
          />
        </div>
        <div>
          <label className="block text-[10px] text-white/40 mb-1 uppercase">الأخطاء</label>
          <input 
            type="number" 
            className="w-full input-field bg-surface text-center"
            value={mistakes}
            readOnly
          />
        </div>
      </div>
      
      <div className="flex items-center justify-between">
        <span className="text-xs text-white/40">قوة الحفظ التقديرية:</span>
        <span className="text-lg font-black text-primary-custom">{calculateMatana()}%</span>
      </div>
    </div>
  );
}

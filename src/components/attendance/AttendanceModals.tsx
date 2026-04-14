import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';

interface SardModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentId: string | null;
  initialStart: number | null;
  initialEnd: number | null;
  initialN: number;
  initialR: number;
  onSave: (start: number | null, end: number | null, n: number, r: number, matana: number) => void;
}

export function SardModal({ isOpen, onClose, studentId, initialStart, initialEnd, initialN, initialR, onSave }: SardModalProps) {
  const [start, setStart] = useState<number | null>(null);
  const [end, setEnd] = useState<number | null>(null);
  const [n, setN] = useState<number>(0);
  const [r, setR] = useState<number>(0);

  useEffect(() => {
    if (isOpen) {
      setStart(initialStart);
      setEnd(initialEnd);
      setN(initialN || 0);
      setR(initialR || 0);
    }
  }, [isOpen, initialStart, initialEnd, initialN, initialR]);

  const handlePageClick = (page: number) => {
    if (!start || (start && end)) {
      setStart(page);
      setEnd(null);
    } else {
      let newStart = start;
      let newEnd = page;
      if (newEnd < newStart) {
        newStart = page;
        newEnd = start;
      }
      setStart(newStart);
      setEnd(newEnd);
    }
  };

  const calculateMatana = () => {
    if (!start || !end) return null;
    const totalPages = Math.abs(end - start) + 1;
    const matana = Math.round(Math.max(0, ((totalPages * 100) - ((n * 10) + (r * 20))) / totalPages));
    return matana;
  };

  const matana = calculateMatana();

  const handleSave = () => {
    onSave(start, end, n, r, matana || 0);
    onClose();
  };

  const handleClear = () => {
    setStart(null);
    setEnd(null);
    setN(0);
    setR(0);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="متانة السرد" maxWidth="max-w-2xl">
      <div className="text-center">
        <div className="flex gap-2 justify-center mb-4">
          <div className="w-1/3">
            <input 
              type="number" 
              placeholder="نقرات (-10)" 
              className="input-field p-2 text-center text-xs w-full"
              value={n || ''}
              onChange={e => setN(Number(e.target.value))}
            />
          </div>
          <div className="w-1/3">
            <input 
              type="number" 
              placeholder="ردات (-20)" 
              className="input-field p-2 text-center text-xs w-full"
              value={r || ''}
              onChange={e => setR(Number(e.target.value))}
            />
          </div>
          <div className="w-1/3 p-2 text-center text-sm bg-surface rounded-lg text-emerald-400 font-bold border border-emerald-500/30 flex items-center justify-center">
            المتانة: {matana !== null ? `${matana}%` : '-'}
          </div>
        </div>

        <div className="flex flex-wrap gap-1 justify-center max-h-[40vh] overflow-y-auto custom-scrollbar p-2 bg-surface rounded-xl border border-white/5">
          {Array.from({ length: 604 }, (_, i) => i + 1).map(page => {
            let cls = 'bg-[#1f2a44] border-[#31394d] text-gray-300 hover:bg-[#31394d]';
            if (start === page || end === page) {
              cls = 'bg-primary-custom text-surface font-bold border-primary-custom scale-105';
            } else if (start && end && page > start && page < end) {
              cls = 'bg-primary-custom/30 border-primary-custom text-emerald-300';
            }

            return (
              <button
                key={page}
                type="button"
                onClick={() => handlePageClick(page)}
                className={`w-8 h-8 text-[10px] rounded border transition-all flex items-center justify-center ${cls}`}
              >
                {page}
              </button>
            );
          })}
        </div>

        <div className="flex gap-2 mt-6">
          <button 
            type="button" 
            onClick={handleClear}
            className="w-1/4 bg-surface text-white py-3 rounded-xl border border-white/10 hover:bg-white/5 transition-all"
          >
            مسح
          </button>
          <button 
            type="button" 
            onClick={handleSave}
            className="w-3/4 btn-primary py-3"
          >
            تأكيد وحفظ التقييم
          </button>
        </div>
      </div>
    </Modal>
  );
}

interface ExamModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentId: string | null;
  initialParts: string;
  onSave: (parts: string) => void;
}

export function ExamModal({ isOpen, onClose, studentId, initialParts, onSave }: ExamModalProps) {
  const [selectedParts, setSelectedParts] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      setSelectedParts(initialParts ? initialParts.split(',') : []);
    }
  }, [isOpen, initialParts]);

  const togglePart = (part: string) => {
    setSelectedParts(prev => 
      prev.includes(part) ? prev.filter(p => p !== part) : [...prev, part]
    );
  };

  const handleSave = () => {
    onSave(selectedParts.join(','));
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="توثيق أجزاء الاختبار" maxWidth="max-w-md">
      <div className="text-center">
        <div className="flex flex-wrap gap-2 justify-center mb-6">
          {Array.from({ length: 30 }, (_, i) => i + 1).map(part => {
            const isActive = selectedParts.includes(part.toString());
            return (
              <button
                key={part}
                type="button"
                onClick={() => togglePart(part.toString())}
                className={`w-10 h-10 text-sm rounded border transition-all flex items-center justify-center ${
                  isActive 
                    ? 'bg-primary-custom text-surface font-bold border-primary-custom scale-105' 
                    : 'bg-[#1f2a44] border-[#31394d] text-gray-300 hover:bg-[#31394d]'
                }`}
              >
                {part}
              </button>
            );
          })}
        </div>
        <button 
          type="button" 
          onClick={handleSave}
          className="btn-primary w-full py-3"
        >
          اعتماد الأجزاء
        </button>
      </div>
    </Modal>
  );
}

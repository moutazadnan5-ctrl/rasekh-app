import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Calculator, Trophy, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-surface/80 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-md bg-container rounded-[2.5rem] border border-white/10 shadow-2xl overflow-hidden"
          >
            <div className="p-6 border-b border-white/5 flex justify-between items-center">
              <h3 className="text-sm font-bold text-white">{title}</h3>
              <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-all">
                <X size={18} />
              </button>
            </div>
            <div className="p-6">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export function SardEngine({ isOpen, onClose, onSave }: { isOpen: boolean; onClose: () => void; onSave: (val: number) => void }) {
  const [pages, setPages] = useState(1);
  const [errors, setErrors] = useState(0);
  const [warnings, setWarnings] = useState(0);

  const calculateMatana = () => {
    // Basic formula: 100 - (errors * 5) - (warnings * 2) / pages
    const penalty = (errors * 5) + (warnings * 2);
    const result = Math.max(0, 100 - (penalty / pages));
    return Math.round(result);
  };

  const matana = calculateMatana();

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="محرك حساب المتانة (السرد)">
      <div className="space-y-6">
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-gray-400 block text-center">عدد الصفحات</label>
            <input 
              type="number" 
              className="w-full bg-surface border-none rounded-xl p-3 text-center font-mono text-lg"
              value={pages}
              onChange={(e) => setPages(Number(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-red-400 block text-center">الأخطاء</label>
            <input 
              type="number" 
              className="w-full bg-surface border-none rounded-xl p-3 text-center font-mono text-lg text-red-400"
              value={errors}
              onChange={(e) => setErrors(Number(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-amber-400 block text-center">التنبيهات</label>
            <input 
              type="number" 
              className="w-full bg-surface border-none rounded-xl p-3 text-center font-mono text-lg text-amber-400"
              value={warnings}
              onChange={(e) => setWarnings(Number(e.target.value))}
            />
          </div>
        </div>

        <div className="bg-surface/50 p-6 rounded-3xl border border-white/5 text-center">
          <p className="text-[10px] font-bold text-gray-400 mb-2 uppercase tracking-widest">المتانة المحسوبة</p>
          <div className="text-5xl font-black text-primary-custom mb-2">{matana}%</div>
          <p className="text-[10px] text-white/20">بناءً على المعايير المؤسسية المعتمدة</p>
        </div>

        <button 
          onClick={() => {
            onSave(matana);
            onClose();
          }}
          className="w-full bg-primary-custom text-surface font-black py-4 rounded-2xl hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
        >
          <Calculator size={18} /> اعتماد وحفظ النتيجة
        </button>
      </div>
    </Modal>
  );
}

export function ExamModal({ isOpen, onClose, onSave }: { isOpen: boolean; onClose: () => void; onSave: (val: string) => void }) {
  const [result, setResult] = useState('');

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="تسجيل نتيجة الاختبار">
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-3">
          {['ممتاز', 'جيد جداً', 'جيد', 'مقبول', 'ضعيف', 'راسب'].map(val => (
            <button
              key={val}
              onClick={() => setResult(val)}
              className={`p-4 rounded-2xl border text-xs font-bold transition-all ${
                result === val 
                  ? 'bg-primary-custom border-primary-custom text-surface shadow-lg shadow-emerald-500/20' 
                  : 'bg-surface border-white/5 text-white/60 hover:border-white/20'
              }`}
            >
              {val}
            </button>
          ))}
        </div>

        <button 
          onClick={() => {
            onSave(result);
            onClose();
          }}
          disabled={!result}
          className="w-full bg-primary-custom text-surface font-black py-4 rounded-2xl hover:scale-[1.02] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Trophy size={18} /> رصد النتيجة النهائية
        </button>
      </div>
    </Modal>
  );
}

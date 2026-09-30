import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check } from 'lucide-react';

export default function Toast() {
  const [msg, setMsg] = useState<{ text: string; id: number } | null>(null);

  useEffect(() => {
    let timer = 0;
    const on = (e: Event) => {
      setMsg({ text: (e as CustomEvent<string>).detail, id: Date.now() });
      clearTimeout(timer);
      timer = window.setTimeout(() => setMsg(null), 2200);
    };
    window.addEventListener('toast', on);
    return () => { window.removeEventListener('toast', on); clearTimeout(timer); };
  }, []);

  return (
    <div aria-live="polite" style={{ position: 'fixed', left: 0, right: 0, bottom: 24, display: 'flex', justifyContent: 'center', pointerEvents: 'none', zIndex: 120 }}>
      <AnimatePresence>
        {msg && (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.25 }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderRadius: 999,
              background: 'var(--fg)', color: 'var(--bg)', fontSize: 14, fontWeight: 500, boxShadow: 'var(--shadow)',
            }}
          >
            <Check size={15} /> {msg.text}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

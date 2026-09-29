import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Effect } from '../store/actions';
import { store } from '../store/store';
import { Button } from './controls';
import { formatNumber } from './display';
import { haptic } from './haptics';
import { Modal } from './overlays';

/**
 * Capa de efectos visuales: escucha los efectos que devuelven las acciones
 * y los traduce a microanimaciones (puntos, corazones, toasts, celebraciones).
 */

interface Float { id: number; text: string; offset: number }
interface Burst { id: number; pieces: { dx: number; dy: number; rot: number; emoji: string; delay: number }[] }
interface Toast { id: number; emoji: string; text: string }
interface Celebration { id: number; emoji: string; eyebrow: string; title: string; text: string }

let seq = 0;
const CELEBRATION_DELAY = 1250;

function makeBurst(emojis: string[]): Burst {
  return {
    id: ++seq,
    pieces: Array.from({ length: 12 }, (_, i) => {
      const angle = (i / 12) * Math.PI * 2 + Math.random() * 0.4;
      const dist = 70 + Math.random() * 60;
      return {
        dx: Math.cos(angle) * dist,
        dy: Math.sin(angle) * dist - 30,
        rot: (Math.random() - 0.5) * 120,
        emoji: emojis[i % emojis.length],
        delay: Math.random() * 80,
      };
    }),
  };
}

export function FxLayer() {
  const [floats, setFloats] = useState<Float[]>([]);
  const [bursts, setBursts] = useState<Burst[]>([]);
  const [toast, setToast] = useState<Toast | null>(null);
  const [queue, setQueue] = useState<Celebration[]>([]);

  useEffect(() => {
    return store.onEffects((effects: Effect[]) => {
      let floatIndex = 0;
      // Si hay animación de corazón/puntos, la celebración espera a que termine.
      const delay = effects.some((e) => e.type === 'points' || e.type === 'heart') ? CELEBRATION_DELAY : 0;
      const enqueue = (c: Omit<Celebration, 'id'>) =>
        setTimeout(() => setQueue((q) => [...q, { ...c, id: ++seq }]), delay);
      for (const e of effects) {
        switch (e.type) {
          case 'points': {
            const f = { id: ++seq, text: `+${formatNumber(e.amount)} ${e.label}`, offset: floatIndex++ };
            setFloats((l) => [...l, f]);
            setTimeout(() => setFloats((l) => l.filter((x) => x.id !== f.id)), 1500 + f.offset * 250);
            break;
          }
          case 'heart': {
            const b = makeBurst(['❤️', '💗', '✨', '💕']);
            setBursts((l) => [...l, b]);
            setTimeout(() => setBursts((l) => l.filter((x) => x.id !== b.id)), 1100);
            haptic([10, 40, 10]);
            break;
          }
          case 'position': {
            const b = makeBurst(['💋', '🔥', '✨']);
            setBursts((l) => [...l, b]);
            setTimeout(() => setBursts((l) => l.filter((x) => x.id !== b.id)), 1100);
            showToast('💋', 'Posición completada');
            break;
          }
          case 'saved':
            showToast('✓', e.text);
            break;
          case 'favorite':
            if (e.added) showToast('❤️', 'Guardada en favoritas');
            break;
          case 'challenge': {
            const b = makeBurst(['🎯', '⭐', '✨']);
            setBursts((l) => [...l, b]);
            setTimeout(() => setBursts((l) => l.filter((x) => x.id !== b.id)), 1100);
            showToast('🎯', 'Reto completado');
            break;
          }
          case 'milestone':
            enqueue({ emoji: '🔥', eyebrow: `Racha de ${e.days} días`, title: e.title, text: `Bonus de racha: +${formatNumber(e.bonus)} puntos` });
            break;
          case 'achievement':
            enqueue({ emoji: e.emoji, eyebrow: 'Logro desbloqueado', title: e.title, text: 'Se guardó en su colección de logros.' });
            break;
          case 'date-done':
            enqueue({ emoji: '💕', eyebrow: 'Cita realizada', title: e.title, text: 'Guardada en “Nuestras citas”.' });
            break;
        }
      }
    });

    function showToast(emoji: string, text: string) {
      const t = { id: ++seq, emoji, text };
      setToast(t);
      setTimeout(() => setToast((cur) => (cur?.id === t.id ? null : cur)), 1800);
    }
  }, []);

  const current = queue[0];
  const root = document.getElementById('overlay-root');

  const layer = (
    <div className="fx-layer" aria-live="polite">
      {floats.map((f) => (
        <div
          key={f.id}
          className="points-float"
          style={{ animationDelay: `${f.offset * 250}ms`, top: `calc(42% - ${f.offset * 8}px)` }}
        >
          {f.text}
        </div>
      ))}
      {bursts.map((b) => (
        <div key={b.id} style={{ position: 'absolute', left: '50%', top: '48%' }}>
          {b.pieces.map((p, i) => (
            <span
              key={i}
              className="burst-piece"
              style={{
                ['--dx' as string]: `${p.dx}px`,
                ['--dy' as string]: `${p.dy}px`,
                ['--rot' as string]: `${p.rot}deg`,
                animationDelay: `${p.delay}ms`,
              }}
            >
              {p.emoji}
            </span>
          ))}
        </div>
      ))}
      {toast && (
        <div key={toast.id} className="toast">
          <span className="toast__emoji">{toast.emoji}</span>
          {toast.text}
        </div>
      )}
    </div>
  );

  return (
    <>
      {root ? createPortal(layer, root) : layer}
      <Modal open={!!current} onClose={() => setQueue((q) => q.slice(1))} label="Celebración">
        {current && (
          <div className="stack" style={{ alignItems: 'center' }}>
            <div className="celebrate-emoji anim-pop">{current.emoji}</div>
            <span className="eyebrow">{current.eyebrow}</span>
            <h2 className="display" style={{ fontSize: 'var(--fs-2xl)' }}>{current.title}</h2>
            <p className="muted small">{current.text}</p>
            <Button variant="primary" block onClick={() => setQueue((q) => q.slice(1))}>
              ¡Sí! ✨
            </Button>
          </div>
        )}
      </Modal>
    </>
  );
}

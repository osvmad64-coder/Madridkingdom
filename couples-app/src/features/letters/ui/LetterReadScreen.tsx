import { useState } from 'react';
import { navigate } from '../../../app/router';
import { useToday } from '../../../app/useToday';
import { dayMonthLabel, longDayLabel } from '../../../domain/time';
import { dispatch, useAppState } from '../../../store/store';
import { Button } from '../../../ui/controls';
import { EmptyState, ScreenHeader } from '../../../ui/display';
import { ConfirmModal } from '../../../ui/forms';
import { haptic } from '../../../ui/haptics';
import { useMedia } from '../../../ui/useMedia';
import { deleteLetter, openLetter } from '../actions';
import { findLetter, letterStatus } from '../service';
import { fromTo } from './LettersScreen';

/** Abrir y leer una carta. Nunca muestra el contenido antes de su fecha. */
export function LetterReadScreen({ id }: { id: string }) {
  const s = useAppState();
  const today = useToday();
  const letter = findLetter(s, id);
  const img = useMedia(letter?.imageId);
  const [opening, setOpening] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const back = () => navigate('/nosotros/cartas');

  if (!letter) {
    return (
      <>
        <ScreenHeader onBack={back} backLabel="Cartas" title="Carta" />
        <EmptyState emoji="🫧" title="Esta carta ya no existe" />
      </>
    );
  }
  const status = letterStatus(letter, today);

  if (status === 'locked') {
    return (
      <div className="stack" style={{ '--gap': '18px' } as React.CSSProperties}>
        <ScreenHeader onBack={back} backLabel="Cartas" eyebrow="🔒 Bloqueada" title={<>Todavía <em>no</em></>} />
        <div className="letter-envelope is-locked">
          <span className="letter-envelope__icon">🔒</span>
          <p className="title">Hay una carta esperando</p>
          <p className="small muted">Se desbloquea el {dayMonthLabel(letter.unlockOn!)}</p>
        </div>
      </div>
    );
  }

  if (status === 'ready') {
    return (
      <div className="stack" style={{ '--gap': '18px' } as React.CSSProperties}>
        <ScreenHeader onBack={back} backLabel="Cartas" eyebrow="💌 Tu carta está lista" title={<>Para <em>ti</em></>} />
        <button
          type="button"
          className={`letter-envelope ${opening ? 'is-opening' : ''}`}
          disabled={opening}
          onClick={() => {
            setOpening(true);
            haptic([10, 40, 10]);
            // La animación dura ~0.9 s; después la carta queda abierta (archivo).
            setTimeout(() => dispatch(openLetter(letter.id)), 900);
          }}
        >
          <span className="letter-envelope__flap" aria-hidden="true" />
          <span className="letter-envelope__icon">💌</span>
          <span className="title">{fromTo(s, letter) || 'Una carta para ti'}</span>
          <span className="small muted">{opening ? 'Abriendo…' : 'Toca para abrirla'}</span>
        </button>
      </div>
    );
  }

  return (
    <div className="stack" style={{ '--gap': '18px' } as React.CSSProperties}>
      <ScreenHeader onBack={back} backLabel="Cartas" eyebrow={fromTo(s, letter) || '💌 Carta'} title={letter.title} />
      <article className="letter-paper">
        {img && <img className="letter-paper__photo" src={img} alt="" />}
        <p className="letter-paper__text">{letter.message}</p>
        <p className="letter-paper__meta">Escrita el {longDayLabel(letter.writtenOn)}</p>
      </article>
      <Button variant="danger" block onClick={() => setConfirm(true)}>
        🗑️ Eliminar carta
      </Button>
      <ConfirmModal
        open={confirm}
        emoji="🗑️"
        title="¿Eliminar esta carta?"
        text="No se podrá recuperar."
        confirmLabel="Sí, eliminar"
        onClose={() => setConfirm(false)}
        onConfirm={() => {
          dispatch(deleteLetter(letter.id));
          back();
        }}
      />
    </div>
  );
}

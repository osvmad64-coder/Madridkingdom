import { useRef, useState } from 'react';
import { navigate } from '../../app/router';
import { CATEGORIES } from '../../content/dateOptions';
import type { Partner } from '../../models/types';
import {
  replaceState,
  resetAll,
  toggleCategory,
  updatePartner,
  updateProfile,
  updateSettings,
} from '../../store/actions';
import { buildDemoState } from '../../store/demo';
import { backupFileName, createBackup, parseBackup, restoreMedia } from '../../storage/backup';
import { dispatch, store, useAppState } from '../../store/store';
import { Button, Chip, Switch } from '../../ui/controls';
import { ScreenHeader, SectionHead } from '../../ui/display';
import { Icon } from '../../ui/Icon';
import { Modal, Sheet } from '../../ui/overlays';

const AVATARS = ['🌸', '🌙', '🦋', '🍓', '🐻', '🦊', '🌻', '⭐', '🍒', '🐱', '🌈', '☕', '🎧', '🌊', '🔥', '💎'];

export function SettingsScreen() {
  const s = useAppState();
  const [editing, setEditing] = useState<0 | 1 | null>(null);
  const [confirm, setConfirm] = useState<'reset' | 'demo' | null>(null);
  const [message, setMessage] = useState(s.profile.message ?? '');
  const fileRef = useRef<HTMLInputElement>(null);

  const [notice, setNotice] = useState('');
  const exportData = async () => {
    const backup = await createBackup(store.getState());
    const blob = new Blob([JSON.stringify(backup)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = backupFileName();
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  const importData = async (file: File) => {
    try {
      const { state, media } = parseBackup(await file.text());
      await restoreMedia(media);
      dispatch(replaceState(state));
      setNotice('Respaldo restaurado ✓');
    } catch {
      setNotice('Ese archivo no parece un respaldo de la app. Elijan el .json que descargaron.');
    }
  };
  const activeChallenges = s.challenges.filter((c) => c.active).length;
  const activePositions = s.positions.filter((p) => p.active).length;

  return (
    <div className="stack" style={{ '--gap': '18px' } as React.CSSProperties}>
      <ScreenHeader eyebrow="Ajustes" title={<>Hecho a <em>nuestra medida</em></>} />

      <SectionHead title="Nosotros dos" />
      <div className="list">
        {s.profile.partners.map((p, i) => (
          <button key={p.id} type="button" className="list-row" onClick={() => setEditing(i as 0 | 1)}>
            <span className="avatar">{p.avatar}</span>
            <div className="grow">
              <p style={{ fontWeight: 700 }}>{p.name}</p>
              <p className="tiny muted">Toca para editar nombre y avatar</p>
            </div>
            <Icon name="chevronRight" size={20} />
          </button>
        ))}
      </div>

      <div className="field">
        <label htmlFor="msg">💌 Mensaje de pareja en Inicio</label>
        <textarea
          id="msg"
          className="input"
          rows={2}
          placeholder="Vacío = un mensaje distinto cada día"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onBlur={() => dispatch(updateProfile({ message }))}
        />
      </div>

      <div className="field">
        <label htmlFor="anniv">💍 Nuestro aniversario</label>
        <input
          id="anniv"
          type="date"
          className="input"
          value={s.profile.anniversary ?? ''}
          onChange={(e) => dispatch(updateProfile({ anniversary: e.target.value || undefined }))}
        />
      </div>

      <SectionHead title="🔒 Contenido privado" />
      <div className="list">
        <button type="button" className="list-row" onClick={() => navigate('/ajustes/retos')}>
          <span className="list-row__icon" data-tone="rose">🎯</span>
          <div className="grow">
            <p style={{ fontWeight: 700 }}>Mis retos</p>
            <p className="tiny muted">{activeChallenges} activos · {s.challenges.length} en total</p>
          </div>
          <Icon name="chevronRight" size={20} />
        </button>
        <button type="button" className="list-row" onClick={() => navigate('/ajustes/posiciones')}>
          <span className="list-row__icon" data-tone="coral">💋</span>
          <div className="grow">
            <p style={{ fontWeight: 700 }}>Posiciones especiales</p>
            <p className="tiny muted">
              {activePositions} activas · aparecen en {Math.round(s.settings.positionFrequency * 100)}% de los días con reto
            </p>
          </div>
          <Icon name="chevronRight" size={20} />
        </button>
      </div>

      <SectionHead title="Date night" />
      <div className="card card--flat stack" style={{ '--gap': '12px' } as React.CSSProperties}>
        <p className="small muted">Categorías que queremos ver</p>
        <div className="chips">
          {CATEGORIES.map((c) => (
            <Chip key={c.id} emoji={c.emoji} selected={s.settings.enabledCategories.includes(c.id)} onToggle={() => dispatch(toggleCategory(c.id))}>
              {c.label}
            </Chip>
          ))}
        </div>
      </div>
      <div className="list">
        <button type="button" className="list-row" onClick={() => navigate('/citas/random')}>
          <span className="list-row__icon">🎲</span>
          <div className="grow">
            <p style={{ fontWeight: 700 }}>Opciones de Random</p>
            <p className="tiny muted">Qué puede incluir Sorpréndenos</p>
          </div>
          <Icon name="chevronRight" size={20} />
        </button>
        <div className="list-row">
          <span className="list-row__icon">📳</span>
          <div className="grow">
            <p style={{ fontWeight: 700 }}>Vibración</p>
            <p className="tiny muted">En teléfonos compatibles</p>
          </div>
          <Switch label="Vibración" checked={s.settings.haptics} onChange={() => dispatch(updateSettings({ haptics: !s.settings.haptics }))} />
        </div>
      </div>

      <SectionHead title="Nuestros datos" />
      <div className="list">
        <button type="button" className="list-row" onClick={() => void exportData()}>
          <span className="list-row__icon">💾</span>
          <div className="grow"><p style={{ fontWeight: 700 }}>Exportar respaldo (JSON)</p><p className="tiny muted">Para pasar todo a otro teléfono</p></div>
        </button>
        <button type="button" className="list-row" onClick={() => fileRef.current?.click()}>
          <span className="list-row__icon">📥</span>
          <div className="grow"><p style={{ fontWeight: 700 }}>Importar respaldo (JSON)</p></div>
        </button>
        <button type="button" className="list-row" onClick={() => setConfirm('demo')}>
          <span className="list-row__icon">🧪</span>
          <div className="grow">
            <p style={{ fontWeight: 700 }}>Cargar datos de ejemplo</p>
            <p className="tiny muted">Para probar estadísticas y rachas</p>
          </div>
        </button>
        <button type="button" className="list-row" onClick={() => setConfirm('reset')}>
          <span className="list-row__icon">🗑️</span>
          <div className="grow"><p style={{ fontWeight: 700, color: 'var(--rose-700)' }}>Borrar todo</p></div>
        </button>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="application/json"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void importData(f);
          e.target.value = '';
        }}
      />

      {notice && <p className="small center" role="status">{notice}</p>}

      <p className="tiny muted center" style={{ padding: '4px 12px' }}>
        🔒 Todo se guarda solo en este teléfono (retos, posiciones, imágenes y citas incluidos). Sin cuentas, sin analytics, sin enviar nada a nadie.
      </p>

      <PartnerSheet index={editing} partner={editing === null ? null : s.profile.partners[editing]} onClose={() => setEditing(null)} />

      <Modal open={!!confirm} onClose={() => setConfirm(null)} label="Confirmar">
        <div className="stack">
          <div className="celebrate-emoji">{confirm === 'reset' ? '🗑️' : '🧪'}</div>
          <h2 className="title">{confirm === 'reset' ? '¿Borrar todo?' : '¿Cargar datos de ejemplo?'}</h2>
          <p className="small muted">
            {confirm === 'reset'
              ? 'Se borran registros, puntos, citas, posiciones y retos propios de este teléfono. Descarguen un respaldo si quieren conservarlos.'
              : 'Reemplaza calendario, puntos y citas por datos de ejemplo. Sus retos y posiciones se conservan.'}
          </p>
          <Button
            variant="primary"
            block
            onClick={() => {
              dispatch(confirm === 'reset' ? resetAll : replaceState(buildDemoState(Date.now(), store.getState())));
              setConfirm(null);
              navigate('/');
            }}
          >
            {confirm === 'reset' ? 'Sí, borrar' : 'Sí, cargar'}
          </Button>
          <Button variant="ghost" block onClick={() => setConfirm(null)}>Cancelar</Button>
        </div>
      </Modal>
    </div>
  );
}

function PartnerSheet({ index, partner, onClose }: { index: 0 | 1 | null; partner: Partner | null; onClose: () => void }) {
  return (
    <Sheet open={index !== null} onClose={onClose} label="Editar perfil">
      {partner && index !== null && <PartnerForm key={partner.id} index={index} partner={partner} onDone={onClose} />}
    </Sheet>
  );
}

function PartnerForm({ index, partner, onDone }: { index: 0 | 1; partner: Partner; onDone: () => void }) {
  const [name, setName] = useState(partner.name);
  const [avatar, setAvatar] = useState(partner.avatar);
  return (
    <div className="stack" style={{ '--gap': '18px' } as React.CSSProperties}>
      <div className="center">
        <span className="avatar anim-pop" key={avatar} style={{ width: 84, height: 84, fontSize: 44, margin: '0 auto' }}>{avatar}</span>
      </div>
      <div className="field">
        <label htmlFor="pname">Nombre</label>
        <input id="pname" className="input" value={name} maxLength={24} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="avatar-grid">
        {AVATARS.map((a) => (
          <button key={a} type="button" className="avatar-option" aria-pressed={a === avatar} onClick={() => setAvatar(a)}>
            {a}
          </button>
        ))}
      </div>
      <Button
        variant="primary"
        size="lg"
        block
        disabled={!name.trim()}
        onClick={() => {
          dispatch(updatePartner(index, { name: name.trim(), avatar }));
          onDone();
        }}
      >
        Guardar
      </Button>
    </div>
  );
}

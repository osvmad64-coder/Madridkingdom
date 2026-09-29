# Nosotros · app privada para parejas

Dos secciones: **❤️ Our Intimacy** (calendario, puntos, rachas, retos, logros) y **💕 Date Night** (categorías, filtros, Sorpréndenos, favoritas, historial). Pensada para iPhone/Safari; en desktop se ve como teléfono centrado.

## Probar

```bash
cd couples-app
npm install
npm run dev        # http://localhost:5173 (con --host para abrir desde el iPhone en la misma red)
npm test           # pruebas de la lógica (rachas, puntos, retos, filtros, random)
npm run build      # compila a dist/
```

En **Ajustes → Cargar datos de ejemplo** se llena con 60 días de datos y citas de ejemplo (conserva sus retos y posiciones).

## Contenido que se administra desde la app (Fase 2)

| Qué | Dónde en la app | Notas |
|---|---|---|
| 🎯 Retos privados | Ajustes → Contenido privado → Mis retos | Crear, editar, desactivar, eliminar. Solo los activos salen en el calendario. |
| 💋 Posiciones especiales | Ajustes → Contenido privado → Posiciones | Imagen, nombre, descripción, categoría, dificultad, bonus. Frecuencia configurable. |
| 💕 Citas | Citas → + Agregar / Biblioteca | Cada cita guarda sus propios filtros. Sorpréndenos elige solo entre ellas. |
| 💾 Respaldo | Ajustes → Nuestros datos | Exportar / importar JSON (incluye imágenes). |

Eliminar algo nunca borra el historial: los días completados y las citas realizadas guardan una copia.

## Arquitectura

```
UI (screens/, ui/)  →  lógica (domain/)  →  modelos (models/)  →  persistencia (storage/)
                        ↑ store/ une todo: acciones puras + efectos para animaciones
```

| Carpeta | Qué hay |
|---|---|
| `src/design/` | **Design system**. `tokens.css` es el único lugar para cambiar colores, tipografía, radios, sombras y animaciones. `[data-section='dates']` le da a Date Night su personalidad. |
| `src/config/game.ts` | Puntos por ❤️, bonus y milestones de racha, multiplicadores, % máximo de días con reto. |
| `src/models/types.ts` | Tipos de todo: registros, retos, logros, citas, filtros, ajustes, estado guardado. |
| `src/features/challenges/` | **Retos privados**: `model`, `service` (sorteo, reemplazo, historial), `actions`, `seed` (contenido inicial), `ui/` (tarjeta, Mis retos, editor). |
| `src/features/positions/` | **Posiciones**: `model`, `service` (sorteo por `positionFrequency`), `actions`, `ui/` (`PositionCard`, `PositionDetail`, `PositionPicker`, `PositionLibraryScreen`, editor). |
| `src/features/dates/` | **Biblioteca de citas**: `model`, `service` (filtros, Random sin repetir, historial), `actions`, `ui/` (editor, tarjeta de biblioteca). |
| `src/domain/` | Lógica pura compartida: `streaks`, `points`, `achievements`, `stats`, `time`, `random`. |
| `src/content/` | Opciones y textos: `dateOptions.ts`, `positionOptions.ts`, `achievements.ts`, `messages.ts`, `demo/` (solo datos de ejemplo). |
| `src/store/` | `core.ts` (tipos de acción), `actions.ts` (registro, ajustes, calendario `ensureCalendarMonth`), `selectors.ts`, `store.ts`, `initialState.ts` (esquema v2 + migración), `demo.ts`. |
| `src/storage/` | `adapter.ts` (estado, hoy localStorage), `media.ts` (imágenes, IndexedDB), `backup.ts` (export/import JSON). Para sincronizar, se implementa otro adaptador. |
| `src/ui/` | Componentes reutilizables: Button, Chip, Switch, Segmented, Sheet, Modal, ProgressBar, StatTile, EmptyState, AnimatedNumber, FxLayer (animaciones). |
| `src/screens/` | Inicio, Intimidad, Citas (+ explorar, sorpresa, detalle, nuestras, random), Nosotros, Ajustes. |

## Cómo ampliar

- **Citas, retos y posiciones:** desde la app (ya no se agregan en código).
- **Tipos de reto permitidos en los sorteos:** `settings.challengeTypes` (vacío = todos).
- **Evitar repetir citas durante X días:** `settings.avoidRepeatDays`.
- **Más logros:** agregar a `content/achievements.ts` (métricas en `models/types.ts → AchievementMetric`).
- **Cambiar puntos o rachas:** `config/game.ts`.
- **Login / sincronización:** nuevo `StorageAdapter` + `partner.id` como autor (`HeartEntry.authorId` ya existe).

## Render (fase posterior)

Sitio estático: Root Directory `couples-app`, Build `npm install && npm run build`, Publish `dist`.

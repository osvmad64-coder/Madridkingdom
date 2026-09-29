# Nosotros · app privada para parejas (Fase 1)

Dos secciones: **❤️ Our Intimacy** (calendario, puntos, rachas, retos, logros) y **💕 Date Night** (categorías, filtros, Sorpréndenos, favoritas, historial). Pensada para iPhone/Safari; en desktop se ve como teléfono centrado.

## Probar

```bash
cd couples-app
npm install
npm run dev        # http://localhost:5173 (con --host para abrir desde el iPhone en la misma red)
npm test           # pruebas de la lógica (rachas, puntos, retos, filtros, random)
npm run build      # compila a dist/
```

En **Ajustes → Cargar datos de ejemplo** se llena con 60 días de datos para ver estadísticas y rachas.

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
| `src/domain/` | Lógica pura: `streaks`, `points`, `challenges`, `achievements`, `dateNight` (filtros/random/historial), `stats`, `time`. |
| `src/content/` | Contenido separado del código: `dateIdeas.ts`, `challenges.ts`, `achievements.ts`, `dateOptions.ts`, `messages.ts`. |
| `src/store/` | `actions.ts` (acciones puras), `selectors.ts`, `store.ts`, `initialState.ts` (esquema + migraciones), `demo.ts`. |
| `src/storage/` | `StorageAdapter` (hoy localStorage). Para sincronizar, se implementa otro adaptador. |
| `src/ui/` | Componentes reutilizables: Button, Chip, Switch, Segmented, Sheet, Modal, ProgressBar, StatTile, EmptyState, AnimatedNumber, FxLayer (animaciones). |
| `src/screens/` | Inicio, Intimidad, Citas (+ explorar, sorpresa, detalle, nuestras, random), Nosotros, Ajustes. |

## Cómo ampliar

- **Más citas:** agregar objetos a `content/dateIdeas.ts`.
- **Más retos / packs privados:** nuevo arreglo con otro `pack` y activarlo en `settings.enabledChallengePacks`. Los retos propios van en `customChallenges`.
- **Más logros:** agregar a `content/achievements.ts` (métricas en `models/types.ts → AchievementMetric`).
- **Cambiar puntos o rachas:** `config/game.ts`.
- **Login / sincronización:** nuevo `StorageAdapter` + `partner.id` como autor (`HeartEntry.authorId` ya existe).

## Render (fase posterior)

Sitio estático: Root Directory `couples-app`, Build `npm install && npm run build`, Publish `dist`.

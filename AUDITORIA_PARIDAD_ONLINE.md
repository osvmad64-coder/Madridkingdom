# Auditoría: paridad MISMO TELÉFONO ↔ MULTIJUGADOR ONLINE

Punto de restauración previo a los cambios: tag git `respaldo-antes-de-paridad-online`.

## Cómo está construido hoy

- **Un solo motor.** Todo el juego vive en `index.html`. El modo *Mismo teléfono* y el *Online* usan **las mismas funciones** (`mpStartGame`, `mpAct`, `mpEndTurn`, `playerAttack`, `odilioStrike`, etc.).
- **Mismo teléfono:** el "servidor" corre dentro del propio teléfono (`LOCAL.srv` + `localSocket`, `index.html` ~L3026).
- **Online:** `server.js` carga ese mismo `index.html` dentro de JSDOM, una instancia por sala (`createEngine`). Los teléfonos solo envían `{name, args}`; el servidor ejecuta y valida la acción (`mpAct`) y reparte el estado. **La autoridad del servidor ya existe.**
- **La diferencia real es una sola bandera:** `S.mpLocal`. Mismo teléfono llama `mpStartGame({ local:true, goal, crest… })`; el servidor llama `mpStartGame({ humans, ai, diff })` sin `local` ni `goal`. Por eso el online juega con reglas "viejas" y siempre en modo Clásico.

## A. Mecánicas de MISMO TELÉFONO (referencia)

| Sistema | Valor / regla en Mismo teléfono | Dónde |
|---|---|---|
| Modos de juego | 🏰 Asedio de castillos (25 turnos, predeterminado) · 🗺️ Dominio en 7 turnos · ⚔️ Conquista total (30) | `MP_GOALS`, `renderLocalTab` |
| Reglas por modo | Castillos: castillo inicial +3 tropas, +8 defensa, destruirlo elimina al dueño, botín +25 oro. Dominio/Conquista: el jefe final se vuelve neutral | `mpStartGame`, `mpCastleSweep`, `castleBonus`, `mpCheckEnd` |
| Puntos de acción | 4 por turno (+1 corcel, +1 Furia de Batalla) | `maxAp` |
| Oro base por turno | 6 | `incomeBreakdown` |
| Oro por tierra | 5 las primeras 6 tierras, 3 las siguientes | `landIncomeAt` |
| Boost "resistencia del pueblo" | +6 oro si vas 3+ tierras detrás del líder humano | `incomeBreakdown` |
| Boosts de oro (buffs) | Fortuna Arcana ×1.5, Poción de Oro ×2, pasivas de terreno, Mercader Astuto | `SPELLS`, `LOOT_TABLE`, `SKILL_TREE` |
| Oro por conquista | 2 (+3 extra) · pícaro 5 (+3) × rasgo × árbol | `playerAttack` |
| Reclutar gladiadores | 3 oro base (+2 por tier) − pasiva | `recruitCost` |
| Escuderos | ×1.5 del costo base (5), reembolso 60 %, tope 20 | `shieldCost` |
| Cañón | 24 oro, alcance 2, 1 PA, 1 disparo por turno | `cannonCost`, `fireCannon` |
| Combate | mínimo 3 unidades para atacar; defensa ×1.3; +3 defensa a reinos (+1 neutral) | `minAttackTroops`, `defenseMult`, `defenseFlat` |
| Experiencia | Curva 60 + 20·nivel; +2 XP entrenar, +1 comprar arma/montura, +12 XP destruir un reino, +2 XP por resistir ataques | `xpToNext`, `trainTerritory`, `buyWeapon`, `playerAttack`, `aiResolveAttack` |
| **El Gran Odilio** | Al subir de nivel ganas 1 carga · 1 PA · golpea 2 territorios enemigos vecinos a la vez · si resiste pierde la mitad · +5 oro por conquista · ataque por clase (Meteoro Arcano / Martillo del Titán / Tajo Relámpago) · animación para todos | `grantOdilio`, `odilioStrike`, `ODILIO`, `playOdilio`, `playStrike` |
| Minijuegos | 3 (Reflejos, Lluvia de oro, Tiro al blanco) · 1 por turno · hasta 18 oro + XP | `MINIGAMES`, `claimMinigame`, `startMinigame` |
| Logros de la partida | Ejército / Tesoro / Leyenda con premios de oro, tropas y XP | `MILESTONES`, `mpCheckMilestones` |
| Identidad | Nombre, color (8), escudo (forma, diseño, emblema, metal), clase | `renderLocalTab` |
| Común a ambos | Tiers de tropa, árbol de habilidades, hechizos y magia, tienda (armas/monturas), mercado, tratos/tregua/alianza, eventos, botín, rasgos, pasivas de bioma, IA y dificultad, eliminación por HP/tierras, victoria por turnos | motor compartido |
| Solo del dispositivo | Pantalla "pásale el teléfono", buzón de avisos por jugador, guardado en el teléfono | `renderPassScreen`, `LOCAL.inbox`, `localSave` |

## B. Mecánicas del ONLINE actual

Mismo motor, pero con `mpLocal=false`: modo **Clásico** fijo (20 turnos), 3 PA, oro base 3, 2 oro por tierra, reclutar a 4, cañón a 32, mínimo 2 para atacar, defensa ×1.1, curva de XP 10·nivel. **Sin** Gran Odilio, **sin** minijuegos, **sin** logros de partida, **sin** "resistencia del pueblo", **sin** selector de modo, **sin** color/escudo. Sí tiene: escuderos, cañón, tienda, magia, árbol, tratos, IA, chat, avisos push, reconexión, guardado en disco, saltar/expulsar.

## C. Lo que falta en ONLINE

| Sistema | Estado |
|---|---|
| Reglas de economía/combate/XP de Mismo teléfono | Falta (bandera `mpLocal`) |
| El Gran Odilio (carga, ataque, animación) | Falta (depende de `mpLocal`) |
| Minijuegos | Falta (`mgAvailable` exige `LOCAL.active`) → necesita adaptación anti-trampa |
| Logros de partida | Falta (depende de `mpLocal`) |
| Selección de modo de juego | Falta (servidor no envía `goal`) |
| Color y escudo | Falta (servidor no envía `crest`) |
| Animaciones de Odilio al reconectar | Necesita adaptación (no repetir historial) |
| Pantalla "pasa el teléfono" / buzón | No aplica: cada quien tiene su teléfono y el servidor manda avisos por jugador |

## D. Archivos y funciones a modificar

- `index.html`: `mpStartGame` (aceptar reglas completas para online), `mgAvailable`, `startMinigame` (avisar inicio al servidor), `mpApplyState` (no repetir animaciones viejas), `playOdilio` (texto para los demás jugadores), `renderMpTab` (modo de juego + color/escudo), `__MKAPI` (exponer catálogos para validar).
- `server.js`: ajustes `goal`, arranque con reglas completas, identidad (`setIdentity`), validación de minijuegos (`mgStart` + tiempo mínimo), valores por defecto al cargar salas del disco.

## E. Qué debe validar el servidor

Ya validado por el motor en el servidor (el teléfono no puede cambiarlo): oro, tropas, escuderos, cañones, PA, territorios, ataques y sus tiradas, compras, hechizos/magia, mejoras, tratos, Odilio (carga, PA, objetivos), turnos, eliminaciones y victoria. Acciones fuera de turno, desconocidas o con datos trucados se rechazan.

Se agrega:
- **Minijuegos:** la puntuación la calcula el teléfono. El servidor ya la limita (máx. 18 oro, 1 por turno) y ahora además exige que el minijuego se haya iniciado en ese turno y que haya durado lo que dura el juego.
- **Identidad:** color y escudo solo de las listas oficiales (evita inyectar HTML en el escudo de otros).
- **Modo de juego:** solo modos existentes en `MP_GOALS`, solo el anfitrión, solo en la sala de espera.

## F. Modos de juego

Se usan exactamente los de `MP_GOALS`: Asedio de castillos, Dominio en 7 turnos y Conquista total (los de Mismo teléfono, con Castillos como predeterminado) y se conserva Clásico, que es el modo con el que ya se jugaba online. El anfitrión lo elige en la sala; el servidor lo guarda en `settings.goal` y lo pasa a `mpStartGame`, que ya carga las reglas de cada modo.

## G. Riesgos

- **Partidas online ya empezadas** (guardadas en disco con `mpLocal=false`): se respetan tal cual; solo las partidas nuevas usan las reglas completas.
- **Salas en espera guardadas** sin `goal`/escudo: se completan con valores por defecto al cargar.
- **Minijuego con internet lento:** el tiempo mínimo tiene margen (9 s de un juego de 10 s).
- **Mismo teléfono:** solo cambia `mgAvailable` (sigue funcionando igual en local) y `mpStartGame` conserva `local:true`.

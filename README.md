# Madrid Kingdom · Multijugador online

Juego de estrategia por turnos para jugar con amigos, cada quien desde su iPhone:
- Chat por partida.
- Avisos cuando es tu turno.
- Partidas guardadas en el servidor que pueden durar días.

## Archivos (súbelos TODOS, sueltos, sin carpetas)
`server.js` · `package.json` · `package-lock.json` · `index.html` · `sw.js` · `manifest.json` · `icon-192.png` · `icon-512.png` · `apple-touch-icon.png` · `README.md`

## 1. Subir a GitHub (desde el iPhone)
1. **Descomprime el zip:** en la app **Archivos**, toca el zip y se crea la carpeta `madrid-kingdom-online`.
2. **Crea el repositorio:** en **github.com**, toca **＋ → New repository**, ponle nombre `madrid-kingdom` y déjalo en **Private** o Public. Toca **Create repository**.
3. **Sube los archivos:** toca **uploading an existing file → choose your files → Elegir archivo**. Entra a la carpeta, toca **Seleccionar**, marca **los 10 archivos** y toca **Abrir**.
4. **Guarda:** baja hasta el final y toca **Commit changes**.

## 2. Publicar en Render (plan Starter, ~7 USD/mes)
1. **Entra:** en **render.com** → **Get Started**, regístrate con **GitHub** y agrega tu tarjeta cuando te la pida.
2. **Crea el servicio:** **New + → Web Service** y elige el repositorio `madrid-kingdom`.
3. **Configura:**
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** **Starter** (siempre encendido)
4. **Agrega un disco** (para que las partidas no se pierdan): en **Advanced → Add Disk** pon **Name** `datos`, **Mount Path** `/var/data` y **Size** `1` GB (~0.25 USD/mes).
5. **Variables de entorno:** en **Environment Variables → Add**:
   - `DATA_DIR` = `/var/data`
   - (Opcional) `VAPID_SUBJECT` = `mailto:tucorreo@gmail.com`
6. **Lanza:** toca **Create Web Service** y espera a que diga **Live**.
7. **Tu link:** arriba aparece algo como `https://madrid-kingdom.onrender.com`. Ese link es tu juego.

Las llaves de las notificaciones se crean solas la primera vez y quedan guardadas en el disco. No tienes que configurar nada más.

## 3. Cada jugador, en su iPhone (iOS 16.4 o superior)
1. **Abre el link** en **Safari**.
2. **Instala la app:** toca **Compartir ⬆️ → Agregar a pantalla de inicio** y luego **Agregar**.
3. **Ábrela siempre desde ese ícono** 👑, no desde Safari.
4. **Entra a la partida:** **🌐 Multijugador** → escribe tu nombre → **Crear partida** o **Unirse** con el código.
5. **Activa los avisos:** en la sala toca **Activar avisos → Permitir**. Pruébalo con **Probar aviso** y bloquea el teléfono.

- **Si entraste primero desde Safari:** abre la app del ícono → **🌐 Multijugador → Recupera tu lugar**, con el código de la sala y **tu clave** (aparece en la sala y en ☰ Más).
- **Al tocar un aviso de turno** se abre directo tu partida.

## Mismas reglas que "Mismo teléfono"
Las partidas online nuevas usan exactamente las reglas de **👥 Mismo teléfono**: 4 PA, economía y combate iguales, **El Gran Odilio**, **minijuegos** (1 por turno), **logros de la partida**, color y escudo propios.
- **Modo de juego:** el anfitrión lo elige en la sala: 🏰 Asedio de castillos (predeterminado), 🗺️ Dominio en 7 turnos, ⚔️ Conquista total o 👑 Clásico.
- **Todo lo valida el servidor:** oro, tropas, PA, ataques, compras, magia, Odilio, turnos y victoria. El teléfono solo envía la acción.
- Las partidas que ya estaban empezadas antes de esta versión se terminan con sus reglas originales.

## Mapas de Asedio de castillos
Cada partida de 🏰 Asedio de castillos (online y Mismo teléfono) sale en uno de **8 mapas grandes** al azar: Llanuras Abiertas, El Gran Río, Las Terrazas, Valles Gemelos, Lago de la Corona, Cuatro Provincias, Archipiélago y Tierras Salvajes.
- De 35 a 45 territorios según cuántos reinos haya, con ríos y cordilleras que obligan a buscar rutas.
- Los castillos salen en lugares distintos cada vez, pero siempre justos: con 2 reinos se necesitan al menos 6 ataques para llegar a un castillo rival (imposible en el primer turno), todos quedan a la misma distancia y hay al menos 2 caminos entre castillos.
- En online el servidor crea el mapa una sola vez: todos ven exactamente lo mismo y al reconectar no cambia.

## Cómo funcionan las partidas largas
- **Tiempo por turno:** el anfitrión elige en la sala qué pasa si alguien no está en su turno: **saltar a los 2 min** (para jugar al mismo tiempo), **saltar a las 12 h** o **esperar siempre**.
- **Guardado:** las partidas se guardan en el disco y sobreviven reinicios y actualizaciones.
- **Limpieza:** las salas sin actividad por 14 días se borran solas.

## Actualizar el juego más adelante
Sube los archivos nuevos al mismo repositorio de GitHub (reemplazando los anteriores). Render se actualiza solo en uno o dos minutos y las partidas guardadas se conservan.

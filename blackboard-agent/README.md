# Agente Blackboard (prueba mínima, solo lectura)

Abre Chromium en https://xochicalco.blackboard.com, **espera a que tú inicies sesión a mano**
(contraseña, MFA, CAPTCHA), detecta que ya entraste e imprime tu lista de cursos.

- No guarda ni pide tu contraseña. No salta MFA ni CAPTCHA.
- No hace clics ni envía nada. Tras el login bloquea POST/PUT/PATCH/DELETE.
- Las cookies de tu sesión quedan en `perfil-navegador/` (en tu compu, ignorada por git).
  Bórrala para cerrar sesión.

## Instalación en Windows (una sola vez)

1. **Instala Python**: entra a https://www.python.org/downloads/ y descarga la versión 3.12 o más nueva.
   En el instalador marca la casilla **"Add python.exe to PATH"** y da *Install Now*.
2. **Abre la terminal**: tecla Windows → escribe `powershell` → Enter.
3. **Ve a esta carpeta** (cambia la ruta por donde la descargaste):
   ```
   cd C:\Users\TU_USUARIO\Downloads\Madridkingdom\blackboard-agent
   ```
4. **Instala Playwright** (la librería que controla el navegador):
   ```
   python -m pip install -r requirements.txt
   ```
5. **Descarga el Chromium de Playwright** (~150 MB):
   ```
   python -m playwright install chromium
   ```

En Mac es igual, pero usa `python3` en lugar de `python`.

## Uso

```
python prueba_minima.py
```

1. Se abre Chromium en Blackboard.
2. Inicia sesión tú mismo (y MFA si lo pide). Tienes 10 minutos.
3. La terminal muestra `Sesión detectada` y tu lista de cursos.
4. Presiona Enter para cerrar.

## Cómo detecta el login y los cursos

- **Login**: cada 3 s consulta `GET /learn/api/public/v1/users/me` con las cookies del navegador.
  Solo responde 200 cuando ya estás dentro.
- **Cursos (plan A)**: `GET /learn/api/public/v1/users/{id}/courses` (API REST oficial de Blackboard,
  usando tu propia sesión).
- **Cursos (plan B)**: si la universidad bloquea esa API, lee los enlaces de la página `/ultra/course`.

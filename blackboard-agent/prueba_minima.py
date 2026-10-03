"""
Prueba mínima: agente local de solo lectura para Blackboard (Universidad Xochicalco).

Qué hace:
  1. Abre Chromium (visible) en https://xochicalco.blackboard.com
  2. Espera a que TÚ inicies sesión a mano (usuario, contraseña, MFA, CAPTCHA...).
  3. Detecta cuando ya estás dentro.
  4. Intenta leer tu lista de cursos y la imprime en la terminal.

Qué NO hace:
  - No pide, guarda ni escribe tu contraseña.
  - No salta CAPTCHA ni MFA.
  - No hace clics, no envía tareas, no modifica nada.
    Después del login, bloquea cualquier petición que no sea de lectura
    (POST/PUT/PATCH/DELETE) como medida extra de seguridad.

Uso:
  python prueba_minima.py
"""

import os
import sys
import time
from urllib.parse import urlparse

from playwright.sync_api import sync_playwright

BASE_URL = os.environ.get("BB_URL", "https://xochicalco.blackboard.com").rstrip("/")
# Carpeta local donde Chromium guarda las cookies de TU sesión (no la contraseña).
# Así no tienes que iniciar sesión cada vez. Bórrala para "cerrar sesión".
PERFIL = os.path.join(os.path.dirname(os.path.abspath(__file__)), "perfil-navegador")
ESPERA_MAX_LOGIN = 10 * 60  # 10 minutos para que hagas login + MFA
METODOS_LECTURA = {"GET", "HEAD", "OPTIONS"}


def log(msg):
    print(f"[agente] {msg}", flush=True)


def api_get(context, ruta):
    """GET de solo lectura usando las cookies de la sesión del navegador."""
    resp = context.request.get(f"{BASE_URL}{ruta}", fail_on_status_code=False)
    if resp.ok:
        try:
            return resp.status, resp.json()
        except Exception:
            return resp.status, None
    return resp.status, None


def sesion_iniciada(context, page):
    """Devuelve el usuario (dict) si ya hay sesión, o None si aún no."""
    host = urlparse(page.url).hostname or ""
    if host and host != urlparse(BASE_URL).hostname:
        return None  # sigues en el proveedor de login (Microsoft, Google, etc.)
    # La señal real: la API solo responde tus datos (HTTP 200) si ya iniciaste sesión.
    status, data = api_get(context, "/learn/api/public/v1/users/me")
    if status == 200 and isinstance(data, dict) and data.get("id"):
        return data
    return None


def esperar_login(context, page):
    log("Inicia sesión en la ventana de Chromium (usuario, contraseña y MFA si lo pide).")
    log("Yo solo voy a esperar; no escribo nada en el formulario.")
    inicio = time.time()
    while time.time() - inicio < ESPERA_MAX_LOGIN:
        try:
            usuario = sesion_iniciada(context, page)
        except Exception:
            usuario = None  # la página está navegando; reintentar
        if usuario:
            return usuario
        time.sleep(3)
    return None


def activar_modo_solo_lectura(context):
    bloqueadas = []

    def filtro(route):
        req = route.request
        if req.method.upper() in METODOS_LECTURA:
            route.continue_()
        else:
            bloqueadas.append(f"{req.method} {req.url[:100]}")
            route.abort()

    context.route("**/*", filtro)
    return bloqueadas


def cursos_por_api(context, user_id):
    ruta = (f"/learn/api/public/v1/users/{user_id}/courses"
            "?expand=course&fields=courseRoleId,availability,course.courseId,"
            "course.name,course.externalAccessUrl,course.id")
    status, data = api_get(context, ruta)
    if status != 200 or not data:
        log(f"La API de cursos respondió HTTP {status}.")
        return None
    cursos = []
    for item in data.get("results", []):
        c = item.get("course") or {}
        cursos.append({
            "nombre": c.get("name", "(sin nombre)"),
            "clave": c.get("courseId", ""),
            "rol": item.get("courseRoleId", ""),
            "enlace": c.get("externalAccessUrl") or f"{BASE_URL}/ultra/courses/{c.get('id', '')}/outline",
        })
    return cursos


def cursos_por_pagina(page):
    """Plan B: leer los cursos directamente de la página 'Cursos' de Ultra."""
    page.goto(f"{BASE_URL}/ultra/course", wait_until="domcontentloaded")
    try:
        page.wait_for_selector("a[href*='/ultra/courses/'], [id^='course-list-course-']", timeout=20000)
    except Exception:
        return []
    vistos, cursos = set(), []
    for a in page.query_selector_all("a[href*='/ultra/courses/']"):
        texto = (a.inner_text() or "").strip()
        href = a.get_attribute("href") or ""
        if texto and href not in vistos:
            vistos.add(href)
            cursos.append({"nombre": texto, "clave": "", "rol": "",
                           "enlace": href if href.startswith("http") else BASE_URL + href})
    if not cursos:
        for el in page.query_selector_all("[id^='course-list-course-'] h4, .course-title h4"):
            t = (el.inner_text() or "").strip()
            if t:
                cursos.append({"nombre": t, "clave": "", "rol": "", "enlace": ""})
    return cursos


def main():
    with sync_playwright() as p:
        context = p.chromium.launch_persistent_context(
            PERFIL,
            headless=os.environ.get("BB_HEADLESS") == "1",  # solo para pruebas automáticas
            executable_path=os.environ.get("BB_CHROMIUM_PATH") or None,
            viewport=None,
        )
        page = context.pages[0] if context.pages else context.new_page()

        log(f"Abriendo {BASE_URL} ...")
        page.goto(BASE_URL, wait_until="domcontentloaded")

        usuario = esperar_login(context, page)
        if not usuario:
            log("No detecté un inicio de sesión en 10 minutos. Cerrando sin hacer nada.")
            context.close()
            sys.exit(1)

        nombre = " ".join(filter(None, [usuario.get("name", {}).get("given"),
                                        usuario.get("name", {}).get("family")]))
        log(f"Sesión detectada. Usuario: {nombre or usuario.get('userName', '(desconocido)')}")

        bloqueadas = activar_modo_solo_lectura(context)
        log("Modo solo lectura activado (POST/PUT/PATCH/DELETE bloqueados).")

        cursos = cursos_por_api(context, usuario["id"])
        fuente = "API REST de Blackboard (con tu sesión)"
        if not cursos:
            log("Probando plan B: leer la página de Cursos...")
            cursos = cursos_por_pagina(page)
            fuente = "página /ultra/course"

        print()
        print("=" * 60)
        print(f" MIS CURSOS  (fuente: {fuente})")
        print("=" * 60)
        if cursos:
            for i, c in enumerate(cursos, 1):
                extra = " | ".join(x for x in (c["clave"], c["rol"]) if x)
                print(f"{i:>2}. {c['nombre']}" + (f"  [{extra}]" if extra else ""))
                if c["enlace"]:
                    print(f"     {c['enlace']}")
        else:
            print(" No pude encontrar cursos. Revisa el mensaje de arriba.")
        print("=" * 60)
        if bloqueadas:
            log(f"Se bloquearon {len(bloqueadas)} peticiones de escritura del navegador (normal, es telemetría de la página).")

        input("\nPresiona Enter para cerrar el navegador...")
        context.close()


if __name__ == "__main__":
    main()

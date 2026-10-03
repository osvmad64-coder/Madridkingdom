"""
Prueba 2: extraer tareas/actividades de cada curso (SOLO LECTURA).

Qué hace, después de que TÚ inicias sesión (igual que prueba_minima.py):
  1. Obtiene tus cursos con la API REST de Blackboard.
  2. Para cada curso PRUEBA varios endpoints REST (solo GET) y anota cuáles
     responden y cuáles no (401/403/404...), sin detenerse si alguno falla:
       - contenido del curso (tareas, exámenes, foros...)
       - columnas del libro de calificaciones (fecha de entrega, puntos)
       - tus calificaciones en el curso (estado, puntaje)
       - tus intentos/entregas por actividad (estado de la entrega)
       - el calendario de fechas de entrega
  3. Si la API no da nada para un curso, lee la página de Calificaciones de
     Blackboard Ultra con Playwright (solo lo que tu usuario ve).
  4. Imprime las tareas por curso y un reporte de qué endpoints funcionaron.

Seguridad:
  - Solo hace peticiones GET. No hace clics, no entrega, no modifica nada.
  - Bloquea POST/PUT/PATCH/DELETE del navegador después del login.
  - No pide ni guarda tu contraseña. La sesión vive en perfil-navegador/ (fuera de Git).

Uso:
  python extraer_tareas.py
  python extraer_tareas.py --diagnostico   # además guarda las respuestas crudas
                                           # en diagnostico/ (local, fuera de Git)
"""

import html
import json
import os
import re
import sys
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from urllib.parse import quote

from playwright.sync_api import sync_playwright

from prueba_minima import (BASE_URL, PERFIL, activar_modo_solo_lectura,
                           esperar_login, log)

DIAGNOSTICO = "--diagnostico" in sys.argv
CARPETA_DIAG = os.path.join(os.path.dirname(os.path.abspath(__file__)), "diagnostico")
API = "/learn/api/public"

# Tipos de contenido que cuentan como actividad aunque no tengan columna de calificación.
TIPOS_ACTIVIDAD = {
    "resource/x-bb-assignment": "Tarea",
    "resource/x-bb-asmt-test-link": "Evaluación/Tarea",
    "resource/x-bb-asmt-survey-link": "Encuesta",
    "resource/x-bb-forumlink": "Foro",
    "resource/x-bb-blti-link": "Actividad externa (LTI)",
    "resource/x-bb-journallink": "Diario",
    "resource/x-bb-bloglink": "Blog",
    "resource/x-bb-wiki-link": "Wiki",
}

ESTADOS = {
    "NotAttempted": "pendiente (sin intento)",
    "InProgress": "en progreso (borrador)",
    "Suspended": "suspendido",
    "Abandoned": "abandonado",
    "Canceled": "cancelado",
    "NeedsGrading": "entregada, por calificar",
    "Completed": "entregada y calificada",
    "Graded": "calificada",
    "Exempt": "exenta",
}


class Registro:
    """Anota cada endpoint probado y su código HTTP."""

    def __init__(self):
        self.resultados = defaultdict(lambda: defaultdict(int))

    def anotar(self, plantilla, status):
        self.resultados[plantilla][status] += 1

    def imprimir(self):
        print()
        print("=" * 60)
        print(" ENDPOINTS PROBADOS (solo GET) CON TU CUENTA")
        print("=" * 60)
        for plantilla, codigos in self.resultados.items():
            ok = any(200 <= c < 300 for c in codigos)
            resumen = ", ".join(f"HTTP {c} x{n}" for c, n in sorted(codigos.items()))
            print(f" {'OK ' if ok else 'NO '} GET {plantilla}")
            print(f"      {resumen}")
        print("=" * 60)


class Cliente:
    """Peticiones GET de solo lectura usando la sesión del navegador."""

    def __init__(self, context, registro):
        self.context = context
        self.registro = registro

    def get(self, ruta, plantilla):
        try:
            resp = self.context.request.get(f"{BASE_URL}{ruta}", fail_on_status_code=False)
            status = resp.status
            data = resp.json() if resp.ok else None
        except Exception as e:
            log(f"  error de red en {plantilla}: {e}")
            status, data = 0, None
        self.registro.anotar(plantilla, status)
        if DIAGNOSTICO:
            guardar_diag(ruta, status, data)
        return status, data

    def get_todo(self, ruta, plantilla, max_paginas=20):
        """GET que sigue la paginación (paging.nextPage) de la API."""
        status, data = self.get(ruta, plantilla)
        if status != 200 or not isinstance(data, dict):
            return status, None
        resultados = list(data.get("results", []))
        siguiente = (data.get("paging") or {}).get("nextPage")
        paginas = 1
        while siguiente and paginas < max_paginas:
            s, d = self.get(siguiente, plantilla)
            if s != 200 or not isinstance(d, dict):
                break
            resultados += d.get("results", [])
            siguiente = (d.get("paging") or {}).get("nextPage")
            paginas += 1
        return status, resultados


def guardar_diag(ruta, status, data):
    os.makedirs(CARPETA_DIAG, exist_ok=True)
    nombre = re.sub(r"[^A-Za-z0-9_.-]+", "_", ruta)[:150] + ".json"
    with open(os.path.join(CARPETA_DIAG, nombre), "w", encoding="utf-8") as f:
        json.dump({"ruta": ruta, "status": status, "data": data}, f, ensure_ascii=False, indent=2)


def texto_plano(valor, limite=200):
    if not valor:
        return ""
    if isinstance(valor, dict):  # algunos campos vienen como {"rawText": ...}
        valor = valor.get("rawText") or valor.get("displayText") or ""
    t = html.unescape(re.sub(r"<[^>]+>", " ", str(valor)))
    t = re.sub(r"\s+", " ", t).strip()
    return t if len(t) <= limite else t[:limite - 1] + "…"


def fecha_local(iso):
    if not iso:
        return None
    try:
        dt = datetime.fromisoformat(iso.replace("Z", "+00:00"))
        return dt.astimezone()  # zona horaria de tu computadora (Tijuana)
    except ValueError:
        return None


def enlace_actividad(course_pk, content_id, tipo="resource/x-bb-asmt-test-link"):
    """Enlace construido a mano (la API pública no trae la URL de cada actividad)."""
    if tipo in ("resource/x-bb-asmt-test-link", "resource/x-bb-assignment"):
        return (f"{BASE_URL}/ultra/courses/{course_pk}/outline/assessment/"
                f"{content_id}/overview?courseId={course_pk}")
    return f"{BASE_URL}/ultra/courses/{course_pk}/outline"


# ---------------------------------------------------------------- recolección

def obtener_cursos(cli, user_id):
    status, items = cli.get_todo(
        f"{API}/v1/users/{user_id}/courses?expand=course&fields=courseRoleId,availability,"
        "course.id,course.courseId,course.name,course.externalAccessUrl,course.ultraStatus",
        "/v1/users/{userId}/courses")
    cursos = []
    for it in items or []:
        c = it.get("course") or {}
        if c.get("id"):
            cursos.append({"pk": c["id"], "clave": c.get("courseId", ""),
                           "nombre": c.get("name", "(sin nombre)"),
                           "ultra": c.get("ultraStatus", ""),
                           "enlace": c.get("externalAccessUrl") or f"{BASE_URL}/ultra/courses/{c['id']}/outline"})
    return cursos


def contenido_curso(cli, pk):
    """Todo el contenido visible; primero en modo recursivo, si no, carpeta por carpeta."""
    status, items = cli.get_todo(f"{API}/v1/courses/{pk}/contents?recursive=true",
                                 "/v1/courses/{courseId}/contents?recursive=true")
    if status == 200:
        return items
    status, raiz = cli.get_todo(f"{API}/v1/courses/{pk}/contents", "/v1/courses/{courseId}/contents")
    if status != 200:
        return None
    todos, pendientes, visitas = [], list(raiz), 0
    while pendientes and visitas < 60:
        item = pendientes.pop(0)
        todos.append(item)
        if item.get("hasChildren"):
            visitas += 1
            s, hijos = cli.get_todo(f"{API}/v1/courses/{pk}/contents/{item['id']}/children",
                                    "/v1/courses/{courseId}/contents/{contentId}/children")
            if s == 200:
                pendientes += hijos
    return todos


def columnas_curso(cli, pk):
    status, items = cli.get_todo(f"{API}/v2/courses/{pk}/gradebook/columns",
                                 "/v2/courses/{courseId}/gradebook/columns")
    return items if status == 200 else None


def mis_calificaciones(cli, pk, user_id):
    status, items = cli.get_todo(f"{API}/v2/courses/{pk}/gradebook/users/{user_id}",
                                 "/v2/courses/{courseId}/gradebook/users/{userId}")
    if status != 200:
        status, items = cli.get_todo(f"{API}/v1/courses/{pk}/gradebook/users/{user_id}",
                                     "/v1/courses/{courseId}/gradebook/users/{userId}")
    if status != 200:
        return None
    return {g.get("columnId"): g for g in items if g.get("columnId")}


def mis_intentos(cli, pk, col_id, user_id):
    status, items = cli.get_todo(
        f"{API}/v2/courses/{pk}/gradebook/columns/{col_id}/attempts?userId={user_id}",
        "/v2/courses/{courseId}/gradebook/columns/{columnId}/attempts?userId=")
    return items if status == 200 else None


def calendario_entregas(cli):
    """Fechas de entrega de las próximas semanas (la API permite máx. 16 semanas)."""
    ahora = datetime.now(timezone.utc)
    desde = (ahora - timedelta(days=28)).strftime("%Y-%m-%dT%H:%M:%S.000Z")
    hasta = (ahora + timedelta(days=84)).strftime("%Y-%m-%dT%H:%M:%S.000Z")
    status, items = cli.get_todo(
        f"{API}/v1/calendars/items?type=GradebookColumn&since={quote(desde)}&until={quote(hasta)}",
        "/v1/calendars/items?type=GradebookColumn")
    return items if status == 200 else None


# --------------------------------------------------------------- construcción

def armar_actividades(cli, curso, user_id, calendario):
    pk = curso["pk"]
    contenidos = contenido_curso(cli, pk)
    columnas = columnas_curso(cli, pk)
    notas = mis_calificaciones(cli, pk, user_id)
    fuentes = []

    acts = {}  # clave -> actividad

    for c in contenidos or []:
        handler = (c.get("contentHandler") or {})
        tipo = handler.get("id", "")
        col_id = handler.get("gradeColumnId")
        if tipo not in TIPOS_ACTIVIDAD and not col_id:
            continue
        acts[col_id or c["id"]] = {
            "nombre": c.get("title", "(sin título)"), "tipo": TIPOS_ACTIVIDAD.get(tipo, tipo),
            "descripcion": texto_plano(c.get("body") or c.get("description")),
            "entrega": None, "puntos": None, "estado": None, "calificacion": None,
            "enlace": enlace_actividad(pk, c["id"], tipo), "col_id": col_id,
            "visible": (c.get("availability") or {}).get("available"),
        }
    if contenidos is not None:
        fuentes.append("contenido")

    for col in columnas or []:
        if (col.get("grading") or {}).get("type") == "Calculated":
            continue  # totales/promedios, no son actividades
        clave = col["id"]
        a = acts.get(clave) or acts.get(col.get("contentId"))
        if a is None:
            a = acts[clave] = {"nombre": col.get("name", "(sin nombre)"), "tipo": "Columna de calificación",
                               "descripcion": "", "entrega": None, "puntos": None, "estado": None,
                               "calificacion": None, "visible": None,
                               "enlace": enlace_actividad(pk, col["contentId"]) if col.get("contentId")
                               else f"{BASE_URL}/ultra/courses/{pk}/grades"}
        a["col_id"] = clave
        a["entrega"] = a["entrega"] or (col.get("grading") or {}).get("due")
        a["puntos"] = (col.get("score") or {}).get("possible")
        a["descripcion"] = a["descripcion"] or texto_plano(col.get("description"))
    if columnas is not None:
        fuentes.append("libro de calificaciones")

    for item in calendario or []:
        if item.get("calendarId") != pk:
            continue
        col_id = item.get("itemSourceId")
        a = acts.get(col_id) or next((x for x in acts.values() if x["nombre"] == item.get("title")), None)
        if a is None:
            a = acts[col_id or item.get("id")] = {
                "nombre": item.get("title", "(sin título)"), "tipo": "Fecha de entrega (calendario)",
                "descripcion": texto_plano(item.get("description")), "puntos": None, "estado": None,
                "calificacion": None, "visible": None, "col_id": col_id, "entrega": None,
                "enlace": f"{BASE_URL}/ultra/calendar"}
        a["entrega"] = a["entrega"] or item.get("end") or item.get("start")
    if calendario is not None:
        fuentes.append("calendario")

    for a in acts.values():
        col_id = a.get("col_id")
        if not col_id:
            continue
        nota = (notas or {}).get(col_id)
        if nota:
            a["estado"] = ESTADOS.get(nota.get("status"), nota.get("status"))
            if nota.get("displayGrade"):
                a["calificacion"] = texto_plano(nota["displayGrade"].get("text")
                                                or nota["displayGrade"].get("score"))
            elif nota.get("score") is not None:
                a["calificacion"] = str(nota["score"])
        intentos = mis_intentos(cli, pk, col_id, user_id)
        if intentos:
            ultimo = max(intentos, key=lambda x: x.get("created", ""))
            a["estado"] = ESTADOS.get(ultimo.get("status"), ultimo.get("status"))
        elif intentos == [] and not a["estado"]:
            vence = fecha_local(a["entrega"])
            a["estado"] = ("vencida sin entrega" if vence and vence < datetime.now().astimezone()
                           else "pendiente (sin intento registrado)")
    if notas is not None:
        fuentes.append("mis calificaciones")

    return list(acts.values()), fuentes


def leer_pagina_calificaciones(page, curso):
    """Plan B: lee el texto visible de la página de Calificaciones del curso."""
    url = f"{BASE_URL}/ultra/courses/{curso['pk']}/grades"
    try:
        page.goto(url, wait_until="domcontentloaded")
        page.wait_for_load_state("networkidle", timeout=20000)
    except Exception:
        pass
    filas = page.query_selector_all("[role='row'], [class*='grade-item'], [class*='gradable-item'], li[class*='item']")
    textos = []
    for f in filas:
        t = re.sub(r"\s+", " ", (f.inner_text() or "")).strip()
        if t and t not in textos:
            textos.append(t[:200])
    if DIAGNOSTICO:
        os.makedirs(CARPETA_DIAG, exist_ok=True)
        with open(os.path.join(CARPETA_DIAG, f"pagina_{curso['pk']}.html"), "w", encoding="utf-8") as fh:
            fh.write(page.content())
    return textos


# ------------------------------------------------------------------ impresión

def imprimir_curso(curso, actividades, fuentes, texto_pagina):
    print()
    print(curso["nombre"].upper() + (f"  [{curso['clave']}]" if curso["clave"] else ""))
    print(f"  (fuentes: {', '.join(fuentes) if fuentes else 'ninguna API respondió'})")
    if actividades:
        actividades.sort(key=lambda a: (fecha_local(a["entrega"]) is None,
                                        fecha_local(a["entrega"]) or datetime.max.replace(tzinfo=timezone.utc)))
        for a in actividades:
            vence = fecha_local(a["entrega"])
            print(f"\n  * {a['nombre']}  ({a['tipo']})")
            print(f"    Entrega: {vence.strftime('%d/%m/%Y %H:%M') if vence else 'sin fecha en la API'}")
            print(f"    Estado: {a['estado'] or 'no disponible'}")
            puntos = a["puntos"]
            print(f"    Puntos: {('%g' % puntos) if isinstance(puntos, (int, float)) else 'no disponible'}"
                  + (f"   Calificación: {a['calificacion']}" if a["calificacion"] else ""))
            if a["descripcion"]:
                print(f"    Descripción: {a['descripcion']}")
            print(f"    Link: {a['enlace']}")
    elif texto_pagina:
        print("  La API no dio actividades. Texto visible en la página de Calificaciones:")
        for t in texto_pagina:
            print(f"   - {t}")
    else:
        print("  No encontré actividades (ni por API ni en la página).")


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
        log(f"Sesión detectada ({usuario.get('userName', 'usuario')}).")
        bloqueadas = activar_modo_solo_lectura(context)
        log("Modo solo lectura activado (POST/PUT/PATCH/DELETE bloqueados).")

        registro = Registro()
        cli = Cliente(context, registro)
        cursos = obtener_cursos(cli, usuario["id"])
        log(f"{len(cursos)} cursos encontrados. Leyendo actividades (puede tardar un minuto)...")
        calendario = calendario_entregas(cli)

        print()
        print("=" * 60)
        print(" TAREAS Y ACTIVIDADES")
        print("=" * 60)
        totales = defaultdict(int)
        for curso in cursos:
            log(f"Curso: {curso['nombre']}")
            actividades, fuentes = armar_actividades(cli, curso, usuario["id"], calendario)
            texto = [] if actividades else leer_pagina_calificaciones(page, curso)
            imprimir_curso(curso, actividades, fuentes, texto)
            for a in actividades:
                totales["actividades"] += 1
                for campo in ("entrega", "estado", "puntos", "descripcion", "calificacion"):
                    if a[campo] not in (None, ""):
                        totales[campo] += 1
        print()
        print("=" * 60)
        n = totales["actividades"]
        print(f" RESUMEN: {n} actividades en {len(cursos)} cursos")
        for campo, nombre in (("entrega", "con fecha de entrega"), ("estado", "con estado"),
                              ("puntos", "con puntos"), ("calificacion", "con calificación"),
                              ("descripcion", "con descripción")):
            print(f"   {totales[campo]:>3}/{n} {nombre}")
        registro.imprimir()
        if bloqueadas:
            log(f"Se bloquearon {len(bloqueadas)} peticiones de escritura del navegador.")
        if DIAGNOSTICO:
            log(f"Respuestas crudas guardadas en {CARPETA_DIAG} (contienen tus datos; no las subas a internet).")

        input("\nPresiona Enter para cerrar el navegador...")
        context.close()


if __name__ == "__main__":
    main()

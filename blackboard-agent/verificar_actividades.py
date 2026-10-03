"""
Prueba 3: verificar actividades (SOLO LECTURA).

Objetivo: datos más confiables de cada actividad y entender su ESTADO real.

Para cada actividad junta lo que da la API REST (solo GET):
  - contenido:      tipo, visibilidad, disponible desde/hasta, creada, descripción
  - columna:        fecha de entrega, puntos, tipo de calificación, intentos permitidos
  - tu calificación: estado oficial (Graded / NeedsGrading / Exempt), puntaje, texto
  - tus intentos:   cuántos hiciste, estado y fecha de cada uno
Con eso clasifica el estado y explica POR QUÉ (qué dato de Blackboard lo decide).
Si después de la API falta el estado, la calificación o la fecha, lee la página
de Calificaciones del curso en Ultra (solo texto visible) y busca la actividad.

Seguridad: solo GET, sin clics, POST/PUT/PATCH/DELETE bloqueados, sin contraseña.

Uso:
  python3 verificar_actividades.py
  python3 verificar_actividades.py --diagnostico   # guarda respuestas crudas en diagnostico/
Zona horaria: por defecto America/Tijuana; cámbiala con la variable BB_TZ.
"""

import json
import os
import re
import sys
import unicodedata
from datetime import datetime, timezone

from playwright.sync_api import sync_playwright

from extraer_tareas import (API, CARPETA_DIAG, DIAGNOSTICO, TIPOS_ACTIVIDAD, Cliente,
                            Registro, calendario_entregas, columnas_curso,
                            contenido_curso, enlace_actividad, obtener_cursos,
                            texto_plano)
from prueba_minima import (BASE_URL, PERFIL, activar_modo_solo_lectura,
                           esperar_login, log)

try:
    from zoneinfo import ZoneInfo
    ZONA = ZoneInfo(os.environ.get("BB_TZ", "America/Tijuana"))
except Exception:  # sin base de zonas horarias: usa la de la computadora
    ZONA = None

# Estados que Blackboard devuelve en calificaciones (grade.status) e intentos (attempt.status)
ESTADO_INTENTO = {
    "NotAttempted": "sin intento",
    "InProgress": "en progreso (guardado, NO enviado)",
    "Suspended": "suspendido",
    "Abandoned": "abandonado",
    "Canceled": "cancelado",
    "NeedsGrading": "enviado, por calificar",
    "Completed": "enviado y calificado",
    "InProgressFromRescinded": "reabierto por el profesor",
}
VISIBLE = {"Yes": "sí", "No": "no (oculta)", "PartiallyVisible": "parcialmente"}


# ------------------------------------------------------------------- fechas

def fecha(iso):
    if not iso:
        return None
    try:
        dt = datetime.fromisoformat(str(iso).replace("Z", "+00:00"))
    except ValueError:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(ZONA) if ZONA else dt.astimezone()


def fmt(iso):
    dt = fecha(iso)
    return dt.strftime("%d/%m/%Y %H:%M") if dt else None


def ahora():
    return datetime.now(ZONA) if ZONA else datetime.now().astimezone()


# ------------------------------------------------------------ datos por API

def mis_calificaciones(cli, pk, user_id):
    status, items = cli.get_todo(f"{API}/v2/courses/{pk}/gradebook/users/{user_id}",
                                 "/v2/courses/{courseId}/gradebook/users/{userId}")
    if status != 200:
        return status, {}
    return status, {g.get("columnId"): g for g in items if g.get("columnId")}


def mis_intentos(cli, pk, col_id, user_id):
    status, items = cli.get_todo(
        f"{API}/v2/courses/{pk}/gradebook/columns/{col_id}/attempts?userId={user_id}",
        "/v2/courses/{courseId}/gradebook/columns/{columnId}/attempts?userId=")
    return status, (items if status == 200 else None)


def texto_calificacion(obj):
    """Calificación legible de un grade o attempt de la API."""
    if not obj:
        return None
    dg = obj.get("displayGrade") or {}
    for v in (dg.get("text"), obj.get("text"), dg.get("score"), obj.get("score")):
        if v not in (None, ""):
            return texto_plano(v) if isinstance(v, str) else "%g" % v
    return None


# ------------------------------------------------------------- clasificación

def clasificar(a):
    """Devuelve (estado, motivo). Usa SOLO datos que Blackboard reportó."""
    grade, intentos = a["grade"], a["intentos"]
    st_grade = (grade or {}).get("status")
    st_int = [x.get("status") for x in intentos or []]
    vence = fecha(a["entrega_iso"])

    if st_grade == "Exempt" or (grade or {}).get("exempt"):
        return "exenta", "el profesor marcó la actividad como exenta"
    if "Completed" in st_int or st_grade == "Graded":
        return "entregada y calificada", f"grade.status={st_grade}, intentos={st_int or '-'}"
    if "NeedsGrading" in st_int or st_grade == "NeedsGrading":
        return "entregada, por calificar", f"grade.status={st_grade}, intentos={st_int}"
    if texto_calificacion(grade) and not intentos:
        return "calificada (sin entrega en línea)", "tiene calificación pero ningún intento registrado"
    if "InProgress" in st_int:
        return "en progreso (guardado, NO enviado)", "hay un intento InProgress"

    bloqueo = motivo_bloqueo(a)
    if bloqueo:
        return "no disponible / bloqueada", bloqueo
    if not a["col_id"]:
        return ("sin estado en Blackboard (no calificable)",
                "la actividad no tiene columna de calificación; Blackboard no lleva registro de entrega")
    if a["col_tipo"] == "Manual":
        return ("sin calificación aún (columna manual)",
                "el profesor captura esta nota a mano; no recibe entregas en línea")

    if intentos == [] or (st_int and all(s == "NotAttempted" for s in st_int)):
        if vence and vence < ahora():
            return "sin intento (fecha vencida)", "0 intentos y la fecha de entrega ya pasó"
        return "pendiente (sin intento)", "0 intentos registrados"
    if intentos:
        return ESTADO_INTENTO.get(st_int[-1], f"Blackboard: {st_int[-1]}"), f"intentos={st_int}"

    motivo = (f"intentos HTTP {a['http_intentos']}" if a["http_intentos"] not in (None, 200)
              else "sin intentos ni calificación")
    return "estado desconocido", motivo


def motivo_bloqueo(a):
    disp = a["disponible"]
    if disp == "No":
        return "el profesor la tiene oculta (availability.available = No)"
    if a["col_visible"] == "No":
        return "la columna de calificación está oculta para alumnos"
    desde, hasta = fecha(a["desde_iso"]), fecha(a["hasta_iso"])
    if desde and desde > ahora():
        return f"se abre el {fmt(a['desde_iso'])} (liberación adaptable)"
    if hasta and hasta < ahora():
        return f"dejó de estar disponible el {fmt(a['hasta_iso'])} (liberación adaptable)"
    if disp == "PartiallyVisible":
        return "visible solo parcialmente (reglas de liberación del profesor)"
    return None


# ------------------------------------------------------------- construcción

def nueva_actividad(nombre, tipo, enlace):
    return {"nombre": nombre, "tipo": tipo, "enlace": enlace, "content_id": None,
            "col_id": None, "descripcion": "", "creada_iso": None, "desde_iso": None,
            "hasta_iso": None, "disponible": None, "col_visible": None, "col_tipo": None,
            "entrega_iso": None, "fuente_entrega": None, "puntos": None,
            "intentos_permitidos": None, "grade": None, "intentos": None,
            "http_intentos": None, "ui": None, "ui_leida": False,
            "fuente_estado": "API"}


def actividades_curso(cli, curso, user_id, calendario, problemas):
    pk = curso["pk"]
    contenidos = contenido_curso(cli, pk)
    columnas = columnas_curso(cli, pk)
    http_notas, notas = mis_calificaciones(cli, pk, user_id)
    if contenidos is None:
        problemas.append(f"{curso['nombre']}: la API no permitió leer el contenido del curso")
    if columnas is None:
        problemas.append(f"{curso['nombre']}: la API no permitió leer el libro de calificaciones")
    if http_notas != 200:
        problemas.append(f"{curso['nombre']}: tus calificaciones respondieron HTTP {http_notas}")

    acts = {}
    for c in contenidos or []:
        h = c.get("contentHandler") or {}
        tipo, col_id = h.get("id", ""), h.get("gradeColumnId")
        if tipo not in TIPOS_ACTIVIDAD and not col_id:
            continue
        a = nueva_actividad(c.get("title", "(sin título)"), TIPOS_ACTIVIDAD.get(tipo, tipo),
                            enlace_actividad(pk, c["id"], tipo))
        av = c.get("availability") or {}
        ar = av.get("adaptiveRelease") or {}
        a.update(content_id=c["id"], col_id=col_id, creada_iso=c.get("created"),
                 descripcion=texto_plano(c.get("body") or c.get("description"), 400),
                 disponible=av.get("available"), desde_iso=ar.get("start"), hasta_iso=ar.get("end"))
        acts[col_id or c["id"]] = a

    for col in columnas or []:
        g = col.get("grading") or {}
        if g.get("type") == "Calculated":
            continue  # totales y promedios
        a = acts.get(col["id"]) or acts.get(col.get("contentId"))
        if a is None:
            a = acts[col["id"]] = nueva_actividad(
                col.get("name", "(sin nombre)"), "Columna de calificación",
                enlace_actividad(pk, col["contentId"]) if col.get("contentId")
                else f"{BASE_URL}/ultra/courses/{pk}/grades")
            a["creada_iso"] = col.get("created")
        a.update(col_id=col["id"], col_tipo=g.get("type"), puntos=(col.get("score") or {}).get("possible"),
                 col_visible=(col.get("availability") or {}).get("available"),
                 intentos_permitidos=g.get("attemptsAllowed"))
        a["descripcion"] = a["descripcion"] or texto_plano(col.get("description"), 400)
        if g.get("due"):
            a["entrega_iso"], a["fuente_entrega"] = g["due"], "libro de calificaciones"

    for item in calendario or []:
        if item.get("calendarId") != pk:
            continue
        a = acts.get(item.get("itemSourceId")) or next(
            (x for x in acts.values() if x["nombre"] == item.get("title")), None)
        if a and not a["entrega_iso"] and (item.get("end") or item.get("start")):
            a["entrega_iso"], a["fuente_entrega"] = item.get("end") or item.get("start"), "calendario"

    for a in acts.values():
        if a["col_id"]:
            a["grade"] = notas.get(a["col_id"])
            a["http_intentos"], a["intentos"] = mis_intentos(cli, pk, a["col_id"], user_id)
    return list(acts.values())


# ---------------------------------------------------------- respaldo: Ultra

def _sin_acentos(t):
    return unicodedata.normalize("NFD", t).encode("ascii", "ignore").decode().lower()


# Señales que Ultra muestra en la página de Calificaciones (español e inglés).
SENAL = {
    "no_enviada": r"\bno (enviad|entregad)|not submitted|sin entrega",
    "enviada": r"(enviad[oa]s?|entregad[oa]s?|submitted)\b",
    "por_calificar": r"por calificar|needs grading|pendiente de calificar",
    "sin_calificar": r"sin calificar|not graded|ungraded",
    "calificada": r"(?<!no )\b(calificad[oa]|graded)\b",
    "atrasada": r"atrasad|\blate\b|past due|overdue|vencid",
    "sin_abrir": r"sin abrir|not opened|unopened",
    "en_progreso": r"en curso|en progreso|in progress|borrador|draft",
    "bloqueada": r"no disponible|unavailable|bloquead|locked",
    "exenta": r"exent|exempt",
    "ilimitados": r"intentos posibles ilimitados|unlimited attempts",
}


def senales_ui(texto):
    t = _sin_acentos(texto)
    return {k for k, rx in SENAL.items() if re.search(rx, t)}


def estado_desde_ui(a):
    """(estado, motivo) usando SOLO lo que Ultra muestra. Nunca supone un intento."""
    texto = a["ui"]["texto"]
    s = senales_ui(texto)
    vence = fecha(a["entrega_iso"])
    vencida = bool(vence and vence < ahora())
    if "sin_calificar" in s:
        s.discard("calificada")
    if "no_enviada" in s:
        s.discard("enviada")

    if "exenta" in s:
        return "exenta", "Ultra la marca como exenta"
    if "enviada" in s or "por_calificar" in s:
        if "calificada" in s:
            return "entregada y calificada", "Ultra muestra enviada y calificada"
        estado = "entregada, por calificar" if ("por_calificar" in s or "sin_calificar" in s) else "entregada"
        if "atrasada" in s:
            estado += " (con atraso)"
        return estado, "Ultra muestra que se envió"
    if "en_progreso" in s:
        return "en progreso (guardado, NO enviado)", "Ultra muestra un intento en curso"
    if "bloqueada" in s:
        return "no disponible / bloqueada", "Ultra la muestra como no disponible"
    if "sin_abrir" in s:
        # Sin abrir = nunca se abrió, por lo tanto no puede haber intento.
        if "atrasada" in s:
            return "atrasada, sin abrir", "Ultra marca 'Atrasado' y 'Sin abrir'"
        if vencida:
            return "sin abrir, fecha vencida", "Ultra marca 'Sin abrir' y la fecha de entrega (API) ya pasó"
        return "pendiente, sin abrir", "Ultra marca 'Sin abrir' y la fecha no ha vencido"
    if "atrasada" in s:
        return "atrasada", "Ultra marca la actividad como atrasada (no indica si se abrió)"
    if "no_enviada" in s:
        return ("sin entrega, fecha vencida" if vencida else "pendiente, sin entrega"), "Ultra muestra que no se ha enviado"
    if "calificada" in s:
        return "calificada", "Ultra la muestra como calificada"
    pistas = []
    if "ilimitados" in s:
        pistas.append("'Intentos posibles ilimitados' solo dice cuántos intentos se permiten, no si hubo uno")
    if "sin_calificar" in s:
        pistas.append("'Sin calificar' no distingue entre 'no entregada' y 'entregada sin revisar'")
    return None, "; ".join(pistas) or "el texto visible no contiene ningún indicador de estado"


JS_FILAS = """
(nombres) => {
  const norm = s => (s || '').replace(/\\s+/g, ' ').trim().toLowerCase();
  const out = {};
  const todos = Array.from(document.querySelectorAll('a, span, div, h3, h4, button, td, bdi, p'));
  for (const n of nombres) {
    const nn = norm(n);
    const otros = nombres.map(norm).filter(o => o !== nn && !nn.includes(o));
    const el = todos.find(e => e.children.length <= 2 && norm(e.innerText) === nn);
    if (!el) continue;
    // Sube hasta la fila completa: se detiene antes de abarcar otra actividad.
    let mejor = el;
    for (let p = el.parentElement, i = 0; p && i < 8; p = p.parentElement, i++) {
      const t = norm(p.innerText);
      if (t.length > 600 || otros.some(o => t.includes(o))) break;
      mejor = p;
    }
    out[n] = mejor.innerText.replace(/\\s*\\n\\s*/g, ' · ').replace(/\\s+/g, ' ').trim().slice(0, 400);
  }
  return out;
}
"""


def leer_ui(page, curso, actividades):
    url = f"{BASE_URL}/ultra/courses/{curso['pk']}/grades"
    capturas = []

    def capturar(resp):  # solo lectura: copia las respuestas JSON que la página ya pidió
        if "/learn/api/" in resp.url and resp.request.method == "GET":
            try:
                capturas.append({"url": resp.url, "status": resp.status, "data": resp.json()})
            except Exception:
                pass

    if DIAGNOSTICO:
        page.on("response", capturar)
    try:
        page.goto(url, wait_until="domcontentloaded")
        page.wait_for_load_state("networkidle", timeout=20000)
    except Exception:
        pass
    if DIAGNOSTICO:
        page.remove_listener("response", capturar)
        os.makedirs(CARPETA_DIAG, exist_ok=True)
        with open(os.path.join(CARPETA_DIAG, f"ultra_api_{curso['pk']}.json"), "w", encoding="utf-8") as f:
            json.dump(capturas, f, ensure_ascii=False, indent=2)
    try:
        filas = page.evaluate(JS_FILAS, [a["nombre"] for a in actividades])
    except Exception as e:
        log(f"  no pude leer la página de Calificaciones: {e}")
        return 0
    if DIAGNOSTICO:
        os.makedirs(CARPETA_DIAG, exist_ok=True)
        with open(os.path.join(CARPETA_DIAG, f"calificaciones_{curso['pk']}.html"), "w", encoding="utf-8") as f:
            f.write(page.content())
    for a in actividades:
        a["ui_leida"] = True
        if filas.get(a["nombre"]):
            a["ui"] = {"texto": filas[a["nombre"]]}
    return len(filas)


def necesita_ui(a, estado):
    return (estado.startswith(("estado desconocido", "sin estado")) or not a["entrega_iso"]
            or a["http_intentos"] not in (None, 200))


# ---------------------------------------------------------------- impresión

def linea_intentos(a):
    if a["intentos"] is None or a["col_tipo"] == "Manual":
        return None
    n = len(a["intentos"])
    permitidos = a["intentos_permitidos"]
    txt = f"{n} realizado(s)"
    if permitidos is not None:
        txt += " de " + ("ilimitados" if permitidos == 0 else str(permitidos)) + " permitidos"
    if n:
        ult = max(a["intentos"], key=lambda x: x.get("attemptDate") or x.get("created") or "")
        st = ult.get("status")
        txt += (f"; último: {ESTADO_INTENTO.get(st, st)}"
                f" el {fmt(ult.get('attemptDate') or ult.get('created')) or 'fecha no indicada'}")
        cal = texto_calificacion(ult)
        if cal:
            txt += f" ({cal})"
    return txt


def imprimir(curso, acts):
    print()
    print("-" * 60)
    print(f"CURSO: {curso['nombre'].upper()}" + (f"  [{curso['clave']}]" if curso["clave"] else ""))
    if not acts:
        print("  (sin actividades publicadas)")
        return
    acts.sort(key=lambda a: (fecha(a["entrega_iso"]) is None, fecha(a["entrega_iso"]) or ahora()))
    for a in acts:
        estado, motivo = a["estado"]
        print(f"\n  Actividad: {a['nombre']}")
        print(f"    Tipo: {a['tipo']}" + (f" (calificación: {a['col_tipo']})" if a["col_tipo"] else ""))
        if a["desde_iso"] or a["hasta_iso"]:
            print(f"    Disponible desde: {fmt(a['desde_iso']) or 'sin restricción'}"
                  + (f"   hasta: {fmt(a['hasta_iso'])}" if a["hasta_iso"] else ""))
        elif a["disponible"]:
            print(f"    Disponible: {VISIBLE.get(a['disponible'], a['disponible'])} (sin fechas de liberación)")
        if a["creada_iso"]:
            print(f"    Publicada/creada: {fmt(a['creada_iso'])}")
        print(f"    Entrega: {fmt(a['entrega_iso']) or 'Blackboard no tiene fecha de entrega'}"
              + (f"  (fuente: {a['fuente_entrega']})" if a["fuente_entrega"] else ""))
        print(f"    Estado: {estado}")
        print(f"      por qué: {motivo}")
        if a["http_intentos"] not in (None, 200):
            print(f"      diagnóstico técnico: API de intentos respondió HTTP {a['http_intentos']}")
        if a["ui"]:
            print(f"      evidencia Ultra: \"{a['ui']['texto']}\"")
        elif a["ui_leida"] and a["http_intentos"] not in (None, 200):
            print("      evidencia Ultra: la actividad no apareció en la página de Calificaciones")
        puntos = a["puntos"]
        print(f"    Puntos: {('%g' % puntos) if isinstance(puntos, (int, float)) else 'no indicado'}")
        print(f"    Calificación: {texto_calificacion(a['grade']) or 'sin calificar'}")
        if a["descripcion"]:
            print(f"    Descripción: {a['descripcion']}")
        intentos = linea_intentos(a)
        if intentos is None and a["http_intentos"] not in (None, 200):
            intentos = f"no disponibles por API (HTTP {a['http_intentos']})"
            if a["ui"] and "ilimitados" in senales_ui(a["ui"]["texto"]):
                intentos += "; Ultra indica intentos posibles ilimitados"
        if intentos:
            print(f"    Intentos: {intentos}")
        print(f"    Link: {a['enlace']}")


def main():
    zona = os.environ.get("BB_TZ", "America/Tijuana") if ZONA else "la de esta computadora"
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
        problemas = []
        cursos = obtener_cursos(cli, usuario["id"])
        calendario = calendario_entregas(cli)
        if calendario is None:
            problemas.append("calendario de entregas: la API no respondió")

        resultados = []
        for curso in cursos:
            log(f"Curso: {curso['nombre']}")
            acts = actividades_curso(cli, curso, usuario["id"], calendario, problemas)
            for a in acts:
                a["estado"] = clasificar(a)
            if any(necesita_ui(a, a["estado"][0]) for a in acts):
                log("  completando con la página de Calificaciones de Ultra...")
                leer_ui(page, curso, acts)
                for a in acts:
                    if not a["estado"][0].startswith(("estado desconocido", "sin estado")):
                        continue  # la API ya decidió el estado; Ultra queda solo como evidencia
                    if not a["ui"]:
                        if a["estado"][0] == "estado desconocido":
                            a["estado"] = ("estado desconocido",
                                           a["estado"][1] + "; la actividad no apareció en la página de Calificaciones de Ultra")
                        continue
                    estado, motivo = estado_desde_ui(a)
                    if estado:
                        a["estado"], a["fuente_estado"] = (estado, motivo), "Ultra"
                    elif a["estado"][0] == "estado desconocido":
                        a["estado"] = ("estado desconocido", f"ni la API ni Ultra lo indican: {motivo}")
            for a in acts:
                if a["estado"][0].startswith(("pendiente", "estado desconocido")) and not a["entrega_iso"]:
                    a["estado"] = (a["estado"][0] + " (sin fecha de entrega)", a["estado"][1])
            resultados.append((curso, acts))

        print()
        print("=" * 60)
        print(" ACTIVIDADES VERIFICADAS")
        print(f" (fechas y horas en zona {zona})")
        print("=" * 60)
        for curso, acts in resultados:
            imprimir(curso, acts)

        todas = [a for _, acts in resultados for a in acts]
        for a in todas:
            if a["http_intentos"] not in (None, 200):
                resuelto = ("estado sigue desconocido" if a["estado"][0].startswith("estado desconocido")
                            else f"estado obtenido de {a['fuente_estado']}")
                problemas.append(f"{a['nombre']}: API de intentos HTTP {a['http_intentos']} "
                                 f"(diagnóstico técnico; {resuelto})")
            elif a["estado"][0].startswith("estado desconocido"):
                problemas.append(f"{a['nombre']}: Blackboard no informó el estado ({a['estado'][1]})")

        print()
        print("=" * 60)
        print(" PROBLEMAS / DATOS NO DISPONIBLES")
        print("=" * 60)
        if problemas:
            for pr in dict.fromkeys(problemas):
                print(f"  - {pr}")
        else:
            print("  Ninguno: Blackboard permitió leer todo lo solicitado.")
        sin_fecha = [a["nombre"] for a in todas if not a["entrega_iso"]]
        sin_desc = sum(1 for a in todas if not a["descripcion"])
        print("\n  Campos vacíos en Blackboard (no son error, el profesor no los llenó):")
        print(f"    sin fecha de entrega: {', '.join(sin_fecha) if sin_fecha else 'ninguna'}")
        print(f"    sin descripción: {sin_desc}/{len(todas)}")

        print()
        print("=" * 60)
        print(" RESUMEN DE ESTADOS")
        print("=" * 60)
        conteo = {}
        for a in todas:
            conteo[a["estado"][0]] = conteo.get(a["estado"][0], 0) + 1
        for est, n in sorted(conteo.items(), key=lambda x: -x[1]):
            print(f"  {n:>3}  {est}")
        registro.imprimir()
        if bloqueadas:
            log(f"Se bloquearon {len(bloqueadas)} peticiones de escritura del navegador.")
        if DIAGNOSTICO:
            log(f"Respuestas crudas en {CARPETA_DIAG} (contienen tus datos; no las compartas).")
        input("\nPresiona Enter para cerrar el navegador...")
        context.close()


if __name__ == "__main__":
    main()

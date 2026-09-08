(() => {
"use strict";
const C = window.CAU_CONFIG || {};

/* Columnas del export que se pueden visualizar, agrupadas. Solo se ofrecen
   las que traen datos: si una viene entera a cero (Hr Load, por ejemplo), se oculta. */
/* Métricas que no vienen en el export y calculamos nosotros. */
const HMLD = "HMLD (m)";
const ACC3 = "ACC > 3 m/s²";
const ACC3MIN = "ACC > 3 por min";
const DEC3 = "DECC > 3 m/s²";
const DEC3MIN = "DECC > 3 por min";
const PCTVEL = "% de su top speed";
const PCTACC = "% de su ACC máx";
const CALCULADAS = [HMLD, ACC3, ACC3MIN, DEC3, DEC3MIN, PCTVEL, PCTACC];

/* Zonas de potencia que componen el HMLD: todo lo que pasa de 25 w/kg. */
const ZONAS_HMLD = [
  "Distance in Power Zone: 25 - 30 w/kg  (metres)",
  "Distance in Power Zone: 30 - 35 w/kg  (metres)",
  "Distance in Power Zone: 35 - 40 w/kg  (metres)",
  "Distance in Power Zone: 40 - 45 w/kg  (metres)",
  "Distance in Power Zone: 45 - 50 w/kg  (metres)",
  "Distance in Power Zone: > 50 w/kg  (metres)"
];

/**
 * HMLD = distancia recorrida por encima de 25 w/kg de potencia metabólica.
 * ACC/DECC > 3 = suma de las zonas 3-4 y > 4, y su versión por minuto.
 */
function calcular(crudo, minutos) {
  const v = c => Math.abs(crudo[c] || 0);
  crudo[HMLD] = ZONAS_HMLD.reduce((t, c) => t + v(c), 0);
  crudo[ACC3] = v("Accelerations Zone Count: 3 - 4 m/s/s") + v("Accelerations Zone Count: > 4 m/s/s");
  crudo[DEC3] = v("Deceleration Zone Count: 3 - 4 m/s/s") + v("Deceleration Zone Count: > 4 m/s/s");
  crudo[ACC3MIN] = minutos ? crudo[ACC3] / minutos : 0;
  crudo[DEC3MIN] = minutos ? crudo[DEC3] / minutos : 0;
}

/* Lo que va en gráficos de barras: volumen y distancias por zona. */
const CATALOGO = [
  ["Volumen", [
    "Distance (metres)", HMLD, "Sprint Distance (m)", "Player Load", "Power Plays",
    "Energy (kcal)", "Hr Load", "Time In Red Zone (min)", "Distance Per Min (m/min)"
  ]],
  ["Acciones de alta intensidad", [ACC3, ACC3MIN, DEC3, DEC3MIN]],
  ["Distancia por zona de potencia", [
    "Distance in Power Zone: 25 - 30 w/kg  (metres)",
    "Distance in Power Zone: 30 - 35 w/kg  (metres)",
    "Distance in Power Zone: 35 - 40 w/kg  (metres)",
    "Distance in Power Zone: 40 - 45 w/kg  (metres)",
    "Distance in Power Zone: 45 - 50 w/kg  (metres)",
    "Distance in Power Zone: > 50 w/kg  (metres)"
  ]],
  ["Distancia por zona de velocidad", [
    "Distance in Speed Zone 1  (metres)", "Distance in Speed Zone 2  (metres)",
    "Distance in Speed Zone 3  (metres)", "Distance in Speed Zone 4  (metres)",
    "Distance in Speed Zone 5  (metres)"
  ]]
];

/* Lo que va en la tabla de abajo, sin barras ni medias por jugador. */
const TABLA = [
  ["Velocidad", ["Top Speed (m/s)", PCTVEL]],
  // Solo las acciones de alta intensidad: por debajo de 3 m/s² no aporta.
  ["Aceleraciones de alta intensidad", [
    "Max Acceleration (m/s/s)", PCTACC,
    "Accelerations Zone Count: 3 - 4 m/s/s", "Accelerations Zone Count: > 4 m/s/s", ACC3MIN
  ]],
  ["Deceleraciones de alta intensidad", [
    "Max Deceleration (m/s/s)",
    "Deceleration Zone Count: 3 - 4 m/s/s", "Deceleration Zone Count: > 4 m/s/s", DEC3MIN
  ]],
  ["Impactos", [
    "Impacts",
    "Impact Zones: 3 - 5 G (Impacts)", "Impact Zones: 5 - 10 G (Impacts)",
    "Impact Zones: 10 - 15 G (Impacts)", "Impact Zones: 15 - 20 G (Impacts)",
    "Impact Zones: > 20 G (Impacts)"
  ]]
];
const TODAS_COLUMNAS = () => CATALOGO.concat(TABLA).flatMap(([, c]) => c);

/* Los cuatro números fijos de la cabecera: vista general de la sesión. */
const RESUMEN = [
  { col:"Distance (metres)", titulo:"Distancia", uni:"m",   tipo:"vol" },
  { col:HMLD,                titulo:"HMLD",      uni:"m",   tipo:"vol" },
  { col:ACC3,                titulo:"ACC > 3",   uni:"m/s²", tipo:"int" },
  { col:"Player Load",       titulo:"Player load", uni:"",  tipo:"vol" }
];

/* Los nombres se dejan tal cual salen en el Sheets, para que no haya dudas
   de qué columna es cada cosa. Solo se les añade el rango cuando lo tienes
   configurado, porque el export no lo trae. */
const RANGOS_ZONA = (C.zonasVelocidad) || {};
const nombreMetrica = c => {
  if (c === HMLD) return "HMLD (m)  ·  > 25 w/kg";
  const z = c.match(/Speed Zone (\d)/);
  if (z && RANGOS_ZONA[z[1]]) return c + "  ·  " + RANGOS_ZONA[z[1]];
  if (c === "Impacts" && C.umbralImpacto) return "Impacts  ·  > " + C.umbralImpacto + " G";
  return c;
};
/* Versión corta para las cabeceras de la tabla. */
const CORTOS = {
  "Top Speed (m/s)": "Top speed (m/s)", [PCTVEL]: "% top speed",
  "Max Acceleration (m/s/s)": "ACC máx", [PCTACC]: "% ACC máx",
  "Max Deceleration (m/s/s)": "DECC máx",
  "Accelerations Zone Count: 3 - 4 m/s/s": "ACC 3-4", "Accelerations Zone Count: > 4 m/s/s": "ACC > 4",
  "Deceleration Zone Count: 3 - 4 m/s/s": "DECC 3-4", "Deceleration Zone Count: > 4 m/s/s": "DECC > 4",
  [ACC3MIN]: "ACC > 3 / min", [DEC3MIN]: "DECC > 3 / min",
  "Impacts": "Impactos", [HMLD]: "HMLD", [ACC3]: "ACC > 3", [DEC3]: "DECC > 3",
  "Distance (metres)": "Distancia", "Sprint Distance (m)": "Sprint dist.",
  "Player Load": "Player load", "Power Plays": "Power plays"
};
const nombreCorto = c => CORTOS[c] || (CALCULADAS.includes(c) ? c : c)
  .replace(/Accelerations Zone Count: (.*) m\/s\/s/, "ACC $1 m/s²")
  .replace(/Deceleration Zone Count: (.*) m\/s\/s/, "DECC $1 m/s²")
  .replace(/Max Acceleration.*/, "ACC máx m/s²")
  .replace(/Max Deceleration.*/, "DECC máx m/s²")
  .replace(/Top Speed \(m\/s\)/, "Top speed m/s")
  .replace(/Impact Zones: /, "").replace(/ \(Impacts\)/, "")
  .replace(/Distance in Power Zone: (.*) w\/kg.*/, "$1 w/kg")
  .replace(/Distance in Speed Zone (\d).*/, "Zona $1")
  .trim();

const UNIDADES = {
  "Distance (metres)":"m", "Sprint Distance (m)":"m", "Distance Per Min (m/min)":"m/min",
  "Top Speed (m/s)":"m/s", "Max Acceleration (m/s/s)":"m/s²", "Max Deceleration (m/s/s)":"m/s²",
  "Energy (kcal)":"kcal", "Power Score (w/kg)":"w/kg", "Time In Red Zone (min)":"min"
};
const unidad = c => UNIDADES[c]
  || (c === PCTVEL || c === PCTACC ? "%" : c === HMLD ? "m" : /por min/.test(c) ? "/min" : /ACC|DECC/.test(c) ? "nº"
     : /Speed Zone|Power Zone/.test(c) ? "m" : /Zone Count|Impact Zones/.test(c) ? "nº" : "");

let METRICAS = [];        // catálogo filtrado a lo que hay en los datos

/* Puestos abreviados, que "Primera línea" no cabe en una pastilla. */
const ABREV_PUESTO = {
  "Primera línea": "1ª línea", "Segunda línea": "2ª línea",
  "Tercera línea": "3ª línea", "Tres cuartos": "3/4", "Sin posición": "sin puesto"
};
const puestoCorto = p => ABREV_PUESTO[p] || p;
/** Media de una columna para un conjunto de filas. */
const mediaDe = (filas, col) => filas.length
  ? filas.reduce((t, r) => t + Math.abs(r.crudo[col] || 0), 0) / filas.length : 0;
/** Una media de recuentos enteros se enseña con un decimal: 6,3 dice más que 6. */
const decMedia = d => d === 0 ? 1 : d;


let DATOS = [], BLOQUES = [];   // sesiones completas y bloques parciales
let MOTES = {}, POSICIONES = {};   // maestro que llega del Sheets
let EQUIPO_CARGA = "";             // equipo elegido al arrastrar un CSV sin columna Squad
const F = { squad:"", fecha:"", pestana:"reporte",
  // Cuatro paneles, como los cuatro selectores del Session Report de Power BI.
  metricas:["Distance (metres)", HMLD, "Sprint Distance (m)",
            ACC3, "Player Load", "Distance in Speed Zone 5  (metres)"] };

/* ---------- utilidades ---------- */
const $ = s => document.querySelector(s);
/** Los porcentajes llevan el símbolo pegado, que si no parecen otra cosa. */
const fmt = (col, v, d) => nf(v, d) + (col === PCTVEL || col === PCTACC ? "%" : "");
const nf = (v, d = 0) => (v == null || isNaN(v)) ? "–" : Number(v).toLocaleString("es-ES", { minimumFractionDigits:d, maximumFractionDigits:d });
const num = v => {
  if (typeof v === "number") return v;
  if (v == null) return 0;
  let s = String(v).trim().replace(/\s/g, "");
  // "5.730,99" -> el punto es de miles. "5730.997" -> el punto es decimal.
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
};
const clave = s => String(s || "").toLowerCase().replace(/[^a-z0-9<>]/g, "");
/** Quita puntos, espacios y acentos para comparar nombres sin sorpresas. */
const nombreClave = s => String(s || "").trim().toUpperCase()
  .normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Z0-9]/g, "");
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;" }[c]));
const fechaLarga = d => d.toLocaleDateString("es-ES", { weekday:"short", day:"2-digit", month:"short", year:"numeric" });
const iso = d => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");

function parseFecha(v) {
  if (v instanceof Date) return v;
  // Catapult exporta la fecha como número de serie de Excel: 46270 = 5/9/2026.
  if (typeof v === "number" && v > 20000 && v < 80000) return serieAFecha(v);
  const s = String(v || "").trim();
  if (/^\d{5}(\.\d+)?$/.test(s)) return serieAFecha(parseFloat(s));
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
  m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (m) {
    const a = +m[3] < 100 ? 2000 + +m[3] : +m[3];
    // Fechas con barras: día primero, como se pegaron desde Excel.
    return +m[2] > 12 ? new Date(a, +m[1] - 1, +m[2]) : new Date(a, +m[2] - 1, +m[1]);
  }
  const d = new Date(s);
  return isNaN(d) ? null : d;
}

function serieAFecha(n) {
  const d = new Date(Date.UTC(1899, 11, 30) + Math.round(n) * 86400000);
  return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

/* ---------- lectura del origen ---------- */
function parseCSV(txt) {
  const filas = []; let f = [], c = "", q = false;
  for (let i = 0; i < txt.length; i++) {
    const ch = txt[i];
    if (q) {
      if (ch === '"') { if (txt[i+1] === '"') { c += '"'; i++; } else q = false; }
      else c += ch;
    } else if (ch === '"') q = true;
    else if (ch === ",") { f.push(c); c = ""; }
    else if (ch === "\n") { f.push(c); filas.push(f); f = []; c = ""; }
    else if (ch !== "\r") c += ch;
  }
  if (c || f.length) { f.push(c); filas.push(f); }
  if (!filas.length) return [];
  const cab = filas[0].map(h => h.trim());
  return filas.slice(1).filter(r => r.some(x => String(x).trim() !== ""))
    .map(r => Object.fromEntries(cab.map((h, i) => [h, r[i] ?? ""])));
}

const SINONIMOS = {
  squad:["squad","equipo","team"], fecha:["date","fecha"], sesion:["sessiontitle","sesion","session"],
  jugador:["playername","jugador","player","nombre"], split:["splitname","split"], posicion:["position","posicion","puesto"],
  tags:["tags","tag","etiquetas"], md:["md","diamd"],
  minutos:["totalduration","totalactivitymins","minutos","duracion"], duracionSeg:["duration"],
  distancia:["distancemetres","distancia","distance"], sprint:["sprintdistancem","sprintdistance","sprint","hsr"],
  playerLoad:["playerload"], vmax:["topspeedms","topspeed","vmax"], mMin:["distanceperminmmin","distancepermin","mmin"],
  maxAcc:["maxaccelerationmss","maxacceleration"], maxDec:["maxdecelerationmss","maxdeceleration"],
  impactos:["impacts","impactos"], powerPlays:["powerplays"], hmld:["hmld"],
  acc3:["acc>3","acc3","accmayor3"], dec3:["decc>3","dec3","deccmayor3"],
  acc34:["accelerationszonecount34mss"], accM4:["accelerationszonecount>4mss"],
  dec34:["decelerationzonecount34mss"], decM4:["decelerationzonecount>4mss"],
  pz25:["distanceinpowerzone2530wkgmetres"], pz30:["distanceinpowerzone3035wkgmetres"],
  pz35:["distanceinpowerzone3540wkgmetres"], pz40:["distanceinpowerzone4045wkgmetres"],
  pz45:["distanceinpowerzone4550wkgmetres"], pz50:["distanceinpowerzone>50wkgmetres"]
};

/** El MD viene escrito en el título: "INS MD-3 Sitges" -> -3. Un partido es MD 0. */
function leerMD(titulo) {
  const t = String(titulo || "");
  const m = t.match(/MD\s*([+-])\s*(\d+)/i);
  if (m) return parseInt(m[1] + m[2], 10);
  return /\bMD\b/i.test(t) ? 0 : null;
}
const etiquetaMD = md => md == null ? null : (md === 0 ? "MD" : "MD" + (md > 0 ? "+" : "") + md);

function normaliza(brutas) {
  let salida = [];
  for (const cruda of brutas) {
    const m = {};
    for (const [k, v] of Object.entries(cruda)) m[clave(k)] = v;
    const get = campo => { for (const alias of SINONIMOS[campo] || []) if (alias in m) return m[alias]; return undefined; };

    const fecha = parseFecha(get("fecha"));
    const alias = String(get("jugador") || "").trim();
    if (!fecha || !alias) continue;
    // El GPS graba motes (RP, JT...) por protección de datos.
    const jugador = MOTES[nombreClave(alias)] || alias;

    const split = String(get("split") || "").trim();
    const esCompleto = !split || (C.splitsCompletos || []).some(s => clave(s) === clave(split));
    const esRespaldo = clave(split) === "all";

    let minutos = num(get("minutos"));
    if (!minutos) minutos = Math.round(num(get("duracionSeg")) / 60);
    if (minutos <= 0 || minutos < (C.minutosMinimos ?? 0)) continue;

    const sesion = String(get("sesion") || "").trim();
    const etiquetas = String(get("tags") || "").trim().toLowerCase();
    // El split manda: en un triangular el tag pone "training" aunque sean partidos.
    const esPartido = /match/i.test(split) || (etiquetas
      ? /\bgame\b/.test(etiquetas) && etiquetas !== "training"
      : (C.marcadoresPartido || []).some(t => (sesion + " " + split).toLowerCase().includes(t)));
    const mdCol = get("md");
    const md = mdCol !== undefined && mdCol !== "" ? num(mdCol) : (esPartido ? 0 : leerMD(sesion));

    // Guardamos las columnas del catálogo tal cual vienen, sin recalcular nada.
    const crudo = {};
    for (const col of TODAS_COLUMNAS()) if (clave(col) in m) crudo[col] = num(m[clave(col)]);
    calcular(crudo, minutos);

    salida.push({
      crudo, esCompleto, esRespaldo,
      squad: String(get("squad") || EQUIPO_CARGA || "Senior").trim(),
      fecha, fechaISO: iso(fecha), sesion, jugador, alias, split, md, esPartido,
      posicion: String(get("posicion") || "").trim() || POSICIONES[jugador] || "Sin posición",
      minutos
    });
  }
  // Los splits parciales son los bloques del entrenamiento: van aparte.
  BLOQUES = salida.filter(r => !r.esCompleto && !r.esRespaldo);
  salida = salida.filter(r => r.esCompleto || r.esRespaldo);

  // Una fila por jugador y evento. Si llegan el split completo y el "all",
  // se queda el completo; el "all" solo sirve cuando no hay nada mejor.
  const porSesion = new Map();
  for (const r of salida) {
    const k = r.jugador + "|" + r.fechaISO + "|" + r.sesion;
    const previa = porSesion.get(k);
    if (!previa) { porSesion.set(k, r); continue; }
    const previaEsAll = clave(previa.split) === "all";
    const nuevaEsAll = clave(r.split) === "all";
    if (previaEsAll && !nuevaEsAll) porSesion.set(k, r);
  }
  salida = [...porSesion.values()];
  salida.sort((a, b) => a.fecha - b.fecha);
  return salida;
}

/**
 * Exposición: qué porcentaje de su propio techo alcanzó cada jugador ese día.
 * El techo es el mejor registro suyo en todo el histórico cargado, así que
 * cuanto más histórico tengas, más fiable es la referencia.
 */
function recalcularExposicion() {
  const registros = {};
  for (const r of DATOS) {
    const t = registros[r.jugador] || (registros[r.jugador] = { vel:[], acc:[] });
    const v = Math.abs(r.crudo["Top Speed (m/s)"] || 0);
    const a = Math.abs(r.crudo["Max Acceleration (m/s/s)"] || 0);
    if (v) t.vel.push(v);
    if (a) t.acc.push(a);
  }

  // Un pico aislado del sensor no debería marcar el techo de todo el año.
  // Con "segundo" se usa el segundo mejor registro, que ya es repetible.
  const modo = C.techo || "segundo";
  const techoDe = lista => {
    if (!lista.length) return 0;
    const orden = lista.slice().sort((a, b) => b - a);
    if (modo === "max" || orden.length < 3) return orden[0];
    if (modo === "p95") return orden[Math.floor(orden.length * 0.05)];
    return orden[1];
  };

  for (const r of DATOS) {
    const t = registros[r.jugador];
    const tv = techoDe(t.vel), ta = techoDe(t.acc);
    if (tv) r.crudo[PCTVEL] = Math.min(100, Math.abs(r.crudo["Top Speed (m/s)"] || 0) / tv * 100);
    if (ta) r.crudo[PCTACC] = Math.min(100, Math.abs(r.crudo["Max Acceleration (m/s/s)"] || 0) / ta * 100);
  }
}

/** Deja en METRICAS solo las columnas que existen y traen algún valor distinto de cero. */
function detectarMetricas() {
  recalcularExposicion();
  METRICAS = [];
  for (const [grupo, cols] of CATALOGO) {
    const vivas = cols.filter(c => DATOS.some(r => Math.abs(r.crudo[c] || 0) > 0));
    if (vivas.length) METRICAS.push([grupo, vivas]);
  }
}
const todasMetricas = () => METRICAS.flatMap(([, c]) => c);

/**
 * Segunda vía de lectura, para cuando fetch falla por permisos entre dominios.
 * Carga el script con una etiqueta <script>, que el navegador nunca bloquea.
 */
function cargarPorScript(url, segundos = 20) {
  return new Promise((resolve, reject) => {
    const nombre = "__cauDatos" + Date.now();
    const et = document.createElement("script");
    const limpiar = () => { delete window[nombre]; et.remove(); clearTimeout(reloj); };
    const reloj = setTimeout(() => { limpiar(); reject(new Error("el script tardó demasiado en responder")); }, segundos * 1000);
    window[nombre] = datos => { limpiar(); resolve(datos); };
    et.onerror = () => { limpiar(); reject(new Error("el navegador no pudo cargar el script")); };
    et.src = url + (url.includes("?") ? "&" : "?") + "callback=" + nombre;
    document.head.appendChild(et);
  });
}

async function cargar() {
  const fuente = (C.fuente || "").trim();
  setEstado("Cargando…", false);
  if (!fuente) { DATOS = normaliza(demo()); detectarMetricas(); setEstado("Datos de ejemplo · arrastra tu CSV", false); return; }
  // Con el endpoint del script probamos primero la vía que no depende de permisos.
  if (/\/exec/.test(fuente)) {
    try {
      const j = await cargarPorScript(fuente);
      if (j.motes) MOTES = j.motes;
      if (j.posiciones) POSICIONES = j.posiciones;
      if (j.bipCabeceras && j.bipFilas) BIP = normalizaBip(
        j.bipFilas.map(f => Object.fromEntries(j.bipCabeceras.map((c, i) => [c, f[i]]))), "");
      const brutas = (j.cabeceras && j.filas)
        ? j.filas.map(f => Object.fromEntries(j.cabeceras.map((c, i) => [c, f[i]])))
        : (j.datos || []);
      DATOS = normaliza(brutas);
      detectarMetricas();
      setEstado(DATOS.length ? "Conectado · " + DATOS.length + " filas"
                             : "Conectado · histórico vacío, arrastra tu CSV", true);
      if (DATOS.length) return;
    } catch (e) {
      console.warn("Lectura por script:", e);
    }
  }

  try {
    const res = await fetch(fuente, { redirect:"follow" });
    if (!res.ok) throw new Error("el servidor respondió HTTP " + res.status);
    const txt = await res.text();
    if (/<html/i.test(txt.slice(0, 400))) {
      throw new Error("Google devolvió una página de error. Suele ser que la implementación " +
        "no está como \"Cualquier usuario\" o que no publicaste una versión nueva tras cambiar el script");
    }
    let brutas;
    if (txt.trim().startsWith("[") || txt.trim().startsWith("{")) {
      const j = JSON.parse(txt);
      if (j.motes) MOTES = j.motes;
      if (j.posiciones) POSICIONES = j.posiciones;
      if (j.bipCabeceras && j.bipFilas) BIP = normalizaBip(
        j.bipFilas.map(f => Object.fromEntries(j.bipCabeceras.map((c, i) => [c, f[i]]))), "");
      if (j.cabeceras && j.filas) {
        // Formato compacto: cabeceras aparte y filas como listas.
        brutas = j.filas.map(f => Object.fromEntries(j.cabeceras.map((c, i) => [c, f[i]])));
      } else {
        brutas = Array.isArray(j) ? j : (j.datos || j.data || []);
      }
    } else brutas = parseCSV(txt);
    if (!brutas.length) throw new Error("el Sheets respondió pero no traía ninguna fila");
    DATOS = normaliza(brutas);
    detectarMetricas();
    if (!DATOS.length) {
      setEstado("Conectado · histórico vacío, arrastra tu CSV", true);
      return;
    }
    setEstado("Conectado · " + DATOS.length + " filas", true);
  } catch (e) {
    DATOS = normaliza(demo());
    detectarMetricas();
    setEstado("Datos de ejemplo · " + (e.message || e), false);
    console.error("No se pudo leer el Sheets:", e);
  }
}
function setEstado(txt, live) {
  $("#estadoTxt").textContent = txt;
  $("#estado .dot").className = "dot" + (live ? " live" : "");
}

/* ---------- filtros ---------- */
function poblarFiltros() {
  const squads = [...new Set(DATOS.map(r => r.squad))].sort();
  if (!squads.includes(F.squad)) F.squad = squads[0] || "";
  $("#fSquad").innerHTML = squads.map(s => `<option${s === F.squad ? " selected" : ""}>${esc(s)}</option>`).join("");
  poblarFechas();
}
/** Cada opción es una sesión concreta: un mismo día puede tener dos eventos. */
const idSesion = r => r.fechaISO + "|" + r.sesion;

function poblarFechas() {
  if (!$("#fFecha")) return;
  const vistas = new Map();
  for (const r of DATOS.filter(x => x.squad === F.squad)) {
    if (!vistas.has(idSesion(r))) vistas.set(idSesion(r), r);
  }
  // De la sesión más reciente a la más antigua, por fecha real y no por texto.
  const claves = [...vistas.keys()].sort((a, b) => vistas.get(b).fecha - vistas.get(a).fecha
    || vistas.get(a).sesion.localeCompare(vistas.get(b).sesion));
  if (!claves.includes(F.fecha)) F.fecha = claves[0] || "";
  $("#fFecha").innerHTML = claves.map(id => {
    const r = vistas.get(id);
    const mdTxt = etiquetaMD(r.md);
    return `<option value="${esc(id)}"${id === F.fecha ? " selected" : ""}>${esc(fechaLarga(r.fecha))}${mdTxt ? " · " + mdTxt : ""} · ${esc(r.sesion || r.split)}</option>`;
  }).join("");
}
const sesion = () => DATOS.filter(r => r.squad === F.squad && idSesion(r) === F.fecha);

/* ---------- pintado ---------- */
/** Cuatro cifras fijas para leer la sesión antes de entrar en detalle. */
function resumen(filas) {
  return `<div class="resumen">${RESUMEN.map(r => {
    if (!filas.some(x => r.col in x.crudo)) return "";
    const vals = filas.map(x => Math.abs(x.crudo[r.col] || 0));
    const media = vals.reduce((t, v) => t + v, 0) / (vals.length || 1);
    const total = vals.reduce((t, v) => t + v, 0);
    const dec = decMedia(decimales(vals));
    return `<div class="kpi ${r.tipo}">
      <span class="k">${r.tipo === "vol" ? "Volumen" : "Intensidad"}</span>
      <b>${nf(media, dec)}<i>${r.uni ? " " + r.uni : ""}</i></b>
      <span class="s">${esc(r.titulo)} media · ${nf(total, 0)} total</span>
    </div>`;
  }).join("")}</div>`;
}

function cabecera() {
  const filas = sesion();
  if (!filas.length) { $("#cab").innerHTML = ""; return; }
  const titulos = [...new Set(filas.map(r => r.sesion).filter(Boolean))];
  const md = etiquetaMD(filas[0].md);
  const mins = filas.reduce((t, r) => t + r.minutos, 0) / filas.length;
  $("#cab").innerHTML = `
    <h2>${esc(titulos.join(" · ") || "Sesión")}</h2>
    ${md ? `<span class="md${filas[0].esPartido ? " partido" : ""}">${md}</span>` : ""}
    <span class="meta">${esc(fechaLarga(filas[0].fecha))} · ${filas.length} jugadores · ${nf(mins)} min de media</span>`;
  $("#resumen").innerHTML = resumen(filas);
}

/** Decimales según el tamaño del número, para no enseñar 2569,68 ni 6 pelado. */
function decimales(vals) {
  // Recuentos (impactos, aceleraciones) son enteros: no tiene sentido "35,0".
  if (vals.every(v => Number.isInteger(v))) return 0;
  return 2;
}

function panel(col, filas, indice) {
  const datos = filas.map(r => ({ nom:r.jugador, pos:r.posicion, v:Math.abs(r.crudo[col] || 0) }))
    .sort((a, b) => b.v - a.v);
  const vals = datos.map(d => d.v);
  const media = vals.reduce((t, v) => t + v, 0) / (vals.length || 1);
  // Rangos estrechos (velocidad, power score) no arrancan en cero o no se distingue nada.
  const met = { dec: decimales(vals), uni: unidad(col), lbl: nombreMetrica(col),
                escala: (Math.min(...vals) > 0 && Math.max(...vals) / Math.min(...vals) < 2) ? "rango" : "" };
  const alto = Math.max(...vals), bajo = Math.min(...vals);
  // En intensidad el rango útil es estrecho: si todas las barras arrancan en cero
  // no se distingue nada, así que la escala empieza justo por debajo del peor dato.
  const margen = (alto - bajo) * 0.12 || 1;
  const tope = alto;
  const suelo = met.escala === "rango" ? Math.max(0, bajo - margen) : 0;
  const ancho = v => Math.max(2, Math.min(100, ((v - suelo) / (tope - suelo || 1)) * 100));
  // Verde si llega a la media de su propio puesto, morado si no.
  const mediaPuesto = {};
  for (const p of [...new Set(filas.map(r => r.posicion))]) {
    mediaPuesto[p] = mediaDe(filas.filter(r => r.posicion === p), col);
  }
  const cuerpo = datos.map(d => {
    const clase = d.v >= (mediaPuesto[d.pos] || 0) ? "cumple" : "";
    return `<div class="fila">
      <span class="nom" title="${esc(d.pos)}">${esc(d.nom)}</span>
      <span class="pista"><i class="${clase}" style="width:${ancho(d.v).toFixed(1)}%"></i><u style="left:${ancho(media).toFixed(1)}%"></u></span>
      <span class="val">${fmt(col, d.v, met.dec)}</span>
    </div>`;
  }).join("");

  const puestos = [...new Set(filas.map(r => r.posicion))].sort();
  const pie = puestos.length < 2 ? "" : `<div class="pie cajas">
    ${puestos.map(p => `<span class="caja"><b>${fmt(col, mediaPuesto[p], decMedia(met.dec))}</b>${esc(puestoCorto(p))}</span>`).join("")}
  </div>`;

  return `<section class="panel">
    ${selectorMetrica(indice)}
    <div class="avgline"><b>${fmt(col, media, met.dec)}</b> media del equipo${met.uni && met.uni !== "%" ? " · " + met.uni : ""}</div>
    ${cuerpo}
    ${pie}
  </section>`;
}

/* ---------- % de carga sobre las demandas de juego ---------- */
const FC = { escenario:"p50" };

/** Color según lo cerca que se queda del 100% de la demanda. */
function tintePct(p) {
  if (p >= 100) return "background:rgba(110,154,155,.30)";
  if (p >= 75)  return "background:rgba(110,154,155,.16)";
  if (p >= 50)  return "background:rgba(240,225,153,.14)";
  return "background:rgba(224,107,112,.13)";
}

function porcentajeCarga() {
  const D = C.demandas;
  if (!D || !D.valores) return `<p class="empty">No hay demandas de juego configuradas.</p>`;
  const filas = sesion();
  if (!filas.length) return `<p class="empty">Elige una sesión con datos.</p>`;

  const mets = D.metricas;
  const esc_ = FC.escenario;
  const conDemanda = filas.filter(r => D.valores[r.posicion]);
  if (!conDemanda.length) {
    return `<p class="empty">Ningún jugador de esta sesión tiene una posición con demandas definidas.</p>`;
  }

  const jugadores = conDemanda.slice().sort((a, b) =>
    a.posicion.localeCompare(b.posicion) || a.jugador.localeCompare(b.jugador));

  const pct = (r, i) => {
    const ref = D.valores[r.posicion][esc_][i];
    const v = Math.abs(r.crudo[mets[i]] || 0);
    return ref ? v / ref * 100 : null;
  };

  const cuerpo = jugadores.map(r => `<tr>
    <td>${esc(r.jugador)}</td><td class="pos">${esc(r.posicion)}</td>
    <td class="n">${nf(r.minutos)}</td>
    ${mets.map((m, i) => {
      const p = pct(r, i);
      if (p == null) return `<td class="n">–</td>`;
      return `<td class="n" style="${tintePct(p)}">${nf(p, 0)}%<i>${nf(Math.abs(r.crudo[m] || 0), 0)}</i></td>`;
    }).join("")}
  </tr>`).join("");

  // Media del equipo por métrica y por puesto.
  const puestos = [...new Set(jugadores.map(r => r.posicion))].sort();
  const resumenPuestos = puestos.map(pu => {
    const suyos = jugadores.filter(r => r.posicion === pu);
    return `<tr class="media"><td>Media</td><td class="pos">${esc(pu)}</td>
      <td class="n">${nf(suyos.reduce((t, r) => t + r.minutos, 0) / suyos.length)}</td>
      ${mets.map((m, i) => {
        const v = suyos.reduce((t, r) => t + (pct(r, i) || 0), 0) / suyos.length;
        return `<td class="n" style="${tintePct(v)}">${nf(v, 0)}%</td>`;
      }).join("")}
    </tr>`;
  }).join("");

  return `<section class="panel">
    <div class="row">
      <div><h3>${esc(D.etiqueta || "Demandas de juego")}</h3>
        <p class="sub" style="margin:0">Porcentaje de la demanda de partido de su posición · debajo, el valor de la sesión</p></div>
      <select id="fEscenario">${(D.escenarios || []).map(([v, t]) =>
        `<option value="${v}"${v === esc_ ? " selected" : ""}>${esc(t)}</option>`).join("")}</select>
    </div>
    <div class="scroll"><table class="datos carga">
      <thead><tr><th>Jugador</th><th>Posición</th><th class="n">Min</th>
        ${mets.map(m => `<th class="n">${esc(nombreCorto(m))}</th>`).join("")}</tr></thead>
      <tbody>${cuerpo}</tbody>
      <tfoot>${resumenPuestos}</tfoot>
    </table></div>
    <div class="leyenda">
      <span><i class="sw" style="background:rgba(110,154,155,.30)"></i>100% o más</span>
      <span><i class="sw" style="background:rgba(110,154,155,.16)"></i>75-100%</span>
      <span><i class="sw" style="background:rgba(240,225,153,.14)"></i>50-75%</span>
      <span><i class="sw" style="background:rgba(224,107,112,.13)"></i>menos del 50%</span>
    </div>
  </section>`;
}

function vistaCarga() {
  cabecera();
  $("#selectores").innerHTML = "";
  $("#paneles").innerHTML = "";
  $("#tabla").innerHTML = porcentajeCarga();
  const sel = $("#fEscenario");
  if (sel) sel.onchange = e => { FC.escenario = e.target.value; pintar(); };
}

/* ---------- análisis por bloques ---------- */
const METRICAS_DRILL = [
  { id:"Player Load",       lbl:"PL / min",   dec:2 },
  { id:"Distance (metres)", lbl:"TD / min",   dec:1 },
  { id:HMLD,                lbl:"HMLD / min", dec:2 },
  { id:"Sprint Distance (m)", lbl:"HSR / min", dec:2 },
  { id:ACC3,                lbl:"ACC / min",  dec:2 },
  { id:DEC3,                lbl:"DECC / min", dec:2 }
];

/**
 * Escala divergente: azul por debajo de la media de la columna, blanco en la
 * media y rojo por encima. Así el color dice "más o menos que lo normal en
 * esta sesión", no "más o menos que cero".
 */
function tinte(v, lo, hi, media) {
  if (hi === lo) return "";
  const t = v >= media
    ? (hi > media ? (v - media) / (hi - media) : 0)
    : (media > lo ? (v - media) / (media - lo) : 0);
  const a = Math.min(0.55, Math.abs(t) * 0.55);
  return t >= 0 ? `background:rgba(224,107,112,${a.toFixed(3)})`
                : `background:rgba(122,162,214,${a.toFixed(3)})`;
}

function drillAnalysis() {
  const filas = BLOQUES.filter(r => r.squad === F.squad && idSesion(r) === F.fecha && r.minutos > 0);
  if (!filas.length) {
    return `<div class="empty"><p>Esta sesión no tiene bloques parciales guardados.</p>
      <p style="font-size:12px">Solo aparecen aquí los splits que no son la sesión o el partido completo.</p></div>`;
  }

  // Un bloque = un split. Se promedia entre los jugadores que lo hicieron.
  const bloques = [...new Set(filas.map(r => r.split))].map(nombre => {
    const suyas = filas.filter(r => r.split === nombre);
    const min = suyas.reduce((t, r) => t + r.minutos, 0) / suyas.length;
    const vals = {};
    for (const m of METRICAS_DRILL) {
      vals[m.id] = suyas.reduce((t, r) => t + (r.minutos ? Math.abs(r.crudo[m.id] || 0) / r.minutos : 0), 0) / suyas.length;
    }
    return { nombre, min, jugadores:suyas.length, vals };
  });

  const orden = FD.orden;
  bloques.sort((a, b) => orden.col === "nombre"
    ? a.nombre.localeCompare(b.nombre) * (orden.asc ? 1 : -1)
    : orden.col === "min" ? (a.min - b.min) * (orden.asc ? 1 : -1)
    : (a.vals[orden.col] - b.vals[orden.col]) * (orden.asc ? 1 : -1));

  const rango = {};
  for (const m of METRICAS_DRILL) {
    const v = bloques.map(b => b.vals[m.id]);
    rango[m.id] = { lo:Math.min(...v), hi:Math.max(...v), media:v.reduce((t, x) => t + x, 0) / v.length };
  }
  const maxMin = Math.max(...bloques.map(b => b.min));
  const flecha = c => orden.col === c ? (orden.asc ? " ↑" : " ↓") : "";

  return `<section class="panel">
    <h3>Bloques de la sesión</h3>
    <div class="scroll"><table class="datos drills">
      <thead><tr>
        <th class="orden" data-c="nombre">Bloque${flecha("nombre")}</th>
        <th class="n orden" data-c="min">Min${flecha("min")}</th>
        ${METRICAS_DRILL.map(m => `<th class="n orden" data-c="${esc(m.id)}">${esc(m.lbl)}${flecha(m.id)}</th>`).join("")}
      </tr></thead>
      <tbody>${bloques.map(b => `<tr>
        <td><div class="nomb">${esc(b.nombre)}</div>
          <div class="dur"><i style="width:${(b.min / maxMin * 62).toFixed(0)}px"></i>
          <span>${nf(b.min, 1)} min · ${b.jugadores} jug.</span></div></td>
        <td class="n">${nf(b.min, 1)}</td>
        ${METRICAS_DRILL.map(m => {
          const v = b.vals[m.id], r = rango[m.id];
          return `<td class="n" style="${tinte(v, r.lo, r.hi, r.media)}">${nf(v, m.dec)}</td>`;
        }).join("")}
      </tr>`).join("")}</tbody>
    </table></div>
  </section>`;
}

function vistaDrill() {
  cabecera();
  $("#selectores").innerHTML = "";
  $("#paneles").innerHTML = "";
  $("#tabla").innerHTML = drillAnalysis();
  document.querySelectorAll(".drills .orden").forEach(th => th.onclick = () => {
    const c = th.dataset.c;
    FD.orden = { col:c, asc: FD.orden.col === c ? !FD.orden.asc : false };
    pintar();
  });
}

/* ---------- balón en juego ---------- */
let BIP = [];                 // fases guardadas, una por secuencia
const FD = { orden:{ col:"min", asc:false },        // orden de la tabla de bloques
             ordenJug:{ col:"", asc:false } };      // orden de la tabla de jugadores
const FB = { partido:"", vista:"partido", sesionGps:"", metrica:"Distance (metres)" };
const PAREJAS = {};   // partido de BiP -> sesión de GPS que le corresponde

const mmss = seg => {
  if (!seg && seg !== 0) return "–";
  const m = Math.floor(seg / 60), r = Math.round(seg % 60);
  return m + ":" + String(r).padStart(2, "0");
};

/** Resume un conjunto de fases: lo que va en la cabecera del reporte. */
function resumirBip(fases) {
  const dur = fases.map(f => f.duracion);
  const total = dur.reduce((t, v) => t + v, 0);
  const descanso = fases.map(f => f.post).filter(v => v > 0);
  const mediaDescanso = descanso.length ? descanso.reduce((t, v) => t + v, 0) / descanso.length : 0;
  const media = dur.length ? total / dur.length : 0;
  return {
    n: fases.length, total, media, mediaDescanso,
    ratio: media ? mediaDescanso / media : 0,
    max: dur.length ? Math.max(...dur) : 0,
    rucks: fases.reduce((t, f) => t + f.rucks, 0)
  };
}

/** Reparte las fases en tramos de duración, como tu Excel. */
const TRAMOS = [[0,30],[31,60],[61,90],[91,120],[121,180],[181,1e9]];
const TRAMOS_RUCK = [[0,3],[4,6],[7,9],[10,12],[13,15]];

function barrasTramos(fases, tramos, valor, etiquetas, color) {
  const cuentas = tramos.map(([lo, hi]) => fases.filter(f => valor(f) >= lo && valor(f) <= hi).length);
  const tope = Math.max(...cuentas, 1), suma = cuentas.reduce((t, v) => t + v, 0) || 1;
  return `<div class="franjas">${cuentas.map((n, i) => `<div class="franja">
    <span class="n">${etiquetas[i]}</span>
    <span class="b"><i style="width:${(n / tope * 100).toFixed(0)}%;background:${color}"></i></span>
    <span class="v">${n}<em>${Math.round(n / suma * 100)}%</em></span>
  </div>`).join("")}</div>`;
}

function reporteBip(fases) {
  const r = resumirBip(fases);
  const partes = [...new Set(fases.map(f => f.parte))];
  const porParte = partes.map(p => resumirBip(fases.filter(f => f.parte === p)));
  const bruto = fases.reduce((t, f) => t + f.duracion + (f.post || 0), 0);
  const pct = bruto ? r.total / bruto * 100 : 0;
  const largas = fases.filter(f => f.duracion > 30);
  const rl = resumirBip(largas);

  return `
  <p class="secc">Fases de balón en juego</p>
  <div class="celdas seis">
    <div class="c"><span>Fases</span><b>${r.n}</b></div>
    ${porParte.map((p, i) => `<div class="c"><span>${esc(partes[i])}</span><b>${mmss(p.total)}</b></div>`).join("")}
    <div class="c dest"><span>Total BiP</span><b>${mmss(r.total)}</b></div>
    <div class="c"><span>Tiempo bruto</span><b>${mmss(bruto)}</b></div>
    <div class="c dest"><span>% BiP</span><b>${nf(pct, 1)}<i>%</i></b></div>
  </div>

  <p class="secc">Medias y ratio trabajo:descanso</p>
  <div class="scroll"><table class="datos bip">
    <thead><tr><th></th><th class="n">Media BiP</th>${partes.map(p => `<th class="n">${esc(p)}</th>`).join("")}<th class="n">Descanso</th><th class="n">W:R</th></tr></thead>
    <tbody>
      <tr><td>Todas las fases</td><td class="n">${mmss(r.media)}</td>
        ${porParte.map(p => `<td class="n">${mmss(p.media)}</td>`).join("")}
        <td class="n">${mmss(r.mediaDescanso)}</td><td class="n">1 : ${nf(r.ratio, 2)}</td></tr>
      <tr><td>Solo fases > 30 s <i>(${largas.length})</i></td><td class="n">${mmss(rl.media)}</td>
        ${partes.map(() => `<td class="n">–</td>`).join("")}
        <td class="n">${mmss(rl.mediaDescanso)}</td><td class="n">1 : ${nf(rl.ratio, 2)}</td></tr>
    </tbody>
  </table></div>

  <div class="paneles dos">
    <section class="panel"><h3>Duración de las fases</h3>
      ${barrasTramos(fases, TRAMOS, f => f.duracion, ["0-30 s","31-60 s","61-90 s","91-120 s","121-180 s","> 180 s"], "var(--lav)")}
    </section>
    <section class="panel"><h3>Rucks por fase</h3>
      ${barrasTramos(fases, TRAMOS_RUCK, f => f.rucks, ["0-3","4-6","7-9","10-12","13-15"], "var(--teal)")}
    </section>
  </div>

  <div class="paneles dos">
    <section class="panel"><h3>Rucks</h3>
      <div class="celdas cinco">
        <div class="c"><span>Total</span><b>${r.rucks}</b></div>
        ${porParte.map((p, i) => `<div class="c"><span>${esc(partes[i])}</span><b>${p.rucks}</b></div>`).join("")}
        <div class="c"><span>Por fase</span><b>${nf(r.n ? r.rucks / r.n : 0, 2)}</b></div>
        <div class="c"><span>Por min BiP</span><b>${nf(r.total ? r.rucks / (r.total / 60) : 0, 2)}</b></div>
      </div>
    </section>
    <section class="panel"><h3>Fase pico</h3>
      <div class="celdas cuatro">
        <div class="c dest"><span>Max BiP</span><b>${mmss(r.max)}</b></div>
        <div class="c"><span>Fases > 90 s</span><b>${fases.filter(f => f.duracion > 90).length}</b></div>
        <div class="c dest"><span>Max rucks</span><b>${Math.max(...fases.map(f => f.rucks), 0)}</b></div>
        <div class="c"><span>Fases > 7 rucks</span><b>${fases.filter(f => f.rucks > 7).length}</b></div>
      </div>
    </section>
  </div>

  <section class="panel">
    <h3>Las ${fases.length} fases, en orden</h3>
    <div class="secuencias">${fases.map((f, i) => {
      const c = f.duracion === r.max ? "wcs" : f.duracion >= 45 ? "larga" : f.duracion >= 25 ? "" : "corta";
      return `<div class="sec"><span class="id">${esc(f.nombre || "BIP " + (i + 1))}</span>
        <span class="barra"><i class="${c}" style="width:${(f.duracion / r.max * 100).toFixed(1)}%"></i></span>
        <span class="seg">${nf(f.duracion, 1)}</span></div>`;
    }).join("")}</div>
  </section>`;
}

/** Evolución entre partidos: una fila por partido con sus cifras. */
function historicoBip() {
  const partidos = [...new Set(BIP.map(f => f.partido))];
  const filas = partidos.map(p => {
    const fases = BIP.filter(f => f.partido === p);
    const r = resumirBip(fases);
    const bruto = fases.reduce((t, f) => t + f.duracion + (f.post || 0), 0);
    return { partido:p, fecha:fases[0].fecha, ...r, pct: bruto ? r.total / bruto * 100 : 0,
             rucksMin: r.total ? r.rucks / (r.total / 60) : 0 };
  }).sort((a, b) => a.fecha - b.fecha);

  if (!filas.length) return `<p class="empty">Todavía no hay partidos guardados.</p>`;
  const media = c => filas.reduce((t, f) => t + f[c], 0) / filas.length;
  const barra = (v, max, color) => `<span class="b"><i style="width:${(v / max * 100).toFixed(0)}%;background:${color}"></i></span>`;
  const maxTot = Math.max(...filas.map(f => f.total));

  return `
  <div class="celdas cuatro">
    <div class="c dest"><span>Partidos</span><b>${filas.length}</b></div>
    <div class="c"><span>BiP medio</span><b>${mmss(media("total"))}</b></div>
    <div class="c"><span>% BiP medio</span><b>${nf(media("pct"), 1)}<i>%</i></b></div>
    <div class="c"><span>Fase media</span><b>${mmss(media("media"))}</b></div>
  </div>

  <section class="panel">
    <h3>Evolución del balón en juego</h3>
    <div class="franjas">${filas.map(f => `<div class="franja ancha">
      <span class="n">${esc(f.partido)}</span>
      ${barra(f.total, maxTot, "var(--teal)")}
      <span class="v">${mmss(f.total)}<em>${nf(f.pct, 0)}%</em></span>
    </div>`).join("")}</div>
  </section>

  <section class="panel">
    <h3>Partido a partido</h3>
    <div class="scroll"><table class="datos">
      <thead><tr><th>Partido</th><th class="n">Fases</th><th class="n">BiP</th><th class="n">% BiP</th>
        <th class="n">Fase media</th><th class="n">Descanso</th><th class="n">W:R</th>
        <th class="n">Max fase</th><th class="n">Rucks</th><th class="n">Rucks/min</th></tr></thead>
      <tbody>${filas.map(f => `<tr>
        <td>${esc(f.partido)}</td><td class="n">${f.n}</td><td class="n">${mmss(f.total)}</td>
        <td class="n">${nf(f.pct, 1)}%</td><td class="n">${mmss(f.media)}</td>
        <td class="n">${mmss(f.mediaDescanso)}</td><td class="n">1 : ${nf(f.ratio, 2)}</td>
        <td class="n">${mmss(f.max)}</td><td class="n">${f.rucks}</td><td class="n">${nf(f.rucksMin, 2)}</td>
      </tr>`).join("")}</tbody>
    </table></div>
  </section>`;
}

/**
 * Cruce con el GPS: la intensidad medida sobre el tiempo real de juego.
 * El tiempo de BiP de cada jugador se ajusta a lo que participó, porque quien
 * juega media parte no ha estado en todas las fases.
 */
function cruceBip(fases, sesionId) {
  const filas = DATOS.filter(r => idSesion(r) === sesionId);
  if (!filas.length) return `<p class="empty">Elige la sesión de GPS que corresponde a este partido.</p>`;

  const r = resumirBip(fases);
  const bipMin = r.total / 60;
  const bruto = fases.reduce((t, f) => t + f.duracion + (f.post || 0), 0) / 60;
  const minPartido = Math.max(...filas.map(x => x.minutos));

  const cols = [
    { id:"Distance (metres)", lbl:"m / min" },
    { id:HMLD, lbl:"HMLD / min" },
    { id:"Sprint Distance (m)", lbl:"HSR / min" },
    { id:ACC3, lbl:"ACC > 3 / min" },
    { id:DEC3, lbl:"DECC > 3 / min" }
  ];

  const cuerpo = filas.slice().sort((a, b) => b.minutos - a.minutos).map(x => {
    // Proporción del partido que estuvo en campo, aplicada al tiempo de juego.
    const suBip = bipMin * Math.min(1, x.minutos / (minPartido || 1));
    return `<tr><td>${esc(x.jugador)}</td><td class="pos">${esc(x.posicion)}</td>
      <td class="n">${nf(x.minutos)}</td><td class="n">${nf(suBip, 1)}</td>
      ${cols.map(c => {
        const v = Math.abs(x.crudo[c.id] || 0);
        return `<td class="n">${nf(x.minutos ? v / x.minutos : 0, 2)}</td>
                <td class="n verde">${nf(suBip ? v / suBip : 0, 2)}</td>`;
      }).join("")}
    </tr>`;
  }).join("");

  return `
  <div class="celdas cuatro">
    <div class="c"><span>Tiempo bruto</span><b>${nf(bruto, 1)}<i> min</i></b></div>
    <div class="c dest"><span>Balón en juego</span><b>${nf(bipMin, 1)}<i> min</i></b></div>
    <div class="c"><span>Factor</span><b>×${nf(bipMin ? bruto / bipMin : 0, 2)}</b></div>
    <div class="c"><span>Jugadores</span><b>${filas.length}</b></div>
  </div>
  <section class="panel">
    <h3>Intensidad sobre tiempo total y sobre balón en juego</h3>
    <p class="sub">La segunda columna de cada par es la exigencia real: lo mismo dividido entre el tiempo de juego</p>
    <div class="scroll"><table class="datos">
      <thead>
        <tr><th></th><th></th><th></th><th></th>${cols.map(c => `<th colspan="2" class="grupo">${esc(c.lbl)}</th>`).join("")}</tr>
        <tr><th>Jugador</th><th>Posición</th><th class="n">Min</th><th class="n">Min BiP</th>
          ${cols.map(() => `<th class="n">total</th><th class="n">BiP</th>`).join("")}</tr>
      </thead>
      <tbody>${cuerpo}</tbody>
    </table></div>
  </section>`;
}

/**
 * Evolución: un punto por partido que tenga BiP y GPS emparejados.
 * El emparejamiento lo guarda el usuario en PAREJAS (partido BiP -> sesión GPS).
 */
const METRICAS_BIP = [
  { id:"Distance (metres)",   lbl:"Distancia por min BiP", uni:"m", dec:1 },
  { id:HMLD,                  lbl:"HMLD por min BiP",      uni:"m", dec:2 },
  { id:"Sprint Distance (m)", lbl:"HSR por min BiP",       uni:"m", dec:2 },
  { id:"accdec",              lbl:"ACC + DECC > 3 por min BiP", uni:"", dec:2 }
];

function puntosEvolucion(metrica) {
  const partidos = [...new Set(BIP.map(f => f.partido))];
  const salida = [];
  for (const p of partidos) {
    const sesionId = PAREJAS[p];
    if (!sesionId) continue;
    const filas = DATOS.filter(r => idSesion(r) === sesionId);
    if (!filas.length) continue;

    const fases = BIP.filter(f => f.partido === p);
    const r = resumirBip(fases);
    const bruto = fases.reduce((t, f) => t + f.duracion + (f.post || 0), 0);
    const bipMin = r.total / 60;
    if (!bipMin) continue;
    const minPartido = Math.max(...filas.map(x => x.minutos));

    // Media del equipo de la métrica, dividida entre el tiempo de juego de cada uno.
    const vals = filas.map(x => {
      const v = metrica.id === "accdec"
        ? Math.abs(x.crudo[ACC3] || 0) + Math.abs(x.crudo[DEC3] || 0)
        : Math.abs(x.crudo[metrica.id] || 0);
      const suBip = bipMin * Math.min(1, x.minutos / (minPartido || 1));
      return suBip ? v / suBip : 0;
    }).filter(v => v > 0);

    salida.push({
      partido: p, fecha: fases[0].fecha,
      pct: bruto ? r.total / bruto * 100 : 0,
      bipMin,
      valor: vals.length ? vals.reduce((t, v) => t + v, 0) / vals.length : 0
    });
  }
  return salida.sort((a, b) => a.fecha - b.fecha);
}

function evolucionBip() {
  const met = METRICAS_BIP.find(m => m.id === FB.metrica) || METRICAS_BIP[0];
  const puntos = puntosEvolucion(met);
  const partidos = [...new Set(BIP.map(f => f.partido))];

  const emparejador = `<section class="panel">
    <h3>Emparejar partidos</h3>
    <p class="sub">Cada partido de BiP con su sesión de GPS. Sin pareja no entra en la gráfica.</p>
    ${partidos.map(p => {
      const sesiones = [...new Set(DATOS.filter(r => r.esPartido).map(r => idSesion(r)))];
      return `<div class="fila" style="grid-template-columns:200px 1fr">
        <span class="nom">${esc(p)}</span>
        <select class="parejaBip" data-p="${esc(p)}">
          <option value="">— sin emparejar —</option>
          ${sesiones.map(id => {
            const r = DATOS.find(x => idSesion(x) === id);
            return `<option value="${esc(id)}"${PAREJAS[p] === id ? " selected" : ""}>${esc(fechaLarga(r.fecha))} · ${esc(r.sesion)}</option>`;
          }).join("")}
        </select>
      </div>`;
    }).join("")}
  </section>`;

  if (puntos.length < 1) {
    return `<div class="empty"><p>Empareja al menos un partido para ver la evolución.</p></div>${emparejador}`;
  }

  const maxPct = Math.max(...puntos.map(p => p.pct), 1);
  const maxVal = Math.max(...puntos.map(p => p.valor), 1);
  const minVal = Math.min(...puntos.map(p => p.valor));
  const rango = maxVal - minVal || maxVal;

  return `
  <section class="panel">
    <div class="row">
      <div><h3>BiP frente a intensidad</h3>
        <p class="sub" style="margin:0">Barras: % de balón en juego · línea: métrica por minuto de juego</p></div>
      <select id="fMetBip">${METRICAS_BIP.map(m =>
        `<option value="${esc(m.id)}"${m.id === met.id ? " selected" : ""}>${esc(m.lbl)}</option>`).join("")}</select>
    </div>
    <div class="evo">
      ${puntos.map(p => `<div class="col">
        <span class="dato">${nf(p.valor, met.dec)}</span>
        <span class="punto" style="bottom:${(18 + (p.valor - minVal) / rango * 62).toFixed(1)}%"></span>
        <span class="barra" style="height:${(p.pct / maxPct * 72).toFixed(1)}%"></span>
        <span class="pct">${nf(p.pct, 1)}%</span>
        <span class="nom">${esc(p.partido)}</span>
      </div>`).join("")}
    </div>
  </section>

  <section class="panel">
    <h3>Partido a partido</h3>
    <div class="scroll"><table class="datos">
      <thead><tr><th>Partido</th><th class="n">% BiP</th><th class="n">Min BiP</th><th class="n">${esc(met.lbl)}</th></tr></thead>
      <tbody>${puntos.map(p => `<tr><td>${esc(p.partido)}</td>
        <td class="n">${nf(p.pct, 1)}%</td><td class="n">${nf(p.bipMin, 1)}</td>
        <td class="n">${nf(p.valor, met.dec)}</td></tr>`).join("")}</tbody>
    </table></div>
  </section>
  ${emparejador}`;
}

function vistaBip() {
  $("#cab").innerHTML = "";
  $("#resumen").innerHTML = "";
  $("#selectores").innerHTML = "";
  $("#paneles").innerHTML = "";

  const partidos = [...new Set(BIP.map(f => f.partido))];
  if (!partidos.includes(FB.partido)) FB.partido = partidos[partidos.length - 1] || "";
  const fases = BIP.filter(f => f.partido === FB.partido).sort((a, b) => a.inicio - b.inicio);

  const sesiones = [...new Set(DATOS.filter(r => r.esPartido).map(r => idSesion(r)))];
  if (!sesiones.includes(FB.sesionGps)) FB.sesionGps = sesiones[0] || "";

  const barra = `<div class="row">
    <div class="conmuta">
      ${[["partido","Partido"],["historico","Histórico"],["cruce","Cruce con GPS"],["evolucion","BiP vs intensidad"]]
        .map(([v, t]) => `<button class="mini${FB.vista === v ? " on" : ""}" data-v="${v}">${t}</button>`).join("")}
    </div>
    <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
      ${FB.vista === "cruce" ? `<select id="fSesionGps">${sesiones.map(id => {
        const r = DATOS.find(x => idSesion(x) === id);
        return `<option value="${esc(id)}"${id === FB.sesionGps ? " selected" : ""}>${esc(fechaLarga(r.fecha))} · ${esc(r.sesion)}</option>`;
      }).join("")}</select>` : ""}
      ${FB.vista !== "historico" && FB.vista !== "evolucion" && partidos.length ? `<select id="fPartidoBip">${partidos.map(p =>
        `<option${p === FB.partido ? " selected" : ""}>${esc(p)}</option>`).join("")}</select>` : ""}
      <button id="btnBip">Cargar CSV de BiP</button>
      <input type="file" id="inpBip" accept=".csv" hidden>
    </div>
  </div>`;

  const contenido = !BIP.length
    ? `<div class="empty"><p style="font-size:15px;color:var(--text-2)">Todavía no hay partidos de balón en juego.</p>
       <p>Pulsa <b>Cargar CSV de BiP</b> y arrastra el export de tu herramienta.</p></div>`
    : FB.vista === "historico" ? historicoBip()
    : FB.vista === "evolucion" ? evolucionBip()
    : FB.vista === "cruce" ? cruceBip(fases, FB.sesionGps)
    : reporteBip(fases);

  $("#tabla").innerHTML = `<div class="bip">${barra}
    ${BIP.length && FB.vista !== "historico" ? `<div class="cab"><h2>${esc(FB.partido)}</h2>
      <span class="meta">${esc(fechaLarga(fases[0].fecha))} · ${fases.length} fases</span></div>` : ""}
    ${contenido}<div id="salidaBip"></div></div>`;

  $("#btnBip").onclick = () => $("#inpBip").click();
  $("#inpBip").onchange = e => { if (e.target.files[0]) leerBip(e.target.files[0]); };
  const selP = $("#fPartidoBip"); if (selP) selP.onchange = e => { FB.partido = e.target.value; pintar(); };
  const selS = $("#fSesionGps"); if (selS) selS.onchange = e => { FB.sesionGps = e.target.value; pintar(); };
  document.querySelectorAll(".conmuta .mini").forEach(b => b.onclick = () => { FB.vista = b.dataset.v; pintar(); });
  const selM = $("#fMetBip"); if (selM) selM.onchange = e => { FB.metrica = e.target.value; pintar(); };
  document.querySelectorAll(".parejaBip").forEach(sel => sel.onchange = e => {
    PAREJAS[e.target.dataset.p] = e.target.value;
    pintar();
  });
}

/** Lee el CSV de balón en juego, lo muestra y lo manda al Sheets. */
async function leerBip(file) {
  $("#salidaBip").innerHTML = `<div class="aviso espera">Leyendo ${esc(file.name)}…</div>`;
  try {
    const txt = await file.text();
    const objetos = parseCSV(txt);
    if (!objetos.length) throw new Error("El archivo no tiene filas");
    const cab = Object.keys(objetos[0]);
    const nombre = String(objetos[0]["activity_name"] || file.name.replace(/\.csv$/i, "")).trim();

    const nuevas = normalizaBip(objetos, nombre);
    if (!nuevas.length) throw new Error("No encontré fases de balón en juego (entity_type = bip)");

    const llave = f => f.id || (f.partido + "|" + f.nombre);
    const mapa = new Map(BIP.map(f => [llave(f), f]));
    for (const f of nuevas) mapa.set(llave(f), f);
    BIP = [...mapa.values()];
    FB.partido = nombre;

    const valores = [cab, ...objetos.map(o => cab.map(c => o[c]))];
    pintar();
    $("#salidaBip").innerHTML = `<div class="aviso ok">${nuevas.length} fases leídas de ${esc(nombre)}.</div>`;
    if (C.endpoint || /\/exec/.test(C.fuente || "")) {
      const res = await fetch(C.endpoint || C.fuente, {
        method:"POST", redirect:"follow",
        headers:{ "Content-Type":"text/plain;charset=utf-8" },
        body: JSON.stringify({ clave: C.clave || "", tipo:"bip", partido: nombre, valores })
      });
      const j = await res.json();
      $("#salidaBip").innerHTML = j.ok
        ? `<div class="aviso ok">Guardado. ${nf(j.nuevas)} fases nuevas y ${nf(j.actualizadas)} sustituidas · ${nf(j.total)} en total.</div>`
        : `<div class="aviso error">Leído, pero no se pudo guardar: ${esc(j.error)}</div>`;
    }
  } catch (err) {
    $("#salidaBip").innerHTML = `<div class="aviso error">No he podido leerlo: ${esc(err.message)}</div>`;
    console.error(err);
  }
}

/** Deja las filas del CSV de BiP en la forma que usa la app. */
function normalizaBip(objetos, partido) {
  const salida = [];
  for (const o of objetos) {
    const m = {};
    for (const [k, v] of Object.entries(o)) m[clave(k)] = v;
    // El CSV crudo trae rucks y partes mezclados; lo guardado en el Sheets ya viene filtrado.
    if ("entitytype" in m && String(m.entitytype).trim().toLowerCase() !== "bip") continue;
    if (!m.bipid && !m.bipname) continue;
    const inicio = num(m.starttimeunixms);
    salida.push({
      partido: String(m.activityname || partido || "").trim() || partido,
      parte: String(m.taskname || "").trim() || "Parte 1",
      id: String(m.bipid || "").trim(),
      nombre: String(m.bipname || "").trim(),
      rucks: num(m.ruckcount),
      duracion: num(m.durationseconds),
      pre: num(m.predeadballseconds),
      post: num(m.postdeadballseconds),
      inicio, fecha: inicio ? new Date(inicio) : new Date()
    });
  }
  return salida;
}

/* ---------- cargar ficheros ---------- */
let ULTIMO = null;   // resultado del último fichero leído

function vistaCargar() {
  $("#cab").innerHTML = "";
  $("#selectores").innerHTML = "";
  $("#tabla").innerHTML = "";
  $("#paneles").innerHTML = `<div class="solo">
    <div class="zona" id="zona">
      <h3>Arrastra aquí el CSV de Catapult</h3>
      <p>También vale un Excel (.xlsx). Se lee en tu ordenador, no se sube a ningún sitio salvo a tu Sheets.</p>
      <div class="field" style="justify-content:center;margin-bottom:16px">
        <label for="fEquipoCarga">Equipo de este archivo</label>
        <select id="fEquipoCarga"></select>
      </div>
      <button id="btnFichero">Elegir archivo</button>
      <input type="file" id="inpFichero" accept=".csv,.xlsx,.xls" hidden>
    </div>
    <div id="salida"></div>
    ${(C.endpoint || /\/exec/.test(C.fuente || "")) ? "" : `<p class="pasos">Para que lo que cargues quede guardado, pon la URL <code>/exec</code> en <code>endpoint</code> dentro de <code>config.js</code>. Sin eso, los datos se ven pero se pierden al cerrar.</p>`}
  </div>`;

  // El CSV de Catapult no trae columna Squad, así que hay que decirlo aquí.
  const squads = [...new Set([...DATOS.map(r => r.squad), "DHb", "Femenino", "S18", "S16"])];
  if (!EQUIPO_CARGA) EQUIPO_CARGA = squads[0];
  $("#fEquipoCarga").innerHTML = squads.map(s => `<option${s === EQUIPO_CARGA ? " selected" : ""}>${esc(s)}</option>`).join("");
  $("#fEquipoCarga").onchange = e => { EQUIPO_CARGA = e.target.value; };

  const zona = $("#zona");
  $("#btnFichero").onclick = () => $("#inpFichero").click();
  $("#inpFichero").onchange = e => { if (e.target.files[0]) leerFichero(e.target.files[0]); };
  ["dragenter","dragover"].forEach(ev => zona.addEventListener(ev, e => { e.preventDefault(); zona.classList.add("encima"); }));
  ["dragleave","drop"].forEach(ev => zona.addEventListener(ev, e => { e.preventDefault(); zona.classList.remove("encima"); }));
  zona.addEventListener("drop", e => { const f = e.dataTransfer.files[0]; if (f) leerFichero(f); });
  if (ULTIMO) mostrarResumen(ULTIMO);
}

/** Lee el fichero, lo normaliza y lo mete en memoria para verlo ya. */
async function leerFichero(file) {
  $("#salida").innerHTML = `<div class="aviso espera">Leyendo ${esc(file.name)}…</div>`;
  try {
    let valores;   // tabla en crudo: [cabeceras, ...filas]
    if (/\.xlsx?$/i.test(file.name)) {
      const buf = await file.arrayBuffer();
      const libro = XLSX.read(buf, { type:"array", cellDates:true });
      const hoja = libro.Sheets[libro.SheetNames.find(n => /import|data|datos/i.test(n)) || libro.SheetNames[0]];
      valores = XLSX.utils.sheet_to_json(hoja, { header:1, raw:true, blankrows:false });
    } else {
      const txt = await file.text();
      const objetos = parseCSV(txt);
      if (!objetos.length) throw new Error("El archivo no tiene filas");
      const cab = Object.keys(objetos[0]);
      valores = [cab, ...objetos.map(o => cab.map(c => o[c]))];
    }
    if (!valores || valores.length < 2) throw new Error("El archivo no tiene filas de datos");

    // Si es un export de balón en juego, se manda a BiP en vez de a GPS.
    const cabecerasK = valores[0].map(clave);
    if (cabecerasK.includes("entitytype") || cabecerasK.includes("bipid")) {
      $("#salida").innerHTML = `<div class="aviso espera">Esto es un archivo de balón en juego, lo llevo a la pestaña BiP…</div>`;
      F.pestana = "bip";
      document.querySelectorAll(".tab").forEach(t =>
        t.setAttribute("aria-selected", t.id === "tab-bip"));
      pintar();
      return leerBip(file);
    }

    // Nos quedamos solo con las columnas que usamos: el CSV de Catapult trae 101.
    const utiles = [];
    valores[0].forEach((c, i) => {
      const k = clave(c);
      if (Object.values(SINONIMOS).some(lista => lista.includes(k))) utiles.push(i);
    });
    const recorte = valores.map(f => utiles.map(i => f[i]));

    const objetos = recorte.slice(1).map(f => Object.fromEntries(recorte[0].map((c, i) => [c, f[i]])));
    const nuevas = normaliza(objetos);
    const bloques = BLOQUES.length;
    if (!nuevas.length && !bloques) {
      throw new Error("Ninguna fila tenía jugador y fecha reconocibles. " +
        "¿Es el CSV de Catapult? Debe traer al menos Player Name y Date.");
    }
    if (!nuevas.length) {
      throw new Error("El archivo solo trae bloques parciales (" + bloques + " filas), " +
        "ninguna sesión ni partido completo. Revisa la columna Split Name.");
    }

    fusionar(nuevas);
    ULTIMO = { nombre:file.name, brutas:valores.length - 1, validas:nuevas.length, valores:recorte,
               equipos:[...new Set(nuevas.map(r => r.squad))], guardado:null,
               jugadores:new Set(nuevas.map(r => r.jugador)).size,
               sesiones:[...new Set(nuevas.map(r => r.fechaISO + " · " + r.sesion))],
               fechas:[...new Set(nuevas.map(r => r.fechaISO))].sort() };
    poblarFiltros();
    mostrarResumen(ULTIMO);
    if (C.endpoint || /\/exec/.test(C.fuente || "")) guardarEnSheets(ULTIMO);
  } catch (err) {
    $("#salida").innerHTML = `<div class="aviso error">No he podido leerlo: ${esc(err.message)}</div>`;
    console.error(err);
  }
}

/** Mete las filas nuevas en memoria sustituyendo las que ya estuvieran. */
function fusionar(nuevas) {
  // El evento entra en la llave: en un triangular hay dos partidos el mismo día.
  const llave = r => r.jugador + "|" + r.fechaISO + "|" + r.split + "|" + r.sesion;
  const mapa = new Map(DATOS.map(r => [llave(r), r]));
  for (const r of nuevas) mapa.set(llave(r), r);
  DATOS = [...mapa.values()].sort((a, b) => a.fecha - b.fecha);
  detectarMetricas();
  setEstado(DATOS.length + " filas cargadas", true);
}

function mostrarResumen(u) {
  const f = u.fechas;
  $("#salida").innerHTML = `<div class="resumen">
    <dl>
      <dt>Archivo</dt><dd>${esc(u.nombre)}</dd>
      <dt>Sesiones</dt><dd>${nf(u.sesiones.length)}</dd>
      <dt>Jugadores</dt><dd>${nf(u.jugadores)}</dd>
      <dt>Fecha</dt><dd>${f.length === 1 ? esc(f[0]) : esc(f[0]) + " → " + esc(f[f.length-1])}</dd>
      <dt>Equipo</dt><dd>${u.equipos.map(esc).join(", ")}</dd>
      <dt>Filas del archivo</dt><dd>${nf(u.brutas)}</dd>
      <dt>Filas usadas</dt><dd>${nf(u.validas)} · el resto son splits parciales</dd>
    </dl>
  </div>
  ${u.guardado === null ? ((C.endpoint || /\/exec/.test(C.fuente || "")) ? `<div class="aviso espera" id="estadoGuardado">Guardando en el Sheets…</div>` : "")
    : u.guardado.ok ? `<div class="aviso ok" id="estadoGuardado">Guardado en Import Data. ${nf(u.guardado.nuevas)} filas nuevas y ${nf(u.guardado.actualizadas)} sustituidas · ${nf(u.guardado.total)} filas en total.</div>`
    : `<div class="aviso error" id="estadoGuardado">No se pudo guardar: ${esc(u.guardado.error)}. Los datos se ven igual, pero se perderán al cerrar.</div>`}
  <p class="pasos">Ya puedes ir a <b>Reporte</b> y elegir la fecha.</p>`;
}

/** Manda la tabla al Apps Script, troceada para no pasarse de tamaño. */
async function guardarEnSheets(u) {
  const cab = u.valores[0], filas = u.valores.slice(1), trozo = 400;
  let total = { nuevas:0, actualizadas:0, total:0 };
  try {
    for (let i = 0; i < filas.length; i += trozo) {
      const parte = [cab, ...filas.slice(i, i + trozo)];
      if ($("#estadoGuardado")) {
        $("#estadoGuardado").textContent = `Guardando en el Sheets… ${Math.min(i + trozo, filas.length)} de ${filas.length}`;
      }
      const res = await fetch(C.endpoint || C.fuente, {
        method:"POST", redirect:"follow",
        headers:{ "Content-Type":"text/plain;charset=utf-8" },   // texto plano: evita el bloqueo del navegador
        body: JSON.stringify({ clave: C.clave || "", equipo: EQUIPO_CARGA, valores: parte })
      });
      const j = await res.json();
      if (!j.ok) throw new Error(j.error || "respuesta inesperada");
      total = { nuevas: total.nuevas + j.nuevas, actualizadas: total.actualizadas + j.actualizadas, total: j.total };
    }
    u.guardado = { ok:true, ...total };
  } catch (err) {
    u.guardado = { ok:false, error: err.message };
    console.error(err);
  }
  if (F.pestana === "cargar") mostrarResumen(u);
}

function selectorMetrica(i) {
  const grupos = METRICAS.map(([g, cols]) => `<optgroup label="${esc(g)}">` +
    cols.map(c => `<option value="${esc(c)}"${c === F.metricas[i] ? " selected" : ""}>${esc(nombreMetrica(c))}</option>`).join("") +
    `</optgroup>`).join("");
  return `<select class="selMet" data-i="${i}" aria-label="Métrica ${i + 1}">${grupos}</select>`;
}

/**
 * Cuánto se sale un valor de lo habitual en ese jugador, en %.
 * Devuelve null si no tiene bastante histórico como para que la comparación valga.
 */
function desvio(jugador, col, valor) {
  const suyas = DATOS.filter(r => r.jugador === jugador && (r.crudo[col] || 0) > 0);
  if (suyas.length < 6) return null;
  const v = suyas.map(r => Math.abs(r.crudo[col])).sort((a, b) => a - b);
  const mediana = v.length % 2 ? v[(v.length - 1) / 2] : (v[v.length / 2 - 1] + v[v.length / 2]) / 2;
  if (!mediana) return null;
  return (valor / mediana - 1) * 100;
}

/* Bandas sacadas del reparto real de tus sesiones: el 25% de las veces se baja
   de -17% y el 25% se pasa de +20%, así que fuera de esas bandas es día raro. */
function bandaColor(p) {
  if (p >= 50) return "224,107,112";   // muy por encima de lo suyo
  if (p >= 20) return "240,225,153";   // por encima
  if (p <= -35) return "110,130,170";  // muy por debajo
  return "110,154,155";                // dentro de su normalidad
}

/** Tabla compacta: valores por jugador y, al final, la media de cada posición. */
function tabla(filas) {
  // Aquí no se esconden las columnas vacías: un cero en impactos de 15-20 G
  // es información, no un hueco. Solo se quitan las que no existen en el origen.
  const cols = TABLA.map(([g, c]) => [g, c.filter(x => filas.some(r => x in r.crudo))])
                    .filter(([, c]) => c.length);
  if (!cols.length) return "";
  const planas = cols.flatMap(([, c]) => c);
  const dec = {};
  for (const c of planas) dec[c] = decimales(filas.map(r => Math.abs(r.crudo[c] || 0)));

  // Por defecto agrupados por puesto; al pulsar una cabecera manda esa columna.
  const o = FD.ordenJug;
  const jugadores = filas.slice().sort((a, b) => {
    if (!o.col) return a.posicion.localeCompare(b.posicion) || a.jugador.localeCompare(b.jugador);
    const signo = o.asc ? 1 : -1;
    if (o.col === "jugador") return a.jugador.localeCompare(b.jugador) * signo;
    if (o.col === "posicion") return (a.posicion.localeCompare(b.posicion) || a.jugador.localeCompare(b.jugador)) * signo;
    return (Math.abs(a.crudo[o.col] || 0) - Math.abs(b.crudo[o.col] || 0)) * signo;
  });
  const flechaJ = c => o.col === c ? (o.asc ? " ↑" : " ↓") : "";

  const grupos = cols.map(([g, c]) => `<th colspan="${c.length}" class="grupo">${esc(g)}</th>`).join("");
  const sub = planas.map(c => `<th class="n orden" data-c="${esc(c)}">${esc(nombreCorto(c))}${flechaJ(c)}</th>`).join("");

  // Solo se sombrean el ritmo de aceleración, el de deceleración y los impactos.
  const conSemaforo = c => c === ACC3MIN || c === DEC3MIN || c === "Impacts";

  const tope = {};
  for (const c of planas) tope[c] = Math.max(...filas.map(r => Math.abs(r.crudo[c] || 0)));

  let puestoPrevio = null;
  const cuerpo = jugadores.map(r => {
    const cambia = r.posicion !== puestoPrevio;
    puestoPrevio = r.posicion;
    return `<tr${cambia ? ' class="corte"' : ""}>
      <td>${esc(r.jugador)}</td><td class="pos">${esc(r.posicion)}</td>
      ${planas.map(c => {
        const v = Math.abs(r.crudo[c] || 0);
        // Cada celda se tiñe según su valor dentro de su columna, no entre columnas.
        let fondo = "";
        if (conSemaforo(c)) {
          const p = desvio(r.jugador, c, v);   // % respecto a lo habitual en él
          if (p !== null) fondo = `background:rgba(${bandaColor(p)},.15)`;
        }
        // Exposición: verde a partir del umbral, porque ahí sí hubo estímulo.
        const esPct = c === PCTVEL || c === PCTACC;
        const expuesto = esPct && v >= (C.umbralExposicion ?? 85);
        if (esPct) fondo = expuesto ? "background:rgba(110,154,155,.28)" : "";
        // El líder de cada columna, en negrita y sin color.
        const lider = v === tope[c] && v > 0;
        return `<td class="n${expuesto ? " verde" : ""}${lider ? " lider" : ""}" style="${fondo}">${fmt(c, v, dec[c])}</td>`;
      }).join("")}
    </tr>`;
  }).join("");




  return `<section class="panel tablon">
    <h3>Velocidad, aceleraciones e impactos</h3>
    <div class="scroll"><table class="datos">
      <thead>
        <tr><th></th><th></th>${grupos}</tr>
        <tr><th class="orden" data-c="jugador">Jugador${flechaJ("jugador")}</th>
            <th class="orden" data-c="posicion">Posición${flechaJ("posicion")}</th>${sub}</tr>
      </thead>
      <tbody>${cuerpo}</tbody>
    </table></div>
  </section>`;
}

function pintar() {
  recordar();
  if (F.pestana === "carga") return vistaCarga();
  if (F.pestana === "drill") return vistaDrill();
  if (F.pestana === "bip") return vistaBip();
  if (F.pestana === "cargar") return vistaCargar();
  cabecera();
  const filas = sesion();
  if (!filas.length) {
    // Diagnóstico: si no hay filas, di por qué, que si no es imposible saberlo.
    const delEquipo = DATOS.filter(r => r.squad === F.squad);
    const fechas = [...new Set(delEquipo.map(r => r.fechaISO))];
    $("#selectores").innerHTML = "";
    $("#tabla").innerHTML = "";
    if (!DATOS.length) {
      $("#paneles").innerHTML = `<div class="empty">
        <p style="font-size:15px;color:var(--text-2)">Todavía no hay datos guardados.</p>
        <p>Ve a <b>Cargar datos</b>, elige el equipo y arrastra el CSV de Catapult.</p></div>`;
      return;
    }
    $("#paneles").innerHTML = `<div class="empty">
      <p>No hay filas para <b>${esc(F.squad)}</b> en <b>${esc(String(F.fecha).replace("|", " · "))}</b>.</p>
      <p style="font-family:'IBM Plex Mono';font-size:12px;margin-top:10px">
        ${DATOS.length} filas cargadas en total · ${delEquipo.length} de este equipo · ${fechas.length} fechas distintas<br>
        equipos detectados: ${[...new Set(DATOS.map(r => r.squad))].map(esc).join(", ") || "ninguno"}
      </p></div>`;
    return;
  }
  // Si la métrica guardada ya no existe en estos datos, se coge otra de las que hay.
  const disponibles = todasMetricas();
  if (!disponibles.length) {
    $("#selectores").innerHTML = "";
    $("#paneles").innerHTML = `<p class="empty">Los datos cargados no traen ninguna de las métricas del catálogo.</p>`;
    return;
  }
  F.metricas = F.metricas.map((m, i) => disponibles.includes(m) ? m : (disponibles[i] || disponibles[0]));

  $("#selectores").innerHTML = "";
  $("#paneles").innerHTML = F.metricas.map((m, i) => panel(m, filas, i)).join("");
  document.querySelectorAll(".selMet").forEach(sel => sel.onchange = e => {
    F.metricas[+e.target.dataset.i] = e.target.value;
    pintar();
  });
  $("#tabla").innerHTML = tabla(filas);
  document.querySelectorAll("#tabla .orden").forEach(th => th.onclick = () => {
    const c = th.dataset.c;
    FD.ordenJug = { col:c, asc: FD.ordenJug.col === c ? !FD.ordenJug.asc : (c === "jugador" || c === "posicion") };
    pintar();
  });
}

/* ---------- eventos ---------- */
function eventos() {
  $("#fSquad").onchange = e => { F.squad = e.target.value; poblarFechas(); pintar(); };
  $("#fFecha").onchange = e => { F.fecha = e.target.value; pintar(); };
  $("#btnPdf").onclick = () => window.print();
  document.querySelectorAll(".tab").forEach(t => t.onclick = () => {
    document.querySelectorAll(".tab").forEach(x => x.setAttribute("aria-selected", x === t));
    F.pestana = t.id.replace("tab-", "");
    pintar();
  });
}

/* ---------- datos de ejemplo ---------- */
function demo() {
  let s = 7;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const gauss = (m, d) => m + (rnd() + rnd() + rnd() - 1.5) * 2 * d;
  const plantilla = [
    ["A. Ferrer","Tercera línea"],["M. Rivas","Tres cuartos"],["J. Català","Primera línea"],["P. Nogués","Segunda línea"],
    ["L. Sanchis","Tres cuartos"],["D. Bertó","Tres cuartos"],["R. Oliver","Primera línea"],["S. Marín","Tres cuartos"],
    ["T. Andrés","Tercera línea"],["V. Puig","Tres cuartos"],["G. Server","Segunda línea"],["N. Alcaraz","Tercera línea"],
    ["E. Molins","Tres cuartos"],["C. Bataller","Primera línea"]
  ];
  const factor = { "Primera línea":0.82, "Segunda línea":0.9, "Tercera línea":1.0, "Tres cuartos":1.12 };
  const filas = [];
  const hoy = new Date(); hoy.setHours(0,0,0,0);
  const lunes = new Date(hoy.getTime() - ((hoy.getDay() + 6) % 7 + 35) * 86400000);
  for (let d = 0; d < 42; d++) {
    const f = new Date(lunes.getTime() + d * 86400000);
    const dow = (f.getDay() + 6) % 7;
    let tipo = null;
    if (dow === 1) tipo = { t:"INS MD-5 Ejemplo", k:0.62, min:95 };
    if (dow === 3) tipo = { t:"INS MD-3 Ejemplo", k:0.88, min:100 };
    if (dow === 4) tipo = { t:"INS MD-2 Ejemplo", k:0.45, min:60 };
    if (dow === 5) tipo = { t:"Rival (H)", k:1.0, min:80, partido:true };
    if (!tipo) continue;
    for (const [jug, pos] of plantilla) {
      if (rnd() < 0.12) continue;
      const k = tipo.k * factor[pos];
      const min = Math.round(gauss(tipo.partido && rnd() < 0.3 ? tipo.min * 0.6 : tipo.min, 6));
      const dist = Math.round(gauss(58 * k, 5) * min);
      filas.push({
        Squad:"Senior", Date:iso(f), "Session Title":tipo.t, "Player Name":jug,
        "Split Name":tipo.partido ? "Full Match" : "Rugby - Full Sessi", Position:pos,
        Tags:tipo.partido ? "game" : "training", Duration:min * 60,
        "Distance (metres)":dist, "Sprint Distance (m)":Math.round(dist * gauss(0.04 * (tipo.partido ? 1.4 : 1), 0.008)),
        "Player Load":Math.round(dist * gauss(0.042, 0.004)),
        "Top Speed (m/s)":+gauss(tipo.partido ? 7.9 : 7.2, 0.5).toFixed(2),
        "Power Plays":Math.round(gauss(tipo.partido ? 26 : 20, 5)),
        HMLD:Math.round(dist * gauss(0.09 * (tipo.partido ? 1.15 : 1), 0.012)),
        "ACC >3":Math.round(gauss(tipo.partido ? 40 : 55, 12)), "DECC >3":Math.round(gauss(tipo.partido ? 30 : 35, 9))
      });
    }
  }
  return filas;
}

/* ---------- memoria de la sesión de trabajo ---------- */
const GUARDA = "cau_gps_prefs";
function recordar() {
  try {
    localStorage.setItem(GUARDA, JSON.stringify({
      squad:F.squad, fecha:F.fecha, metricas:F.metricas, pestana:F.pestana, escenario:FC.escenario,
      parejas:PAREJAS, ordenDrill:FD.orden
    }));
  } catch (e) { /* navegador sin almacenamiento, no pasa nada */ }
}
function recuperar() {
  try {
    const p = JSON.parse(localStorage.getItem(GUARDA) || "{}");
    if (p.squad) F.squad = p.squad;
    if (p.fecha) F.fecha = p.fecha;
    if (Array.isArray(p.metricas) && p.metricas.length) F.metricas = p.metricas;
    if (p.ordenDrill) FD.orden = p.ordenDrill;
    if (p.escenario) FC.escenario = p.escenario;
    if (p.parejas) Object.assign(PAREJAS, p.parejas);
  } catch (e) { /* preferencias corruptas: se ignoran */ }
}

/* ---------- arranque ---------- */
(async function init() {
  eventos();
  recuperar();
  await cargar();
  poblarFiltros();
  pintar();
})();
})();

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
    "Accelerations Zone Count: 3 - 4 m/s/s", "Accelerations Zone Count: > 4 m/s/s",
    ACC3, ACC3MIN
  ]],
  ["Deceleraciones de alta intensidad", [
    "Max Deceleration (m/s/s)",
    "Deceleration Zone Count: 3 - 4 m/s/s", "Deceleration Zone Count: > 4 m/s/s",
    DEC3, DEC3MIN
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
/* Versión corta para las cabeceras de la tabla, donde no cabe el nombre entero. */
const nombreCorto = c => CALCULADAS.includes(c) ? c : c
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


let DATOS = [];
let MOTES = {}, POSICIONES = {};   // maestro que llega del Sheets
let EQUIPO_CARGA = "";             // equipo elegido al arrastrar un CSV sin columna Squad
const F = { squad:"", fecha:"", pestana:"reporte",
  // Cuatro paneles, como los cuatro selectores del Session Report de Power BI.
  metricas:["Distance (metres)", HMLD, "Sprint Distance (m)",
            ACC3, "Player Load", "Distance in Speed Zone 5  (metres)"] };

/* ---------- utilidades ---------- */
const $ = s => document.querySelector(s);
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
    // La hoja está en inglés, así que 9/5/2026 es 5 de septiembre.
    // Si el primer número pasa de 12 solo puede ser el día.
    return +m[1] > 12 ? new Date(a, +m[2] - 1, +m[1]) : new Date(a, +m[1] - 1, +m[2]);
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
    if (!esCompleto && !esRespaldo) continue;

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
      crudo,
      squad: String(get("squad") || EQUIPO_CARGA || "Senior").trim(),
      fecha, fechaISO: iso(fecha), sesion, jugador, alias, split, md, esPartido,
      posicion: String(get("posicion") || "").trim() || POSICIONES[jugador] || "Sin posición",
      minutos
    });
  }
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

async function cargar() {
  const fuente = (C.fuente || "").trim();
  setEstado("Cargando…", false);
  if (!fuente) { DATOS = normaliza(demo()); detectarMetricas(); setEstado("Datos de ejemplo · arrastra tu CSV", false); return; }
  try {
    const res = await fetch(fuente, { redirect:"follow" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const txt = await res.text();
    let brutas;
    if (txt.trim().startsWith("[") || txt.trim().startsWith("{")) {
      const j = JSON.parse(txt);
      if (j.motes) MOTES = j.motes;
      if (j.posiciones) POSICIONES = j.posiciones;
      if (j.cabeceras && j.filas) {
        // Formato compacto: cabeceras aparte y filas como listas.
        brutas = j.filas.map(f => Object.fromEntries(j.cabeceras.map((c, i) => [c, f[i]])));
      } else {
        brutas = Array.isArray(j) ? j : (j.datos || j.data || []);
      }
    } else brutas = parseCSV(txt);
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
    setEstado("No se pudo leer el Sheets, mostrando el ejemplo", false);
    console.warn("Origen de datos:", e);
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
  const cuerpo = datos.map(d => {
    const clase = d.v >= media ? "alta" : "";
    return `<div class="fila">
      <span class="nom" title="${esc(d.pos)}">${esc(d.nom)}</span>
      <span class="pista"><i class="${clase}" style="width:${ancho(d.v).toFixed(1)}%"></i><u style="left:${ancho(media).toFixed(1)}%"></u></span>
      <span class="val">${nf(d.v, met.dec)}</span>
    </div>`;
  }).join("");

  return `<section class="panel">
    ${selectorMetrica(indice)}
    <div class="avgline"><b>${nf(media, met.dec)}</b> avg${met.uni ? " " + met.uni : ""}</div>
    ${cuerpo}
  </section>`;
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
    ${C.fuente ? "" : `<p class="pasos">Todavía no has puesto la URL de tu Sheets en <code>config.js</code>, así que lo que cargues se verá pero no se guardará al cerrar.</p>`}
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

    // Nos quedamos solo con las columnas que usamos: el CSV de Catapult trae 101.
    const utiles = [];
    valores[0].forEach((c, i) => {
      const k = clave(c);
      if (Object.values(SINONIMOS).some(lista => lista.includes(k))) utiles.push(i);
    });
    const recorte = valores.map(f => utiles.map(i => f[i]));

    const objetos = recorte.slice(1).map(f => Object.fromEntries(recorte[0].map((c, i) => [c, f[i]])));
    const nuevas = normaliza(objetos);
    if (!nuevas.length) throw new Error("Ninguna fila pasó los filtros. Revisa que el archivo tenga la columna Split Name.");

    fusionar(nuevas);
    ULTIMO = { nombre:file.name, brutas:valores.length - 1, validas:nuevas.length, valores:recorte,
               equipos:[...new Set(nuevas.map(r => r.squad))], guardado:null,
               jugadores:new Set(nuevas.map(r => r.jugador)).size,
               sesiones:[...new Set(nuevas.map(r => r.fechaISO + " · " + r.sesion))],
               fechas:[...new Set(nuevas.map(r => r.fechaISO))].sort() };
    poblarFiltros();
    mostrarResumen(ULTIMO);
    if (C.fuente) guardarEnSheets(ULTIMO);
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
  ${u.guardado === null ? (C.fuente ? `<div class="aviso espera" id="estadoGuardado">Guardando en el Sheets…</div>` : "")
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
      const res = await fetch(C.fuente, {
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

  const jugadores = filas.slice().sort((a, b) => a.posicion.localeCompare(b.posicion) || a.jugador.localeCompare(b.jugador));

  const grupos = cols.map(([g, c]) => `<th colspan="${c.length}" class="grupo">${esc(g)}</th>`).join("");
  const sub = planas.map(c => `<th class="n">${esc(nombreCorto(c))}</th>`).join("");

  // El mejor valor de cada columna va en negrita, para que la tabla se lea de un vistazo.
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
        const t = tope[c] ? v / tope[c] : 0;
        const fondo = v > 0 ? `background:rgba(160,167,216,${(0.04 + t * 0.42).toFixed(3)})` : "";
        return `<td class="n${v === tope[c] && v > 0 ? " top" : ""}" style="${fondo}">${nf(v, dec[c])}</td>`;
      }).join("")}
    </tr>`;
  }).join("");

  const puestos = [...new Set(filas.map(r => r.posicion))].sort();
  const medias = puestos.map(p => {
    const suyos = filas.filter(r => r.posicion === p);
    return `<tr class="media">
      <td>Media</td><td class="pos">${esc(p)}</td>
      ${planas.map(c => `<td class="n">${nf(mediaDe(suyos, c), decMedia(dec[c]))}</td>`).join("")}
    </tr>`;
  }).join("");
  const total = `<tr class="media global">
      <td>Media</td><td class="pos">equipo</td>
      ${planas.map(c => `<td class="n">${nf(mediaDe(filas, c), decMedia(dec[c]))}</td>`).join("")}
    </tr>`;


  return `<section class="panel tablon">
    <h3>Velocidad, aceleraciones e impactos</h3>
    <p class="sub">En negrita el mejor de cada columna · medias por posición al final</p>
    <div class="scroll"><table class="datos">
      <thead>
        <tr><th></th><th></th>${grupos}</tr>
        <tr><th>Jugador</th><th>Posición</th>${sub}</tr>
      </thead>
      <tbody>${cuerpo}</tbody>
      <tfoot>${medias}${total}</tfoot>
    </table></div>
  </section>`;
}

function pintar() {
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

/* ---------- arranque ---------- */
(async function init() {
  eventos();
  await cargar();
  poblarFiltros();
  pintar();
})();
})();

(() => {
"use strict";
const VERSION = "20261109c";   // se muestra abajo en el lateral
const C = window.CAU_CONFIG || {};

/* Columnas del export que se pueden visualizar, agrupadas. Solo se ofrecen
   las que traen datos: si una viene entera a cero (Hr Load, por ejemplo), se oculta. */
/* Métricas que no vienen en el export y calculamos nosotros. */
const HMLD = "HMLD (m)";
const ACC3 = "ACC > 3 m/s²";
const ACC3MIN = "ACC > 3 por min";
const DEC3 = "DECC > 3 m/s²";
const DEC3MIN = "DECC > 3 por min";
const ACDC3MIN = "ACC + DECC > 3 por min";
const PCTVEL = "% de su top speed";
const PCTACC = "% de su ACC máx";
const CALCULADAS = [HMLD, ACC3, ACC3MIN, DEC3, DEC3MIN, ACDC3MIN, PCTVEL, PCTACC];

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
  crudo[ACDC3MIN] = minutos ? (crudo[ACC3] + crudo[DEC3]) / minutos : 0;
}

/* Lo que va en gráficos de barras: volumen y distancias por zona. */
const CATALOGO = [
  ["Volumen", [
    "Distance (metres)", HMLD, "Sprint Distance (m)", "Player Load", "Power Plays",
    "Energy (kcal)", "Hr Load", "Time In Red Zone (min)", "Distance Per Min (m/min)"
  ]],
  ["Acciones de alta intensidad", [ACC3, ACC3MIN, DEC3, DEC3MIN, ACDC3MIN]],
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
    "Deceleration Zone Count: 3 - 4 m/s/s", "Deceleration Zone Count: > 4 m/s/s", DEC3MIN,
    ACDC3MIN
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
  { col:"Distance (metres)",        titulo:"Distancia",            uni:"m",     tipo:"vol" },
  { col:"Sprint Distance (m)",      titulo:"HSR",                 uni:"m",     tipo:"vol" },
  { col:"Distance Per Min (m/min)", titulo:"Distancia por min",    uni:"m/min", tipo:"int", sinTotal:true },
  { col:ACC3,                       titulo:"ACC > 3 m/s²",         uni:"nº",    tipo:"int" },
  { col:"Player Load",              titulo:"Player load",          uni:"",      tipo:"vol" }
];

/* Las cinco tarjetas de podio. Cada una mide algo distinto: dos de velocidad,
   una mecánica, una de contacto y el volumen al final. */
/**
 * Los cinco rankings del reporte. La distancia total salió de aquí porque ya
 * es el primer KPI de arriba y además la gana siempre quien más minutos juega.
 * En su lugar entran la distancia explosiva, que es lo que de verdad se
 * acumula, y una medida por minuto: ahí una jugadora de veinte minutos puede
 * ganar a una de ochenta, que es justo lo que los demás rankings esconden.
 */
const TOP3 = [
  { col:"Sprint Distance (m)",      ico:"🚀",
    titulo:() => "HSR · distancia a alta velocidad" + conUmbral(umbralSprintTxt()),
    corto:() => "HSR" + (umbralSprintTxt() ? " " + umbralSprintTxt() : "") },
  { col:HMLD,                       ico:"🔥",  titulo:"Distancia explosiva (HMLD)  ·  > 25 w/kg", corto:"HMLD 25 w/kg" },
  { col:"Top Speed (m/s)",          ico:"⚡",  titulo:"Velocidad máxima (m/s)",       corto:"Vel. máx m/s" },
  { col:ACC3,                       ico:"🏎️", titulo:"Aceleraciones > 3 m/s²",       corto:"ACC > 3 m/s²" },
  { col:ACC3MIN,                    ico:"🌶️", titulo:() => `${esFem() ? "La más intensa" : "El más intenso"} · aceleraciones por minuto`, corto:"ACC / min" },
  { col:"Impacts",                  ico:"🥊",  titulo:"Contactos",                    corto:"Contactos" }
];

/* Los nombres se dejan tal cual salen en el Sheets, para que no haya dudas
   de qué columna es cada cosa. Solo se les añade el rango cuando lo tienes
   configurado, porque el export no lo trae. */
/**
 * Los umbrales de Catapult se configuran por jugador, así que cada equipo
 * puede tener los suyos. Si el ajuste trae "_defecto" se entiende que está
 * repartido por equipo; si no, vale para todos.
 */
function porEquipo(ajuste, squad) {
  if (ajuste == null) return null;
  if (typeof ajuste !== "object") return ajuste;
  if (!("_defecto" in ajuste) && !(squad in ajuste)) return ajuste;
  return ajuste[squad] !== undefined ? ajuste[squad] : ajuste._defecto;
}
const zonasDe = () => porEquipo(C.zonasVelocidad, F.squad) || {};
/* A la velocidad punta se llega más a menudo que a la aceleración máxima, así
   que cada una lleva su propio listón: con 90 y 85 el verde salta en torno a
   un tercio de las sesiones en las dos, que es lo que hace que signifique igual. */
const umbralDe = col => {
  const u = C.umbralExposicion;
  if (u && typeof u === "object") return col === PCTVEL ? (u.velocidad ?? 90) : (u.aceleracion ?? 85);
  return u ?? (col === PCTVEL ? 90 : 85);
};
const impactoDe = () => porEquipo(C.umbralImpacto, F.squad);

/**
 * El umbral de alta velocidad, rotulado en km/h, que es como se habla de él.
 * En config se pone tal como lo tengas en Catapult ("> 5 m/s"); aquí se
 * convierte. La cifra sale de multiplicar por 3,6 y no se redondea a ojo:
 * 5 m/s son 18 km/h justos, pero 5,5 son 19,8, y el rótulo no puede decir
 * un número que la métrica no mide.
 */
function umbralSprintTxt() {
  const u = porEquipo(C.umbralSprint, F.squad);
  if (u == null || u === "") return "";
  const txt = String(u).trim();
  if (/km\s*\/?\s*h/i.test(txt)) return txt;        // ya viene en km/h, se deja
  const m = txt.match(/-?[\d.,]+/);
  if (!m) return txt;
  const v = parseFloat(m[0].replace(",", "."));
  // Si no son m/s ni un número suelto, es un rótulo suyo: no se toca.
  if (!isFinite(v) || !(/m\s*\/?\s*s/i.test(txt) || typeof u === "number")) return txt;
  const kmh = v * 3.6;
  const signo = (txt.match(/^[<>≥≤]/) || [">"])[0];
  return `${signo} ${nf(kmh, Math.abs(kmh - Math.round(kmh)) < .05 ? 0 : 1)} km/h`;
}
const conUmbral = u => u ? "  ·  " + u : "";

const nombreMetrica = c => {
  const RANGOS_ZONA = zonasDe();
  if (c === HMLD) return "HMLD (m)  ·  > 25 w/kg";
  const z = c.match(/Speed Zone (\d)/);
  if (z && RANGOS_ZONA[z[1]]) return c + "  ·  " + RANGOS_ZONA[z[1]];
  const g = impactoDe();
  if (c === "Impacts" && g) return "Impacts  ·  > " + g + " G";
  if (c === "Sprint Distance (m)") return "HSR (m)" + conUmbral(umbralSprintTxt());
  return c;
};
/* Versión corta para las cabeceras de la tabla. */
const CORTOS = {
  "Top Speed (m/s)": "Top speed (m/s)", [PCTVEL]: "% top speed",
  "Max Acceleration (m/s/s)": "ACC máx", [PCTACC]: "% ACC máx",
  "Max Deceleration (m/s/s)": "DECC máx",
  "Accelerations Zone Count: 3 - 4 m/s/s": "ACC 3-4", "Accelerations Zone Count: > 4 m/s/s": "ACC > 4",
  "Deceleration Zone Count: 3 - 4 m/s/s": "DECC 3-4", "Deceleration Zone Count: > 4 m/s/s": "DECC > 4",
  [ACC3MIN]: "ACC > 3 / min", [DEC3MIN]: "DECC > 3 / min", [ACDC3MIN]: "ACC+DECC / min",
  "Impacts": "Impactos", [HMLD]: "HMLD", [ACC3]: "ACC > 3", [DEC3]: "DECC > 3",
  "Distance (metres)": "Distancia", "Sprint Distance (m)": "HSR",
  "Player Load": "Player load", "Power Plays": "Power plays",
  "Distance Per Min (m/min)": "Dist. / min", "Energy (kcal)": "Energía", "Hr Load": "Carga HR"
};
const nombreCorto = c => {
  // El umbral de la columna de impactos va pegado al nombre: "Impactos" a
  // secas no dice a partir de cuántas G cuenta Catapult un golpe.
  if (c === "Impacts") { const g = impactoDe(); return g ? `Impactos (${g}G)` : "Impactos"; }
  return cortoBase(c);
};
const cortoBase = c => CORTOS[c] || (CALCULADAS.includes(c) ? c : c)
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
            ACC3, "Player Load", "Distance in Speed Zone 5  (metres)"],
  // Las filas de la matriz: se marcan y desmarcan y el bloque crece o encoge.
  matriz:["Distance (metres)", HMLD, "Sprint Distance (m)", ACC3],
  // Los dos ejes del gráfico de dispersión.
  sc:{ x:HMLD, y:"Power Plays" } };

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
/** Catapult exporta con coma o con punto y coma según el idioma del equipo. */
function separadorDe(txt) {
  const linea = txt.slice(0, txt.indexOf("\n") === -1 ? txt.length : txt.indexOf("\n"));
  const cuenta = ch => linea.split(ch).length - 1;
  const punto = cuenta(";"), coma = cuenta(","), tab = cuenta("\t");
  if (tab > punto && tab > coma) return "\t";
  return punto > coma ? ";" : ",";
}

function parseCSV(txt, sep) {
  const s2 = sep || separadorDe(txt);
  const filas = []; let f = [], c = "", q = false;
  for (let i = 0; i < txt.length; i++) {
    const ch = txt[i];
    if (q) {
      if (ch === '"') { if (txt[i+1] === '"') { c += '"'; i++; } else q = false; }
      else c += ch;
    } else if (ch === '"') q = true;
    else if (ch === s2) { f.push(c); c = ""; }
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
      fecha, fechaMs: fecha.getTime(), fechaISO: iso(fecha), sesion, jugador, alias, split, md, esPartido,
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
 * El techo de una lista de registros suyos. Un pico aislado del sensor no
 * debería marcar la referencia de todo el año, así que en modo "auto" la
 * mejor marca se descarta cuando hay histórico suficiente y se despega más
 * de un 10% de la siguiente: ese es el patrón de un fallo, no de capacidad.
 */
function techoDe(lista, minimo) {
  const min = minimo ?? C.minSesionesTecho ?? 1;
  if (lista.length < min) return 0;
  const modo = C.techo || "auto";
  const orden = lista.slice().sort((a, b) => b - a);
  if (modo === "max") return orden[0];
  if (modo === "p95") return orden[Math.floor(orden.length * 0.05)];
  if (modo === "segundo") return orden[1] || orden[0];
  return (orden.length >= 8 && orden[0] > orden[1] * 1.10) ? orden[1] : orden[0];
}

/**
 * Su mejor marca en esa métrica, contando solo sesiones del mismo tipo: un
 * entreno se compara con sus entrenos y un partido con sus partidos, que si
 * no un MD-4 sale siempre al 40% de su techo y parece una alarma.
 */
function techoJugadora(jugador, col, esPartido, squad) {
  const suyas = DATOS.filter(r => r.jugador === jugador && r.squad === squad
    && r.esPartido === esPartido && Math.abs(r.crudo[col] || 0) > 0);
  if (suyas.length < 2) return 0;
  return techoDe(suyas.map(r => Math.abs(r.crudo[col])), 2);
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

  for (const r of DATOS) {
    const t = registros[r.jugador];
    const tv = techoDe(t.vel), ta = techoDe(t.acc);
    delete r.crudo[PCTVEL];
    delete r.crudo[PCTACC];
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
 * Catálogo completo para la pestaña del jugador: lo de los paneles más todo lo
 * que solo vivía en la tabla — velocidad punta, % de su techo, los conteos de
 * aceleración y deceleración y las bandas de impacto.
 */
function catalogoJugador() {
  const hay = c => DATOS.some(r => c in r.crudo);
  const fuera = new Set(METRICAS.flatMap(([, c]) => c));
  const extra = TABLA.map(([g, cols]) => [g, cols.filter(c => !fuera.has(c) && hay(c))])
                     .filter(([, c]) => c.length);
  return METRICAS.concat(extra);
}
const metricasJugador = () => catalogoJugador().flatMap(([, c]) => c);

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
      sincronizaFotos(j.fotosSello);
      AVISO_BIP = j.bipAviso || "";
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
      sincronizaFotos(j.fotosSello);
      AVISO_BIP = j.bipAviso || "";
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
  // La versión va pegada al estado: si tras subir los archivos aquí sigue
  // saliendo la de antes, lo que está corriendo es la copia vieja.
  $("#estadoTxt").innerHTML = esc(txt) + `<br><span class="ver">v${esc(VERSION)}</span>`;
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
/**
 * Una rayita por jugadora y la mediana en negro. Dice de un vistazo si la
 * media sale de un grupo apretado o de tres que corren mucho y ocho que
 * entraron al final, que es una sesión muy distinta con el mismo número.
 */
function tiraDispersion(vals) {
  const limpios = vals.filter(v => isFinite(v));
  if (limpios.length < 3) return "";
  const mx = Math.max(...limpios);
  if (!mx) return "";
  const ord = limpios.slice().sort((a, b) => a - b);
  const med = ord[Math.floor(ord.length / 2)];
  const W = 120, H = 20;
  let s = `<svg class="disp" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
    <title>Cada rayita es ${unaUn()} ${jug()} · la marca gruesa es la mediana</title>
    <line x1="0" y1="15" x2="${W}" y2="15" stroke="currentColor" opacity=".22" vector-effect="non-scaling-stroke"/>`;
  for (const v of limpios) {
    const x = (v / mx) * (W - 2) + 1;
    s += `<line x1="${x.toFixed(1)}" y1="5" x2="${x.toFixed(1)}" y2="15" stroke="currentColor"
            opacity=".55" vector-effect="non-scaling-stroke"/>`;
  }
  const xm = (med / mx) * (W - 2) + 1;
  s += `<line x1="${xm.toFixed(1)}" y1="2" x2="${xm.toFixed(1)}" y2="18" stroke="currentColor"
          stroke-width="2" vector-effect="non-scaling-stroke"/>`;
  return s + `</svg>`;
}

/* ---------- balón en juego dentro del reporte ---------- */
function bipDeSesion() {
  const partido = Object.keys(PAREJAS).find(p => PAREJAS[p] === F.fecha);
  if (!partido) return null;
  const fases = BIP.filter(f => f.partido === partido && f.duracion > 0)
                   .sort((a, b) => (a.inicio || 0) - (b.inicio || 0));
  return fases.length ? { partido, fases } : null;
}

function bloqueBipReporte() {
  const d = bipDeSesion();
  if (!d) return "";
  const r = resumirBip(d.fases);
  const t0 = Math.min(...d.fases.map(f => f.inicio || 0));
  const finMs = Math.max(...d.fases.map(f => (f.inicio || 0) + f.duracion * 1000));
  const reloj = Math.max(1, (finMs - t0) / 60000);
  const larga = d.fases.reduce((a, b) => b.duracion > a.duracion ? b : a, d.fases[0]);
  const minLarga = (larga.inicio - t0) / 60000;

  const W = 1180, L = 14, T = 26, carril = 46, iw = W - L - 18, H = T + carril + 48;
  const px = m => L + m / reloj * iw;
  let s = `<svg class="cols" width="100%" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">`;
  s += `<rect x="${L}" y="${T}" width="${iw}" height="${carril}" rx="5" fill="#F2F5F4"/>`;
  for (const f of d.fases) {
    const a = ((f.inicio || 0) - t0) / 60000;
    const w = Math.max(px(a + f.duracion / 60) - px(a), 2);
    s += `<rect x="${px(a).toFixed(1)}" y="${T + 7}" width="${w.toFixed(1)}" height="${carril - 14}"
            rx="2" fill="#1F5E5C" opacity="${f.duracion >= 80 ? 1 : .6}"><title>${
            esc(f.nombre || f.id)} · ${mmss(f.duracion)}</title></rect>`;
  }
  const pasoMin = reloj > 50 ? 10 : 5;
  for (let m = 0; m <= reloj; m += pasoMin) {
    s += `<text x="${px(m).toFixed(1)}" y="${T + carril + 18}" font-size="10" fill="#8A9290" text-anchor="middle">${m}'</text>`;
  }
  s += `<text x="${L}" y="${T - 9}" font-size="10.5" fill="#5C6462">cada bloque es una secuencia de juego · en color pleno las que pasan de 1 min 20 s</text>`;
  s += `</svg>`;

  return `<section class="panel ancho bipReporte">
    <h3>Balón en juego <span class="uni">${esc(d.partido)}</span></h3>
    <div class="celdas cuatro" style="margin:10px 0 4px">
      <div class="c dest"><span>Balón en juego</span><b>${mmss(r.total)}</b>
        <span>de ${nf(reloj, 0)} minutos de reloj</span></div>
      <div class="c"><span>Secuencias</span><b>${r.n}</b>
        <span>una cada ${nf(reloj / r.n, 1)} min</span></div>
      <div class="c"><span>Duración media</span><b>${nf(r.media, 0)} s</b>
        <span>la más larga, ${mmss(larga.duracion)} en el minuto ${nf(minLarga, 0)}</span></div>
      <div class="c"><span>Ratio juego : parada</span><b>1:${nf(r.mediaDescanso / (r.media || 1), 2)}</b>
        <span>${nf(r.mediaDescanso, 0)} s de parada de media</span></div>
    </div>
    ${s}
    <p class="sub" style="margin:4px 0 0">Para ${lasLos()} ${jugs()}: jugamos ${mmss(r.total)} de balón en juego
      en secuencias de ${nf(r.media, 0)} segundos de media. Por eso el acondicionamiento se trabaja en
      bloques cortos y repetidos, y no corriendo veinte minutos seguidos.</p>
  </section>`;
}

function resumen(filas) {
  return `<div class="resumen cinco">${RESUMEN.map(r => {
    if (!filas.some(x => r.col in x.crudo)) return "";
    const vals = filas.map(x => Math.abs(x.crudo[r.col] || 0));
    const media = vals.reduce((t, v) => t + v, 0) / (vals.length || 1);
    const total = vals.reduce((t, v) => t + v, 0);
    const dec = decMedia(decimales(vals));
    // El nombre de la métrica va arriba: "Volumen 4042" obliga a bajar la vista
    // para enterarte de qué es ese 4042.
    const serie = serieEquipo(r.col);
    // Se compara con la MEDIA de las anteriores del mismo tipo, no solo con la
    // última: una sesión suelta rara desviaba el % entero.
    const antes = serie.slice(0, -1);
    const previa = antes.length ? antes.reduce((t, v) => t + v, 0) / antes.length : null;
    const delta = previa ? (media / previa - 1) * 100 : null;
    return `<div class="kpi ${r.tipo}" title="${esc(r.titulo)}">
      <span class="k">${esc(r.titulo)}</span>
      <b>${nf(media, dec)}<i>${r.uni ? " " + r.uni : ""}</i></b>
      <span class="s"><em>${r.tipo === "vol" ? "Volumen" : "Intensidad"}</em>${
        delta == null ? "" : `<span class="delta ${delta >= 0 ? "sube" : "baja"}">${
          delta >= 0 ? "▲" : "▼"} ${nf(Math.abs(delta), Math.abs(delta) < 10 ? 1 : 0)}%</span>`}</span>
      ${antes.length
        ? `<span class="vs">vs ${antes.length} ${
            antes.length > 1
              ? (filas[0].esPartido ? "partidos anteriores" : "sesiones anteriores")
              : (filas[0].esPartido ? "partido anterior" : "sesión anterior")
          }</span>${chispa(serie, r.tipo)}`
        : `<span class="vs sola">primer${filas[0].esPartido ? " partido" : "a sesión"} registrad${filas[0].esPartido ? "o" : "a"}</span>`}
      ${tiraDispersion(vals)}
    </div>`;
  }).join("")}</div>`;
}

/**
 * Media del equipo en las últimas sesiones del MISMO tipo que la elegida:
 * un partido se compara con partidos y un entreno con entrenos, que si no la
 * línea sube y baja por el tipo de sesión y no por la carga.
 */
function serieEquipo(col, cuantas = 6) {
  const actual = sesion();
  if (!actual.length) return [];
  const esP = actual[0].esPartido, hasta = actual[0].fechaMs;
  const por = new Map();
  for (const r of DATOS) {
    if (r.squad !== F.squad || r.esPartido !== esP || r.fechaMs > hasta) continue;
    if (!(col in r.crudo)) continue;
    const k = idSesion(r);
    if (!por.has(k)) por.set(k, { ms:r.fechaMs, vals:[] });
    por.get(k).vals.push(Math.abs(r.crudo[col] || 0));
  }
  return [...por.values()].sort((a, b) => a.ms - b.ms).slice(-cuantas)
    .map(s => s.vals.reduce((t, v) => t + v, 0) / s.vals.length);
}

/** Minigráfico de área con la evolución del equipo. */
function chispa(vals, tipo) {
  if (vals.length < 2) return "";
  const col = tipo === "vol" ? "#2F615C" : "#343C8A";
  const w = 200, h = 32, p = 4;
  const alto = Math.max(...vals), bajo = Math.min(...vals);
  const suelo = bajo - (alto - bajo) * 0.25, techo = alto + (alto - bajo) * 0.2 || alto * 1.1 || 1;
  const x = i => p + (w - p * 2) * i / (vals.length - 1);
  const y = n => h - p - (n - suelo) / ((techo - suelo) || 1) * (h - p * 2);
  const d = vals.map((n, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(n).toFixed(1)}`).join(" ");
  return `<svg class="chispa" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true">
    <path d="${d} L${x(vals.length - 1).toFixed(1)},${h} L${x(0)},${h} Z" fill="${col}" opacity=".18"/>
    <path d="${d}" fill="none" stroke="${col}" stroke-width="2" stroke-linejoin="round"
      vector-effect="non-scaling-stroke"/>
    <circle cx="${x(vals.length - 1).toFixed(1)}" cy="${y(vals[vals.length - 1]).toFixed(1)}" r="3" fill="${col}"/>
  </svg>`;
}

/**
 * Rankings de la sesión. El 1-2-3 va en podio, con la cara y el fondo del
 * metal que le toca, y del cuarto para abajo en fila fina: el podio cuenta la
 * historia de un vistazo y la lista deja ver que hay más gente detrás.
 */
const MEDALLA = ["🥇", "🥈", "🥉"];
const METAL = ["oro", "plata", "bronce"];
function medallas(filas) {
  const tarjetas = TOP3.filter(t => filas.some(r => t.col in r.crudo)).map(t => {
    const orden = filas.map(r => {
      const v = Math.abs(r.crudo[t.col] || 0);
      const techo = techoJugadora(r.jugador, t.col, r.esPartido, r.squad);
      return { nom:r.jugador, pos:r.posicion, v, pct: techo ? Math.min(999, v / techo * 100) : null };
    }).sort((a, b) => b.v - a.v).slice(0, 5);
    const dec = decimales(filas.map(r => Math.abs(r.crudo[t.col] || 0)));
    const g = impactoDe();
    const base = typeof t.titulo === "function" ? t.titulo() : t.titulo;
    const titulo = (t.col === "Impacts" && g) ? `Contactos  ·  > ${g} G` : (base || nombreMetrica(t.col));
    const cortoBase = typeof t.corto === "function" ? t.corto() : t.corto;
    const corto = (t.col === "Impacts" && g) ? `Contactos ${g}G` : cortoBase;
    const clasePct = p => p == null ? "" : p >= 95 ? "tope" : p >= 80 ? "alto" : "medio";
    const tituloPct = p => p == null
      ? "Todavía no tiene bastantes sesiones de este tipo como para saber su máximo"
      : `${nf(p, 0)}% de su mejor marca en sesiones de este tipo`;
    const podio = orden.slice(0, 3).map((d, i) => `<div class="pod ${METAL[i]}" title="${esc(d.pos)}">
      <span class="med">${MEDALLA[i]}</span>
      ${avatar(d.nom, i === 0 ? 50 : 42, d.pos)}
      <span class="n">${esc(d.nom)}</span>
      <span class="v">${fmt(t.col, d.v, dec)}</span>
      <span class="p ${clasePct(d.pct)}" title="${esc(tituloPct(d.pct))}">${
        d.pct == null ? "–" : nf(d.pct, 0) + "% de su máx."}</span>
    </div>`).join("");
    const resto = orden.slice(3).map((d, i) => `<li title="${esc(d.pos)}">
      <span class="pos"><em>${i + 4}</em></span>
      <span class="qui">${esc(d.nom)}</span>
      <span class="val">${fmt(t.col, d.v, dec)}</span>
      <span class="suyo ${clasePct(d.pct)}" title="${esc(tituloPct(d.pct))}">${
        d.pct == null ? "–" : nf(d.pct, 0) + "%"}</span></li>`).join("");
    return `<div class="medalla">
      <div class="top"><span class="ico">${t.ico}</span>
        <span class="tit" title="${esc(titulo)}">
          <b><span class="larga">${esc(titulo)}</span><span class="corta">${esc(corto)}</span></b></span>
        <span class="uniR">${esc(unidad(t.col) || "")}</span></div>
      <div class="podio">${podio}</div>
      ${resto ? `<ol class="resto">${resto}</ol>` : ""}
    </div>`;
  }).join("");
  return tarjetas ? `<div class="medallas">${tarjetas}</div>` : "";
}

/**
 * El título de la sesión. Con `conResumen` añade además el podio y los
 * promedios; las demás pestañas solo quieren el título, que si no el ranking
 * se cuela en todas.
 */
function cabecera(conResumen) {
  const filas = sesion();
  if (!filas.length) { $("#cab").innerHTML = ""; $("#resumen").innerHTML = ""; return; }
  const titulos = [...new Set(filas.map(r => r.sesion).filter(Boolean))];
  const md = etiquetaMD(filas[0].md);
  const mins = filas.reduce((t, r) => t + r.minutos, 0) / filas.length;
  $("#cab").innerHTML = `
    <h2>${esc(titulos.join(" · ") || "Sesión")}${md ? `<span class="md${filas[0].esPartido ? " partido" : ""}">${md}</span>` : ""}</h2>
    <span class="meta">${esc(fechaLarga(filas[0].fecha))} · ${esc(F.squad)} · ${filas.length} jugadores · ${nf(mins)} min de media</span>`;
  // El podio solo tiene sentido en partido: en un entreno el que más corre
  // suele ser el que más rondos le han tocado, no una referencia.
  // Primero el resumen de la sesión y después el ranking, que es el orden en
  // que se mira: el dato del equipo y luego quién destacó.
  $("#resumen").innerHTML = !conResumen ? ""
    : resumen(filas) + (filas[0].esPartido ? medallas(filas) : "");
}

/** Decimales según el tamaño del número, para no enseñar 2569,68 ni 6 pelado. */
function decimales(vals) {
  // Recuentos (impactos, aceleraciones) son enteros: no tiene sentido "35,0".
  if (vals.every(v => Number.isInteger(v))) return 0;
  return 2;
}

/* Un color por línea. Las cuatro del rugby llevan el suyo fijo; cualquier otra
   que aparezca coge uno de la reserva, para que nunca se repita con las demás. */
const COLOR_PUESTO = {
  "Primera línea":"#A8323F", "Segunda línea":"#9A6B12",
  "Tercera línea":"#2F615C", "Tres cuartos":"#343C8A"
};
const RESERVA = ["#5B4A86", "#B4602A", "#4A7E92", "#8E5A78"];
function colorPuesto(p, todos) {
  if (COLOR_PUESTO[p]) return COLOR_PUESTO[p];
  const sueltos = todos.filter(x => !COLOR_PUESTO[x]);
  return RESERVA[sueltos.indexOf(p) % RESERVA.length];
}

/**
 * Un panel de columnas agrupadas por línea.
 *
 * Las columnas se separan en bloques por posición porque un primera línea y un
 * tres cuartos no son comparables. Cada bloque lleva su media punteada dentro;
 * la del equipo va arriba en su caja, no cruzando el gráfico, que con dos rayas
 * de dos colores no se sabe cuál es cuál.
 */
function panel(col, filas, indice) {
  const vals = filas.map(r => Math.abs(r.crudo[col] || 0));
  const dec = decimales(vals);
  const lbl = nombreMetrica(col), uni = unidad(col);
  const puestos = [...new Set(filas.map(r => r.posicion))].sort();
  const grupos = {};
  for (const p of puestos) {
    grupos[p] = filas.filter(r => r.posicion === p)
      .sort((a, b) => Math.abs(b.crudo[col] || 0) - Math.abs(a.crudo[col] || 0));
  }
  const mediaEquipo = mediaDe(filas, col);

  const cajas = `<div class="cajasMedia">
    <div class="cm eq"><span>Media del equipo</span><b>${fmt(col, mediaEquipo, decMedia(dec))}</b></div>
    ${puestos.map(p => `<div class="cm" style="border-left-color:${colorPuesto(p, puestos)}">
      <span>${esc(p)}</span><b>${fmt(col, mediaDe(grupos[p], col), decMedia(dec))}</b></div>`).join("")}
  </div>`;

  // Barras horizontales agrupadas por posición: el nombre va entero y sin
  // girar a la izquierda, y el valor justo al final de su barra.
  const W = 1180, R = 92, T = 6, ALTO = 19, CAB = 17, HUECO = 15;
  const largo = Math.max(...filas.map(r => r.jugador.length), 8);
  const L = Math.min(210, Math.round(26 + largo * 7.2));
  const H = T + puestos.reduce((t, p) => t + CAB + grupos[p].length * ALTO, 0)
              + HUECO * (puestos.length - 1) + 6;
  const iw = W - L - R;
  const tope = Math.max(...vals) * 1.04 || 1;
  const x = v => L + v / tope * iw;

  let g = "";
  let y = T;
  for (const p of puestos) {
    const l = grupos[p], c = colorPuesto(p, puestos), m = mediaDe(l, col);
    const altoG = CAB + l.length * ALTO;
    g += `<rect x="0" y="${y}" width="${W}" height="${altoG}" fill="${c}" opacity=".05" rx="4"/>
          <text x="6" y="${y + 12}" fill="${c}" font-size="10.5" letter-spacing=".04em">${esc(p).toUpperCase()}</text>
          <text x="${L}" y="${y + 12}" fill="#8A9290" font-size="10">media ${fmt(col, m, decMedia(dec))}</text>`;
    const y0 = y + CAB;
    l.forEach((r, i) => {
      const v = Math.abs(r.crudo[col] || 0), fy = y0 + i * ALTO, an = x(v) - L;
      g += `<text x="${L - 9}" y="${fy + 13}" fill="#5C6462" font-size="11" text-anchor="end">${esc(r.jugador)}</text>
            <rect x="${L}" y="${fy + 3}" width="${Math.max(0, an).toFixed(1)}" height="13" rx="3" fill="${c}" opacity=".85"/>
            <text x="${(x(v) + 7).toFixed(1)}" y="${fy + 13.5}" fill="#131715" font-size="10.5">${fmt(col, v, dec)}</text>`;
    });
    // La media de la línea cruza solo su propio bloque, no el gráfico entero.
    g += `<line x1="${x(m).toFixed(1)}" x2="${x(m).toFixed(1)}" y1="${y0 + 1}" y2="${(y0 + l.length * ALTO - 2).toFixed(1)}"
            stroke="${c}" stroke-width="2" stroke-dasharray="5 3"/>`;
    y += altoG + HUECO;
  }

  return `<section class="panel">
    <h3 class="soloPdf">${esc(lbl)}${uni ? ` <span class="uni">${uni}</span>` : ""}</h3>
    ${selectorMetrica(indice)}
    ${cajas}
    <svg class="cols" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(lbl)} por jugador">${g}</svg>
  </section>`;
}

/* ---------- matriz métricas x posiciones ---------- */

/** Las métricas que de verdad están en los datos cargados, agrupadas. */
function catalogoDisponible(filas) {
  return METRICAS.map(([g, cols]) => [g, cols.filter(c => filas.some(r => c in r.crudo))])
                 .filter(([, c]) => c.length);
}

/**
 * Anillo de exposición: el relleno es el % de su propia marca y la muesca
 * blanca marca el umbral, que es lo que de verdad decide si hubo estímulo.
 */
function rosco(p, umbral) {
  const r = 13, c = 2 * Math.PI * r, off = c * (1 - Math.min(p, 100) / 100);
  const tono = p >= umbral ? "#2F615C" : (p >= umbral - 15 ? "#9A6B12" : "#A2AAA8");
  const a = -Math.PI / 2 + 2 * Math.PI * umbral / 100;
  const x1 = 18 + (r - 3.5) * Math.cos(a), y1 = 18 + (r - 3.5) * Math.sin(a);
  const x2 = 18 + (r + 3.5) * Math.cos(a), y2 = 18 + (r + 3.5) * Math.sin(a);
  return `<svg class="rosco" viewBox="0 0 36 36" role="img" aria-label="${nf(p)}% de su marca">
    <circle cx="18" cy="18" r="${r}" fill="none" stroke="#F5F7F6" stroke-width="5"/>
    <circle cx="18" cy="18" r="${r}" fill="none" stroke="${tono}" stroke-width="5" stroke-linecap="round"
      stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}" transform="rotate(-90 18 18)"/>
    <line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}"
      stroke="#131715" stroke-width="1.5" opacity=".8"/>
    <text x="18" y="21.5" text-anchor="middle" font-size="11" font-weight="600" fill="#131715">${nf(p)}</text>
  </svg>`;
}

/* Cómo se agrupan los puestos en los gráficos. Una primera línea no se parece
   a una segunda (1,55 contra 3,88 m de HMLD por minuto en los 14 partidos),
   pero una segunda y una tercera sí, así que esas dos van juntas. Se puede
   cambiar desde config.js con "grupos". */
const GRUPO_PUESTO = {
  "Primera línea":"Primeras líneas",
  "Segunda línea":"Segundas y terceras líneas",
  "Tercera línea":"Segundas y terceras líneas",
  "Tres cuartos":"Tres cuartos"
};
const ORDEN_GRUPO = ["Primeras líneas", "Segundas y terceras líneas", "Tres cuartos"];
const grupoDe = p => (C.grupos && C.grupos[p]) || GRUPO_PUESTO[p] || p;
/** Los grupos presentes en estas filas, en el orden de la delantera a la línea. */
function gruposDe(filas) {
  const vistos = [...new Set(filas.map(r => grupoDe(r.posicion)))];
  return vistos.sort((a, b) => {
    const ia = ORDEN_GRUPO.indexOf(a), ib = ORDEN_GRUPO.indexOf(b);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.localeCompare(b);
  });
}
/* Color de cada grupo y el tinte de su panel: base, oscuro (papel), fondo. */
const COLOR_GRUPO = {
  "Primeras líneas":          { base:"#9C4B52", papel:"#9C4B52", fondoOsc:"#FBEEF0", fondoCla:"#FBEEF0" },
  "Segundas y terceras líneas":{ base:"#2F615C", papel:"#2F615C", fondoOsc:"#EAF4F2", fondoCla:"#EAF4F2" },
  "Tres cuartos":             { base:"#454C92", papel:"#454C92", fondoOsc:"#EFF0FA", fondoCla:"#EFF0FA" }
};
const RESERVA_GRUPO = [
  { base:"#9A6B12", papel:"#8A7A2E", fondoOsc:"#FBF7E6", fondoCla:"#FBF7E6" },
  { base:"#5B4A86", papel:"#5B4A86", fondoOsc:"#F3EFFB", fondoCla:"#F3EFFB" },
  { base:"#B4602A", papel:"#8E5338", fondoOsc:"#FCF0EA", fondoCla:"#FCF0EA" }
];
function tonoGrupo(g, todos) {
  if (COLOR_GRUPO[g]) return COLOR_GRUPO[g];
  const sueltos = todos.filter(x => !COLOR_GRUPO[x]);
  return RESERVA_GRUPO[sueltos.indexOf(g) % RESERVA_GRUPO.length];
}

/** Parte el rótulo del puesto por la mitad de sus palabras. */
function partePuesto(t) {
  const p = t.split(" ");
  if (p.length < 2) return [t];
  return [p.slice(0, Math.ceil(p.length / 2)).join(" "), p.slice(Math.ceil(p.length / 2)).join(" ")];
}

/* El rótulo de cada banda agrupa a varias jugadoras, así que va en plural. */
const PUESTO_PLURAL = {
  "Primera línea":"Primeras líneas", "Segunda línea":"Segundas líneas",
  "Tercera línea":"Terceras líneas", "Tres cuartos":"Tres cuartos"
};

/**
 * Tamaño de letra para que el nombre entero quepa en el ancho de su columna.
 * En Chivo Mono cada letra ocupa algo más de medio cuerpo, así que de ahí sale
 * el tamaño que hace falta; por debajo de 6 no se lee, así que ahí se recorta.
 */
function letraNombre(nombre, ancho) {
  // 0,54 em por letra es lo que ocupa Sora de media en minúscula; antes se
  // calculaba con el ancho de la monoespaciada y salían nombres diminutos.
  return Math.min(10.5, (ancho * 0.9) / (Math.max(1, nombre.length) * 0.54));
}

/** Para chips y para la columna izquierda: sin el umbral, que no cabe. */
const etiquetaChip = c => nombreCorto(c).split("·")[0].trim() || nombreCorto(c);

/** Chips para marcar qué métricas entran en la matriz. */
function chipsMatriz(filas) {
  const cat = catalogoDisponible(filas);
  return `<div class="chipsMet noPdf">${cat.map(([g, cols]) => cols.map(c =>
    `<button class="chM${F.matriz.includes(c) ? " on" : ""}" data-c="${esc(c)}"
      title="${esc(nombreMetrica(c))} · ${esc(g)}">${F.matriz.includes(c) ? "✓ " : ""}${esc(etiquetaChip(c))}</button>`).join("")).join("")}</div>`;
}

/**
 * Una fila por métrica y una columna por línea, como el gráfico de la
 * referencia: el valor va girado dentro de la barra y la discontinua es la
 * media de esa línea. Los nombres se escriben una sola vez abajo porque el
 * orden de jugadores se repite en todas las filas.
 */
/* Cuántas métricas caben en una hoja apaisada sin que el bloque se parta.
   Más de esto y la matriz se trocea sola en varios bloques. */
const POR_HOJA = 5;

function matriz(filas) {
  const todas = F.matriz.filter(c => filas.some(r => c in r.crudo));
  if (!todas.length) return `<p class="empty">Marca al menos una métrica.</p>`;
  // Los nombres van una sola vez, al pie de cada bloque: repetirlos en cada
  // métrica ensuciaba el gráfico. Para que nunca se queden en otra página, la
  // matriz se corta en trozos que caben enteros en una hoja.
  // Se reparten a partes iguales: con 7 métricas salen 4 y 3, no 5 y 2, que
  // dejaba una hoja casi vacía.
  const hojas = Math.ceil(todas.length / POR_HOJA);
  const trozos = [];
  let desde = 0;
  for (let h = 0; h < hojas; h++) {
    const cuantas = Math.ceil((todas.length - desde) / (hojas - h));
    trozos.push(todas.slice(desde, desde + cuantas));
    desde += cuantas;
  }
  return trozos.map((t, i) => `<section class="panel matriz">
    <h3>Métricas por posición${trozos.length > 1 ? ` <span class="uni">${i + 1} de ${trozos.length}</span>` : ""}</h3>
    ${i === 0 ? chipsMatriz(filas) : ""}
    ${bloqueMatriz(filas, t, todas[0])}
  </section>`).join("");
}

function bloqueMatriz(filas, cols, ordenPor) {
  const puestos = gruposDe(filas);
  // Se ordena siempre por la misma métrica, la primera de las marcadas: si cada
  // bloque se ordenase por la suya, el jugador cambiaría de sitio entre páginas.
  const orden = ordenPor || cols[0];
  const grupos = puestos.map(p => [p, filas.filter(r => grupoDe(r.posicion) === p)
    .sort((a, b) => Math.abs(b.crudo[orden] || 0) - Math.abs(a.crudo[orden] || 0))]);

  // Cada métrica lleva su propia línea de apellidos pegada al eje: con varias
  // métricas el bloque pasa de una hoja y, si los nombres fueran solo al final,
  // la página de en medio no habría quien la leyera.
  // Alto de cada fila: se estira para llenar la hoja apaisada cuando hay pocas
  // métricas marcadas, en vez de dejar media página en blanco.
  const W = 1180, LG = 84, GAP = 10, TOP = 30;
  const HOJA = 752;   // alto útil del SVG en una hoja apaisada, ya descontado
                      // el marco del panel y su título
  const n = filas.length, iw = W - LG - 8 - GAP * (puestos.length - 1);
  // Todos los bloques reparten el mismo ancho por jugador, así que el paso es
  // el mismo en los cuatro y basta decidir una vez cómo caben los nombres.
  // Ancho máximo por jugador: con pocos jugadores las barras salían enormes y
  // separadísimas. Se limita el paso y el grupo se centra dentro de su banda,
  // así las barras quedan juntas y estrechas haya 6 jugadores o haya 25.
  // Se separa un poco más de lo que mide la barra para que el nombre de la
  // jugadora pueda leerse: la barra sigue igual de estrecha, solo crece el aire.
  const PASO_MAX = 46;
  const paso0 = Math.min(iw / n, PASO_MAX);
  const mini = Math.min(...filas.map(r => letraNombre(r.jugador, paso0)));
  // Un único cuerpo de letra para todos los nombres, el que necesita el más
  // largo: con uno por jugador la fila quedaba desigual.
  const soloApellido = r => { const t = r.jugador.trim().split(/\s+/); return t.length > 1 ? t.slice(1).join(" ") : t[0]; };
  const fzNom = Math.max(8.4, Math.min(11, Math.min(...filas.map(r => letraNombre(soloApellido(r), paso0)))));
  // Si el nombre entero no cabe legible en una línea, se parte en dos: la
  // inicial arriba y el apellido debajo, que así cada uno tiene la columna entera.
  const dosLineas = mini < 7;
  const PIE = dosLineas ? 28 : 19;
  const FH = Math.min(170, Math.max(112, (HOJA - TOP - PIE) / cols.length - 6));
  const H = TOP + cols.length * (FH + 6) + PIE;
  // Cada banda mide lo que ocupan sus barras más un poco de aire, en vez de
  // repartirse el ancho entero: así no quedan bandas medio vacías cuando una
  // línea tiene dos jugadores y otra tiene diez.
  const PAD = 12;
  // La banda nunca es más estrecha que su rótulo: con una sola jugadora,
  // "Segundas líneas" se partía en dos renglones.
  const FZ_ROTULO = 9.5;
  const anchoRotulo = p => p.length * 0.54 * FZ_ROTULO + 18;
  const anchoDe = (p, rs) => Math.max(paso0 * rs.length + PAD * 2, anchoRotulo(p));
  const total = grupos.reduce((t, [p, rs]) => t + anchoDe(p, rs), 0) + GAP * (grupos.length - 1);
  // Pegado al margen de las etiquetas: centrarlo dejaba un hueco enorme entre
  // el nombre de la métrica y la primera barra cuando hay pocos jugadores.
  let g = "", x = LG;
  const bloques = grupos.map(([p, rs]) => {
    const w = anchoDe(p, rs), b = { p, rs, x, w };
    x += w + GAP;
    return b;
  });
  for (const { p, rs, x, w } of bloques) {
    const t = tonoGrupo(p, puestos);
    // Con bandas estrechas el rótulo se pisaba con el de al lado: si no cabe
    // entero se parte en dos líneas antes que encogerlo hasta no leerse.
    const lineas = letraNombre(p, w) >= 8.4 ? [p] : partePuesto(p);
    const fz = Math.max(8, Math.min(11, Math.min(...lineas.map(l => letraNombre(l, w)))));
    g += `<rect class="fondoGrupo" x="${x.toFixed(1)}" y="2" width="${w.toFixed(1)}" height="${H - 4}"
            rx="12" fill="${t.fondoOsc}"/>`;
    lineas.forEach((l, i) => {
      g += `<text x="${(x + w / 2).toFixed(1)}" y="${15 + i * 12}" fill="${t.base}" font-size="${fz.toFixed(1)}"
              font-weight="600" text-anchor="middle">${esc(l)}</text>`;
    });
  }
  cols.forEach((col, mi) => {
    const vals = filas.map(r => Math.abs(r.crudo[col] || 0));
    const bruto = decimales(vals);
    // Dentro de una barra estrecha "6112,55" no cabe: con cifras grandes se
    // quitan los decimales, que ahí no aportan nada.
    const dec = Math.max(...vals) >= 100 ? 0 : bruto;
    const tope = Math.max(...vals) * 1.12 || 1;
    const y0 = TOP + mi * (FH + 6), ih = FH - 16;
    g += `<text x="2" y="${(y0 + ih / 2).toFixed(0)}" fill="#131715" font-size="10.5">${esc(etiquetaChip(col))}<title>${esc(nombreMetrica(col))}</title></text>
          <text x="2" y="${(y0 + ih / 2 + 12).toFixed(0)}" fill="#8A9290" font-size="9">${esc(unidad(col) || "")}</text>
          <line x1="${(bloques[0].x - 6).toFixed(1)}" x2="${(bloques[bloques.length - 1].x + bloques[bloques.length - 1].w + 6).toFixed(1)}"
            y1="${y0 + ih}" y2="${y0 + ih}" stroke="#DCE1DF"/>`;
    for (const { p, rs, x, w } of bloques) {
      const c = tonoGrupo(p, puestos).base, paso = paso0;
      const dentro = x + (w - paso * rs.length) / 2;
      const m = mediaDe(rs, col), ym = y0 + ih - m / tope * ih;
      g += `<line x1="${(dentro - 4).toFixed(1)}" x2="${(dentro + paso * rs.length + 4).toFixed(1)}"
              y1="${ym.toFixed(1)}" y2="${ym.toFixed(1)}"
              stroke="${c}" stroke-width="1.6" stroke-dasharray="4 3"/>`;
      rs.forEach((r, i) => {
        const v = Math.abs(r.crudo[col] || 0), cx = dentro + paso * (i + 0.5);
        const h = v / tope * ih, an = Math.min(paso * 0.72, 30);
        // En color pleno quien llega al promedio de su grupo; apagada quien no.
        g += `<rect x="${(cx - an / 2).toFixed(1)}" y="${(y0 + ih - h).toFixed(1)}" width="${an.toFixed(1)}"
                height="${Math.max(1, h).toFixed(1)}" rx="4" fill="${c}" opacity="${v >= m ? 1 : .42}"/>`;
        // Siempre horizontal y encima de la barra: girado dentro quedaba
        // enterrado en la base, lejos de lo que mide.
        g += `<text x="${cx.toFixed(1)}" y="${(y0 + ih - h - 5).toFixed(1)}" fill="#3F4846"
                font-size="9.5" text-anchor="middle">${fmt(col, v, dec)}</text>`;
      });
    }
  });
  // Una sola fila de nombres al pie, con el cuerpo de letra que les permita
  // caber en su columna sin tocarse.
  const yb = TOP + cols.length * (FH + 6);
  for (const { rs, x, w } of bloques) {
    const paso = paso0, dentro = x + (w - paso * rs.length) / 2;
    rs.forEach((r, i) => {
      const cx = dentro + paso * (i + 0.5);
      if (dosLineas) {
        const t = r.jugador.trim().split(/\s+/);
        const ini = t.length > 1 ? t[0] : "", ape = t.length > 1 ? t.slice(1).join(" ") : t[0];
        g += `<text x="${cx.toFixed(1)}" y="${yb + 10}" fill="#8A9290" font-size="${(fzNom - 0.6).toFixed(1)}"
                text-anchor="middle">${esc(ini)}</text>
              <text x="${cx.toFixed(1)}" y="${yb + 21}" fill="#3F4846" font-size="${fzNom.toFixed(1)}"
                text-anchor="middle">${esc(ape)}<title>${esc(r.jugador)}</title></text>`;
      } else {
        g += `<text x="${cx.toFixed(1)}" y="${yb + 13}" fill="#3F4846" font-size="${mini.toFixed(1)}"
                text-anchor="middle">${esc(r.jugador)}</text>`;
      }
    });
  }
  return `<svg class="cols" viewBox="0 0 ${W} ${H}" role="img" aria-label="Métricas por posición">${g}</svg>`;
}

/* ---------- dispersión normalizada por posición ---------- */

/**
 * Los dos ejes van en % de la media de SU puesto, no en valor bruto: así un
 * primera línea no se queda siempre abajo a la izquierda solo por ser primera.
 */
function scatter(filas) {
  const puestos = gruposDe(filas);
  const hayX = filas.some(r => F.sc.x in r.crudo), hayY = filas.some(r => F.sc.y in r.crudo);
  if (!hayX || !hayY) return `<p class="empty">Esa pareja de métricas no está en estos datos.</p>`;
  const pts = [];
  for (const p of puestos) {
    const rs = filas.filter(r => grupoDe(r.posicion) === p);
    const mx = mediaDe(rs, F.sc.x) || 1, my = mediaDe(rs, F.sc.y) || 1;
    for (const r of rs) {
      pts.push({ nom:r.jugador, pos:p, c:tonoGrupo(p, puestos).base,
                 a:Math.abs(r.crudo[F.sc.x] || 0) / mx * 100,
                 b:Math.abs(r.crudo[F.sc.y] || 0) / my * 100 });
    }
  }
  const W = 1180, H = 330, L = 56, R = 16, T = 14, B = 36;
  const iw = W - L - R, ih = H - T - B;
  // Los dos ejes van simétricos alrededor del 100%, así el cruce cae siempre
  // justo en el centro y los cuatro cuadrantes miden lo mismo: el cartel de
  // cada uno tiene su sitio fijo y no depende de dónde hayan caído los puntos.
  const lejos = Math.max(...pts.map(p => Math.max(Math.abs(p.a - 100), Math.abs(p.b - 100))), 40);
  const m = lejos * 1.18;
  // Simétrico de verdad: si se recortara por abajo en 0 el 100% dejaría de caer
  // en el centro y las rayas no coincidirían con el cambio de color.
  const bajo = 100 - m, alto = 100 + m;
  const x = v => L + (v - bajo) / (alto - bajo) * iw;
  const y = v => T + ih - (v - bajo) / (alto - bajo) * ih;
  const cx = L + iw / 2, cy = T + ih / 2;
  let g = `<rect x="${cx.toFixed(1)}" y="${T}" width="${(W - R - cx).toFixed(1)}" height="${(cy - T).toFixed(1)}" fill="#1F5E5C" opacity=".22"/>
    <rect x="${L}" y="${T}" width="${(cx - L).toFixed(1)}" height="${(cy - T).toFixed(1)}" fill="#9A6B12" opacity=".22"/>
    <rect x="${cx.toFixed(1)}" y="${cy.toFixed(1)}" width="${(W - R - cx).toFixed(1)}" height="${(T + ih - cy).toFixed(1)}" fill="#B4602A" opacity=".22"/>
    <rect x="${L}" y="${cy.toFixed(1)}" width="${(cx - L).toFixed(1)}" height="${(T + ih - cy).toFixed(1)}" fill="#C0392B" opacity=".22"/>`;
  // Las rayas de referencia salen del 100% hacia los dos lados, con un paso
  // redondo, para que la retícula siga siendo legible con cualquier rango.
  const paso = [10, 20, 25, 50, 100, 200].find(p => m / p <= 3.5) || 500;
  for (let k = -Math.floor(m / paso); k <= Math.floor(m / paso); k++) {
    const v = 100 + k * paso;
    if (v < 0 || v < bajo || v > alto) continue;
    g += `<line x1="${x(v).toFixed(1)}" x2="${x(v).toFixed(1)}" y1="${T}" y2="${T + ih}" stroke="#E2E6E4"/>
          <line x1="${L}" x2="${W - R}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}" stroke="#E2E6E4"/>
          <text x="${x(v).toFixed(1)}" y="${T + ih + 13}" fill="#8A9290" font-size="9" text-anchor="middle">${v}%</text>
          <text x="${L - 6}" y="${(y(v) + 3).toFixed(1)}" fill="#8A9290" font-size="9" text-anchor="end">${v}%</text>`;
  }
  g += `<line x1="${cx.toFixed(1)}" x2="${cx.toFixed(1)}" y1="${T}" y2="${T + ih}" stroke="#9A6B12" stroke-width="1.4" stroke-dasharray="5 3"/>
        <line x1="${L}" x2="${W - R}" y1="${cy.toFixed(1)}" y2="${cy.toFixed(1)}" stroke="#9A6B12" stroke-width="1.4" stroke-dasharray="5 3"/>`;

  // Los carteles de cada cuadrante. Se dibujan con el texto en su sitio pero
  // sin colocar: el ancho real de una frase no se puede calcular contando
  // letras, así que el hueco y el tamaño de la caja se ajustan después, ya
  // pintados, en ajustaCarteles().
  // Los cuatro carteles grandes tapaban puntos: dentro del lienzo se queda
  // solo una pastilla pequeña en cada esquina y la explicación baja a la
  // leyenda de debajo, donde además se lee mucho mejor.
  const TX = textosCuadrante();
  const quads = [
    ["verde", "#1F5E5C", cx, T, W - R - cx, cy - T, "der", "arr"],
    ["amar",  "#9A6B12", L, T, cx - L, cy - T, "izq", "arr"],
    ["nara",  "#B4602A", cx, cy, W - R - cx, T + ih - cy, "der", "aba"],
    ["rojo",  "#C0392B", L, cy, cx - L, T + ih - cy, "izq", "aba"]
  ];
  for (const [k, col, qx, qy, qw, qh, ax, ay] of quads) {
    const t = TX[k];
    const rot = t.fle;
    const an = Math.min(qw - 12, rot.length * 5.9 + 20), al = 21;
    if (an < 70) continue;
    const px0 = ax === "izq" ? qx + 6 : qx + qw - an - 6;
    const py0 = ay === "arr" ? qy + 6 : qy + qh - al - 6;
    g += `<g class="cartel" data-qx="${px0.toFixed(1)}" data-qy="${py0.toFixed(1)}">
      <rect class="fondo" x="${px0.toFixed(1)}" y="${py0.toFixed(1)}" width="${an.toFixed(1)}"
        height="${al}" rx="10" fill="#FFFFFF" opacity=".94" stroke="#D4D8D6"/>
      <text x="${(px0 + an / 2).toFixed(1)}" y="${(py0 + 14.5).toFixed(1)}" fill="${col}" font-size="10.5"
        font-weight="700" text-anchor="middle" letter-spacing=".01em">${esc(rot)}</text></g>`;
  }

  // Los nombres se pintan en su sitio de siempre y se recolocan después, ya
  // medidos, en colocaNombres(): contando letras no se sabe lo que ocupa una
  // palabra y con veinte jugadoras se pisan unas a otras.
  for (const p of pts) {
    g += `<circle cx="${x(p.a).toFixed(1)}" cy="${y(p.b).toFixed(1)}" r="5.5" fill="${p.c}" stroke="#FFFFFF" stroke-width="1.4"><title>${esc(p.nom)} · ${esc(p.pos)}</title></circle>`;
  }
  g += `<g class="guias" stroke="#B9C0BE" stroke-width="1"></g>`;
  for (const p of pts) {
    g += `<text class="nomPt" data-px="${x(p.a).toFixed(1)}" data-py="${y(p.b).toFixed(1)}"
            x="${x(p.a).toFixed(1)}" y="${(y(p.b) - 10).toFixed(1)}" fill="#131715"
            font-size="9.2" font-weight="600" text-anchor="middle">${esc(p.nom)}</text>`;
  }
  g += `<text x="${(L + iw / 2).toFixed(0)}" y="${H - 4}" fill="#3F4846" font-size="11" text-anchor="middle">${esc(nombreMetrica(F.sc.x))}</text>
        <text x="13" y="${(T + ih / 2).toFixed(0)}" fill="#3F4846" font-size="11" text-anchor="middle"
          transform="rotate(-90 13 ${(T + ih / 2).toFixed(0)})">${esc(nombreMetrica(F.sc.y))}</text>`;
  return `<svg class="cols" viewBox="0 0 ${W} ${H}" role="img" aria-label="Dispersión por posición">${g}</svg>`;
}

/* El femenino lee el reporte igual que el resto: las explicaciones van en
   femenino cuando el equipo elegido es el suyo. */
/**
 * Género del equipo, para que los textos concuerden: DHb es masculino y
 * Femenino o Women, femenino. Si el nombre no lo deja claro, se puede fijar
 * equipo por equipo en config.js con generoEquipo: { "DHb":"m", ... }.
 */
const esFem = () => {
  const g = (C.generoEquipo || {})[F.squad];
  if (g) return /^f/i.test(String(g));
  return /femenin|women|\bfem\b|chicas|girls|ladies|senior f/i.test(F.squad || "");
};
const JUG  = () => esFem() ? "Jugadora" : "Jugador";
const jug  = () => esFem() ? "jugadora" : "jugador";
const jugs = () => esFem() ? "jugadoras" : "jugadores";
const JUGS = () => esFem() ? "Jugadoras" : "Jugadores";
const lasLos = () => esFem() ? "las" : "los";
const unaUn = () => esFem() ? "una" : "un";
const unaJugadora = () => esFem() ? "una jugadora" : "un jugador";
const companeras = () => esFem() ? "compañeras" : "compañeros";

/** Los cuatro cuadrantes explicados debajo del gráfico, en cuatro columnas. */
function leyendaCuadrantes() {
  const TX = textosCuadrante();
  const cols = [["verde", "#1F5E5C"], ["amar", "#9A6B12"], ["nara", "#B4602A"], ["rojo", "#C0392B"]];
  return `<div class="leyCuad">${cols.map(([k, col]) => {
    const t = TX[k];
    return `<div style="border-top:2px solid ${col}">
      <b style="color:${col}">${t.emo} ${esc(t.tit)}</b>
      <span>${esc(t.desc.join(" "))}.</span>
      <i>Foco en ${esc(t.foco.join(" "))}.</i></div>`;
  }).join("")}</div>`;
}

/** Una línea, no un párrafo: lo demás lo cuentan los cuadrantes. */
function explicaScatter() {
  return `<p class="sub">Comparación con el promedio de tu posición.</p>`;
}

/* Cómo se llama cada métrica cuando se habla con las jugadoras, y qué hay que
   hacer para subirla. Es lo que se escribe dentro de los cuadrantes. */
const CLARO = {
  [HMLD]:"distancia explosiva", "Power Plays":"esfuerzos de alta intensidad",
  "Sprint Distance (m)":"metros a alta velocidad", [ACC3]:"aceleraciones",
  [DEC3]:"deceleraciones", "Distance (metres)":"distancia total",
  "Player Load":"carga", "Impacts":"contactos", "Top Speed (m/s)":"velocidad punta",
  "Distance Per Min (m/min)":"metros por minuto"
};
const FOCO = {
  [HMLD]:"sumar metros de distancia explosiva:|con, sin y alrededor del balón",
  "Power Plays":"repetir esfuerzos|de alta intensidad",
  "Sprint Distance (m)":"buscar los metros|a alta velocidad",
  [ACC3]:"arrancar más veces|desde parada",
  [DEC3]:"frenar y recolocarse|más veces"
};
const claro = c => CLARO[c] || etiquetaChip(c).toLowerCase();
const foco = c => FOCO[c] || ("sumar " + claro(c));

/** Los cuatro carteles de dentro del gráfico. */
/** Primera letra en mayúscula, para arrancar una frase. */
const cap = t => String(t).charAt(0).toUpperCase() + String(t).slice(1);

function textosCuadrante() {
  const ex = claro(F.sc.x), ey = claro(F.sc.y);
  // Dentro del gráfico van las flechas con el nombre de la métrica, que es lo
  // que una jugadora necesita para saber dónde está. El vehículo es el nombre
  // de la zona y vive en la leyenda de debajo, donde hay sitio para explicarlo.
  const corto = c => {
    const t = CLARO[c] || etiquetaChip(c).toLowerCase();
    return t.charAt(0).toUpperCase() + t.slice(1);
  };
  const X = corto(F.sc.x), Y = corto(F.sc.y);
  return {
    verde:{ emo:"🏎️", tit:"F1", fle:`↑ ${Y}   ↑ ${X}`,
            desc:envuelve(cap(ex) + " y " + ey + " por encima de lo normal en tu puesto"),
            foco:envuelve("ser consistente con este motor") },
    amar: { emo:"🏍️", tit:"Moto", fle:`↑ ${Y}   ↓ ${X}`,
            desc:envuelve("Más " + ey + ", menos " + ex),
            foco:envuelve(foco(F.sc.x).replace("|", " ")) },
    nara: { emo:"🚤", tit:"Lancha", fle:`↑ ${X}   ↓ ${Y}`,
            desc:envuelve("Más " + ex + ", menos " + ey),
            foco:envuelve(foco(F.sc.y).replace("|", " ")) },
    rojo: { emo:"⛽", tit:"Entrar en juego", fle:`↓ ${Y}   ↓ ${X}`,
            desc:envuelve(cap(ex) + " y " + ey + " por debajo de lo normal en tu puesto"),
            foco:envuelve("aparecer en más jugadas: apoyo, patada y recolocación") }
  };
}

function envuelve(txt, max = 28) {
  const out = [];
  let linea = "";
  for (const p of String(txt).split(/\s+/)) {
    if (!linea) linea = p;
    else if ((linea + " " + p).length <= max) linea += " " + p;
    else { out.push(linea); linea = p; }
  }
  if (linea) out.push(linea);
  return out;
}

/**
 * Qué hay detrás del 100% de cada línea, en metros y en número: el gráfico va
 * en porcentaje y sin esto no hay forma de saber de cuánto se habla.
 */
function cajas100(filas) {
  const puestos = gruposDe(filas);
  const x = F.sc.x, y = F.sc.y;
  const dx = decMedia(decimales(filas.map(r => Math.abs(r.crudo[x] || 0))));
  const dy = decMedia(decimales(filas.map(r => Math.abs(r.crudo[y] || 0))));
  // Tres cajas para esto ocupaban media pantalla. El dato hay que darlo —sin
  // él nadie sabe contra qué es ese 100%— pero cabe en una línea.
  const partes = puestos.map(p => {
    const rs = filas.filter(r => grupoDe(r.posicion) === p);
    return `<span><i style="background:${tonoGrupo(p, puestos).base}"></i>${esc(p)}
      <b>${fmt(x, mediaDe(rs, x), dx)}${unidad(x) ? " " + esc(unidad(x)) : ""}</b>
      y <b>${fmt(y, mediaDe(rs, y), dy)}${unidad(y) ? " " + esc(unidad(y)) : ""}</b></span>`;
  }).join("");
  return `<p class="ref100">${partes}</p>`;
}

/**
 * Coloca los nombres del cuadrante sin que se pisen. Se prueban cuatro sitios
 * alrededor de la bolita y, si ninguno está libre, se sube con una guía fina
 * hasta encontrar hueco. Las pastillas de esquina cuentan como ocupadas.
 */
function colocaNombres(svg, ocupadas, limites) {
  const guias = svg.querySelector("g.guias");
  const nombres = [...svg.querySelectorAll("text.nomPt")];
  const pisa = b => ocupadas.some(o =>
    b.x < o.x + o.w && b.x + b.w > o.x && b.y < o.y + o.h && b.y + b.h > o.y);
  for (const t of nombres) {
    ocupadas.push({ x:+t.dataset.px - 6, y:+t.dataset.py - 6, w:12, h:12 });
  }
  // De fuera hacia dentro: a las de los extremos se les da sitio primero.
  nombres.sort((a, b) => (+b.dataset.px + +b.dataset.py) - (+a.dataset.px + +a.dataset.py));
  for (const t of nombres) {
    const px = +t.dataset.px, py = +t.dataset.py;
    const m = t.getBBox(), an = m.width + 2, al = m.height * .78;
    const sitios = [[0, -9], [0, 16], [an / 2 + 9, 3.5], [-an / 2 - 9, 3.5]];
    let puesto = null;
    for (const [dx, dy] of sitios) {
      const c = { x:px + dx - an / 2, y:py + dy - al + 1, w:an, h:al };
      if (c.x > limites.x && c.x + c.w < limites.x + limites.w
          && c.y > limites.y && c.y + c.h < limites.y + limites.h && !pisa(c)) { puesto = [dx, dy, c]; break; }
    }
    if (!puesto) {
      for (let k = 1; k <= 7 && !puesto; k++) {
        const dy = -9 - k * (al + 1.5);
        const c = { x:px - an / 2, y:py + dy - al + 1, w:an, h:al };
        if (c.y > limites.y && !pisa(c)) puesto = [0, dy, c];
      }
    }
    // Último recurso: se coloca encima aunque roce. Antes se borraba el
    // nombre y quedaba una bolita anónima, que es peor que un roce.
    if (!puesto) {
      puesto = [0, -9, { x:px - an / 2, y:py - 9 - al + 1, w:an, h:al }];
    }
    ocupadas.push(puesto[2]);
    t.setAttribute("x", (px + puesto[0]).toFixed(1));
    t.setAttribute("y", (py + puesto[1]).toFixed(1));
    if (Math.abs(puesto[1]) > 14 && guias) {
      const fin = py + puesto[1] + (puesto[1] < 0 ? 4 : -9);
      guias.insertAdjacentHTML("beforeend",
        `<line x1="${px.toFixed(1)}" y1="${py.toFixed(1)}" x2="${px.toFixed(1)}" y2="${fin.toFixed(1)}"/>`);
    }
  }
}

function ajustaCarteles() {
  const svg = document.querySelector("#cuadrante svg.cols");
  if (!svg) return;
  const puestas = [];
  // Las pastillas de esquina ya vienen colocadas; solo hay que apuntarlas para
  // que los nombres de las jugadoras no se las coman.
  for (const g of svg.querySelectorAll("g.cartel")) {
    const r = g.querySelector("rect.fondo");
    if (!r) continue;
    puestas.push({ x:+r.getAttribute("x"), y:+r.getAttribute("y"),
                   w:+r.getAttribute("width"), h:+r.getAttribute("height") });
  }
  const vb = (svg.getAttribute("viewBox") || "0 0 100 100").split(/\s+/).map(Number);
  colocaNombres(svg, puestas, { x:vb[0] + 2, y:vb[1] + 2, w:vb[2] - 4, h:vb[3] - 4 });
}

/** Los dos desplegables del scatter, nativos del navegador. */
function selectorEje(eje, filas) {
  const cat = catalogoDisponible(filas);
  const act = F.sc[eje];
  const op = cat.map(([g, cols]) => `<optgroup label="${esc(g)}">` + cols.map(c =>
    `<option value="${esc(c)}"${c === act ? " selected" : ""}>${esc(nombreMetrica(c))}</option>`).join("") + `</optgroup>`).join("");
  return `<label class="ejeSel"><span>Eje ${eje.toUpperCase()}</span>
    <select class="selEje" data-e="${eje}">${op}</select></label>`;
}

/* ---------- % de carga sobre las demandas de juego ---------- */
/* ---------- motor de referencia ---------- */
/**
 * Todo lo que compara un dato con "lo normal" pasa por aquí: la barra de
 * control, la ruedecita de criterios y la cascada que baja de jugadora a
 * posición y de posición a equipo cuando no hay partidos suficientes.
 *
 * Por qué una media móvil y no un z-score por defecto: con cinco o seis
 * partidos por jugadora la desviación típica del denominador se mueve tanto
 * que dos sesiones iguales pueden dar z muy distintos. El porcentaje de una
 * media no tiene denominador frágil. El z-score queda como cuarta opción y
 * solo se pinta cuando hay observaciones de sobra.
 */
const FR = {
  nivel:"jugadora",     // jugadora | posicion | equipo
  modo:"media",         // media | alto | maximo | z | demandas
  objetivo:70,
  ventana:5,            // cuántas sesiones entran en la referencia
  minObs:5,             // por debajo de esto la referencia baja de nivel sola
  minZ:8,               // sesiones mínimas para que el z-score se pinte
  tipo:"md",            // partido | md | entreno | todo
  eventos:[],           // sesiones elegidas a mano; vacío = ventana automática
  color:"objetivo",     // objetivo | fijo — de dónde salen las bandas de color
  margenes:[80, 60],    // % del objetivo donde empiezan el verde claro y el ocre
  umbrales:[100, 75, 50],   // los tres cortes, cuando el color va por fijos
  minutos:null,         // minutos mínimos por puesto; se copia de config
  escenario:"p50",      // solo para el modo "demandas"
  abierto:false
};
const FC = FR;   // antes el escenario vivía en FC; se mantiene el nombre

const NIVELES = [["jugadora", "Ella misma"], ["posicion", "Su posición"], ["equipo", "El equipo"]];
const MODOS = [["media", "Media de la ventana"], ["alto", "Perfil alto (p90)"],
               ["maximo", "Máximo"], ["z", "Z-score"], ["demandas", "Demandas 25/26"]];
const TIPOS = [["md", "Mismo tipo de sesión"], ["partido", "Solo partidos"],
               ["entreno", "Solo entrenos"], ["todo", "Todas"]];

function minutosMin(puesto) {
  if (!FR.minutos) FR.minutos = Object.assign({}, C.minutosPartido || {});
  return FR.minutos[puesto] ?? FR.minutos._defecto ?? 0;
}

/** Cómo se llama un MD en texto: MD0 es el partido. */
const nombreMD = md => md === 0 || md === "0" ? "partido" : (md == null || md === "" ? "sin MD" : "MD-" + Math.abs(num(md)));

/**
 * Una sesión entra en la referencia si es del tipo pedido, llega a los minutos
 * mínimos (solo se exigen en partidos, que es donde tienen sentido) y trae la
 * métrica. Comparar un MD-4 contra partidos pinta la tabla entera de rojo sin
 * que eso signifique nada: por eso el tipo por defecto es "mismo tipo".
 */
function valeParaRef(x, col, act) {
  if (FR.tipo === "partido" && !x.esPartido) return false;
  if (FR.tipo === "entreno" && x.esPartido) return false;
  if (FR.tipo === "md" && act && x.md !== act.md) return false;
  const minReq = x.esPartido ? minutosMin(x.posicion) : 0;
  return x.minutos >= minReq && x.crudo[col] != null && !isNaN(x.crudo[col]);
}

/** Las últimas n sesiones, o exactamente las elegidas a mano en la ruedecita. */
function ultimasSesiones(filas, n) {
  if (FR.eventos && FR.eventos.length) {
    const set = new Set(FR.eventos);
    return filas.filter(x => set.has(idSesion(x)));
  }
  const ids = [...new Set(filas.map(x => idSesion(x)))].slice(-n);
  const set = new Set(ids);
  return filas.filter(x => set.has(idSesion(x)));
}

function muestraRef(r, col, nivel) {
  const antes = DATOS.filter(x => x.squad === r.squad && x.fechaMs < r.fechaMs && valeParaRef(x, col, r));
  let pool;
  if (nivel === "jugadora") {
    const suyas = antes.filter(x => x.jugador === r.jugador);
    pool = (FR.eventos && FR.eventos.length)
      ? suyas.filter(x => FR.eventos.includes(idSesion(x)))
      : suyas.slice(-FR.ventana);
  } else if (nivel === "posicion") pool = ultimasSesiones(antes.filter(x => x.posicion === r.posicion), FR.ventana);
  else                            pool = ultimasSesiones(antes, FR.ventana);
  return pool.map(x => Math.abs(x.crudo[col]));
}

/** Cuántas sesiones de ese tipo tiene registradas esa jugadora en total. */
function registradasDe(r, col) {
  return DATOS.filter(x => x.squad === r.squad && x.jugador === r.jugador
    && x.fechaMs < r.fechaMs && valeParaRef(x, col, r)).length;
}

function percentil(ordenados, p) {
  if (!ordenados.length) return null;
  const i = (p / 100) * (ordenados.length - 1);
  const lo = Math.floor(i), hi = Math.ceil(i);
  return ordenados[lo] + (ordenados[hi] - ordenados[lo]) * (i - lo);
}

function estadistica(vals) {
  const n = vals.length;
  if (!n) return null;
  const media = vals.reduce((a, b) => a + b, 0) / n;
  const sd = n > 1 ? Math.sqrt(vals.reduce((a, b) => a + (b - media) ** 2, 0) / (n - 1)) : 0;
  const ord = vals.slice().sort((a, b) => a - b);
  return { n, media, sd, p90:percentil(ord, 90), max:ord[n - 1], min:ord[0] };
}

const ORDEN_NIVEL = ["jugadora", "posicion", "equipo"];
/**
 * La cascada: se empieza en el nivel que pida la barra y se baja mientras no
 * haya observaciones suficientes. Devuelve con qué nivel se ha quedado, para
 * poder decirlo en la fila en vez de esconderlo.
 */
function referencia(r, col) {
  const desde = Math.max(0, ORDEN_NIVEL.indexOf(FR.nivel));
  let ultimo = null;
  for (let i = desde; i < ORDEN_NIVEL.length; i++) {
    const e = estadistica(muestraRef(r, col, ORDEN_NIVEL[i]));
    if (!e) continue;
    ultimo = Object.assign({ nivel:ORDEN_NIVEL[i] }, e);
    if (e.n >= FR.minObs) return ultimo;
  }
  return ultimo ? Object.assign({ flojo:true }, ultimo) : null;
}

function demandaDe(r, col) {
  const D = C.demandas;
  const i = (D && D.metricas || []).indexOf(col);
  const v = D && D.valores && D.valores[r.posicion] && D.valores[r.posicion][FR.escenario];
  return (i >= 0 && v) ? v[i] : null;
}

/** El número contra el que se compara, según el modo elegido en la barra. */
function valorRef(e, r, col) {
  if (FR.modo === "demandas") return demandaDe(r, col);
  if (!e) return null;
  if (FR.modo === "alto")   return e.p90;
  if (FR.modo === "maximo") return e.max;
  return e.media;
}

const ETIQUETA_NIVEL = { jugadora:"ella", posicion:"posición", equipo:"equipo" };
const CLASE_NIVEL = { jugadora:"s-jug", posicion:"s-pos", equipo:"s-eq" };

/* ---------- qué sesiones entran ---------- */
/** Las candidatas de la ventana para el equipo, de la más vieja a la más nueva. */
function candidatasRef() {
  const act = sesion()[0];
  if (!act) return [];
  const col = (todasMetricas()[0]) || "Distance (metres)";
  const base = DATOS.filter(x => x.squad === F.squad && x.fechaMs < act.fechaMs && valeParaRef(x, col, act));
  const vistas = new Map();
  for (const x of base) if (!vistas.has(idSesion(x))) vistas.set(idSesion(x), x);
  return [...vistas.values()];
}

function eventosVentana() {
  const todas = candidatasRef();
  if (FR.eventos && FR.eventos.length) return todas.filter(x => FR.eventos.includes(idSesion(x)));
  return todas.slice(-FR.ventana);
}

const rotuloEvento = x => `${x.fecha.toLocaleDateString("es-ES", { day:"2-digit", month:"short" })} · ${
  x.sesion || nombreMD(x.md)}`;

function notaEventos() {
  if (FR.modo === "demandas") return "";
  const usados = eventosVentana();
  if (!usados.length) return `<p class="notaEv">Todavía no hay sesiones anteriores del tipo elegido con las que comparar.</p>`;
  const act = sesion()[0];
  const manual = FR.eventos && FR.eventos.length;
  const tipo = FR.tipo === "md" && act ? `del mismo tipo que esta (${esc(nombreMD(act.md))})`
             : FR.tipo === "partido" ? "partidos"
             : FR.tipo === "entreno" ? "entrenos" : "sesiones de cualquier tipo";
  return `<p class="notaEv"><b>${manual ? "Sesiones elegidas a mano" : `Las ${usados.length} sesiones de la referencia`}</b>
    · ${esc(tipo)}: ${usados.map(x => esc(rotuloEvento(x))).join(" · ")}.
    ${FR.nivel === "jugadora"
      ? `A nivel de ${jug()} cada ${unaUn()} usa las suyas, así que si faltó a alguna, su ventana es más corta: el número de la etiqueta lo dice.`
      : ""}</p>`;
}

/* ---------- barra de control y ruedecita ---------- */
function barraRef() {
  const seg = (grupo, ops, activo) => `<div class="segR" data-g="${grupo}">${
    ops.map(([v, t]) => `<button data-v="${v}" class="${v === activo ? "on" : ""}">${esc(t)}</button>`).join("")
  }</div>`;
  const D = C.demandas;
  const act = sesion()[0];
  const etTipo = FR.tipo === "md" && act ? `Qué sesiones entran · hoy es ${esc(nombreMD(act.md))}` : "Qué sesiones entran";
  return `<section class="barraRef noPdf">
    <div class="filaRef">
      <div class="campoR"><label>Comparar contra</label>${seg("nivel", NIVELES, FR.nivel)}</div>
      <div class="campoR"><label>Qué referencia</label>${seg("modo", MODOS, FR.modo)}</div>
      ${FR.modo === "demandas" && D ? `<div class="campoR"><label>Escenario</label>
        <select id="fEscenario">${(D.escenarios || []).map(([v, t]) =>
          `<option value="${v}"${v === FR.escenario ? " selected" : ""}>${esc(t)}</option>`).join("")}</select></div>` : ""}
      ${FR.modo === "z" ? "" : `<div class="campoR"><label>Objetivo</label>
        <div class="objR"><input id="fObjetivo" type="number" min="0" max="300" step="5" value="${FR.objetivo}"><span>%</span></div></div>`}
      <button class="ruedaR${FR.abierto ? " on" : ""}" id="btnCriterios"
        title="Criterios de selección de datos" aria-expanded="${FR.abierto}">⚙</button>
    </div>
    ${FR.modo === "demandas" ? "" : `<div class="filaRef" style="margin-top:12px">
      <div class="campoR"><label>${etTipo}</label>${seg("tipo", TIPOS, FR.tipo)}</div>
      <div class="campoR"><label>Ventana</label>
        <div class="objR"><input id="fVentana" type="number" min="2" max="20" value="${FR.ventana}"><span>sesiones</span></div></div>
      ${FR.eventos && FR.eventos.length
        ? `<div class="campoR"><label>&nbsp;</label>
           <button id="btnLimpiaEv" class="bot">Quitar la selección a mano (${FR.eventos.length})</button></div>` : ""}
    </div>`}
    ${FR.abierto ? panelCriterios() : ""}
  </section>`;
}

function panelCriterios() {
  const puestos = [...new Set(DATOS.filter(r => r.squad === F.squad).map(r => r.posicion))].sort();
  if (!FR.minutos) FR.minutos = Object.assign({}, C.minutosPartido || {});
  const cand = candidatasRef().slice(-18).reverse();
  const u = FR.umbrales;
  return `<div class="ajustesR">
    <div class="gridR">
      <div class="blqR"><h4>Minutos mínimos del partido</h4>
        ${puestos.map(p => `<div class="filaC"><span>${esc(p)}</span>
          <input type="number" class="minPuesto" data-p="${esc(p)}" min="0" max="120" value="${minutosMin(p)}"></div>`).join("")}
        <p class="notaR">Solo se exigen en partidos. Un partido por debajo sigue saliendo en el reporte,
          pero no cuenta para calcular lo habitual. En los entrenos no se aplica.</p></div>

      <div class="blqR"><h4>Umbrales de color</h4>
        <div class="filaC"><span>Las bandas salen de</span>
          <select id="crColor">
            <option value="objetivo"${FR.color === "objetivo" ? " selected" : ""}>El objetivo de arriba</option>
            <option value="fijo"${FR.color === "fijo" ? " selected" : ""}>Umbrales fijos</option>
          </select></div>
        ${FR.color === "objetivo" ? `
        <div class="filaC"><span>Verde claro desde el … % del objetivo</span>
          <input type="number" class="margen" data-i="0" min="5" max="99" value="${FR.margenes[0]}"></div>
        <div class="filaC"><span>Ocre desde el … % del objetivo</span>
          <input type="number" class="margen" data-i="1" min="5" max="98" value="${FR.margenes[1]}"></div>
        <p class="notaR">Con el objetivo en ${FR.objetivo}%: verde a partir de ${cortes()[0]}%,
          verde claro desde ${cortes()[1]}%, ocre desde ${cortes()[2]}% y rojo por debajo.</p>` : `
        <div class="filaC"><span>Verde fuerte, a partir de</span>
          <input type="number" class="umbral" data-i="0" min="1" max="400" value="${u[0]}"></div>
        <div class="filaC"><span>Verde claro, a partir de</span>
          <input type="number" class="umbral" data-i="1" min="1" max="400" value="${u[1]}"></div>
        <div class="filaC"><span>Ocre, a partir de</span>
          <input type="number" class="umbral" data-i="2" min="1" max="400" value="${u[2]}"></div>`}
        <div class="filaC"><span>Mínimo para fiarse de la referencia</span>
          <input type="number" id="crMinObs" min="1" max="20" value="${FR.minObs}"></div>
        <div class="filaC"><span>Sesiones para pintar el z-score</span>
          <input type="number" id="crMinZ" min="3" max="40" value="${FR.minZ}"></div>
        <p class="notaR">Por debajo del mínimo para fiarse, la referencia baja de nivel sola. Con menos
          sesiones de las que pide el z-score, el número sale en gris y sin color.</p></div>

      <div class="blqR"><h4>Elegir las sesiones a mano</h4>
        <p class="notaR" style="margin:0 0 8px">Si no marcas ninguna, se usan las
          ${FR.ventana} últimas del tipo elegido. Si marcas, se usan exactamente esas.</p>
        <div class="listaEv">${cand.length ? cand.map(x => {
          const id = idSesion(x);
          return `<label class="evR"><input type="checkbox" class="chkEv" value="${esc(id)}"${
            FR.eventos.includes(id) ? " checked" : ""}><span>${esc(rotuloEvento(x))}</span>
            <s>${esc(nombreMD(x.md))}</s></label>`;
        }).join("") : `<p class="notaR">No hay sesiones anteriores del tipo elegido.</p>`}</div></div>
    </div>
    <div class="cascadaR">
      ${ORDEN_NIVEL.map((n, i) => {
        const act = ORDEN_NIVEL.indexOf(FR.nivel) === i;
        const pie = i === 0 ? `${FR.minObs} sesiones válidas o más` : (i === 1 ? "si ella no llega" : "si la posición tampoco");
        return `${i ? '<span class="fleR">→</span>' : ""}<div class="pasoR${act ? " act" : ""}">
          <b>${esc(NIVELES[i][1])}</b><s>${esc(pie)}</s></div>`;
      }).join("")}
    </div>
  </div>`;
}

/* ---------- tabla de referencia ---------- */
/**
 * Los tres cortes de color. Por defecto cuelgan del objetivo, que es lo que
 * uno espera: si pones el objetivo en el 20%, el verde empieza en el 20%.
 * Quien quiera bandas fijas las pone en la ruedecita.
 */
function cortes() {
  if (FR.color === "fijo") return FR.umbrales.slice(0, 3);
  // Proporcionales y no en puntos: con el objetivo al 20%, restar 15 y 30
  // puntos dejaba las bandas pegadas al cero.
  const o = FR.objetivo, m = FR.margenes;
  return [o, Math.max(1, Math.round(o * m[0] / 100)), Math.max(1, Math.round(o * m[1] / 100))];
}
function tintePct(p) {
  const [a, b, c] = cortes();
  if (p >= a) return "background:rgba(31,94,92,.22)";
  if (p >= b) return "background:rgba(31,94,92,.12)";
  if (p >= c) return "background:rgba(154,107,18,.12)";
  return "background:rgba(168,50,63,.10)";
}
function tinteZ(z) {
  const a = Math.abs(z);
  if (a < 1) return "";
  if (z > 0) return a >= 2 ? "background:rgba(31,94,92,.22)" : "background:rgba(31,94,92,.12)";
  return a >= 2 ? "background:rgba(168,50,63,.16)" : "background:rgba(168,50,63,.09)";
}

function celdaRef(r, col) {
  const v = Math.abs(r.crudo[col] ?? NaN);
  if (isNaN(v)) return `<td class="n">–</td>`;
  const e = referencia(r, col);
  const ref = valorRef(e, r, col);
  const tip = JSON.stringify({
    j:r.jugador, c:nombreCorto(col), v,
    med:e ? e.media : null, mx:e ? e.max : null, p90:e ? e.p90 : null,
    n:e ? e.n : 0, niv:e ? e.nivel : "", dem:demandaDe(r, col), reg:registradasDe(r, col)
  });
  if (FR.modo === "z") {
    if (!e || !e.sd) return `<td class="n" data-tip='${esc(tip)}'>–</td>`;
    const z = (v - e.media) / e.sd;
    const flojo = e.n < FR.minZ;
    return `<td class="n${flojo ? " flojo" : ""}" style="${flojo ? "" : tinteZ(z)}" data-tip='${esc(tip)}'>
      ${z > 0 ? "+" : ""}${nf(z, 2)}<i>${nf(v, 0)}</i></td>`;
  }
  if (!ref) return `<td class="n" data-tip='${esc(tip)}'>–<i>${nf(v, 0)}</i></td>`;
  const p = v / ref * 100;
  return `<td class="n${p >= FR.objetivo ? " llega" : ""}" style="${tintePct(p)}" data-tip='${esc(tip)}'>
    ${nf(p, 0)}%<i>${nf(v, 0)}</i></td>`;
}

function porcentajeCarga() {
  const filas = sesion();
  if (!filas.length) return `<p class="empty">Elige una sesión con datos.</p>`;
  const D = C.demandas;
  const mets = (FR.modo === "demandas" && D ? D.metricas : F.matriz.concat(["Player Load"]))
    .filter((m, i, a) => a.indexOf(m) === i && todasMetricas().includes(m));
  if (!mets.length) return `<p class="empty">Los datos cargados no traen ninguna de las métricas del catálogo.</p>`;

  const orden = ORDEN_GRUPO.slice();
  const jugadoras = filas.slice().sort((a, b) => {
    const ia = orden.indexOf(grupoDe(a.posicion)), ib = orden.indexOf(grupoDe(b.posicion));
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib)
        || a.posicion.localeCompare(b.posicion) || a.jugador.localeCompare(b.jugador);
  });

  let grupoActual = "", cuerpo = "";
  for (const r of jugadoras) {
    const g = grupoDe(r.posicion);
    if (g !== grupoActual) {
      grupoActual = g;
      cuerpo += `<tr class="grupoRef" style="color:${tonoGrupo(g, orden).papel}">
        <td colspan="${3 + mets.length}">${esc(g.toUpperCase())}</td></tr>`;
    }
    // La procedencia se decide una vez por jugadora, con la métrica principal:
    // si no tiene sesiones suficientes, no las tiene para ninguna columna.
    const e0 = referencia(r, mets[0]);
    const niv = e0 ? e0.nivel : "equipo";
    cuerpo += `<tr>
      <td class="nomR">${esc(r.jugador)}<span class="selloR ${CLASE_NIVEL[niv]}"
        title="Sesiones que hay detrás de su referencia">${ETIQUETA_NIVEL[niv]}${e0 ? " · " + e0.n : ""}</span></td>
      <td class="pos">${esc(r.posicion)}</td>
      <td class="n">${nf(r.minutos)}</td>
      ${mets.map(m => celdaRef(r, m)).join("")}</tr>`;
  }

  const u = cortes();
  const sub = FR.modo === "z"
    ? "Desviaciones típicas respecto a su referencia · debajo, el valor de la sesión"
    : `Porcentaje de la referencia · en negrita ${lasLos()} que pasan del ${FR.objetivo}% · debajo, el valor de la sesión`;

  return `<section class="panel">
    <div class="row">
      <div><h3>${esc(tituloRef())}</h3>
        <p class="sub" style="margin:0">${esc(sub)}</p></div>
    </div>
    <div class="scroll"><table class="datos carga ref">
      <thead><tr><th>${JUG()}</th><th>Posición</th><th class="n">Min</th>
        ${mets.map(m => `<th class="n">${esc(nombreCorto(m))}</th>`).join("")}</tr></thead>
      <tbody>${cuerpo}</tbody>
    </table></div>
    <div class="leyenda">
      ${FR.modo === "z"
        ? `<span><i class="sw" style="background:rgba(31,94,92,.22)"></i>2 o más por encima</span>
           <span><i class="sw" style="background:rgba(31,94,92,.12)"></i>entre 1 y 2 por encima</span>
           <span><i class="sw" style="background:rgba(168,50,63,.09)"></i>entre 1 y 2 por debajo</span>
           <span><i class="sw" style="background:rgba(168,50,63,.16)"></i>2 o más por debajo</span>
           <span>En gris, las que no llegan a ${FR.minZ} sesiones</span>`
        : `<span><i class="sw" style="background:rgba(31,94,92,.22)"></i>${u[0]}% o más</span>
           <span><i class="sw" style="background:rgba(31,94,92,.12)"></i>${u[1]}-${u[0]}%</span>
           <span><i class="sw" style="background:rgba(154,107,18,.12)"></i>${u[2]}-${u[1]}%</span>
           <span><i class="sw" style="background:rgba(168,50,63,.10)"></i>menos del ${u[2]}%</span>`}
      <span>La etiqueta del nombre dice con qué se compara y cuántas sesiones hay detrás</span>
    </div>
    ${notaEventos()}
  </section>`;
}

function tituloRef() {
  const n = NIVELES.find(x => x[0] === FR.nivel)[1];
  const m = MODOS.find(x => x[0] === FR.modo)[1];
  if (FR.modo === "demandas") {
    const et = ((C.demandas || {}).escenarios || []).find(x => x[0] === FR.escenario);
    return `Demandas de juego · ${et ? et[1] : FR.escenario}`;
  }
  const act = sesion()[0];
  const tipo = FR.eventos && FR.eventos.length ? "sesiones elegidas a mano"
    : FR.tipo === "md" && act ? `${nombreMD(act.md)} anteriores`
    : FR.tipo === "partido" ? "partidos anteriores"
    : FR.tipo === "entreno" ? "entrenos anteriores" : "sesiones anteriores";
  return `${n} · ${m.toLowerCase()} de ${FR.eventos.length ? "" : "los últimos " + FR.ventana + " "}${tipo}`;
}

/* ---------- tooltip con la referencia de debajo ---------- */
function enganchaTip(raiz) {
  let caja = document.getElementById("tipRef");
  if (!caja) {
    caja = document.createElement("div");
    caja.id = "tipRef"; caja.className = "tipRef"; caja.hidden = true;
    document.body.appendChild(caja);
  }
  raiz.querySelectorAll("td[data-tip]").forEach(td => {
    td.addEventListener("mouseenter", () => {
      let d; try { d = JSON.parse(td.dataset.tip); } catch (e) { return; }
      const fila = (et, v, dec = 0) => v == null || isNaN(v) ? "" :
        `<div class="tr"><span>${et}</span><b>${nf(v, dec)}</b></div>`;
      caja.innerHTML = `<h5>${esc(d.j)} · ${esc(d.c)}</h5>
        ${fila("Esta sesión", d.v)}
        ${fila(`Su habitual (${d.niv === "jugadora" ? d.n + " sesiones" : ETIQUETA_NIVEL[d.niv] || "referencia"})`, d.med)}
        ${fila("Máximo de la ventana", d.mx)}
        ${fila("Perfil alto (p90)", d.p90)}
        ${fila("Demanda de su puesto", d.dem)}
        <div class="pieT">${d.med ? nf(d.v / d.med * 100, 0) + "% de lo habitual" : "sin referencia todavía"}${
          d.mx ? " · " + nf(d.v / d.mx * 100, 0) + "% del máximo" : ""}<br>
          ${d.n} ${d.n === 1 ? "sesión usada" : "sesiones usadas"} de ${d.reg} registradas de est${esFem() ? "a" : "e"} ${jug()}</div>`;
      caja.hidden = false;
      const b = td.getBoundingClientRect();
      const x = Math.min(b.left + window.scrollX, window.scrollX + document.documentElement.clientWidth - 280);
      caja.style.left = Math.max(8, x) + "px";
      caja.style.top = (b.bottom + window.scrollY + 7) + "px";
    });
    td.addEventListener("mouseleave", () => { caja.hidden = true; });
  });
}

function enganchaBarraRef() {
  document.querySelectorAll(".barraRef .segR").forEach(sg => sg.querySelectorAll("button").forEach(b => {
    b.onclick = () => {
      FR[sg.dataset.g] = b.dataset.v;
      // Cambiar de tipo de sesión invalida una selección a mano hecha sobre otra lista.
      if (sg.dataset.g === "tipo") FR.eventos = [];
      recordar(); pintar();
    };
  }));
  const rue = $("#btnCriterios");
  if (rue) rue.onclick = () => { FR.abierto = !FR.abierto; recordar(); pintar(); };
  const limpia = $("#btnLimpiaEv");
  if (limpia) limpia.onclick = () => { FR.eventos = []; recordar(); pintar(); };
  const obj = $("#fObjetivo");
  if (obj) obj.onchange = e => { FR.objetivo = Math.max(0, num(e.target.value) || 70); recordar(); pintar(); };
  const esce = $("#fEscenario");
  if (esce) esce.onchange = e => { FR.escenario = e.target.value; recordar(); pintar(); };
  const liga = (id, campo, min, max) => {
    const el = $("#" + id);
    if (el) el.onchange = ev => {
      FR[campo] = Math.min(max, Math.max(min, num(ev.target.value) || min));
      recordar(); pintar();
    };
  };
  liga("fVentana", "ventana", 2, 20);
  liga("crMinObs", "minObs", 1, 20);
  liga("crMinZ", "minZ", 3, 40);
  document.querySelectorAll(".minPuesto").forEach(inp => inp.onchange = e => {
    if (!FR.minutos) FR.minutos = Object.assign({}, C.minutosPartido || {});
    FR.minutos[e.target.dataset.p] = Math.max(0, num(e.target.value));
    recordar(); pintar();
  });
  const colSel = $("#crColor");
  if (colSel) colSel.onchange = e => { FR.color = e.target.value; recordar(); pintar(); };
  document.querySelectorAll(".umbral").forEach(inp => inp.onchange = e => {
    FR.umbrales[+e.target.dataset.i] = Math.max(1, num(e.target.value));
    // Se mantienen en orden decreciente para que las bandas no se crucen.
    FR.umbrales = FR.umbrales.slice(0, 3).sort((a, b) => b - a);
    recordar(); pintar();
  });
  document.querySelectorAll(".margen").forEach(inp => inp.onchange = e => {
    FR.margenes[+e.target.dataset.i] = Math.min(99, Math.max(5, num(e.target.value)));
    if (FR.margenes[1] >= FR.margenes[0]) FR.margenes[1] = Math.max(5, FR.margenes[0] - 20);
    recordar(); pintar();
  });
  document.querySelectorAll(".chkEv").forEach(chk => chk.onchange = () => {
    FR.eventos = [...document.querySelectorAll(".chkEv")].filter(c => c.checked).map(c => c.value);
    recordar(); pintar();
  });
}

function vistaCarga() {
  cabecera();
  $("#notas").innerHTML = "";
  $("#paneles").innerHTML = ""; $("#cuadrante").innerHTML = "";
  $("#selectores").innerHTML = barraRef();
  $("#tabla").innerHTML = porcentajeCarga();
  enganchaBarraRef();
  enganchaTip($("#tabla"));
}

/* ---------- carga aguda:crónica ---------- */
const FA = { metrica:"Distance (metres)", semanas:6, vista:"equipo", quien:"", col:"" };
const METRICAS_ACWR = [
  { id:"Distance (metres)", lbl:"Distancia", dec:0 },
  { id:HMLD,                lbl:"HMLD",      dec:0 },
  { id:"Sprint Distance (m)", lbl:"HSR", dec:0 },
  { id:"Player Load",       lbl:"Player load", dec:0 },
  { id:ACC3,                lbl:"ACC > 3",   dec:0 },
  { id:DEC3,                lbl:"DECC > 3",  dec:0 }
];

/**
 * Ratio agudo:crónico de un jugador a una fecha dada.
 * Aguda: lo acumulado en los 7 días anteriores. Crónica: la media semanal de
 * los 28 anteriores, ajustada a las semanas que realmente tienen histórico,
 * para que las primeras semanas de temporada no den ratios disparados.
 */
function acwr(jugador, col, hasta) {
  const suyas = DATOS.filter(r => r.jugador === jugador);
  if (!suyas.length) return null;
  const fin = hasta.getTime() + 86400000;
  const suma = dias => suyas
    .filter(r => r.fechaMs < fin && r.fechaMs >= fin - dias * 86400000)
    .reduce((t, r) => t + Math.abs(r.crudo[col] || 0), 0);

  const primera = suyas[0].fechaMs;
  const historia = Math.min(28, Math.max(0, Math.round((fin - primera) / 86400000)));
  const ventana = suyas.filter(r => r.fechaMs < fin && r.fechaMs >= fin - 28 * 86400000);
  // En cuántas de las cuatro semanas anteriores hubo trabajo. Si solo entrenó
  // la última, la crónica no es una base: es una vuelta tras un parón.
  const semanasConDatos = new Set(ventana.map(r =>
    Math.floor((fin - r.fechaMs) / (7 * 86400000)))).size;

  const aguda = suma(7);
  const cronica = historia >= 7 ? suma(28) / (historia / 7) : 0;
  const ratio = (historia >= 14 && semanasConDatos >= 3 && cronica) ? aguda / cronica : null;
  return { aguda, cronica, ratio, sesiones: ventana.length, semanas: semanasConDatos,
           reincorporacion: ratio == null && aguda > 0 && semanasConDatos < 3 };
}

function estadoAcwr(r, f) {
  const lo = (C.acwr && C.acwr.bajo) ?? 0.8, hi = (C.acwr && C.acwr.alto) ?? 1.3;
  if (r == null) return { cls:"", txt: f && f.reincorporacion ? "Vuelve de parón" : "Sin histórico" };
  if (r < lo) return { cls:"baja", txt:"Por debajo" };
  if (r > hi) return { cls:"alta", txt:"Por encima" };
  return { cls:"ok", txt:"En rango" };
}

/** Semanas naturales hacia atrás desde la fecha de referencia. */
function semanasHasta(hasta, n) {
  const fin = new Date(hasta); fin.setHours(0,0,0,0);
  const lunes = new Date(fin); lunes.setDate(lunes.getDate() - ((lunes.getDay() + 6) % 7));
  return [...Array(n)].map((_, i) => {
    const ini = new Date(lunes); ini.setDate(ini.getDate() - (n - 1 - i) * 7);
    const fin2 = new Date(ini); fin2.setDate(fin2.getDate() + 7);
    return { ini, fin: fin2 };
  });
}

/* ---------- la semana ---------- */
/**
 * Dos preguntas distintas y dos gráficos distintos.
 * Arriba, cómo se repartió la carga entre los días de esta semana.
 * Abajo, cómo va la carga de 7 días contra la media de 28, en dos líneas en
 * vez de en un ratio: el ratio agudo:crónico se queda en un solo número que
 * no dice si ha subido la semana o si ha bajado el mes, y además no está
 * respaldado — con denominadores inventados la relación con la lesión sale
 * parecida (Impellizzeri et al., 2020). El aviso útil es el salto de una
 * semana a la siguiente, y eso es la barra de abajo.
 */
/** Un paso de rejilla redondo (1, 2 o 5 por década) para unas cinco líneas. */
function pasoEje(mx, objetivo = 5) {
  const bruto = Math.max(mx, 1) / objetivo;
  const mag = Math.pow(10, Math.floor(Math.log10(bruto)));
  const n = bruto / mag;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * mag;
}
/** Miles con punto siempre: es-ES no agrupa los de cuatro cifras y en un eje
 *  quedaba "15.000" encima de "5000". */
function nfEje(v) {
  const s = Math.round(Math.abs(v)).toString();
  return (v < 0 ? "-" : "") + (s.length > 3 ? s.replace(/\B(?=(\d{3})+(?!\d))/g, ".") : s);
}

const DIAS_SEM = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

const METRICAS_SEMANA = ["Distance (metres)", HMLD, "Sprint Distance (m)", ACC3, "Player Load"];
function colSemana() {
  const hay = todasMetricas();
  if (FA.col && hay.includes(FA.col)) return FA.col;
  for (const c of [HMLD, "Distance (metres)", "Player Load"]) if (hay.includes(c)) return c;
  return hay[0];
}

function filasSemana() {
  const base = DATOS.filter(r => r.squad === F.squad);
  if (FA.vista === "jugadora" && FA.quien) return base.filter(r => r.jugador === FA.quien);
  if (FA.vista === "grupo" && FA.quien)    return base.filter(r => grupoDe(r.posicion) === FA.quien);
  return base;
}

/** Media por jugadora presente, para que el eje valga igual en las tres vistas. */
function mediaPorJugadora(filas, col) {
  const js = new Set(filas.map(r => r.jugador));
  if (!js.size) return 0;
  return filas.reduce((t, r) => t + Math.abs(r.crudo[col] || 0), 0) / js.size;
}

function selectorSemana() {
  const grupos = gruposDe(DATOS.filter(r => r.squad === F.squad));
  const jugadoras = [...new Set(DATOS.filter(r => r.squad === F.squad).map(r => r.jugador))].sort();
  const seg = [["equipo", "Equipo"], ["grupo", "Por grupo"], ["jugadora", "Por " + jug()]];
  let lista = "";
  if (FA.vista === "grupo") lista = `<select id="semQuien">${grupos.map(g =>
    `<option${g === FA.quien ? " selected" : ""}>${esc(g)}</option>`).join("")}</select>`;
  if (FA.vista === "jugadora") lista = `<select id="semQuien">${jugadoras.map(j =>
    `<option${j === FA.quien ? " selected" : ""}>${esc(j)}</option>`).join("")}</select>`;
  return `<section class="barraRef noPdf"><div class="filaRef">
    <div class="campoR"><label>Ver la carga de</label>
      <div class="segR" data-g="vista">${seg.map(([v, t]) =>
        `<button data-v="${v}" class="${v === FA.vista ? "on" : ""}">${esc(t)}</button>`).join("")}</div></div>
    ${lista ? `<div class="campoR"><label>Cuál</label>${lista}</div>` : ""}
    <div class="campoR"><label>Métrica</label>
      <div class="segR" data-g="col">${METRICAS_SEMANA.filter(c => todasMetricas().includes(c)).map(c =>
        `<button data-v="${esc(c)}" class="${c === colSemana() ? "on" : ""}">${esc(nombreCorto(c))}</button>`).join("")}</div></div>
    <div class="campoR"><label>Semanas en la tendencia</label>
      <div class="objR"><input id="semCuantas" type="number" min="4" max="20" value="${FA.semanas}"><span>sem</span></div></div>
  </div></section>`;
}

function formaSemana(ref) {
  const col = colSemana();
  const todas = filasSemana();
  const lunes = new Date(ref.fecha); lunes.setHours(0, 0, 0, 0);
  lunes.setDate(lunes.getDate() - ((lunes.getDay() + 6) % 7));

  const dias = DIAS_SEM.map((nom, i) => {
    const d = new Date(lunes); d.setDate(d.getDate() + i);
    const sig = new Date(d); sig.setDate(sig.getDate() + 1);
    const delDia = todas.filter(r => r.fecha >= d && r.fecha < sig);
    const partido = delDia.filter(r => r.esPartido), entreno = delDia.filter(r => !r.esPartido);
    const nombres = [...new Set(delDia.map(r => r.sesion))].filter(Boolean);
    const mins = delDia.length ? Math.round(delDia.reduce((t, r) => t + r.minutos, 0) / delDia.length) : 0;
    return { nom, fecha:d,
      partido: mediaPorJugadora(partido, col), entreno: mediaPorJugadora(entreno, col),
      rotulo: nombres.length ? (nombres[0].length > 22 ? nombres[0].slice(0, 21) + "…" : nombres[0]) + (mins ? " · " + mins + " min" : "") : "Descanso" };
  });

  const total = dias.reduce((t, d) => t + d.partido + d.entreno, 0);
  const pesoPartido = total ? dias.reduce((t, d) => t + d.partido, 0) / total * 100 : 0;
  const W = 1180, H = 258, T = 22, B = 56, L = 60, ih = H - T - B;
  const mx = Math.max(...dias.map(d => d.partido + d.entreno), 1) * 1.16;
  const paso = (W - L - 20) / 7;
  const paso10 = pasoEje(mx);
  let s = `<svg class="cols" width="100%" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">`;
  for (let v = 0; v <= mx; v += paso10) {
    const y = T + ih - v / mx * ih;
    s += `<line x1="${L}" y1="${y.toFixed(1)}" x2="${W - 20}" y2="${y.toFixed(1)}" stroke="#EDF0EF"/>`;
    s += `<text x="${L - 9}" y="${(y + 3.5).toFixed(1)}" font-size="10" fill="#8A9290" text-anchor="end">${nfEje(v)}</text>`;
  }
  dias.forEach((d, i) => {
    const x = L + paso * i + paso * .17, bw = paso * .66;
    const he = d.entreno / mx * ih, hp = d.partido / mx * ih;
    if (he) s += `<rect x="${x.toFixed(1)}" y="${(T + ih - he).toFixed(1)}" width="${bw.toFixed(1)}" height="${he.toFixed(1)}" rx="4" fill="#9FBEBB"/>`;
    if (hp) s += `<rect x="${x.toFixed(1)}" y="${(T + ih - hp).toFixed(1)}" width="${bw.toFixed(1)}" height="${hp.toFixed(1)}" rx="4" fill="#1F5E5C"/>`;
    if (!he && !hp) s += `<line x1="${x.toFixed(1)}" y1="${T + ih}" x2="${(x + bw).toFixed(1)}" y2="${T + ih}" stroke="#DCE1DF" stroke-width="3"/>`;
    const tv = d.partido + d.entreno;
    if (tv) s += `<text x="${(x + bw / 2).toFixed(1)}" y="${(T + ih - Math.max(he, hp) - 7).toFixed(1)}" font-size="11" font-weight="600" text-anchor="middle">${nfEje(tv)}</text>`;
    s += `<text x="${(x + bw / 2).toFixed(1)}" y="${T + ih + 18}" font-size="12" font-weight="600" text-anchor="middle">${d.nom}</text>`;
    s += `<text x="${(x + bw / 2).toFixed(1)}" y="${T + ih + 33}" font-size="9.5" fill="#8A9290" text-anchor="middle">${esc(d.rotulo)}</text>`;
  });
  s += `</svg>`;

  const quien = FA.vista === "equipo" ? "del equipo" : (FA.vista === "grupo" ? "de " + (FA.quien || "") : "de " + (FA.quien || ""));
  return `<section class="panel ancho">
    <h3>Forma de la semana <span class="uni">${esc(nombreCorto(col))} · media por ${jug()}</span></h3>
    <p class="sub">Semana del ${esc(dias[0].fecha.toLocaleDateString("es-ES", { day:"numeric", month:"long" }))}
      al ${esc(dias[6].fecha.toLocaleDateString("es-ES", { day:"numeric", month:"long" }))} ·
      carga ${esc(quien)} · el partido pesa el ${nf(pesoPartido, 0)}% de la semana</p>
    ${s}
    <div class="leyenda">
      <span><i class="sw" style="background:#1F5E5C"></i>Partido</span>
      <span><i class="sw" style="background:#9FBEBB"></i>Entrenamiento</span>
      <span>Cada barra es lo que hizo de media ${unaUn()} ${jug()} que estuvo ese día</span>
    </div>
  </section>`;
}

function agudaCronica(ref) {
  const col = colSemana();
  const todas = filasSemana();
  const n = Math.max(5, FA.semanas);
  const semanas = semanasHasta(ref.fecha, n);
  const porSemana = semanas.map(s => mediaPorJugadora(todas.filter(r => r.fecha >= s.ini && r.fecha < s.fin), col));
  // La crónica es la media de las cuatro semanas que acaban en esa: no se
  // pinta hasta que hay cuatro, porque antes es la misma cifra con otro nombre.
  const cronica = porSemana.map((_, i) => i < 3 ? null
    : porSemana.slice(i - 3, i + 1).reduce((a, b) => a + b, 0) / 4);
  const cambio = porSemana.map((v, i) => i === 0 || !porSemana[i - 1] ? null : (v / porSemana[i - 1] - 1) * 100);

  const W = 1180, H = 330, T = 20, L = 62, B = 122, ih = H - T - B;
  const mx = Math.max(...porSemana, ...cronica.filter(v => v != null), 1) * 1.18;
  const paso = (W - L - 20) / n;
  const X = i => L + paso * i + paso / 2, Y = v => T + ih - v / mx * ih;
  const paso10 = pasoEje(mx);
  let s = `<svg class="cols" width="100%" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">`;
  for (let v = 0; v <= mx; v += paso10) {
    s += `<line x1="${L}" y1="${Y(v).toFixed(1)}" x2="${W - 20}" y2="${Y(v).toFixed(1)}" stroke="#EDF0EF"/>`;
    s += `<text x="${L - 9}" y="${(Y(v) + 3.5).toFixed(1)}" font-size="10" fill="#8A9290" text-anchor="end">${nfEje(v)}</text>`;
  }
  const ptsC = cronica.map((v, i) => v == null ? null : `${X(i).toFixed(1)},${Y(v).toFixed(1)}`).filter(Boolean);
  if (ptsC.length > 1) s += `<polyline fill="none" stroke="#9FBEBB" stroke-width="2.5" stroke-dasharray="6 4" points="${ptsC.join(" ")}"/>`;
  s += `<polyline fill="none" stroke="#1F5E5C" stroke-width="2.8" points="${porSemana.map((v, i) => `${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(" ")}"/>`;
  porSemana.forEach((v, i) => s += `<circle cx="${X(i).toFixed(1)}" cy="${Y(v).toFixed(1)}" r="4.5" fill="#1F5E5C" stroke="#fff" stroke-width="1.6"/>`);
  cronica.forEach((v, i) => { if (v != null) s += `<circle cx="${X(i).toFixed(1)}" cy="${Y(v).toFixed(1)}" r="3.5" fill="#fff" stroke="#9FBEBB" stroke-width="2"/>`; });
  semanas.forEach((w, i) => s += `<text x="${X(i).toFixed(1)}" y="${T + ih + 16}" font-size="10.5" fill="#5C6462" text-anchor="middle">${
    esc(w.ini.toLocaleDateString("es-ES", { day:"2-digit", month:"2-digit" }))}</text>`);

  const bT = T + ih + 44, bh = 46;
  s += `<line x1="${L}" y1="${bT + bh / 2}" x2="${W - 20}" y2="${bT + bh / 2}" stroke="#DCE1DF"/>`;
  s += `<text x="${L - 9}" y="${bT + bh / 2 + 3.5}" font-size="10" fill="#8A9290" text-anchor="end">0%</text>`;
  s += `<text x="${L - 9}" y="${bT - 3}" font-size="10" fill="#5C6462" text-anchor="end">cambio</text>`;
  cambio.forEach((c, i) => {
    if (c == null || !isFinite(c)) return;
    const al = Math.min(Math.abs(c), 70) / 70 * (bh / 2);
    const y = c > 0 ? bT + bh / 2 - al : bT + bh / 2;
    s += `<rect x="${(X(i) - 16).toFixed(1)}" y="${y.toFixed(1)}" width="32" height="${al.toFixed(1)}" rx="2" fill="${Math.abs(c) > 15 ? "#9A6B12" : "#9FBEBB"}"/>`;
    s += `<text x="${X(i).toFixed(1)}" y="${(c > 0 ? y - 5 : y + al + 12).toFixed(1)}" font-size="10" font-weight="600" fill="#5C6462" text-anchor="middle">${c > 0 ? "+" : ""}${nf(c, 0)}%</text>`;
  });
  s += `</svg>`;

  const ult = cambio[cambio.length - 1];
  const aviso = ult != null && isFinite(ult) && Math.abs(ult) > 15
    ? `<div class="aviso espera" style="margin:14px 0 0">La última semana ha cambiado un
        <b>${ult > 0 ? "+" : ""}${nf(ult, 0)}%</b> respecto a la anterior en ${esc(nombreCorto(col))}.
        Por encima del 15% es cuando conviene mirar qué día se ha ido la carga.</div>`
    : "";

  return `<section class="panel ancho">
    <h3>Carga de 7 días frente a la de 28 <span class="uni">${esc(nombreCorto(col))}</span></h3>
    <p class="sub">Dos líneas en vez de un ratio: la continua es la semana, la punteada la media de las
      cuatro anteriores. La barra de abajo es el cambio de una semana a la siguiente.</p>
    ${s}
    <div class="leyenda">
      <span><i class="sw" style="background:#1F5E5C"></i>Carga de la semana</span>
      <span><i class="sw" style="background:#9FBEBB"></i>Media de 28 días</span>
      <span><i class="sw" style="background:#9A6B12"></i>Salto de más del 15%</span>
    </div>
    ${aviso}
  </section>`;
}

function enganchaSemana() {
  document.querySelectorAll(".barraRef .segR").forEach(sg => sg.querySelectorAll("button").forEach(b => {
    b.onclick = () => {
      if (sg.dataset.g === "col") { FA.col = b.dataset.v; recordar(); pintar(); return; }
      FA.vista = b.dataset.v;
      FA.quien = "";
      if (FA.vista === "grupo") FA.quien = gruposDe(DATOS.filter(r => r.squad === F.squad))[0] || "";
      if (FA.vista === "jugadora") FA.quien = [...new Set(DATOS.filter(r => r.squad === F.squad).map(r => r.jugador))].sort()[0] || "";
      recordar(); pintar();
    };
  }));
  const q = $("#semQuien");
  if (q) q.onchange = e => { FA.quien = e.target.value; recordar(); pintar(); };
  const c = $("#semCuantas");
  if (c) c.onchange = e => { FA.semanas = Math.min(20, Math.max(4, num(e.target.value) || 6)); recordar(); pintar(); };
}

function vistaSemana() {
  cabecera();
  $("#notas").innerHTML = "";
  $("#paneles").innerHTML = ""; $("#cuadrante").innerHTML = "";

  const ref = sesion()[0];
  if (!ref) {
    $("#selectores").innerHTML = "";
    $("#tabla").innerHTML = `<p class="empty">Elige una sesión para fijar la semana de referencia.</p>`;
    return;
  }
  $("#selectores").innerHTML = selectorSemana();
  const arriba = formaSemana(ref) + agudaCronica(ref);

  const jugadores = [...new Set(DATOS.filter(r => r.squad === F.squad).map(r => r.jugador))];
  const semanas = semanasHasta(ref.fecha, FA.semanas);
  const principal = "Distance (metres)";   // la métrica de la tendencia

  const filas = jugadores.map(j => {
    const suyas = DATOS.filter(r => r.jugador === j);
    const ratios = {};
    for (const m of METRICAS_ACWR) ratios[m.id] = acwr(j, m.id, ref.fecha);
    const porSemana = semanas.map(s => suyas
      .filter(r => r.fecha >= s.ini && r.fecha < s.fin)
      .reduce((t, r) => t + Math.abs(r.crudo[principal] || 0), 0));
    const ult = porSemana[porSemana.length - 1], previa = porSemana[porSemana.length - 2];
    return {
      jugador:j, posicion:suyas[suyas.length - 1].posicion, ratios, porSemana,
      sesionesSemana: suyas.filter(r => r.fecha >= semanas[semanas.length - 1].ini).length,
      delta: previa > 0 ? (ult / previa - 1) * 100 : null
    };
  }).filter(f => f.porSemana.some(v => v > 0));

  if (!filas.length) { $("#tabla").innerHTML = `<p class="empty">Sin datos para este equipo.</p>`; return; }

  // Lo que importa no es cuánto histórico hay en total, sino cuánto cae dentro
  // de los 28 días anteriores a la sesión elegida. Un año de datos con seis
  // meses de parón justo antes no sirve para calcular una carga crónica.
  const fin = ref.fecha.getTime() + 86400000;
  const ventana = DATOS.filter(r => r.squad === F.squad
    && r.fechaMs < fin && r.fechaMs >= fin - 28 * 86400000);
  const sesionesVentana = new Set(ventana.map(r => idSesion(r))).size;
  const semanasVentana = new Set(ventana.map(r =>
    Math.floor((fin - r.fechaMs) / (7 * 86400000)))).size;

  const aviso = semanasVentana >= 3 ? "" : `<div class="aviso espera" style="margin:0 0 16px">
    En los 28 días anteriores al ${esc(fechaLarga(ref.fecha))} solo hay
    <b>${sesionesVentana} ${sesionesVentana === 1 ? "sesión" : "sesiones"}</b>,
    repartidas en ${semanasVentana} ${semanasVentana === 1 ? "semana" : "semanas"}.
    El ratio compara la última semana contra la media de las cuatro anteriores, así que
    necesita al menos tres semanas con trabajo. Empezará a salir cuando encadenes un mes seguido.
  </div>`;

  const alto = c => (C.acwr && C.acwr.alto) ?? 1.3, bajo = () => (C.acwr && C.acwr.bajo) ?? 0.8;
  const clase = r => r == null ? "" : r > alto() ? "alta" : r < bajo() ? "baja" : "ok";
  // Se ordena por el peor caso de cada jugador, que es lo que quieres ver arriba.
  const peor = f => Math.max(...METRICAS_ACWR.map(m => f.ratios[m.id] && f.ratios[m.id].ratio || 0));
  filas.sort((a, b) => peor(b) - peor(a));

  const tope = Math.max(...filas.flatMap(f => f.porSemana), 1);
  const detalle = METRICAS_ACWR.find(m => m.id === FA.metrica) || METRICAS_ACWR[0];

  const alarmas = filas.filter(f => peor(f) > alto()).length;
  const conRatio = filas.map(f => f.ratios[principal] && f.ratios[principal].ratio).filter(v => v);
  const mediaRatio = conRatio.length ? conRatio.reduce((t, v) => t + v, 0) / conRatio.length : null;

  const cuerpo = filas.map(f => `<tr>
    <td>${esc(f.jugador)}</td><td class="pos">${esc(f.posicion)}</td>
    ${METRICAS_ACWR.map(m => {
      const a = f.ratios[m.id];
      const cl = clase(a && a.ratio);
      return `<td class="n" data-m="${esc(m.id)}">${a && a.ratio != null ? nf(a.ratio, 2) : "–"}</td>`;
    }).join("")}
    <td class="n ${f.delta == null ? "" : f.delta >= 15 ? "acwr alta" : f.delta <= -15 ? "acwr baja" : ""}">
      ${f.delta == null ? "–" : (f.delta > 0 ? "+" : "") + nf(f.delta, 0) + "%"}</td>
    <td class="n">${f.sesionesSemana}</td>
    <td class="chispa">${f.porSemana.map((v, i) => `<i style="height:${Math.max(3, v / tope * 26).toFixed(0)}px"
      class="${i === f.porSemana.length - 1 ? "ult" : ""}" title="${nf(v, 0)} m"></i>`).join("")}</td>
  </tr>`).join("");

  // Detalle de una sola métrica: aguda, crónica y de dónde sale cada número.
  const det = filas.map(f => {
    const a = f.ratios[detalle.id];
    if (!a) return "";
    return `<tr><td>${esc(f.jugador)}</td><td class="pos">${esc(f.posicion)}</td>
      <td class="n">${nf(a.aguda, detalle.dec)}</td>
      <td class="n">${nf(a.cronica, detalle.dec)}</td>
      <td class="n">${a.ratio == null ? "–" : nf(a.ratio, 2)}</td>
      <td class="n">${a.sesiones}</td>
      <td>${a.ratio == null
        ? `<span class="tag na">${a.reincorporacion ? "Vuelve de parón" : "Sin histórico"}</span>`
        : `<span class="tag na">${nf(a.aguda / (a.cronica || 1), 2)} veces su media</span>`}</td>
    </tr>`;
  }).join("");

  $("#tabla").innerHTML = `${arriba}${aviso}
  <div class="celdas cuatro">
    <div class="c"><span>Referencia</span><b style="font-size:16px">${esc(fechaLarga(ref.fecha))}</b></div>
    <div class="c dest"><span>${JUGS()} con salto &gt; 15% esta semana</span><b>${
      filas.filter(f => f.delta != null && Math.abs(f.delta) > 15).length}</b></div>
    <div class="c"><span>Cambio medio de la semana</span><b>${(() => {
      const d = filas.map(f => f.delta).filter(v => v != null && isFinite(v));
      return d.length ? (d.reduce((a, b) => a + b, 0) / d.length > 0 ? "+" : "") + nf(d.reduce((a, b) => a + b, 0) / d.length, 0) + "%" : "–";
    })()}</b></div>
    <div class="c"><span>${JUGS()}</span><b>${filas.length}</b></div>
  </div>

  <section class="panel">
    <h3>Ratio agudo:crónico por métrica <span class="uni">descriptivo</span></h3>
    <p class="sub">Carga de 7 días sobre la media semanal de los 28 anteriores. Se muestra sin semáforo
      a propósito: el rango 0,8–1,3 no está respaldado, y con denominadores inventados la relación con
      la lesión sale parecida (Impellizzeri et al., 2020). El aviso que sí sirve es el Δ semana.</p>
    <div class="scroll"><table class="datos acwrtabla">
      <thead><tr><th>Jugador</th><th>Posición</th>
        ${METRICAS_ACWR.map(m => `<th class="n col" data-m="${esc(m.id)}">${esc(m.lbl)}${m.id === detalle.id ? " ·" : ""}</th>`).join("")}
        <th class="n">Δ semana</th><th class="n">Ses.</th><th>Últimas ${FA.semanas} semanas</th></tr></thead>
      <tbody>${cuerpo}</tbody>
    </table></div>
    <div class="leyenda">
      <span>Δ semana: cambio respecto a la semana anterior · en color a partir del 15%</span>
      <span>Pulsa una columna de métrica para ver de dónde sale su ratio</span>
    </div>
  </section>

  <section class="panel">
    <h3>Detalle · ${esc(detalle.lbl)}</h3>
    <p class="sub">De dónde sale el ratio de esa columna</p>
    <div class="scroll"><table class="datos">
      <thead><tr><th>Jugador</th><th>Posición</th><th class="n">Aguda (7 d)</th>
        <th class="n">Crónica (28 d)</th><th class="n">ACWR</th><th class="n">Ses. 28 d</th><th>Estado</th></tr></thead>
      <tbody>${det}</tbody>
    </table></div>
  </section>`;

  document.querySelectorAll(".acwrtabla .col").forEach(th => th.onclick = () => {
    FA.metrica = th.dataset.m;
    pintar();
  });
  enganchaSemana();
}

/* ---------- análisis por bloques ---------- */
const METRICAS_DRILL = [
  { id:"Distance (metres)",   lbl:"TD / min",   dec:1 },
  { id:"Sprint Distance (m)", lbl:"HSR / min",  dec:2 },
  { id:HMLD,                  lbl:"HMLD / min", dec:2 },
  { id:"__acdc",              lbl:"ACC+DECC / min", dec:2 }
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

/**
 * Valores típicos de un día de microciclo: se toma cada sesión completa con
 * ese mismo MD, se calcula su intensidad media y se saca la mediana entre
 * sesiones. La mediana y no la media, para que una sesión rara no la mueva.
 */
function tipicoMD(md, excluirSesion) {
  if (md == null) return null;
  const suyas = DATOS.filter(r => r.squad === F.squad && r.md === md && idSesion(r) !== excluirSesion);
  const sesiones = [...new Set(suyas.map(r => idSesion(r)))];
  if (sesiones.length < 2) return null;

  const porSesion = sesiones.map(id => porMinuto(suyas.filter(r => idSesion(r) === id)));
  const mediana = lista => {
    const o = lista.slice().sort((a, b) => a - b);
    const m = Math.floor(o.length / 2);
    return o.length % 2 ? o[m] : (o[m - 1] + o[m]) / 2;
  };
  const vals = {};
  for (const m of METRICAS_DRILL) vals[m.id] = mediana(porSesion.map(v => v[m.id]));
  const mins = sesiones.map(id => {
    const f = suyas.filter(r => idSesion(r) === id);
    return f.reduce((t, r) => t + r.minutos, 0) / f.length;
  });
  return { vals, min: mediana(mins), n: sesiones.length };
}

/** Media entre jugadores de cada métrica dividida entre sus propios minutos. */
function porMinuto(filas) {
  const vals = {};
  for (const m of METRICAS_DRILL) {
    vals[m.id] = filas.reduce((t, r) => {
      const v = m.id === "__acdc"
        ? Math.abs(r.crudo[ACC3] || 0) + Math.abs(r.crudo[DEC3] || 0)
        : Math.abs(r.crudo[m.id] || 0);
      return t + (r.minutos ? v / r.minutos : 0);
    }, 0) / (filas.length || 1);
  }
  return vals;
}

/**
 * El ritmo del partido, por minuto, con la misma ventana que usa el motor de
 * referencia. Es la vara de medir: una tarea que no lo alcanza nunca no está
 * preparando a nadie para lo que le va a pedir el sábado.
 */
function ritmoPartido(col, grupo) {
  const base = DATOS.filter(r => r.squad === F.squad && r.esPartido
    && r.minutos >= minutosMin(r.posicion)
    && (!grupo || grupoDe(r.posicion) === grupo));
  // Aquí siempre son partidos, pase lo que pase en la barra de Análisis.
  const ids = [...new Set(base.map(idSesion))].slice(-FR.ventana);
  const ult = base.filter(x => ids.includes(idSesion(x)));
  if (!ult.length) return null;
  return porMinuto(ult)[col];
}

function barrasTareas(bloques, grupo, todos) {
  let m = METRICAS_DRILL.find(x => x.id === FD.met) || METRICAS_DRILL[2];
  // Si la métrica elegida viene a cero en todos los bloques (datos sin esa
  // columna), se pasa a la primera que sí traiga números en vez de pintar
  // seis barras vacías.
  if (!bloques.some(b => b.vals[m.id] > 0)) {
    const alt = METRICAS_DRILL.find(x => bloques.some(b => b.vals[x.id] > 0));
    if (alt) m = alt;
  }
  const part = ritmoPartido(m.id, grupo);
  const lista = bloques.slice().sort((a, b) => b.vals[m.id] - a.vals[m.id]);
  if (!lista.length) return "";

  const W = 1180, L = 268, R = 78, fh = 34, TOP = 28;
  const iw = W - L - R;
  const H = TOP + lista.length * fh + 58;
  const mx = Math.max(...lista.map(b => b.vals[m.id]), part || 0) * 1.14 || 1;
  const px = v => L + v / mx * iw;
  const paso = pasoEje(mx, 6);
  let s = `<svg class="cols" width="100%" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">`;
  for (let v = 0; v <= mx; v += paso) {
    s += `<line x1="${px(v).toFixed(1)}" y1="${TOP}" x2="${px(v).toFixed(1)}" y2="${TOP + lista.length * fh + 8}" stroke="#EDF0EF"/>`;
    s += `<text x="${px(v).toFixed(1)}" y="${TOP + lista.length * fh + 25}" font-size="10" fill="#8A9290" text-anchor="middle">${nf(v, paso < 1 ? 1 : 0)}</text>`;
  }
  if (part) {
    s += `<rect x="${(px(part) - 1).toFixed(1)}" y="${TOP}" width="2" height="${lista.length * fh + 4}" fill="#131715" opacity=".55"/>`;
    s += `<text x="${px(part).toFixed(1)}" y="${TOP - 9}" font-size="10.5" font-weight="600" text-anchor="middle">ritmo del partido · ${nf(part, m.dec)}</text>`;
  }
  lista.forEach((b, i) => {
    const y = TOP + 5 + i * fh, v = b.vals[m.id];
    const llega = part && v >= part;
    const nom = b.nombre.length > 38 ? b.nombre.slice(0, 37) + "…" : b.nombre;
    s += `<text x="${L - 12}" y="${y + 15}" font-size="12" text-anchor="end">${esc(nom)}</text>`;
    s += `<rect x="${L}" y="${y + 3}" width="${Math.max(px(v) - L, 1).toFixed(1)}" height="16" rx="3" fill="#454C92" opacity="${llega ? .92 : .4}"/>`;
    s += `<text x="${(px(v) + 8).toFixed(1)}" y="${y + 16}" font-size="11.5" font-weight="600" fill="#5C6462">${nf(v, m.dec)}</text>`;
  });
  s += `<text x="${W - 20}" y="${H - 8}" font-size="10.5" fill="#5C6462" text-anchor="end">${esc(m.lbl)} · por minuto de juego</text>`;
  s += `</svg>`;

  const llegan = part ? lista.filter(b => b.vals[m.id] >= part).length : 0;
  const grupos = gruposDe(todos);
  return `<section class="panel ancho">
    <h3>¿Qué tarea llega a la intensidad del partido?</h3>
    <p class="sub">Todo por minuto, que es la única forma de comparar un bloque de seis minutos con un
      partido de setenta. La línea vertical es el ritmo medio de los últimos ${FR.ventana} partidos.</p>
    <div class="filaRef noPdf" style="margin:0 0 14px">
      <div class="campoR"><label>Métrica</label>
        <div class="segR" data-g="met">${METRICAS_DRILL.map(x =>
          `<button data-v="${esc(x.id)}" class="${x.id === m.id ? "on" : ""}">${esc(x.lbl)}</button>`).join("")}</div></div>
      <div class="campoR"><label>Puesto</label>
        <div class="segR" data-g="grupo"><button data-v="" class="${grupo ? "" : "on"}">Todas</button>${
          grupos.map(g => `<button data-v="${esc(g)}" class="${g === grupo ? "on" : ""}">${esc(g)}</button>`).join("")}</div></div>
    </div>
    ${s}
    <div class="leyenda">
      <span>${part ? `${llegan} de ${lista.length} ${llegan === 1 ? "tarea llega" : "tareas llegan"} al ritmo del partido`
                   : "Todavía no hay partidos con los que fijar el ritmo de referencia"}</span>
      <span>Las tareas de contacto no se miden bien con esto: ahí lo que cuenta son los impactos</span>
    </div>
  </section>`;
}

function drillAnalysis() {
  const todos = BLOQUES.filter(r => r.squad === F.squad && idSesion(r) === F.fecha && r.minutos > 0);
  if (!todos.length) {
    return `<div class="empty"><p>Esta sesión no tiene bloques parciales guardados.</p>
      <p style="font-size:12px">Solo aparecen aquí los splits que no son la sesión o el partido completo.</p></div>`;
  }
  // El filtro de puesto se guarda entre sesiones. Si el grupo elegido no está
  // en esta, se ignora en vez de dejar la pestaña vacía y sin barra con la que
  // volver atrás, que es como se quedaba atascada.
  const presentes = gruposDe(todos);
  if (FD.grupo && !presentes.includes(FD.grupo)) FD.grupo = "";
  const grupo = FD.grupo;
  const filas = grupo ? todos.filter(r => grupoDe(r.posicion) === grupo) : todos;

  // Un bloque = un split. Se promedia entre los jugadores que lo hicieron.
  const bloques = [...new Set(filas.map(r => r.split))].map(nombre => {
    const suyas = filas.filter(r => r.split === nombre);
    const min = suyas.reduce((t, r) => t + r.minutos, 0) / suyas.length;
    return { nombre, min, jugadores:suyas.length, vals: porMinuto(suyas) };
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

  // Filas de referencia: esta sesión completa y el MD típico del histórico.
  const completas = sesion();
  const fila = (titulo, sub, filasRef) => {
    const v = porMinuto(filasRef);
    const min = filasRef.reduce((t, r) => t + r.minutos, 0) / filasRef.length;
    return `<tr class="media">
      <td><div class="nomb">${esc(titulo)}</div>
        <div class="dur"><span>${esc(sub)}</span></div></td>
      <td class="n">${nf(min, 1)}</td>
      ${METRICAS_DRILL.map(m => `<td class="n">${nf(v[m.id], m.dec)}</td>`).join("")}
    </tr>`;
  };

  // Qué es lo normal en ese día de microciclo, según el histórico.
  const md = completas.length ? completas[0].md : null;
  const tipico = tipicoMD(md, F.fecha);
  const hoy = completas.length ? porMinuto(completas) : null;
  const minHoy = completas.length
    ? completas.reduce((t, r) => t + r.minutos, 0) / completas.length : 0;

  const pieSesion = `<tfoot>
    ${completas.length ? fila("Sesión completa",
      nf(minHoy, 1) + " min · " + completas.length + " jug.", completas) : ""}
    ${tipico ? `<tr class="media tipico">
      <td><div class="nomb">${esc(etiquetaMD(md) || "Sin MD")} típico</div>
        <div class="dur"><span>mediana de ${tipico.n} sesiones anteriores</span></div></td>
      <td class="n">${nf(tipico.min, 1)}</td>
      ${METRICAS_DRILL.map(m => `<td class="n">${nf(tipico.vals[m.id], m.dec)}</td>`).join("")}
    </tr>
    <tr class="media dif">
      <td><div class="nomb">Hoy sobre lo típico</div></td>
      <td class="n">${tipico.min ? nf(minHoy / tipico.min * 100, 0) + "%" : "–"}</td>
      ${METRICAS_DRILL.map(m => {
        const t = tipico.vals[m.id];
        if (!t) return `<td class="n">–</td>`;
        const p = hoy[m.id] / t * 100;
        return `<td class="n" style="${tintePct(p)}">${nf(p, 0)}%</td>`;
      }).join("")}
    </tr>` : ""}
  </tfoot>`;

  return `${barrasTareas(bloques, grupo, todos)}
  <section class="panel">
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
      ${pieSesion}
    </table></div>
  </section>`;
}

function vistaDrill() {
  cabecera();
  $("#notas").innerHTML = "";
  $("#selectores").innerHTML = "";
  $("#paneles").innerHTML = ""; $("#cuadrante").innerHTML = "";
  $("#tabla").innerHTML = drillAnalysis();
  document.querySelectorAll(".drills .orden").forEach(th => th.onclick = () => {
    const c = th.dataset.c;
    FD.orden = { col:c, asc: FD.orden.col === c ? !FD.orden.asc : false };
    pintar();
  });
  document.querySelectorAll("#tabla .segR").forEach(sg => sg.querySelectorAll("button").forEach(b => {
    b.onclick = () => { FD[sg.dataset.g] = b.dataset.v; recordar(); pintar(); };
  }));
}

/* ---------- balón en juego ---------- */
let BIP = [];                 // fases guardadas, una por secuencia
let AVISO_BIP = "";           // lo que el Apps Script cuenta si el enlace falla
const DURACION_PARTE = {};    // "partido|parte" -> segundos reales de esa parte
const FD = { orden:{ col:"min", asc:false },        // orden de la tabla de bloques
             ordenJug:{ col:"", asc:false },        // orden de la tabla de jugadores
             met:HMLD, grupo:"" };                  // gráfico de tareas contra partido
const FB = { partido:"", vista:"panel", sesionGps:"", metrica:"Distance (metres)",
             parte:"all", sel:"", temp:"" };   // panel de temporada
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
  // El corte de abajo es exclusivo (31-60 es "más de 30 hasta 60"): con >= lo
  // una fase de 30,4 s se quedaba fuera de los dos tramos.
  const cuentas = tramos.map(([lo, hi]) => fases.filter(f => valor(f) > lo - 1 && valor(f) <= hi).length);
  const tope = Math.max(...cuentas, 1), suma = cuentas.reduce((t, v) => t + v, 0) || 1;
  return `<div class="franjas">${cuentas.map((n, i) => `<div class="franja">
    <span class="n">${etiquetas[i]}</span>
    <span class="b"><i style="width:${(n / tope * 100).toFixed(0)}%;background:${color}"></i></span>
    <span class="v">${n}<em>${Math.round(n / suma * 100)}%</em></span>
  </div>`).join("")}</div>`;
}

/* ---------- reporte de un partido ---------- */
/** El export nombra las partes en inglés; aquí se leen en castellano. */
const PARTES_ES = { "firsthalf":"1ª parte", "secondhalf":"2ª parte",
  "firsthalf1":"1ª parte", "secondhalf2":"2ª parte", "extratime":"Prórroga" };
const nombreParte = p => PARTES_ES[clave(p)] || p;

const RAMPA_DUR = ["#2F615C", "#5E8D71", "#8E9448", "#B4782A", "#B4602A", "#A8323F"];
const RAMPA_RUCK = ["#2F615C", "#6E9A9B", "#B4782A", "#B4602A", "#A8323F"];

/** Una fila de cuentas y otra de porcentajes, como la tabla de tu Excel. */
function tablaTramos(fases, tramos, valor, etiquetas, rampa) {
  const n = fases.length || 1;
  const cuentas = tramos.map(([lo, hi]) => fases.filter(f => valor(f) > lo - 1 && valor(f) <= hi).length);
  return `<div class="scroll"><table class="tramos">
    <thead><tr>${etiquetas.map((e, i) =>
      `<th style="background:${rampa[i]}">${esc(e)}</th>`).join("")}</tr></thead>
    <tbody>
      <tr>${cuentas.map(c => `<td class="cnt">${c}</td>`).join("")}</tr>
      <tr>${cuentas.map((c, i) => `<td class="pct" style="background:${rampa[i]}1F;color:${rampa[i]}">${
        nf(c / n * 100, 2)}%</td>`).join("")}</tr>
    </tbody></table></div>`;
}

/** Dos barras, una por parte. Pequeñas, para la columna de la derecha. */
function barrasParte(etiquetas, valores, fmt) {
  const W = 300, H = 120, B = 26, T = 18, ih = H - T - B;
  const mx = Math.max(...valores, 1) * 1.2;
  const paso = W / etiquetas.length;
  let s = `<svg class="cols" width="100%" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">`;
  s += `<line x1="0" y1="${T + ih}" x2="${W}" y2="${T + ih}" stroke="#DCE1DF"/>`;
  etiquetas.forEach((e, i) => {
    const h = valores[i] / mx * ih, x = paso * i + paso * .25, bw = paso * .5;
    s += `<rect x="${x.toFixed(1)}" y="${(T + ih - h).toFixed(1)}" width="${bw.toFixed(1)}"
            height="${Math.max(h, 1).toFixed(1)}" rx="4" fill="${i ? "#2F615C" : "#9FBEBB"}"/>`;
    s += `<text x="${(x + bw / 2).toFixed(1)}" y="${(T + ih - h - 6).toFixed(1)}" font-size="12"
            font-weight="700" text-anchor="middle">${esc(fmt(valores[i]))}</text>`;
    s += `<text x="${(x + bw / 2).toFixed(1)}" y="${T + ih + 16}" font-size="10.5" fill="#5C6462"
            text-anchor="middle">${esc(e)}</text>`;
  });
  return s + `</svg>`;
}

/** El reparto entre balón en juego y balón parado. */
function donutBip(pct) {
  const R = 46, C = 2 * Math.PI * R, W = 300, H = 150;
  const on = C * Math.min(Math.max(pct, 0), 100) / 100;
  return `<svg class="cols" width="100%" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">
    <g transform="translate(${W / 2} ${H / 2})">
      <circle r="${R}" fill="none" stroke="#DCE1DF" stroke-width="22"/>
      <circle r="${R}" fill="none" stroke="#2F615C" stroke-width="22"
        stroke-dasharray="${on.toFixed(1)} ${(C - on).toFixed(1)}" transform="rotate(-90)"/>
      <text y="-2" font-size="21" font-weight="700" text-anchor="middle">${nf(pct, 1)}%</text>
      <text y="15" font-size="10.5" fill="#5C6462" text-anchor="middle">en juego</text>
    </g>
    <text x="8" y="${H - 6}" font-size="10.5" fill="#5C6462">Parado ${nf(100 - pct, 1)}%</text>
  </svg>`;
}

function reporteBip(fases) {
  const r = resumirBip(fases);
  const partes = [...new Set(fases.map(f => f.parte))];
  const porParte = partes.map(p => resumirBip(fases.filter(f => f.parte === p)));
  // El reloj de verdad sale de las filas "task" del export. Si no están, se
  // estima sumando cada fase con su balón muerto.
  const reloj = partes.reduce((t, p) => t + (DURACION_PARTE[fases[0].partido + "|" + p] || 0), 0)
    || fases.reduce((t, f) => t + f.duracion + (f.post || 0), 0);
  const pct = reloj ? r.total / reloj * 100 : 0;
  const largas = fases.filter(f => f.duracion > 30);
  const rl = resumirBip(largas);
  const porParteL = partes.map(p => resumirBip(largas.filter(f => f.parte === p)));
  const maxRucks = Math.max(...fases.map(f => f.rucks), 0);

  const fila = (tit, res, porP, cuantas) => `<tr>
    <td class="nm">${esc(tit)}${cuantas != null ? ` <i>(${cuantas})</i>` : ""}</td>
    <td class="n">${mmss(res.media)}</td>
    ${porP.map(p => `<td class="n">${p.n ? mmss(p.media) : "–"}</td>`).join("")}
    <td class="n">${mmss(res.mediaDescanso)}</td>
    <td class="n fuerte">1 : ${nf(res.media ? res.mediaDescanso / res.media : 0, 2)}</td></tr>`;

  return `
  <div class="repBip">
    <div class="repCol">
      <section class="blq">
        <h4 class="cab1">Análisis de balón en juego</h4>
        <div class="cifras">
          <div><span>Fases</span><b>${r.n}</b></div>
          ${porParte.map((p, i) => `<div><span>${esc(nombreParte(partes[i]))}</span><b>${mmss(p.total)}</b></div>`).join("")}
          <div class="dest"><span>Total BiP</span><b>${mmss(r.total)}</b></div>
          <div><span>Tiempo de reloj</span><b>${mmss(reloj)}</b></div>
          <div class="dest"><span>% BiP</span><b>${nf(pct, 1)}%</b></div>
        </div>
        <div class="scroll"><table class="datos bip">
          <thead><tr><th></th><th class="n">Media</th>
            ${partes.map(p => `<th class="n">${esc(nombreParte(p))}</th>`).join("")}
            <th class="n">Descanso</th><th class="n">W:R</th></tr></thead>
          <tbody>
            ${fila("Todas las secuencias", r, porParte)}
            ${fila("Secuencias de más de 30 s", rl, porParteL, largas.length)}
          </tbody>
        </table></div>
      </section>

      <section class="blq">
        <h4 class="cab2">Duración y distribución de las fases</h4>
        ${tablaTramos(fases, TRAMOS, f => f.duracion,
          ["0-30 s", "31-60 s", "61-90 s", "91-120 s", "121-180 s", "> 180 s"], RAMPA_DUR)}
      </section>

      <section class="blq">
        <h4 class="cab2">Rucks</h4>
        <div class="cifras">
          <div><span>Total</span><b>${r.rucks}</b></div>
          ${porParte.map((p, i) => `<div><span>${esc(nombreParte(partes[i]))}</span><b>${p.rucks}</b></div>`).join("")}
          <div class="dest"><span>Por fase</span><b>${nf(r.n ? r.rucks / r.n : 0, 2)}</b></div>
          <div><span>Por minuto de BiP</span><b>${nf(r.total ? r.rucks / (r.total / 60) : 0, 2)}</b></div>
        </div>
        ${tablaTramos(fases, TRAMOS_RUCK, f => f.rucks,
          ["0-3", "4-6", "7-9", "10-12", "13-15"], RAMPA_RUCK)}
      </section>

      <section class="blq">
        <h4 class="cab3">Fase pico</h4>
        <div class="cifras">
          <div class="dest"><span>Fase más larga</span><b>${mmss(r.max)}</b></div>
          <div><span>Fases de más de 90 s</span><b>${fases.filter(f => f.duracion > 90).length}</b></div>
          <div class="dest"><span>Máximo de rucks en una fase</span><b>${maxRucks}</b></div>
          <div><span>Fases de más de 7 rucks</span><b>${fases.filter(f => f.rucks > 7).length}</b></div>
        </div>
      </section>
    </div>

    <div class="repLat">
      <section class="panel"><h3>Balón en juego por parte</h3>
        ${barrasParte(partes.map(nombreParte), porParte.map(p => p.total), v => mmss(v))}</section>
      <section class="panel"><h3>En juego frente a parado</h3>
        ${donutBip(pct)}</section>
      <section class="panel"><h3>Duración media por parte</h3>
        ${barrasParte(partes.map(nombreParte), porParte.map(p => p.media), v => mmss(v))}</section>
      <section class="panel"><h3>Rucks por parte</h3>
        ${barrasParte(partes.map(nombreParte), porParte.map(p => p.rucks), v => nf(v, 0))}</section>
    </div>
  </div>

  <section class="panel ancho">
    <h3>Las ${fases.length} fases, en orden <span class="uni">la más larga en rojo</span></h3>
    <div class="secuencias">${fases.map((f, i) => {
      const c = f.duracion === r.max ? "wcs" : f.duracion >= 45 ? "larga" : f.duracion >= 25 ? "" : "corta";
      return `<div class="sec"><span class="id">${esc(f.nombre || "BIP " + (i + 1))}</span>
        <span class="barra"><i class="${c}" style="width:${(f.duracion / r.max * 100).toFixed(1)}%"></i></span>
        <span class="seg">${nf(f.duracion, 1)}</span></div>`;
    }).join("")}</div>
  </section>`;
}
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
        <p class="sub" style="margin:0">Si en los partidos con más balón en juego además se corre más fuerte,
          o si solo se corre más rato. Barras: % de balón en juego. Línea: la métrica por cada minuto de
          juego real, no por minuto de reloj.</p></div>
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

/* ---------- panel de temporada de balón en juego ---------- */
/**
 * El mismo panel que teníamos suelto para DHb, pero calculado desde los CSV
 * que subes aquí. Cinco preguntas: cuánto se juega, de qué tipo es el partido,
 * cómo se reparten las fases, cuál es el peor caso y cómo fue la secuencia.
 * Los chips de arriba aíslan un partido concreto en los cinco a la vez.
 */
const PARTE_BIP = [["all", "Partido"], ["h1", "1ª parte"], ["h2", "2ª parte"]];

function parteDe(f) {
  return /\b2|seg|second/i.test(String(f.parte || "")) ? 2 : 1;
}

/** El tramo de ventanaSeg segundos de reloj con más balón en juego dentro. */
function picoBip(fases, ventanaSeg) {
  if (!fases.length) return 0;
  const ord = fases.slice().sort((a, b) => (a.inicio || 0) - (b.inicio || 0));
  let mejor = 0;
  for (const f0 of ord) {
    const ini = f0.inicio || 0, fin = ini + ventanaSeg * 1000;
    let suma = 0;
    for (const f of ord) {
      const a = f.inicio || 0, b = a + f.duracion * 1000;
      const sol = Math.min(b, fin) - Math.max(a, ini);
      if (sol > 0) suma += sol / 1000;
    }
    if (suma > mejor) mejor = suma;
  }
  return mejor;
}

function agregaBip(fases) {
  if (!fases.length) return null;
  const dur = fases.map(f => f.duracion);
  const bip = dur.reduce((a, b) => a + b, 0);
  // Si el export trae la fila "task" de esa parte, su duración es el reloj de
  // verdad. Si no, se estima de la primera a la última fase, que se queda corto.
  const partes = [...new Set(fases.map(f => f.partido + "|" + f.parte))];
  const reloj = partes.reduce((t, k) => t + (DURACION_PARTE[k] || 0), 0);
  const ini = Math.min(...fases.map(f => f.inicio || 0));
  const fin = Math.max(...fases.map(f => (f.inicio || 0) + f.duracion * 1000));
  const raw = reloj || (fin - ini) / 1000 || bip;
  const post = fases.map(f => f.post).filter(v => v > 0);
  const rest = post.length ? post.reduce((a, b) => a + b, 0) / post.length : 0;
  const media = bip / fases.length;
  // La media de todas las fases la hunden los saques y las melés. La de las
  // que pasan de 30 s describe las que de verdad fatigan, que es la que
  // mirabas en el Excel como "Avg BiP (>30 s)".
  const largas = dur.filter(d => d > 30);
  const m30 = largas.length ? largas.reduce((a, b) => a + b, 0) / largas.length : 0;
  return {
    bip, raw, pct: raw ? bip / raw : 0, n: fases.length, media, rest, m30, n30: largas.length,
    wr: media ? rest / media : 0, mx: Math.max(...dur), p5: picoBip(fases, 300),
    dist: TRAMOS.map(([lo, hi]) => dur.filter(d => d > lo - 1 && d <= hi).length),
    rk: fases.reduce((t, f) => t + (f.rucks || 0), 0),
    mxrk: Math.max(...fases.map(f => f.rucks || 0))
  };
}

/**
 * La temporada de una fecha. Arranca en julio salvo que lo cambies en config
 * con mesInicioTemporada. Hace falta para que la evolución no mezcle los
 * partidos del año pasado con los de este.
 */
function temporadaDe(f) {
  const m0 = (C.mesInicioTemporada || 7) - 1;
  const a = f.getMonth() >= m0 ? f.getFullYear() : f.getFullYear() - 1;
  return String(a % 100).padStart(2, "0") + "/" + String((a + 1) % 100).padStart(2, "0");
}

/** Los partidos cargados, en orden, con sus dos partes y sus fases. */
function datosBip() {
  const nombres = [...new Set(BIP.map(f => f.partido))];
  const filas = nombres.map(nom => {
    const fases = BIP.filter(f => f.partido === nom && f.duracion > 0)
                     .sort((a, b) => (a.inicio || 0) - (b.inicio || 0));
    if (!fases.length) return null;
    const h1f = fases.filter(f => parteDe(f) === 1), h2f = fases.filter(f => parteDe(f) === 2);
    const h1 = agregaBip(h1f), h2 = agregaBip(h2f);
    // El partido entero no es la suma de todo seguido: el pico de 5 minutos y
    // la fase más larga son el peor de los dos tiempos, no la media.
    const todo = agregaBip(fases);
    if (h1 && h2) {
      todo.raw = h1.raw + h2.raw;
      todo.pct = todo.raw ? todo.bip / todo.raw : 0;
      todo.p5 = Math.max(h1.p5, h2.p5);
      // Las medias del partido son la media de las dos partes, no el montón
      // entero junto: es como lo calcula tu Excel y así los números coinciden.
      todo.wr = (h1.wr + h2.wr) / 2;
      todo.media = (h1.media + h2.media) / 2;
      todo.m30 = (h1.m30 + h2.m30) / 2;
      todo.rest = (h1.rest + h2.rest) / 2;
    }
    return { id:nom, nom, fecha:fases[0].fecha, temp:temporadaDe(fases[0].fecha),
             all:todo, h1:h1 || todo, h2:h2 || todo,
             fases:fases.map(f => [parteDe(f), f.duracion, f.rucks || 0]) };
  }).filter(Boolean);
  filas.sort((a, b) => a.fecha - b.fecha);
  filas.forEach(r => { r.corto = rivalDe(r.nom); });
  // Si el rival se repite (ida y vuelta), se le añade la fecha para distinguirlos.
  const cuenta = {};
  filas.forEach(r => { cuenta[r.corto] = (cuenta[r.corto] || 0) + 1; });
  filas.forEach(r => {
    if (cuenta[r.corto] > 1)
      r.corto += " " + r.fecha.toLocaleDateString("es-ES", { day:"2-digit", month:"2-digit" });
  });
  return filas;
}

/** "DHB 1 vs Ponent" se queda en "Ponent": en los ejes cabe y se entiende. */
function rivalDe(nom) {
  const partes = String(nom).split(/\s+(?:vs\.?|v\.?|contra|@)\s+/i);
  return (partes.length > 1 ? partes[partes.length - 1] : nom).trim() || String(nom);
}
const etPartido = r => r.corto;
const Sb = r => r[FB.parte] || r.all;

function panelBip() {
  const TODO = datosBip();
  if (!TODO.length) return `<p class="empty">Los CSV cargados no traen fases de balón en juego.</p>`;
  const temps = [...new Set(TODO.map(r => r.temp))].sort().reverse();
  if (temps.length > 1 && !temps.includes(FB.temp) && FB.temp !== "todas") FB.temp = temps[0];
  const D = (temps.length > 1 && FB.temp !== "todas") ? TODO.filter(r => r.temp === FB.temp) : TODO;
  if (!D.length) return `<p class="empty">No hay partidos en esa temporada.</p>`;
  if (FB.sel && !D.some(r => r.id === FB.sel)) FB.sel = "";
  const sel = D.find(r => r.id === FB.sel) || null;

  return `
  <section class="barraRef noPdf"><div class="filaRef">
    ${temps.length > 1 ? `<div class="campoR"><label>Temporada</label>
      <div class="segR" data-g="temp">${temps.map(t =>
        `<button data-v="${esc(t)}" class="${FB.temp === t ? "on" : ""}">${esc(t)}</button>`).join("")}
        <button data-v="todas" class="${FB.temp === "todas" ? "on" : ""}">Todas</button></div></div>` : ""}
    <div class="campoR"><label>Parte del partido</label>
      <div class="segR" data-g="parte">${PARTE_BIP.map(([v, t]) =>
        `<button data-v="${v}" class="${FB.parte === v ? "on" : ""}">${t}</button>`).join("")}</div></div>
    <div class="campoR"><label>Aislar un partido</label>
      <div class="chipsP">${D.map(r =>
        `<button class="chipP${FB.sel === r.id ? " on" : ""}" data-p="${esc(r.id)}"
          title="${esc(r.nom)} · ${esc(fechaLarga(r.fecha))}">${esc(r.corto)}</button>`).join("")}</div></div>
    ${sel ? `<div class="campoR"><label>De ${esc(sel.corto)}</label>
      <div style="display:flex;gap:7px">
        <button class="bot irBip" data-ir="partido">Reporte del partido</button>
        <button class="bot irBip" data-ir="cruce">Cruce con GPS</button>
      </div></div>` : ""}
  </div></section>
  ${kpisBip(D, sel)}
  <div class="dosBip">
    ${evolucionPanelBip(D, sel)}
    ${cuadranteBip(D, sel)}
    ${partesPanelBip(D, sel)}
    ${rucksPanelBip(D, sel)}
    ${distribucionBip(D, sel)}
    ${peorCasoBip(D, sel)}
  </div>
  ${secuenciasBip(D, sel)}
  <p class="notaEv">BiP: suma de las fases marcadas. W:R: descanso medio tras cada fase dividido por la
    duración media de fase. Pico de 5 min: la ventana de cinco minutos seguidos dentro de una parte con
    más balón en juego dentro.</p>`;
}

function kpisBip(D, sel) {
  const media = f => D.reduce((t, r) => t + f(r), 0) / D.length;
  const defs = [
    ["Balón en juego", r => Sb(r).bip, v => mmss(v)],
    ["% de balón en juego", r => Sb(r).pct, v => nf(v * 100, 1) + "%"],
    ["Duración media de fase", r => Sb(r).media, v => nf(v, 0) + " s"],
    ["Fase más larga", r => Sb(r).mx, v => mmss(v)]
  ];
  const extra = {
    "Duración media de fase": r => `${nf(Sb(r).m30, 0)} s contando solo las de más de 30 s`,
    "Balón en juego": r => `ratio juego:parada 1:${nf(Sb(r).rest / (Sb(r).media || 1), 2)}`
  };
  return `<div class="celdas cuatro">${defs.map(([lbl, f, fmt]) => {
    const m = media(f);
    if (sel) {
      const d = f(sel) - m;
      return `<div class="c dest"><span>${esc(lbl)} · ${esc(sel.corto)}</span><b>${fmt(f(sel))}</b>
        <span><em class="${d >= 0 ? "sube" : "baja"}">${d >= 0 ? "▲" : "▼"} ${
          lbl.startsWith("%") ? nf(Math.abs(d) * 100, 1) + " pts" : fmt(Math.abs(d))
        }</em> frente a la media (${fmt(m)})</span>${
          extra[lbl] ? `<span>${esc(extra[lbl](sel))}</span>` : ""}</div>`;
    }
    const hi = D.reduce((p, r) => f(r) > f(p) ? r : p), lo = D.reduce((p, r) => f(r) < f(p) ? r : p);
    const med30 = D.reduce((t, r) => t + Sb(r).m30, 0) / D.length;
    const medWR = D.reduce((t, r) => t + Sb(r).rest / (Sb(r).media || 1), 0) / D.length;
    const pie = lbl === "Duración media de fase" ? `${nf(med30, 0)} s contando solo las de más de 30 s`
              : lbl === "Balón en juego" ? `ratio juego:parada 1:${nf(medWR, 2)}` : "";
    return `<div class="c"><span>${esc(lbl)} · media</span><b>${fmt(m)}</b>
      <span>de ${fmt(f(lo))} (${esc(lo.corto)}) a ${fmt(f(hi))} (${esc(hi.corto)})</span>
      ${pie ? `<span>${esc(pie)}</span>` : ""}</div>`;
  }).join("")}</div>`;
}

function evolucionPanelBip(D, sel) {
  const W = 580, H = 290, L = 52, R = 12, T = 28, B = 34, ih = H - T - B;
  const vals = D.map(r => Sb(r).bip / 60);
  const top = Math.max(...vals) * 1.18 || 1;
  const paso = pasoEje(top, 5);
  const y = v => T + ih - v / top * ih;
  const gw = (W - L - R) / D.length, bw = Math.min(64, gw * .5);
  let s = `<svg class="cols" width="100%" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">`;
  for (let v = 0; v <= top; v += paso) {
    s += `<line x1="${L}" x2="${W - R}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}" stroke="#EDF0EF"/>`;
    s += `<text x="${L - 8}" y="${(y(v) + 4).toFixed(1)}" font-size="10" fill="#8A9290" text-anchor="end">${nf(v, 0)}'</text>`;
  }
  const med = vals.reduce((a, b) => a + b, 0) / vals.length;
  s += `<line x1="${L}" x2="${W - R}" y1="${y(med).toFixed(1)}" y2="${y(med).toFixed(1)}"
          stroke="#8A9290" stroke-width="1.4" stroke-dasharray="6 4"/>`;
  D.forEach((r, i) => {
    const cx = L + i * gw + gw / 2, v = vals[i], op = sel && sel.id !== r.id ? .32 : 1;
    s += `<g opacity="${op}"><rect x="${(cx - bw / 2).toFixed(1)}" y="${y(v).toFixed(1)}" width="${bw.toFixed(1)}"
            height="${(y(0) - y(v)).toFixed(1)}" rx="5" fill="${sel && sel.id === r.id ? "#A8323F" : "#1F5E5C"}"/>
          <text x="${cx.toFixed(1)}" y="${(y(v) - 7).toFixed(1)}" font-size="13" font-weight="700"
            text-anchor="middle" paint-order="stroke" stroke="#FFFFFF" stroke-width="3.5">${mmss(Sb(r).bip)}</text>`;
    if (y(0) - y(v) > 40)
      s += `<text x="${cx.toFixed(1)}" y="${(y(v) + 20).toFixed(1)}" font-size="12" font-weight="700"
              fill="#FFFFFF" text-anchor="middle">${nf(Sb(r).pct * 100, 1)}%</text>`;
    s += `<text x="${cx.toFixed(1)}" y="${H - 8}" font-size="11" font-weight="600" text-anchor="middle">${esc(r.corto)}</text></g>`;
  });
  s += `</svg>`;
  const hi = D.reduce((p, r) => Sb(r).bip > Sb(p).bip ? r : p), lo = D.reduce((p, r) => Sb(r).bip < Sb(p).bip ? r : p);
  return `<section class="panel"><h3>Evolución del balón en juego <span class="uni">minutos y % del tiempo</span></h3>
    <p class="sub">La línea de puntos es la media de los partidos cargados.</p>${s}
    <div class="leyenda"><span>Más juego: ${esc(etPartido(hi))} (${mmss(Sb(hi).bip)}, ${nf(Sb(hi).pct * 100, 1)}%)</span>
      <span>Menos: ${esc(etPartido(lo))} (${mmss(Sb(lo).bip)}, ${nf(Sb(lo).pct * 100, 1)}%)</span></div></section>`;
}

/**
 * El partido tiene cuatro formas posibles según cuántas fases hubo y cuánto
 * duraron, y cada una pide preparar una cosa distinta. Mismo lenguaje que el
 * cuadrante de los GPS: las zonas dentro, la explicación debajo.
 */
/**
 * Los cuatro perfiles de partido. Los colores son de categoría, no de
 * semáforo: ninguna esquina es mejor que otra, solo pide cosas distintas.
 * Los cuatro estados del partido. Los nombres se pueden cambiar desde
 * config.js con zonasBip, que es lenguaje de cuerpo técnico y cada club
 * tiene el suyo.
 */
const ZONAS_BASE = [
  { k:"mucho",   tit:"LONG BURN",           emo:"🪨", col:"#2F615C", tin:"#E8F2F0",
    que:"Muchas fases y largas." },
  { k:"continuo",tit:"SLOW BURN",           emo:"🌊", col:"#454C92", tin:"#EDEEF9",
    que:"Pocas fases pero largas." },
  { k:"cortado", tit:"PLAY FAST, FOR LONG", emo:"⚡", col:"#9A6B12", tin:"#FBF6EA",
    que:"Muchas fases y cortas." },
  { k:"poco",    tit:"FAST BURN",           emo:"💨", col:"#6E6459", tin:"#F2F0EB",
    que:"Pocas fases y cortas." }
];
const ZONAS_BIP = ZONAS_BASE.map(z => Object.assign({}, z, (C.zonasBip || {})[z.k] || {}));

function cuadranteBip(D, sel) {
  const W = 580, H = 320, L = 58, R = 16, T = 14, B = 50, iw = W - L - R, ih = H - T - B;
  const xs = D.map(r => Sb(r).n), ys = D.map(r => Sb(r).media);
  const ax = xs.reduce((a, b) => a + b, 0) / xs.length, ay = ys.reduce((a, b) => a + b, 0) / ys.length;
  // Márgenes simétricos respecto a la media: así los cuatro cuadrantes miden
  // lo mismo y la posición de un punto se lee sin trampa.
  const dx = Math.max(...xs.map(v => Math.abs(v - ax)), 3) * 1.35;
  const dy = Math.max(...ys.map(v => Math.abs(v - ay)), 2) * 1.35;
  const X = v => L + (v - (ax - dx)) / (2 * dx) * iw;
  const Y = v => T + ih - (v - (ay - dy)) / (2 * dy) * ih;
  const cx = X(ax), cy = Y(ay);

  let s = `<svg class="cols" width="100%" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">`;
  const marcos = [
    [ZONAS_BIP[0], cx, T, L + iw - cx, cy - T, "der", "arr"],
    [ZONAS_BIP[1], L, T, cx - L, cy - T, "izq", "arr"],
    [ZONAS_BIP[2], cx, cy, L + iw - cx, T + ih - cy, "der", "aba"],
    [ZONAS_BIP[3], L, cy, cx - L, T + ih - cy, "izq", "aba"]
  ];
  marcos.forEach(([z, qx, qy, qw, qh]) =>
    s += `<rect x="${qx.toFixed(1)}" y="${qy.toFixed(1)}" width="${qw.toFixed(1)}" height="${qh.toFixed(1)}" fill="${z.tin}"/>`);

  const pasoY = pasoEje(2 * dy, 4);
  for (let v = Math.ceil((ay - dy) / pasoY) * pasoY; v <= ay + dy; v += pasoY) {
    s += `<line x1="${L}" x2="${W - R}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}" stroke="#E6EAE9"/>`;
    s += `<text x="${L - 8}" y="${(Y(v) + 4).toFixed(1)}" font-size="10" fill="#8A9290" text-anchor="end">${nf(v, 0)} s</text>`;
  }
  const pasoX = pasoEje(2 * dx, 4);
  for (let v = Math.ceil((ax - dx) / pasoX) * pasoX; v <= ax + dx; v += pasoX) {
    s += `<text x="${X(v).toFixed(1)}" y="${T + ih + 16}" font-size="10" fill="#8A9290" text-anchor="middle">${nf(v, 0)}</text>`;
  }
  s += `<line x1="${cx.toFixed(1)}" x2="${cx.toFixed(1)}" y1="${T}" y2="${T + ih}" stroke="#8A9290" stroke-dasharray="4 4"/>
        <line x1="${L}" x2="${W - R}" y1="${cy.toFixed(1)}" y2="${cy.toFixed(1)}" stroke="#8A9290" stroke-dasharray="4 4"/>
        <text x="${(L + iw / 2).toFixed(0)}" y="${H - 6}" font-size="10.5" fill="#8A9290" text-anchor="middle">Número de fases</text>
        <text x="${L}" y="${H - 6}" font-size="10.5" font-weight="600" fill="#3F4846">← pocas</text>
        <text x="${W - R}" y="${H - 6}" font-size="10.5" font-weight="600" fill="#3F4846" text-anchor="end">muchas →</text>
        <text transform="translate(15,${(T + ih * .26).toFixed(0)}) rotate(-90)" font-size="10.5"
          font-weight="600" fill="#3F4846" text-anchor="middle">LONG &amp; SLOW ↑</text>
        <text transform="translate(15,${(T + ih * .76).toFixed(0)}) rotate(-90)" font-size="10.5"
          font-weight="600" fill="#3F4846" text-anchor="middle">↓ SHORT &amp; SHARP</text>`;

  // Pastillas de esquina con el nombre de la zona.
  const puestas = [];
  marcos.forEach(([z, qx, qy, qw, qh, ax2, ay2]) => {
    const rot = `${z.emo} ${z.tit}`, an = rot.length * 5.5 + 16, al = 20;
    if (qw < an + 8 || qh < al + 10) return;
    const px0 = ax2 === "izq" ? qx + 5 : qx + qw - an - 5;
    const py0 = ay2 === "arr" ? qy + 5 : qy + qh - al - 5;
    puestas.push({ x:px0, y:py0, w:an, h:al });
    s += `<rect x="${px0.toFixed(1)}" y="${py0.toFixed(1)}" width="${an.toFixed(1)}" height="${al}" rx="10"
            fill="#FFFFFF" opacity=".94" stroke="#D4D8D6"/>
          <text x="${(px0 + an / 2).toFixed(1)}" y="${(py0 + 14).toFixed(1)}" fill="${z.col}" font-size="9.5"
            font-weight="700" text-anchor="middle" letter-spacing=".01em">${esc(rot)}</text>`;
  });

  // Los puntos, y los nombres colocados donde quepan.
  const pts = D.map(r => ({ r, x:X(Sb(r).n), y:Y(Sb(r).media) }));
  pts.forEach(p => puestas.push({ x:p.x - 7, y:p.y - 7, w:14, h:14 }));
  const pisa = c => puestas.some(o =>
    c.x < o.x + o.w && c.x + c.w > o.x && c.y < o.y + o.h && c.y + c.h > o.y);
  pts.forEach(p => {
    const on = sel && sel.id === p.r.id, op = sel && !on ? .32 : 1;
    s += `<g opacity="${op}"><circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${on ? 8 : 6}"
            fill="${on ? "#A8323F" : "#454C92"}" stroke="#FFFFFF" stroke-width="2"/>`;
    const txt = p.r.corto, an = txt.length * 6.2 + 4, al = 12;
    const sitios = [[11, 4, "start"], [-11 - an, 4, "start"], [-an / 2, -11, "start"], [-an / 2, 18, "start"]];
    let col = null;
    for (const [ox, oy, anc] of sitios) {
      const c = { x:p.x + ox, y:p.y + oy - al + 2, w:an, h:al };
      if (c.x > L && c.x + c.w < L + iw && c.y > T && c.y + c.h < T + ih && !pisa(c)) { col = [ox, oy, anc, c]; break; }
    }
    if (!col) col = [11, 4, "start", { x:p.x + 11, y:p.y - 8, w:an, h:al }];
    puestas.push(col[3]);
    s += `<text x="${(p.x + col[0]).toFixed(1)}" y="${(p.y + col[1]).toFixed(1)}" font-size="11.5" font-weight="700"
            text-anchor="${col[2]}" paint-order="stroke" stroke="#FFFFFF" stroke-width="3.5">${esc(txt)}</text></g>`;
  });
  s += `</svg>`;

  const cont = D.reduce((p, r) => Sb(r).media > Sb(p).media ? r : p);
  const cut = D.reduce((p, r) => Sb(r).n > Sb(p).n ? r : p);
  return `<section class="panel"><h3>Tipo de partido <span class="uni">fases y duración media</span></h3>
    <p class="sub">El cruce de las líneas es la media de los partidos cargados.</p>${s}
    <div class="leyCuad">${ZONAS_BIP.map(z => `<div style="border-top:2px solid ${z.col}">
      <b style="color:${z.col}">${z.emo} ${esc(z.tit)}</b>
      <span>${esc(z.que)}</span></div>`).join("")}</div>
    <div class="leyenda"><span>El más largo de secuencia: ${esc(etPartido(cont))} (${nf(Sb(cont).media, 0)} s de media)</span>
      <span>El de más fases: ${esc(etPartido(cut))} (${Sb(cut).n})</span></div></section>`;
}

function distribucionBip(D, sel) {
  const bk = TRAMOS.map(([lo, hi]) => hi > 1000 ? `>${lo - 1} s` : `${lo}-${hi} s`);
  const tono = p => p >= .3 ? "background:rgba(31,94,92,.20)" : p >= .1 ? "background:rgba(154,107,18,.16)" : "background:rgba(168,50,63,.10)";
  const fila = (nom, sub, dist, n, cls) => `<tr class="${cls || ""}">
    <td class="nm">${esc(nom)}${sub ? `<small>${esc(sub)}</small>` : ""}</td>
    ${dist.map(k => { const p = n ? k / n : 0;
      return `<td style="${tono(p)}"><b>${k}</b><span>${nf(p * 100, 0)}%</span></td>`; }).join("")}</tr>`;
  const tot = bk.map((_, i) => D.reduce((t, r) => t + Sb(r).dist[i], 0));
  const N = tot.reduce((a, b) => a + b, 0) || 1;
  return `<section class="panel"><h3>Distribución de secuencias <span class="uni">cuántas fases de cada duración</span></h3>
    <p class="sub">Y qué peso tiene cada tramo dentro del partido.</p>
    <div class="scroll"><table class="semBip"><thead><tr><th></th>${bk.map(b => `<th>${esc(b)}</th>`).join("")}</tr></thead>
      <tbody>${D.map(r => fila(etPartido(r), Sb(r).n + " fases", Sb(r).dist, Sb(r).n,
        sel ? (sel.id === r.id ? "sel" : "dim") : "")).join("")}
      ${fila("Todos los partidos", N + " fases", tot, N, "tot")}</tbody></table></div>
    <div class="leyenda"><span>${nf(tot[0] / N * 100, 0)}% de las fases duran 30 s o menos</span>
      <span>Fases de más de 90 s: ${tot.slice(3).reduce((a, b) => a + b, 0)}</span></div></section>`;
}

function peorCasoBip(D, sel) {
  const W = 580, H = 290, L = 56, R = 22, T = 26, B = 34, iw = W - L - R, ih = H - T - B;
  const A = D.map(r => Sb(r).p5), Bv = D.map(r => Sb(r).mx);
  const top = Math.max(...A, ...Bv) * 1.2 || 1;
  const X = i => L + (D.length === 1 ? iw / 2 : 20 + i * (iw - 40) / (D.length - 1));
  const Y = v => T + ih - v / top * ih;
  const paso = pasoEje(top, 4);
  let s = `<svg class="cols" width="100%" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">`;
  for (let v = 0; v <= top; v += paso) {
    s += `<line x1="${L}" x2="${W - R}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}" stroke="#EDF0EF"/>`;
    s += `<text x="${L - 8}" y="${(Y(v) + 4).toFixed(1)}" font-size="10" fill="#8A9290" text-anchor="end">${mmss(v)}</text>`;
  }
  D.forEach((r, i) => s += `<text x="${X(i).toFixed(1)}" y="${H - 8}" font-size="11" font-weight="600" text-anchor="middle">${esc(r.corto)}</text>`);
  [[A, "#A8323F", "", -11], [Bv, "#454C92", "6 5", 20]].forEach(([vals, col, da, off]) => {
    if (D.length > 1)
      s += `<polyline fill="none" stroke="${col}" stroke-width="2.6" stroke-dasharray="${da}"
              stroke-linejoin="round" points="${vals.map((d, i) => `${X(i).toFixed(1)},${Y(d).toFixed(1)}`).join(" ")}"/>`;
    vals.forEach((d, i) => {
      const op = sel && sel.id !== D[i].id ? .32 : 1;
      s += `<g opacity="${op}"><circle cx="${X(i).toFixed(1)}" cy="${Y(d).toFixed(1)}" r="5.5"
              fill="#FFFFFF" stroke="${col}" stroke-width="2.6"/>
            <text x="${X(i).toFixed(1)}" y="${(Y(d) + off).toFixed(1)}" font-size="11.5" font-weight="700"
              fill="${col}" text-anchor="middle" paint-order="stroke" stroke="#FFFFFF" stroke-width="3">${mmss(d)}</text></g>`;
    });
  });
  s += `</svg>`;
  const hp = D.reduce((p, r) => Sb(r).p5 > Sb(p).p5 ? r : p), hm = D.reduce((p, r) => Sb(r).mx > Sb(p).mx ? r : p);
  return `<section class="panel"><h3>Peor caso <span class="uni">el pico, no la media</span></h3>
    <p class="sub">Rojo: en los 5 minutos de reloj más duros, cuánto tiempo estuvo el balón en juego, sumando
      varias fases. Azul: la fase más larga sin parar.</p>${s}
    <div class="leyenda"><span><i class="sw" style="background:#A8323F"></i>Juego en los 5 min más duros</span>
      <span><i class="sw" style="background:#454C92"></i>Fase más larga</span>
      <span>Lo exigente es ${mmss(Sb(hp).p5)} en 5 min (${esc(hp.corto)}) y ${mmss(Sb(hm).mx)} seguidos (${esc(hm.corto)})</span></div></section>`;
}

/**
 * El contacto por partido. Los rucks son la otra mitad de la carga del
 * partido y no salían por ningún lado en la temporada: la barra es el total
 * y el número de arriba, cuántos caen por minuto de balón en juego, que es
 * lo que de verdad compara partidos de duración distinta.
 */
function rucksPanelBip(D, sel) {
  const W = 580, H = 290, L = 52, R = 16, T = 34, B = 34, ih = H - T - B;
  const tot = D.map(r => Sb(r).rk), porMin = D.map(r => Sb(r).bip ? r.rk60 = Sb(r).rk / (Sb(r).bip / 60) : 0);
  const top = Math.max(...tot, 1) * 1.22;
  const paso = pasoEje(top, 5), y = v => T + ih - v / top * ih;
  const gw = (W - L - R) / D.length, bw = Math.min(64, gw * .5);
  let s = `<svg class="cols" width="100%" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">`;
  for (let v = 0; v <= top; v += paso) {
    s += `<line x1="${L}" x2="${W - R}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}" stroke="#EDF0EF"/>`;
    s += `<text x="${L - 8}" y="${(y(v) + 4).toFixed(1)}" font-size="10" fill="#8A9290" text-anchor="end">${nf(v, 0)}</text>`;
  }
  const med = tot.reduce((a, b) => a + b, 0) / tot.length;
  s += `<line x1="${L}" x2="${W - R}" y1="${y(med).toFixed(1)}" y2="${y(med).toFixed(1)}"
          stroke="#8A9290" stroke-width="1.4" stroke-dasharray="6 4"/>`;
  D.forEach((r, i) => {
    const cx = L + i * gw + gw / 2, v = tot[i], op = sel && sel.id !== r.id ? .32 : 1;
    s += `<g opacity="${op}"><rect x="${(cx - bw / 2).toFixed(1)}" y="${y(v).toFixed(1)}" width="${bw.toFixed(1)}"
            height="${(y(0) - y(v)).toFixed(1)}" rx="5" fill="${sel && sel.id === r.id ? "#A8323F" : "#9C4B52"}"/>
          <text x="${cx.toFixed(1)}" y="${(y(v) - 20).toFixed(1)}" font-size="13" font-weight="700"
            text-anchor="middle" paint-order="stroke" stroke="#FFFFFF" stroke-width="3.5">${nf(v, 0)}</text>
          <text x="${cx.toFixed(1)}" y="${(y(v) - 7).toFixed(1)}" font-size="10.5" fill="#5C6462"
            text-anchor="middle" paint-order="stroke" stroke="#FFFFFF" stroke-width="3">${nf(porMin[i], 2)} / min</text>
          <text x="${cx.toFixed(1)}" y="${H - 8}" font-size="11" font-weight="600" text-anchor="middle">${esc(r.corto)}</text></g>`;
  });
  s += `</svg>`;
  const porFase = D.map(r => Sb(r).n ? Sb(r).rk / Sb(r).n : 0);
  const hi = D.reduce((p, r, i) => porMin[i] > porMin[D.indexOf(p)] ? r : p, D[0]);
  return `<section class="panel"><h3>Contacto <span class="uni">rucks por partido</span></h3>
    <p class="sub">La barra es el total. Debajo del número, cuántos rucks por minuto de balón en juego:
      eso es lo que compara partidos que han durado cosas distintas.</p>${s}
    <div class="leyenda">
      <span>Media de ${nf(porFase.reduce((a, b) => a + b, 0) / D.length, 2)} rucks por fase</span>
      <span>El de más densidad: ${esc(etPartido(hi))} (${nf(Math.max(...porMin), 2)} por minuto)</span></div></section>`;
}

/**
 * Si el balón en juego cae en la segunda parte, el partido se cierra o el
 * equipo se cae. Comparadas en la misma escala se ve de un vistazo.
 */
function partesPanelBip(D, sel) {
  const W = 580, H = 290, L = 52, R = 16, T = 30, B = 46, ih = H - T - B;
  const vals = D.flatMap(r => [r.h1.bip / 60, r.h2.bip / 60]);
  const top = Math.max(...vals, 1) * 1.2;
  const paso = pasoEje(top, 5), y = v => T + ih - v / top * ih;
  const gw = (W - L - R) / D.length, bw = Math.min(28, gw * .26);
  let s = `<svg class="cols" width="100%" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">`;
  for (let v = 0; v <= top; v += paso) {
    s += `<line x1="${L}" x2="${W - R}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}" stroke="#EDF0EF"/>`;
    s += `<text x="${L - 8}" y="${(y(v) + 4).toFixed(1)}" font-size="10" fill="#8A9290" text-anchor="end">${nf(v, 0)}'</text>`;
  }
  D.forEach((r, i) => {
    const cx = L + i * gw + gw / 2, op = sel && sel.id !== r.id ? .32 : 1;
    const v1 = r.h1.bip / 60, v2 = r.h2.bip / 60;
    const cae = v1 ? (v2 / v1 - 1) * 100 : 0;
    s += `<g opacity="${op}">`;
    [[v1, cx - bw - 3, "#9FBEBB"], [v2, cx + 3, "#2F615C"]].forEach(([v, x, col]) => {
      s += `<rect x="${x.toFixed(1)}" y="${y(v).toFixed(1)}" width="${bw}" height="${(y(0) - y(v)).toFixed(1)}"
              rx="4" fill="${col}"/>
            <text x="${(x + bw / 2).toFixed(1)}" y="${(y(v) - 6).toFixed(1)}" font-size="11" font-weight="700"
              text-anchor="middle">${mmss(v * 60)}</text>`;
    });
    s += `<text x="${cx.toFixed(1)}" y="${H - 22}" font-size="11" font-weight="600" text-anchor="middle">${esc(r.corto)}</text>
          <text x="${cx.toFixed(1)}" y="${H - 8}" font-size="10.5" font-weight="600" text-anchor="middle"
            fill="${Math.abs(cae) < 8 ? "#8A9290" : cae < 0 ? "#A8323F" : "#2F615C"}">${
            cae > 0 ? "+" : ""}${nf(cae, 0)}%</text></g>`;
  });
  s += `</svg>`;
  const caidas = D.map(r => r.h1.bip ? (r.h2.bip / r.h1.bip - 1) * 100 : 0);
  const media = caidas.reduce((a, b) => a + b, 0) / caidas.length;
  return `<section class="panel"><h3>Primera frente a segunda parte <span class="uni">minutos de balón en juego</span></h3>
    <p class="sub">El porcentaje de debajo es cuánto cambia la segunda respecto a la primera. Se pinta
      en color solo cuando pasa del 8%, que por debajo de eso es ruido.</p>${s}
    <div class="leyenda">
      <span><i class="sw" style="background:#9FBEBB"></i>1ª parte</span>
      <span><i class="sw" style="background:#2F615C"></i>2ª parte</span>
      <span>De media, la segunda parte ${media < 0 ? "cae" : "sube"} un ${nf(Math.abs(media), 0)}%</span></div></section>`;
}

function secuenciasBip(D, sel) {
  const lista = sel ? [sel] : D;
  const col = d => d > 90 ? "#A8323F" : d > 60 ? "#1F5E5C" : d > 30 ? "#6E9A9B" : "#AEC6C3";
  const alto = sel ? 150 : 66, top = Math.max(...lista.flatMap(r => r.fases.map(f => f[1]))) * 1.1 || 1;
  const filas = lista.map(r => {
    const fases = FB.parte === "all" ? r.fases : r.fases.filter(f => f[0] === (FB.parte === "h1" ? 1 : 2));
    if (!fases.length) return "";
    const W = 1000, bw = W / fases.length;
    let s = `<svg class="cols" width="100%" viewBox="0 0 ${W} ${alto}" preserveAspectRatio="none">`;
    for (const v of [60, 120]) {
      if (v > top) continue;
      const y = alto - 2 - v / top * (alto - 8);
      s += `<line x1="0" x2="${W}" y1="${y.toFixed(1)}" y2="${y.toFixed(1)}" stroke="#EDF0EF"/>`;
    }
    const corte = fases.findIndex(f => f[0] === 2);
    fases.forEach((f, i) => {
      const h = f[1] / top * (alto - 8);
      s += `<rect x="${(i * bw + bw * .14).toFixed(2)}" y="${(alto - 2 - h).toFixed(1)}" width="${(bw * .72).toFixed(2)}"
              height="${h.toFixed(1)}" rx="1.5" fill="${col(f[1])}"><title>Fase ${i + 1} · ${
              f[0] === 1 ? "1ª" : "2ª"} parte · ${mmss(f[1])} · ${f[2]} rucks</title></rect>`;
    });
    if (corte > 0) s += `<line x1="${(corte * bw).toFixed(1)}" x2="${(corte * bw).toFixed(1)}" y1="0" y2="${alto}"
      stroke="#A8323F" stroke-dasharray="3 3"/>`;
    s += `</svg>`;
    return `<div class="sqBip"><div class="nq">${esc(etPartido(r))}
      <small>${fases.length} fases · máx ${mmss(Math.max(...fases.map(f => f[1])))}</small></div>
      <div class="gq">${s}</div></div>`;
  }).join("");
  return `<section class="panel ancho"><h3>Secuencias del partido <span class="uni">cada barra es una fase</span></h3>
    <p class="sub">${sel ? "Todas las fases de " + esc(etPartido(sel)) + " en orden; la altura es la duración."
      : "Todas las fases de cada partido en orden y en la misma escala. Pulsa un partido arriba para verlo en grande."}
      La línea roja marca el descanso.</p>
    <div class="leyenda"><span><i class="sw" style="background:#AEC6C3"></i>0-30 s</span>
      <span><i class="sw" style="background:#6E9A9B"></i>31-60 s</span>
      <span><i class="sw" style="background:#1F5E5C"></i>61-90 s</span>
      <span><i class="sw" style="background:#A8323F"></i>más de 90 s</span></div>
    <div class="seqsBip">${filas}</div></section>`;
}

function vistaBip() {
  $("#cab").innerHTML = "";
  $("#notas").innerHTML = "";
  $("#resumen").innerHTML = "";
  $("#selectores").innerHTML = "";
  $("#paneles").innerHTML = ""; $("#cuadrante").innerHTML = "";

  const partidos = [...new Set(BIP.map(f => f.partido))];
  if (!partidos.includes(FB.partido)) FB.partido = partidos[partidos.length - 1] || "";
  const fases = BIP.filter(f => f.partido === FB.partido).sort((a, b) => a.inicio - b.inicio);

  const sesiones = [...new Set(DATOS.filter(r => r.esPartido).map(r => idSesion(r)))];
  if (!sesiones.includes(FB.sesionGps)) FB.sesionGps = sesiones[0] || "";

  const barra = `<div class="row">
    <div class="conmuta">
      ${[["panel","Temporada","Todos los partidos cargados, con chips para aislar uno"],
          ["partido","Reporte del partido","Las fases de un partido al detalle, con sus tramos y sus rucks"],
          ["cruce","Cruce con GPS",`Qué hizo cada ${jug()} en los minutos en que el balón estuvo en juego`],
          ["evolucion","BiP vs intensidad","Si cuando se juega más también se corre más fuerte por minuto"],
          ["historico","Histórico","La tabla con todos los partidos, uno por fila"]]
        .map(([v, t, ay]) => `<button class="mini${FB.vista === v ? " on" : ""}" data-v="${v}" title="${esc(ay)}">${t}</button>`).join("")}
    </div>
    <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
      ${FB.vista === "cruce" ? `<select id="fSesionGps">${sesiones.map(id => {
        const r = DATOS.find(x => idSesion(x) === id);
        return `<option value="${esc(id)}"${id === FB.sesionGps ? " selected" : ""}>${esc(fechaLarga(r.fecha))} · ${esc(r.sesion)}</option>`;
      }).join("")}</select>` : ""}
      ${FB.vista !== "historico" && FB.vista !== "evolucion" && FB.vista !== "panel" && partidos.length ? `<select id="fPartidoBip">${partidos.map(p =>
        `<option${p === FB.partido ? " selected" : ""}>${esc(p)}</option>`).join("")}</select>` : ""}
      <button id="btnBip">Cargar CSV de BiP</button>
      <input type="file" id="inpBip" accept=".csv" hidden>
    </div>
  </div>`;

  const contenido = !BIP.length
    ? `<div class="empty"><p style="font-size:15px;color:var(--text-2)">Todavía no hay partidos de balón en juego.</p>
       ${AVISO_BIP
         ? `<div class="aviso espera" style="max-width:560px;margin:14px auto 0;text-align:left">
              <b>El enlace con tu hoja de BiP no está trayendo nada.</b><br>${esc(AVISO_BIP)}</div>`
         : `<p>Pulsa <b>Cargar CSV de BiP</b> y arrastra el export de tu herramienta.</p>`}</div>`
    : FB.vista === "panel" ? panelBip()
    : FB.vista === "historico" ? historicoBip()
    : FB.vista === "evolucion" ? evolucionBip()
    : FB.vista === "cruce" ? cruceBip(fases, FB.sesionGps)
    : reporteBip(fases);

  $("#tabla").innerHTML = `<div class="bip">${barra}
    ${BIP.length && FB.vista !== "historico" && FB.vista !== "panel" ? `<div class="cab"><h2>${esc(FB.partido)}</h2>
      <span class="meta">${esc(fechaLarga(fases[0].fecha))} · ${fases.length} fases</span></div>` : ""}
    ${contenido}<div id="salidaBip"></div></div>`;

  $("#btnBip").onclick = () => $("#inpBip").click();
  $("#inpBip").onchange = e => { if (e.target.files[0]) leerBip(e.target.files[0]); };
  const selP = $("#fPartidoBip"); if (selP) selP.onchange = e => { FB.partido = e.target.value; pintar(); };
  const selS = $("#fSesionGps"); if (selS) selS.onchange = e => { FB.sesionGps = e.target.value; pintar(); };
  document.querySelectorAll(".conmuta .mini").forEach(b => b.onclick = () => { FB.vista = b.dataset.v; pintar(); });
  document.querySelectorAll(".barraRef .segR[data-g=parte] button").forEach(b => b.onclick = () => {
    FB.parte = b.dataset.v; recordar(); pintar();
  });
  document.querySelectorAll(".barraRef .segR[data-g=temp] button").forEach(b => b.onclick = () => {
    FB.temp = b.dataset.v; FB.sel = ""; recordar(); pintar();
  });
  document.querySelectorAll(".chipP").forEach(b => b.onclick = () => {
    FB.sel = FB.sel === b.dataset.p ? "" : b.dataset.p;
    recordar(); pintar();
  });
  document.querySelectorAll(".irBip").forEach(b => b.onclick = () => {
    // Saltar al detalle llevándose el partido que estaba aislado.
    if (FB.sel) FB.partido = FB.sel;
    FB.vista = b.dataset.ir;
    recordar(); pintar();
  });
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
/**
 * Pasa las filas crudas a fases. Las de entity_type = task no son fases: son
 * la duración real de cada parte, y se guardan aparte porque con ellas el % de
 * balón en juego sale exacto en vez de estimado a ojo entre la primera y la
 * última fase.
 */
function normalizaBip(objetos, partido) {
  const salida = [];
  for (const o of objetos) {
    const m = {};
    for (const [k, v] of Object.entries(o)) m[clave(k)] = v;
    const tipo = "entitytype" in m ? String(m.entitytype).trim().toLowerCase() : "bip";
    const nomPartido = String(m.activityname || partido || "").trim() || partido;
    const parte = String(m.taskname || "").trim() || "Parte 1";

    if (tipo === "task") {
      const d = num(m.durationseconds);
      if (nomPartido && d > 0) DURACION_PARTE[nomPartido + "|" + parte] = d;
      continue;
    }
    if (tipo !== "bip") continue;
    if (!m.bipid && !m.bipname) continue;

    const inicio = num(m.starttimeunixms);
    salida.push({
      partido: nomPartido, parte,
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

let ULTIMO = null;   // resultado del último fichero leído

function vistaCargar() {
  // Esta pestaña no es la sesión: se limpia todo lo que dejó la anterior, que
  // si no el reporte entero se queda colgando encima del área de carga.
  $("#cab").innerHTML = "";
  $("#resumen").innerHTML = "";
  $("#cuadrante").innerHTML = "";
  $("#notas").innerHTML = "";
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
  </div>
  ${bloqueFotos()}`;

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
  eventosFotos();
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

/* Semáforo de cuatro paradas. Se usa la POSICIÓN del valor dentro de su columna,
   no la escala cruda: con un dato disparado (69 impactos frente a ceros) la
   escala lineal apelotona a todos los demás en el mismo tono. */
const PARADAS = [[106,170,150], [224,205,110], [230,150,86], [224,88,96]];
function semaforo(t) {
  t = Math.max(0, Math.min(1, t));
  const p = t * (PARADAS.length - 1), i = Math.min(PARADAS.length - 2, Math.floor(p)), f = p - i;
  return PARADAS[i].map((c, j) => Math.round(c + (PARADAS[i + 1][j] - c) * f)).join(",");
}
/** Posición relativa de cada valor dentro de una lista, con empates promediados. */
function posiciones(vals) {
  const orden = vals.slice().sort((a, b) => a - b), mapa = {};
  orden.forEach((v, i) => { if (!(v in mapa)) mapa[v] = [i, i]; else mapa[v][1] = i; });
  for (const v in mapa) { const [a, b] = mapa[v]; mapa[v] = (a + b) / 2 / Math.max(1, vals.length - 1); }
  return mapa;
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

  // Solo llevan degradado los dos ritmos por minuto. Ahí mucho es bueno, así
  // que la escala va al revés: verde arriba.
  const RITMO = [ACC3MIN, DEC3MIN];
  const tope = {}, orden = {};
  for (const c of planas) {
    const vals = filas.map(r => Math.abs(r.crudo[c] || 0));
    tope[c] = Math.max(...vals);
    if (RITMO.includes(c)) orden[c] = posiciones(vals);
  }
  // En impactos casi todo el mundo está a cero, así que un degradado fingiría
  // una escala que no existe: se marcan solo los tres que más recibieron.
  const golpeados = filas.filter(r => Math.abs(r.crudo["Impacts"] || 0) > 0)
    .sort((a, b) => Math.abs(b.crudo["Impacts"] || 0) - Math.abs(a.crudo["Impacts"] || 0))
    .slice(0, 3).map(r => r.jugador);
  const BANDAS_ALTAS = ["Impact Zones: 10 - 15 G (Impacts)", "Impact Zones: 15 - 20 G (Impacts)",
                        "Impact Zones: > 20 G (Impacts)"];
/**
 * Marcas personales batidas en esta sesión: se compara con TODAS las sesiones
 * anteriores de esa jugadora, no con el techo que usa el % de exposición, que
 * ya descarta picos. Aquí se enseñan los dos números para que se vea el salto
 * y se pueda descartar a ojo una lectura rara del chaleco.
 */
function recordsSesion(filas) {
  const hoy = filas[0].fechaMs;
  const MIRA = [
    { col:"Top Speed (m/s)",          ico:"⚡",  tit:"Nueva velocidad máxima",   uni:"m/s",  dec:2 },
    { col:"Max Acceleration (m/s/s)", ico:"🏎️", tit:"Nueva aceleración máxima", uni:"m/s²", dec:2 }
  ];
  const bloques = MIRA.map(m => {
    const suyos = [];
    for (const r of filas) {
      const v = Math.abs(r.crudo[m.col] || 0);
      if (!v) continue;
      const antes = DATOS.filter(x => x.jugador === r.jugador && x.fechaMs < hoy)
        .map(x => Math.abs(x.crudo[m.col] || 0)).filter(n => n > 0);
      // Sin un mínimo de historia cualquiera "bate su récord" el primer día.
      if (antes.length < Math.max(2, C.minSesionesTecho ?? 1)) continue;
      const mejor = Math.max(...antes);
      // Medio punto porcentual de margen: mejorar 8,96 a 8,97 es ruido del
      // chaleco, no una marca nueva.
      if (v > mejor * 1.005) suyos.push({ jugador:r.jugador, v, mejor });
    }
    if (!suyos.length) return "";
    suyos.sort((a, b) => b.v - a.v);
    return suyos.map(h => `<div class="med">
      <span class="ico">${m.ico}</span>
      ${rosco(100, 100)}
      <div class="txt">
        <s>${m.tit}</s>
        <b>${esc(h.jugador)}</b>
        <u>${nf(h.v, m.dec)} <i>${m.uni}</i></u>
        <em>último registro ${nf(h.mejor, m.dec)}
          <span class="sube">▲ ${nf((h.v / h.mejor - 1) * 100, 1)}%</span></em>
      </div>
    </div>`).join("");
  }).join("");
  return bloques ? `<div class="records">${bloques}</div>` : "";
}

  // El icono del mejor de la sesión, el mismo que en su tarjeta de podio.
  const ICONO = { "Top Speed (m/s)":"⚡", "Max Acceleration (m/s/s)":"🏎️" };

  let puestoPrevio = null;
  const cuerpo = jugadores.map(r => {
    const cambia = r.posicion !== puestoPrevio;
    puestoPrevio = r.posicion;
    return `<tr${cambia ? ' class="corte"' : ""}>
      <td>${esc(r.jugador)}</td><td class="pos">${esc(r.posicion)}</td>
      ${planas.map(c => {
        if (!(c in r.crudo) && (c === PCTVEL || c === PCTACC)) {
          return `<td class="n" title="Necesita al menos ${C.minSesionesTecho ?? 4} sesiones suyas">–</td>`;
        }
        const v = Math.abs(r.crudo[c] || 0);
        let fondo = "";
        if (RITMO.includes(c) && tope[c] > 0) {
          fondo = `background:rgba(${semaforo(1 - orden[c][v])},.24)`;
        } else if (c === "Impacts") {
          const p = golpeados.indexOf(r.jugador);
          if (p !== -1) fondo = `background:rgba(224,88,96,${[.34, .22, .13][p]})`;
        }
        // Exposición: verde a partir de su umbral, porque ahí sí hubo estímulo.
        const esPct = c === PCTVEL || c === PCTACC;
        const expuesto = esPct && v >= umbralDe(c);
        if (esPct) fondo = expuesto ? "background:rgba(110,154,155,.28)" : "";
        const lider = v === tope[c] && v > 0;
        // La alerta va en la banda de G que la provoca, no en el total.
        const avisa = BANDAS_ALTAS.includes(c) && v > 0;
        return `<td class="n${expuesto ? " verde" : ""}${lider ? " lider" : ""}" style="${fondo}">${
          fmt(c, v, dec[c])}${
          lider && ICONO[c] ? `<span class="icoMejor" title="El mejor de la sesión">${ICONO[c]}</span>` : ""}${
          avisa ? `<span class="alertaG" title="Precaución · ${nf(v)} impacto${v === 1 ? "" : "s"} de alta intensidad">!</span>` : ""}</td>`;
      }).join("")}
    </tr>`;
  }).join("");




  const ley = `<div class="leyTabla">
    <span><i style="background:rgba(${semaforo(0)},.24)"></i>más acciones por minuto</span>
    <span><i style="background:rgba(${semaforo(1)},.24)"></i>menos acciones por minuto</span>
    <span><i style="background:rgba(224,88,96,.34)"></i>los tres que más impactos recibieron</span>
    <span><b>negrita</b> el mejor de su columna</span>
    <span><i class="sw verde"></i>llega al ${umbralDe(PCTVEL)}% de su top speed o al ${umbralDe(PCTACC)}% de su ACC máx</span>
    <span><span class="alertaG">!</span> precaución · impactos de alta intensidad</span>
  </div>`;

  return `<section class="panel tablon">
    <h3>Velocidad, aceleraciones e impactos</h3>
    ${recordsSesion(filas)}
    <div class="scroll"><table class="datos">
      <thead>
        <tr><th></th><th></th>${grupos}</tr>
        <tr><th class="orden" data-c="jugador">Jugador${flechaJ("jugador")}</th>
            <th class="orden" data-c="posicion">Posición${flechaJ("posicion")}</th>${sub}</tr>
      </thead>
      <tbody>${cuerpo}</tbody>
    </table></div>
    ${ley}
  </section>`;
}

/* ---------- evolución individual de un jugador ---------- */
const FJ = { jugador:"", tipo:"todo", metrica:"Distance (metres)", metricas:[], ventana:10, marcadas:[] };

/** Las sesiones del jugador elegido, ya filtradas por tipo de evento y ventana. */
function sesionesJugador() {
  const todas = DATOS.filter(r => r.squad === F.squad && r.jugador === FJ.jugador)
    .sort((a, b) => a.fechaMs - b.fechaMs);
  let v = todas;
  if (FJ.tipo === "partido") v = v.filter(r => r.esPartido);
  else if (FJ.tipo === "entreno") v = v.filter(r => !r.esPartido);
  // Las marcadas se cruzan CON la categoría, no la sustituyen: así puedes
  // decir "partidos" y quedarte solo con tres de ellos.
  if (FJ.marcadas.length) v = v.filter(r => FJ.marcadas.includes(idSesion(r)));
  else if (FJ.ventana) v = v.slice(-FJ.ventana);
  return { todas, v };
}

const valorJug = (r, col) => col === "__min" ? r.minutos : Math.abs(r.crudo[col] || 0);
const diaCorto = d => String(d.getDate()).padStart(2, "0") + "/" + String(d.getMonth() + 1).padStart(2, "0");

/**
 * La gráfica: línea de la métrica y, debajo y en el mismo eje de tiempo,
 * los minutos de cada sesión. Un pico de HMLD se lee distinto si ese día
 * jugó 90 minutos o 17.
 */
function graficaJugador(v, col) {
  if (v.length < 2) return `<p class="empty">Hacen falta al menos dos sesiones para dibujar la línea.</p>`;
  const W = 1120, H = 320, L = 60, R = 20, T = 22, B = 104;
  const iw = W - L - R, ih = H - T - B;
  const vals = v.map(r => valorJug(r, col));
  const dec = col === "__min" ? 0 : decimales(vals);
  const alto = Math.max(...vals), bajo = Math.min(...vals);
  const suelo = Math.max(0, bajo - (alto - bajo) * 0.25);
  const techo = alto + (alto - bajo) * 0.12 || alto * 1.1 || 1;
  const media = vals.reduce((t, n) => t + n, 0) / vals.length;
  const x = i => L + (v.length === 1 ? iw / 2 : iw * i / (v.length - 1));
  const y = n => T + ih - (n - suelo) / ((techo - suelo) || 1) * ih;
  const maxMin = Math.max(...v.map(r => r.minutos), 1);
  const anchoB = Math.min(30, iw / v.length * 0.5);
  const base = H - 30, cima = H - B + 30, altoBarra = base - cima;

  let g = "", previa = null;
  for (let i = 0; i <= 4; i++) {
    const n = suelo + (techo - suelo) * i / 4, yy = y(n);
    // Con métricas enteras de rango corto (impactos, power plays) cuatro cortes
    // dan la misma cifra repetida: se escribe solo cuando cambia.
    const etq = nf(n, dec ? 1 : 0);
    g += `<line x1="${L}" x2="${W - R}" y1="${yy}" y2="${yy}" stroke="#E2E6E4"/>`;
    if (etq !== previa) {
      g += `<text x="${L - 9}" y="${yy + 4}" fill="#8A9290" font-size="11" text-anchor="end">${etq}</text>`;
      previa = etq;
    }
  }
  g += `<line x1="${L}" x2="${W - R}" y1="${y(media)}" y2="${y(media)}" stroke="#2F615C" stroke-width="1.5" stroke-dasharray="5 4"/>
        <text x="${W - R}" y="${y(media) - 7}" fill="#2F615C" font-size="11" text-anchor="end">media ${nf(media, dec)}</text>`;

  const d = v.map((r, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(valorJug(r, col)).toFixed(1)}`).join(" ");
  g += `<path d="${d} L${x(v.length - 1).toFixed(1)},${T + ih} L${L},${T + ih} Z" fill="url(#degJug)"/>
        <path d="${d}" fill="none" stroke="#343C8A" stroke-width="2.2" stroke-linejoin="round"/>`;

  g += `<line x1="${L}" x2="${W - R}" y1="${base}" y2="${base}" stroke="#DCE1DF"/>
        <text x="${L - 9}" y="${base + 4}" fill="#8A9290" font-size="10" text-anchor="end">min</text>`;
  v.forEach((r, i) => {
    const h = Math.max(2, r.minutos / maxMin * altoBarra);
    g += `<rect x="${(x(i) - anchoB / 2).toFixed(1)}" y="${(base - h).toFixed(1)}" width="${anchoB.toFixed(1)}"
           height="${h.toFixed(1)}" rx="3" fill="${r.esPartido ? "#3B3346" : "#DCE1DF"}"/>
          <text x="${x(i).toFixed(1)}" y="${H - 12}" fill="#8A9290" font-size="10.5" text-anchor="middle">${diaCorto(r.fecha)}</text>`;
    if (v.length <= 18) g += `<text x="${x(i).toFixed(1)}" y="${(base - h - 5).toFixed(1)}"
           fill="#5C6462" font-size="10.5" text-anchor="middle">${nf(r.minutos)}'</text>`;
  });
  v.forEach((r, i) => {
    const n = valorJug(r, col);
    // El valor va escrito sobre el punto: al exportar no puedes pasar el ratón.
    if (v.length <= 16) {
      // En los extremos se ancla al borde, que si no la cifra se sale del lienzo.
      const anc = i === 0 ? "start" : i === v.length - 1 ? "end" : "middle";
      g += `<text x="${x(i).toFixed(1)}" y="${(y(n) - 11).toFixed(1)}" fill="#5C6462" font-size="10.5"
             text-anchor="${anc}">${fmt(col, n, dec)}</text>`;
    }
    g += `<circle class="ptJug" data-i="${i}" cx="${x(i).toFixed(1)}" cy="${y(n).toFixed(1)}"
           r="${r.esPartido ? 6 : 4.5}" fill="${r.esPartido ? "#A8323F" : "#343C8A"}" stroke="#FFFFFF" stroke-width="2"/>`;
  });

  return `<svg viewBox="0 0 ${W} ${H}" class="svgJug" role="img" aria-label="Evolución de ${esc(nombreMetrica(col))}">
    <defs><linearGradient id="degJug" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#343C8A" stop-opacity=".22"/>
      <stop offset="100%" stop-color="#343C8A" stop-opacity="0"/></linearGradient></defs>${g}</svg>`;
}

/** Cómo se llama el filtro activo, para el encabezado del PDF. */
function lblFiltro() {
  const t = { todo:"todas las sesiones", partido:"solo partidos",
              entreno:"solo entrenamientos", elegir:"eventos elegidos a mano" }[FJ.tipo];
  const v = FJ.ventana && FJ.tipo !== "elegir" ? "últimas " + FJ.ventana : "histórico completo";
  return t + " · " + v;
}

function vistaJugador() {
  $("#selectores").innerHTML = "";
  $("#notas").innerHTML = "";
  $("#tabla").innerHTML = "";
  $("#resumen").innerHTML = "";

  const delEquipo = DATOS.filter(r => r.squad === F.squad);
  const jugadores = [...new Set(delEquipo.map(r => r.jugador))].sort();
  if (!jugadores.length) {
    $("#cab").innerHTML = "";
    $("#paneles").innerHTML = `<p class="empty">No hay datos de ${esc(F.squad)} todavía.</p>`;
    return;
  }
  if (!jugadores.includes(FJ.jugador)) {
    // Por defecto, el que más sesiones tiene: es con quien vas a querer empezar.
    const cuenta = {};
    for (const r of delEquipo) cuenta[r.jugador] = (cuenta[r.jugador] || 0) + 1;
    FJ.jugador = jugadores.slice().sort((a, b) => cuenta[b] - cuenta[a])[0];
  }
  const selJ = $("#fJugador");
  selJ.innerHTML = jugadores.map(j =>
    `<option value="${esc(j)}"${j === FJ.jugador ? " selected" : ""}>${esc(j)}</option>`).join("");

  const { todas, v } = sesionesJugador();
  const disponibles = metricasJugador();
  if (FJ.metrica !== "__min" && !disponibles.includes(FJ.metrica)) FJ.metrica = disponibles[0] || "__min";
  const col = FJ.metrica;
  const dec = col === "__min" ? 0 : decimales(todas.map(r => valorJug(r, col)));

  const ultima = todas[todas.length - 1];
  $("#cab").innerHTML = `
    <h2>${esc(FJ.jugador)}<span class="md">${esc(ultima.posicion)}</span></h2>
    <span class="meta">${todas.length} ${todas.length === 1 ? "sesión" : "sesiones"} en el histórico ·
      de ${esc(fechaLarga(todas[0].fecha))} a ${esc(fechaLarga(ultima.fecha))}</span>`;

  const grupos = catalogoJugador().map(([g, cols]) => `<optgroup label="${esc(g)}">` +
    cols.map(c => `<option value="${esc(c)}"${c === col ? " selected" : ""}>${esc(nombreMetrica(c))}</option>`).join("") +
    `</optgroup>`).join("") +
    `<optgroup label="Otros"><option value="__min"${col === "__min" ? " selected" : ""}>Minutos</option></optgroup>`;

  const tipos = [["todo","Todo"],["partido","Partidos"],["entreno","Entrenos"]];
  const ventanas = [[5,"Últimas 5 sesiones"],[10,"Últimas 10 sesiones"],
                    [20,"Últimas 20 sesiones"],[0,"Todo el histórico"]];

  // En papel la cabecera de la app no se imprime, así que el nombre va aquí.
  const tituloPdf = `<div class="soloPdf cabPdf"><b>${esc(FJ.jugador)}</b> · ${esc(ultima.posicion)} ·
    ${esc(F.squad)} · ${esc(lblFiltro())}</div>`;
  // Las métricas extra del informe, con su chip para quitarlas.
  const extrasActivas = FJ.metricas.filter(m => m !== col);
  const chips = !extrasActivas.length ? "" : `<div class="chipsJug">
    <span class="et">También en el informe</span>
    ${extrasActivas.map(m => `<button class="chip" data-m="${esc(m)}" title="Quitar del informe">
      ${esc(m === "__min" ? "Minutos" : nombreCorto(m))} <i>×</i></button>`).join("")}
  </div>`;

  const barra = tituloPdf + `<div class="barraJug">
    <div class="segm" id="jTipo">${tipos.map(([k, t]) =>
      `<button data-v="${k}" class="${FJ.tipo === k ? "on" : ""}">${t}</button>`).join("")}</div>
    <div class="field"><label for="jMet">Métrica</label><select id="jMet">${grupos}</select></div>
    <div class="field"><label for="jVent">Ventana</label><select id="jVent">${ventanas.map(([n, t]) =>
      `<option value="${n}"${FJ.ventana === n ? " selected" : ""}>${t}</option>`).join("")}</select></div>
    <div class="field"><label for="jMas">Añadir</label><select id="jMas">
      <option value="" selected>Otra métrica…</option>${grupos.replace(/ selected/g, "")}</select></div>
  </div>` + chips;

  if (!v.length) {
    $("#paneles").innerHTML = barra + `<p class="empty">Ninguna sesión suya encaja con este filtro.</p>`;
    engancharJugador();
    return;
  }

  const vals = v.map(r => valorJug(r, col));
  const media = vals.reduce((t, n) => t + n, 0) / vals.length;
  const mejor = Math.max(...vals);
  const diaMejor = v[vals.indexOf(mejor)];
  const mins = v.reduce((t, r) => t + r.minutos, 0);
  const partidos = v.filter(r => r.esPartido).length;
  const ult = v[v.length - 1];
  const delta = media ? (valorJug(ult, col) / media - 1) * 100 : null;
  const lbl = col === "__min" ? "Minutos" : nombreMetrica(col);
  const uni = col === "__min" ? "min" : unidad(col);

  const kpis = `<div class="resumen cinco">
    <div class="kpi"><span class="k">Sesiones</span><b>${v.length}</b>
      <span class="s">${partidos} ${partidos === 1 ? "partido" : "partidos"} ·
        ${v.length - partidos} ${v.length - partidos === 1 ? "entreno" : "entrenos"}</span></div>
    <div class="kpi int"><span class="k">Minutos totales</span><b>${nf(mins)}<i> min</i></b>
      <span class="s">media ${nf(mins / v.length)} min por sesión</span></div>
    <div class="kpi"><span class="k">${esc(lbl)} · media</span><b>${fmt(col, media, decMedia(dec))}<i>${uni ? " " + uni : ""}</i></b>
      <span class="s">en esta ventana</span></div>
    <div class="kpi pico"><span class="k">${esc(lbl)} · su mejor</span><b>${fmt(col, mejor, dec)}<i>${uni ? " " + uni : ""}</i></b>
      <span class="s">${esc(fechaLarga(diaMejor.fecha))}</span></div>
    <div class="kpi int"><span class="k">Última sesión</span><b>${fmt(col, valorJug(ult, col), dec)}</b>
      <span class="s">${delta == null ? "" : (delta >= 0 ? "+" : "") + nf(delta) + "% sobre su media"}</span></div>
  </div>`;

  const marcadas = FJ.marcadas.length;
  // La tabla enseña solo las de la categoría elegida: marcar dentro de
  // "partidos" no debería obligarte a buscar entre los entrenos.
  const listadas = todas.filter(r => FJ.tipo === "todo" ? true
    : FJ.tipo === "partido" ? r.esPartido : !r.esPartido);
  const filas = listadas.slice().reverse().map(r => {
    const dentro = v.includes(r);
    const id = idSesion(r);
    return `<tr class="${dentro ? "" : "fuera"}">
      <td><input type="checkbox" class="chkJug" data-id="${esc(id)}" ${FJ.marcadas.includes(id) ? "checked" : ""}
           aria-label="Incluir ${esc(r.sesion)}"></td>
      <td>${esc(fechaLarga(r.fecha))}</td>
      <td class="ses" title="${esc(r.sesion)}">${esc(r.sesion)}</td>
      <td><span class="tipoEv${r.esPartido ? " p" : ""}">${r.esPartido ? "Partido" : "Entreno"}</span></td>
      <td class="n minc">${nf(r.minutos)}</td>
      ${COLS_JUG.map(c => `<td class="n">${c in r.crudo ? fmt(c, Math.abs(r.crudo[c]), c === "Top Speed (m/s)" ? 2 : 0) : "–"}</td>`).join("")}
    </tr>`;
  }).join("");

  // El informe puede llevar varias métricas: la principal y las que añadas.
  const extras = FJ.metricas.filter(m => m !== col && (m === "__min" || disponibles.includes(m)));
  const leyenda = `<div class="leyenda">
    <span><i class="sw" style="background:#A8323F"></i> Partido</span>
    <span><i class="sw" style="background:#343C8A"></i> Entrenamiento</span>
    <span><i class="sw ln" style="background:#2F615C"></i> Su media en la ventana</span>
    <span><i class="sw" style="background:#DCE1DF"></i> Minutos</span>
  </div>`;
  const grafico = (c, principal) => `<section class="panel ancho">
      <h3>${principal ? "Evolución · " : ""}${esc(c === "__min" ? "Minutos" : nombreMetrica(c))}</h3>
      ${principal ? `<p class="sub">Cada punto es una sesión completa. Las barras de abajo son los minutos de ese día.</p>` : ""}
      ${graficaJugador(v, c)}
      ${principal ? leyenda : ""}
    </section>`;

  $("#paneles").innerHTML = barra + kpis + grafico(col, true) + extras.map(c => grafico(c, false)).join("") + `
    <section class="panel ancho">
      <h3>Sesiones</h3>
      <p class="sub">${marcadas
        ? `${marcadas} ${marcadas === 1 ? "evento marcado" : "eventos marcados"} dentro de
           ${FJ.tipo === "partido" ? "los partidos" : FJ.tipo === "entreno" ? "los entrenos" : "todo"} ·
           <button class="enlace" id="jLimpiar">quitar las marcas</button>`
        : "Marca las que quieras comparar y la gráfica se queda solo con esas"}</p>
      <div class="scroll"><table class="datos jug">
        <thead><tr><th></th><th>Fecha</th><th>Sesión</th><th>Tipo</th><th class="n minc">Min</th>
          ${COLS_JUG.map(c => `<th class="n">${esc(nombreCorto(c))}</th>`).join("")}</tr></thead>
        <tbody>${filas}</tbody>
      </table></div>
    </section>`;

  engancharJugador(v);
}

/* Las columnas de la tabla del jugador: las que de verdad se miran sesión a sesión. */
const COLS_JUG = ["Distance (metres)", HMLD, "Sprint Distance (m)", "Distance Per Min (m/min)",
                  "Player Load", "Top Speed (m/s)", PCTVEL, "Max Acceleration (m/s/s)", PCTACC,
                  ACC3, DEC3, "Impacts"];

function engancharJugador(v) {
  const sel = $("#jMet"); if (sel) sel.onchange = e => { FJ.metrica = e.target.value; pintar(); };
  const vent = $("#jVent"); if (vent) vent.onchange = e => { FJ.ventana = +e.target.value; pintar(); };
  const mas = $("#jMas");
  if (mas) mas.onchange = e => {
    const m = e.target.value;
    if (m && m !== FJ.metrica && !FJ.metricas.includes(m)) FJ.metricas.push(m);
    pintar();
  };
  document.querySelectorAll(".chipsJug .chip").forEach(c => c.onclick = () => {
    FJ.metricas = FJ.metricas.filter(m => m !== c.dataset.m);
    pintar();
  });
  document.querySelectorAll("#jTipo button").forEach(b => b.onclick = () => {
    FJ.tipo = b.dataset.v;
    pintar();
  });
  const limpiar = $("#jLimpiar");
  if (limpiar) limpiar.onclick = () => { FJ.marcadas = []; pintar(); };
  document.querySelectorAll(".chkJug").forEach(c => c.onchange = () => {
    const id = c.dataset.id;
    FJ.marcadas = c.checked ? FJ.marcadas.concat([id]) : FJ.marcadas.filter(x => x !== id);
    pintar();
  });
  if (!v) return;
  const tip = $("#tipJug");
  document.querySelectorAll(".ptJug").forEach(p => {
    const r = v[+p.dataset.i];
    p.onmouseenter = () => {
      const dec = FJ.metrica === "__min" ? 0 : decimales(v.map(x => valorJug(x, FJ.metrica)));
      tip.innerHTML = `<b>${fmt(FJ.metrica, valorJug(r, FJ.metrica), dec)}</b>
        <em>${esc(fechaLarga(r.fecha))} · ${nf(r.minutos)} min</em><br>${esc(r.sesion)}`;
      tip.style.opacity = 1;
    };
    p.onmousemove = e => { tip.style.left = (e.clientX + 14) + "px"; tip.style.top = (e.clientY - 10) + "px"; };
    p.onmouseleave = () => { tip.style.opacity = 0; };
  });
}

/** El rótulo del lateral y el título de la pestaña del navegador. */
function rotulaMarca() {
  const tit = C.titulo || "Control de carga";
  const t = $("#bTitulo"), sb = $("#bSub");
  if (t) t.textContent = tit;
  if (sb) {
    sb.textContent = C.subtitulo || "";
    sb.style.display = sb.textContent ? "" : "none";
  }
  const m = $(".brand .mark");
  if (m && C.siglas) m.textContent = C.siglas;
  document.title = tit + (C.siglas ? " · " + C.siglas : "");
}

function pintar() {
  recordar();
  rotulaMarca();
  // El rótulo de la pestaña de jugadora concuerda con el equipo elegido.
  const etJug = document.querySelector("#tab-jugador .et");
  if (etJug) etJug.textContent = JUG();
  // La pestaña se recuerda entre recargas: el resaltado tiene que ir con ella.
  document.querySelectorAll(".tab").forEach(t =>
    t.setAttribute("aria-selected", t.id === "tab-" + F.pestana));
  document.body.classList.toggle("sinSesion", F.pestana === "jugador");
  if (F.pestana === "jugador") return vistaJugador();
  if (F.pestana === "semana") return vistaSemana();
  if (F.pestana === "carga") return vistaCarga();
  if (F.pestana === "drill") return vistaDrill();
  if (F.pestana === "bip") return vistaBip();
  if (F.pestana === "cargar") return vistaCargar();
  cabecera(true);
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

  F.matriz = F.matriz.filter(c => disponibles.includes(c));
  if (!F.matriz.length) F.matriz = disponibles.slice(0, 4);
  if (!disponibles.includes(F.sc.x)) F.sc.x = disponibles[0];
  if (!disponibles.includes(F.sc.y)) F.sc.y = disponibles[1] || disponibles[0];
  // El cuadrante va en su propio hueco, entre el ranking y la tabla.
  $("#cuadrante").innerHTML = `
    <section class="panel disp">
      <h3>Cuadrante de acciones de alta intensidad
        <span class="uni">${esc(nombreCorto(F.sc.x))} frente a ${esc(nombreCorto(F.sc.y))} · % de la media de tu puesto</span></h3>
      <div class="ejes noPdf">${selectorEje("x", filas)}${selectorEje("y", filas)}</div>
      ${explicaScatter()}
      ${cajas100(filas)}
      ${scatter(filas)}
      ${leyendaCuadrantes()}
    </section>`;
  $("#paneles").innerHTML = `
    ${bloqueBipReporte()}
    ${matriz(filas)}
    <div class="leyPaneles">
      <span>Cada bloque es una línea, con su color y su media punteada dentro</span>
      <span>El 100% del scatter es la media de la línea del jugador, no la del equipo</span>
    </div>`;
  ajustaCarteles();
  document.querySelectorAll(".chM").forEach(b => b.onclick = () => {
    const c = b.dataset.c;
    F.matriz = F.matriz.includes(c) ? F.matriz.filter(x => x !== c) : F.matriz.concat(c);
    recordar(); pintar();
  });
  document.querySelectorAll(".selEje").forEach(sel => sel.onchange = e => {
    F.sc[e.target.dataset.e] = e.target.value;
    recordar(); pintar();
  });
  $("#tabla").innerHTML = tabla(filas);
  $("#notas").innerHTML = cajaComentarios();
  const caja = $("#coment");
  if (caja) {
    // Se guarda al salir del campo, no en cada tecla: así no se escribe en
    // disco quince veces por frase.
    caja.addEventListener("blur", () => guardarComentario(caja.dataset.clave, caja.innerText));
  }
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
  $("#fJugador").onchange = e => { FJ.jugador = e.target.value; FJ.marcadas = []; pintar(); };
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
/* ---------- comentarios escritos a mano ---------- */
const COMENTARIOS = "cau_gps_comentarios";
const leerComentarios = () => {
  try { return JSON.parse(localStorage.getItem(COMENTARIOS) || "{}"); } catch (e) { return {}; }
};
const comentarioDe = clave => leerComentarios()[clave] || "";
function guardarComentario(clave, texto) {
  try {
    const todos = leerComentarios();
    if (texto.trim()) todos[clave] = texto; else delete todos[clave];
    localStorage.setItem(COMENTARIOS, JSON.stringify(todos));
  } catch (e) { /* navegador sin almacenamiento */ }
}

/**
 * Caja de comentarios de la sesión. Se escribe a mano, se guarda en este
 * navegador y sale en el PDF. Va al final porque se escribe después de mirar
 * los datos, no antes.
 */
function cajaComentarios() {
  const clave = F.squad + "|" + F.fecha;
  const texto = comentarioDe(clave);
  return `<section class="panel comentarios">
    <h3>Comentarios de la sesión</h3>
    <p class="sub noPdf">Lo que escribas aquí se guarda en este navegador y sale en el PDF</p>
    <div id="coment" class="coment" contenteditable="true" role="textbox" aria-multiline="true"
      data-clave="${esc(clave)}" data-vacio="Escribe aquí lo que quieras que salga en el reporte…">${esc(texto)}</div>
  </section>`;
}

/* ---------- fotos de jugadores ----------
   Viven en el navegador y, si hay endpoint, también en la pestaña "Fotos" del
   Sheets, para que estén igual en el portátil y en la tablet. No se suben al
   repo: GitHub Pages es público y las caras no lo son. */
const FOTOS_LS = "cau_fotos_v1";
let FOTOS = {};        // clave del nombre -> dataURL (JPEG cuadrado de 192 px)
let FOTOS_PEND = {};   // las que todavía no han llegado al Sheets
let FOTOS_EST = "";    // texto del estado de sincronización

function cargarFotosLocal() {
  try { FOTOS = JSON.parse(localStorage.getItem(FOTOS_LS) || "{}"); } catch (e) { FOTOS = {}; }
  try { FOTOS_PEND = JSON.parse(localStorage.getItem(FOTOS_LS + "_pend") || "{}"); } catch (e) { FOTOS_PEND = {}; }
}
function guardarFotosLocal() {
  try {
    localStorage.setItem(FOTOS_LS, JSON.stringify(FOTOS));
    localStorage.setItem(FOTOS_LS + "_pend", JSON.stringify(FOTOS_PEND));
    return true;
  } catch (e) {
    // El cupo del navegador son unos 5 MB. Mejor decirlo que fallar en silencio.
    console.warn("No cabe la foto en el navegador:", e);
    FOTOS_EST = "El navegador no admite más fotos: quita alguna antes de añadir otra.";
    return false;
  }
}

const fotoDe = nom => FOTOS[nombreClave(nom)] || "";
/** Iniciales para cuando todavía no hay foto: nunca un hueco vacío. */
const iniciales = nom => {
  const p = String(nom || "").trim().split(/\s+/).filter(Boolean);
  if (!p.length) return "?";
  const a = p[0][0] || "", b = p.length > 1 ? (p[p.length - 1][0] || "") : (p[0][1] || "");
  return (a + b).toUpperCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Z0-9]/g, "") || "?";
};
/** La cara, o las iniciales sobre el color de su línea si todavía no hay cara. */
function avatar(nom, px, pos) {
  const f = fotoDe(nom), lado = `width:${px}px;height:${px}px`;
  if (f) return `<img class="av" style="${lado}" src="${f}" alt="" loading="lazy">`;
  const col = (pos && COLOR_PUESTO[pos]) || "";
  return `<span class="av ini" style="${lado};font-size:${Math.round(px * .34)}px${
    col ? `;background:${col}18;color:${col}` : ""}">${esc(iniciales(nom))}</span>`;
}

const hayEndpoint = () => {
  const d = C.endpoint || C.fuente || "";
  return /\/exec/.test(d) ? d : "";
};

/**
 * El Sheets manda en cada carga solo el sello: qué jugador tiene foto y
 * cuánto ocupa. Si cuadra con lo que ya hay guardado aquí no se baja nada,
 * que serían cientos de kB en cada recarga. Si no cuadra, se piden y punto.
 */
async function sincronizaFotos(sello) {
  subirFotosPendientes();
  if (!sello || typeof sello !== "object") return;
  const claves = new Set([...Object.keys(sello), ...Object.keys(FOTOS)]);
  const difiere = [...claves].some(k =>
    !FOTOS_PEND[k] && (sello[k] || 0) !== (FOTOS[k] || "").length);
  if (!difiere) return;
  const destino = hayEndpoint();
  if (!destino) return;
  try {
    const j = await cargarPorScript(destino + (destino.includes("?") ? "&" : "?") + "fotos=1");
    fusionaFotos(j && j.fotos);
  } catch (e) {
    console.warn("No se pudieron bajar las fotos:", e.message);
  }
}

/** Las que llegan del Sheets ganan, salvo que aquí haya un cambio sin subir. */
function fusionaFotos(remotas) {
  if (!remotas || typeof remotas !== "object") return;
  let cambio = false;
  const vistas = new Set();
  Object.keys(remotas).forEach(k => {
    vistas.add(k);
    if (FOTOS_PEND[k]) return;
    const v = remotas[k] || "";
    if (FOTOS[k] !== v) { cambio = true; if (v) FOTOS[k] = v; else delete FOTOS[k]; }
  });
  // Si una foto ya no está en el Sheets, es que la quitaron desde otro sitio.
  Object.keys(FOTOS).forEach(k => {
    if (!vistas.has(k) && !FOTOS_PEND[k]) { delete FOTOS[k]; cambio = true; }
  });
  if (cambio) {
    guardarFotosLocal();
    if (F.pestana === "cargar") pintaFotos(); else pintar();
  }
}

/**
 * Sube de una en una. Si una falla, el resto espera al próximo intento.
 * El cerrojo importa: al soltar 25 fotos de golpe se llama 25 veces, y sin
 * él se mandaría cada foto varias veces a la vez.
 */
let SUBIENDO = false;
async function subirFotosPendientes() {
  const destino = hayEndpoint();
  if (!destino || SUBIENDO) return;
  const pend = Object.keys(FOTOS_PEND);
  if (!pend.length) { FOTOS_EST = ""; return pintaEstadoFotos(); }
  SUBIENDO = true;
  let bien = false;
  try { bien = await mandaFotos(destino); } finally { SUBIENDO = false; }
  // Mientras subía pueden haber entrado más: se recoge la cola nueva. Solo si
  // la tanda fue bien, que si no sería reintentar en bucle contra un Sheets caído.
  if (bien && Object.keys(FOTOS_PEND).length) return subirFotosPendientes();
}

async function mandaFotos(destino) {
  const pend = Object.keys(FOTOS_PEND);
  FOTOS_EST = `Guardando ${pend.length} ${pend.length === 1 ? "foto" : "fotos"} en el Sheets…`;
  pintaEstadoFotos();
  for (const k of pend) {
    try {
      const res = await fetch(destino, {
        method:"POST", redirect:"follow",
        headers:{ "Content-Type":"text/plain;charset=utf-8" },
        body: JSON.stringify({ clave: C.clave || "", accion:"foto",
          jugadorClave: k, jugador: FOTOS_PEND[k].nombre || "", foto: FOTOS[k] || "" })
      });
      const j = await res.json();
      if (!j.ok) throw new Error(j.error || "respuesta inesperada");
      delete FOTOS_PEND[k];
      guardarFotosLocal();
    } catch (e) {
      console.warn("Foto sin subir:", k, e.message);
      FOTOS_EST = "Guardadas aquí, pero el Sheets no responde. Se reintenta al recargar.";
      pintaEstadoFotos();
      return false;
    }
  }
  FOTOS_EST = "Al día con el Sheets.";
  pintaEstadoFotos();
  return true;
}

function pintaEstadoFotos() {
  const e = $("#estFotos");
  if (e) e.textContent = FOTOS_EST;
}

/** Guarda una foto ya recortada y la deja en cola para el Sheets. */
function ponFoto(nombre, dataURL) {
  const k = nombreClave(nombre);
  if (dataURL) FOTOS[k] = dataURL; else delete FOTOS[k];
  FOTOS_PEND[k] = { nombre };
  guardarFotosLocal();
  subirFotosPendientes();
}

/* ---------- recorte ----------
   Un cuadrado que luego se ve redondo. Se puede arrastrar y hacer zoom, y hay
   un botón que busca la cabeza solo para no tener que encuadrar 30 fotos. */
const FOTO_PX = 192;        // lo que se guarda
const LIENZO = 288;         // lo que se ve mientras encuadras

function cargaImagen(file) {
  // createImageBitmap respeta el giro que trae la foto del móvil; si el
  // navegador no lo soporta, se cae al <img> de toda la vida.
  if (window.createImageBitmap) {
    return createImageBitmap(file, { imageOrientation:"from-image" }).catch(() => cargaImagenImg(file));
  }
  return cargaImagenImg(file);
}
function cargaImagenImg(file) {
  return new Promise((ok, mal) => {
    const url = URL.createObjectURL(file), im = new Image();
    im.onload = () => { URL.revokeObjectURL(url); ok(im); };
    im.onerror = () => { URL.revokeObjectURL(url); mal(new Error("no se pudo leer la imagen")); };
    im.src = url;
  });
}

/**
 * Busca la cabeza por tono de piel. No es reconocimiento facial: mira qué
 * píxeles caen en el rango de piel en YCbCr, se queda con la banda de filas
 * más alta que tiene bastantes (la cara va arriba; las manos, más abajo) y
 * devuelve el cuadrado que la encuadra. Si no encuentra nada, el tercio
 * superior centrado, que es donde está la cara en casi cualquier retrato.
 */
function buscaCabeza(im) {
  const W = im.width, H = im.height;
  const ancho = 96, alto = Math.max(8, Math.round(ancho * H / W));
  const lienzo = document.createElement("canvas");
  lienzo.width = ancho; lienzo.height = alto;
  const cx2 = lienzo.getContext("2d", { willReadFrequently:true });
  cx2.drawImage(im, 0, 0, ancho, alto);
  let d;
  try { d = cx2.getImageData(0, 0, ancho, alto).data; } catch (e) { return porDefecto(W, H); }

  const mascara = new Uint8Array(ancho * alto), porFila = new Int32Array(alto);
  for (let i = 0, p = 0; i < mascara.length; i++, p += 4) {
    const r = d[p], g = d[p + 1], b = d[p + 2];
    const y = .299 * r + .587 * g + .114 * b;
    const cb = 128 - .168736 * r - .331264 * g + .5 * b;
    const cr = 128 + .5 * r - .418688 * g - .081312 * b;
    if (y > 55 && cb >= 75 && cb <= 136 && cr >= 132 && cr <= 182 && r > g && r > b) {
      mascara[i] = 1; porFila[(i / ancho) | 0]++;
    }
  }
  const total = mascara.reduce((a, b) => a + b, 0);
  if (total < mascara.length * .004) return porDefecto(W, H);

  const pico = Math.max(...porFila), minimo = Math.max(2, pico * .3);
  let ini = porFila.findIndex(c => c >= minimo);
  if (ini < 0) return porDefecto(W, H);
  let fin = ini;
  while (fin + 1 < alto && porFila[fin + 1] >= minimo) fin++;
  // Una banda de una o dos filas es ruido, no una cabeza.
  if (fin - ini < 2) return porDefecto(W, H);

  let sx = 0, n = 0;
  for (let f = ini; f <= fin; f++) {
    for (let c = 0; c < ancho; c++) if (mascara[f * ancho + c]) { sx += c; n++; }
  }
  if (!n) return porDefecto(W, H);
  const escala = W / ancho;
  const centroX = (sx / n) * escala;
  const altoCabeza = (fin - ini + 1) * escala;
  // Que la cabeza ocupe algo más de un tercio del círculo: así entra pelo y hombros.
  const lado = Math.min(Math.min(W, H), Math.max(altoCabeza * 2.5, Math.min(W, H) * .35));
  const centroY = (ini + (fin - ini) / 2) * escala + altoCabeza * .12;
  return recorta(W, H, centroX, centroY, lado);
}
function porDefecto(W, H) {
  const lado = Math.min(W, H) * .82;
  return recorta(W, H, W / 2, H * .40, lado);
}
/** Mete el cuadrado dentro de la imagen pase lo que pase. */
function recorta(W, H, cx, cy, lado) {
  lado = Math.max(24, Math.min(lado, Math.min(W, H)));
  return {
    lado,
    cx: Math.max(lado / 2, Math.min(W - lado / 2, cx)),
    cy: Math.max(lado / 2, Math.min(H - lado / 2, cy))
  };
}

let RECORTE = null;   // { im, cx, cy, lado, nombre }

function abreRecorte(nombre, im) {
  RECORTE = Object.assign({ im, nombre }, buscaCabeza(im));
  const c = $("#capaRecorte");
  c.hidden = false;
  c.querySelector("h3").textContent = nombre;
  dibujaRecorte();
}
function cierraRecorte() {
  RECORTE = null;
  const c = $("#capaRecorte");
  if (c) c.hidden = true;
}
function dibujaRecorte() {
  if (!RECORTE) return;
  const { im, cx, cy, lado } = RECORTE;
  const cv = $("#lienzoRecorte"), g = cv.getContext("2d");
  g.clearRect(0, 0, LIENZO, LIENZO);
  g.drawImage(im, cx - lado / 2, cy - lado / 2, lado, lado, 0, 0, LIENZO, LIENZO);
  const z = $("#zoomRecorte");
  if (z) z.value = String(Math.round(Math.min(RECORTE.im.width, RECORTE.im.height) / lado * 100));
}
/** Mueve el encuadre en píxeles de pantalla. */
function mueveRecorte(dx, dy) {
  if (!RECORTE) return;
  const f = RECORTE.lado / LIENZO;
  Object.assign(RECORTE, recorta(RECORTE.im.width, RECORTE.im.height,
    RECORTE.cx - dx * f, RECORTE.cy - dy * f, RECORTE.lado));
  dibujaRecorte();
}
function zoomRecorte(pct) {
  if (!RECORTE) return;
  const menor = Math.min(RECORTE.im.width, RECORTE.im.height);
  Object.assign(RECORTE, recorta(RECORTE.im.width, RECORTE.im.height,
    RECORTE.cx, RECORTE.cy, menor / Math.max(1, pct / 100)));
  dibujaRecorte();
}
/**
 * Pasa el cuadrado elegido a un JPEG de 192 px. Una celda de Sheets admite
 * 50.000 caracteres, así que si una foto muy detallada se pasa, se baja la
 * calidad hasta que entre, en vez de fallar al guardarla.
 */
const TOPE_CELDA = 44000;
function recorteA(im, cx, cy, lado) {
  const cv = document.createElement("canvas");
  cv.width = cv.height = FOTO_PX;
  const g = cv.getContext("2d");
  g.imageSmoothingQuality = "high";
  g.drawImage(im, cx - lado / 2, cy - lado / 2, lado, lado, 0, 0, FOTO_PX, FOTO_PX);
  let q = .82, d = cv.toDataURL("image/jpeg", q);
  while (d.length > TOPE_CELDA && q > .35) { q -= .12; d = cv.toDataURL("image/jpeg", q); }
  return d;
}

function guardaRecorte() {
  if (!RECORTE) return;
  const { im, cx, cy, lado, nombre } = RECORTE;
  ponFoto(nombre, recorteA(im, cx, cy, lado));
  cierraRecorte();
  if (F.pestana === "cargar") pintaFotos(); else pintar();
}

/** Recorte automático sin abrir nada: para cuando se sueltan 20 fotos de golpe. */
function recorteAuto(im) {
  const { cx, cy, lado } = buscaCabeza(im);
  return recorteA(im, cx, cy, lado);
}

/* ---------- la pantalla de fotos, dentro de Cargar datos ---------- */
let FOTO_SQUAD = "";

const jugadoresDe = squad => [...new Set(DATOS.filter(r => r.squad === squad).map(r => r.jugador))]
  .sort((a, b) => a.localeCompare(b, "es"));

function bloqueFotos() {
  return `<section class="fotos" id="bloqueFotos">
    <div class="fcab">
      <div>
        <h3>Fotos de ${jugs()}</h3>
        <p>Salen en el podio de cada ranking. Se guardan en tu Sheets, no en la web:
          la web es pública y las caras no.</p>
      </div>
      <select id="fSquadFoto" aria-label="Equipo"></select>
    </div>
    <div class="suelta" id="sueltaFotos">
      <b>Arrastra aquí varias fotos a la vez</b>
      <span>Si el archivo se llama como ${esFem() ? "la jugadora" : "el jugador"} (<code>sellau.jpg</code>), se reparten solas y se encuadra la cara.
        Las que no cuadren te las dejo para asignar a mano.</span>
      <button id="btnFotos" class="sec">Elegir fotos</button>
      <input type="file" id="inpFotos" accept="image/*" multiple hidden>
    </div>
    <div id="sinAsignar"></div>
    <div class="rejFotos" id="rejFotos"></div>
    <p class="estFotos" id="estFotos">${esc(FOTOS_EST)}</p>
  </section>`;
}

function pintaFotos() {
  const rej = $("#rejFotos");
  if (!rej) return;
  const lista = jugadoresDe(FOTO_SQUAD);
  rej.innerHTML = lista.length ? lista.map(n => {
    const pos = (DATOS.find(r => r.jugador === n && r.squad === FOTO_SQUAD) || {}).posicion || "";
    return `<div class="fjug${fotoDe(n) ? " tiene" : ""}" data-nom="${esc(n)}">
      ${avatar(n, 46, pos)}
      <div class="fnom"><b>${esc(n)}</b><span>${esc(pos)}</span></div>
      <button class="fbtn" data-acc="poner" title="${fotoDe(n) ? "Cambiar la foto" : "Poner foto"}">${fotoDe(n) ? "Cambiar" : "Poner"}</button>
      ${fotoDe(n) ? `<button class="fbtn x" data-acc="quitar" title="Quitar la foto">×</button>` : ""}
    </div>`;
  }).join("") : `<p class="vacio">No hay ${jugs()} de ${esc(FOTO_SQUAD)} en los datos todavía.</p>`;
  const con = lista.filter(n => fotoDe(n)).length;
  const cab = $("#bloqueFotos .fcab h3");
  if (cab) cab.textContent = `Fotos de ${jugs()} · ${con} de ${lista.length}`;
  pintaEstadoFotos();
}

/** Empareja el nombre del archivo con un jugador. Solo si no hay dudas. */
function jugadorDeArchivo(nombreArchivo, lista) {
  const k = nombreClave(nombreArchivo.replace(/\.[a-z0-9]+$/i, ""));
  if (k.length < 4) return null;
  const exactos = lista.filter(n => nombreClave(n) === k);
  if (exactos.length === 1) return exactos[0];
  const casi = lista.filter(n => { const j = nombreClave(n); return j.includes(k) || k.includes(j); });
  return casi.length === 1 ? casi[0] : null;
}

async function sueltaFotos(files) {
  const lista = jugadoresDe(FOTO_SQUAD), sueltas = [];
  let puestas = 0;
  for (const f of files) {
    if (!/^image\//.test(f.type)) continue;
    let im;
    try { im = await cargaImagen(f); } catch (e) { continue; }
    const quien = jugadorDeArchivo(f.name, lista);
    if (quien) { ponFoto(quien, recorteAuto(im)); puestas++; }
    else sueltas.push({ nombre:f.name, im });
  }
  pintaFotos();
  const caja = $("#sinAsignar");
  if (!caja) return;
  if (!sueltas.length) {
    caja.innerHTML = puestas ? `<p class="ok">${puestas === 1
      ? "Una foto colocada y encuadrada"
      : `${puestas} fotos colocadas y encuadradas`}. Si alguna no ha quedado bien, pincha en Cambiar.</p>` : "";
    return;
  }
  SUELTAS = sueltas;
  caja.innerHTML = `<div class="pend"><b>${sueltas.length} sin asignar</b>
    <span>No he sabido de quién son. Elige a quién va cada una.</span>
    <div class="pendRej">${sueltas.map((s, i) => `<div class="pfoto">
      <canvas class="mini" data-i="${i}" width="56" height="56"></canvas>
      <select class="asig" data-i="${i}"><option value="">${esc(s.nombre)}</option>
        ${lista.map(n => `<option value="${esc(n)}">${esc(n)}</option>`).join("")}</select>
    </div>`).join("")}</div></div>`;
  sueltas.forEach((s, i) => {
    const cv = caja.querySelector(`canvas[data-i="${i}"]`);
    const { cx, cy, lado } = buscaCabeza(s.im);
    cv.getContext("2d").drawImage(s.im, cx - lado / 2, cy - lado / 2, lado, lado, 0, 0, 56, 56);
  });
  caja.querySelectorAll(".asig").forEach(sel => sel.onchange = e => {
    const quien = e.target.value;
    if (!quien) return;
    abreRecorte(quien, SUELTAS[+e.target.dataset.i].im);
  });
}
let SUELTAS = [];

/** Pide un archivo para un jugador concreto y abre el encuadre. */
function pideFoto(nombre) {
  const inp = document.createElement("input");
  inp.type = "file"; inp.accept = "image/*";
  inp.onchange = async () => {
    const f = inp.files[0];
    if (!f) return;
    try { abreRecorte(nombre, await cargaImagen(f)); }
    catch (e) { alert("No se pudo leer esa imagen."); }
  };
  inp.click();
}

function eventosFotos() {
  const squads = [...new Set(DATOS.map(r => r.squad))].filter(Boolean);
  if (!squads.includes(FOTO_SQUAD)) FOTO_SQUAD = squads.includes(F.squad) ? F.squad : squads[0] || "";
  const sel = $("#fSquadFoto");
  sel.innerHTML = squads.map(s => `<option${s === FOTO_SQUAD ? " selected" : ""}>${esc(s)}</option>`).join("");
  sel.onchange = e => { FOTO_SQUAD = e.target.value; $("#sinAsignar").innerHTML = ""; pintaFotos(); };

  $("#btnFotos").onclick = () => $("#inpFotos").click();
  $("#inpFotos").onchange = e => { if (e.target.files.length) sueltaFotos([...e.target.files]); e.target.value = ""; };
  const z = $("#sueltaFotos");
  ["dragenter","dragover"].forEach(ev => z.addEventListener(ev, e => { e.preventDefault(); z.classList.add("encima"); }));
  ["dragleave","drop"].forEach(ev => z.addEventListener(ev, e => { e.preventDefault(); z.classList.remove("encima"); }));
  z.addEventListener("drop", e => { if (e.dataTransfer.files.length) sueltaFotos([...e.dataTransfer.files]); });

  $("#rejFotos").onclick = e => {
    const b = e.target.closest(".fbtn"), caja = e.target.closest(".fjug");
    if (!caja) return;
    const nom = caja.dataset.nom;
    if (b && b.dataset.acc === "quitar") { ponFoto(nom, ""); return pintaFotos(); }
    pideFoto(nom);
  };
  pintaFotos();
}

/** El encuadre: arrastrar con el ratón o el dedo, rueda para el zoom. */
function eventosRecorte() {
  const capa = $("#capaRecorte");
  if (!capa) return;
  const cv = $("#lienzoRecorte");
  let arrastrando = false, px = 0, py = 0;
  cv.addEventListener("pointerdown", e => {
    arrastrando = true; px = e.clientX; py = e.clientY;
    cv.setPointerCapture(e.pointerId);
  });
  cv.addEventListener("pointermove", e => {
    if (!arrastrando) return;
    mueveRecorte(e.clientX - px, e.clientY - py);
    px = e.clientX; py = e.clientY;
  });
  ["pointerup","pointercancel"].forEach(ev => cv.addEventListener(ev, () => { arrastrando = false; }));
  cv.addEventListener("wheel", e => {
    e.preventDefault();
    if (!RECORTE) return;
    const menor = Math.min(RECORTE.im.width, RECORTE.im.height);
    zoomRecorte(Math.max(100, Math.min(400, menor / RECORTE.lado * 100 * (e.deltaY > 0 ? .92 : 1.08))));
  }, { passive:false });
  $("#zoomRecorte").oninput = e => zoomRecorte(+e.target.value);
  $("#recCara").onclick = () => {
    if (!RECORTE) return;
    Object.assign(RECORTE, buscaCabeza(RECORTE.im));
    dibujaRecorte();
  };
  $("#recGuardar").onclick = guardaRecorte;
  $("#recCancelar").onclick = cierraRecorte;
  capa.addEventListener("click", e => { if (e.target === capa) cierraRecorte(); });
  document.addEventListener("keydown", e => {
    if (capa.hidden) return;
    if (e.key === "Escape") cierraRecorte();
    if (e.key === "Enter") guardaRecorte();
  });
}

const GUARDA = "cau_gps_prefs";
function recordar() {
  try {
    localStorage.setItem(GUARDA, JSON.stringify({
      squad:F.squad, fecha:F.fecha, metricas:F.metricas, matriz:F.matriz, sc:F.sc,
      pestana:F.pestana, escenario:FR.escenario, referencia:FR,
      metricaAcwr:FA.metrica, semana:FA, jugador:FJ,
      parejas:PAREJAS, bip:{ vista:FB.vista, parte:FB.parte, sel:FB.sel, temp:FB.temp }, ordenDrill:FD.orden, drill:{ met:FD.met, grupo:FD.grupo }
    }));
  } catch (e) { /* navegador sin almacenamiento, no pasa nada */ }
}
function recuperar() {
  try {
    const p = JSON.parse(localStorage.getItem(GUARDA) || "{}");
    if (p.squad) F.squad = p.squad;
    if (p.fecha) F.fecha = p.fecha;
    if (Array.isArray(p.metricas) && p.metricas.length) F.metricas = p.metricas;
    if (Array.isArray(p.matriz) && p.matriz.length) F.matriz = p.matriz;
    if (p.sc && p.sc.x && p.sc.y) F.sc = p.sc;
    if (p.ordenDrill) FD.orden = p.ordenDrill;
    if (p.drill) Object.assign(FD, p.drill);
    if (p.escenario) FR.escenario = p.escenario;
    if (p.referencia) Object.assign(FR, p.referencia);
    if (p.metricaAcwr) FA.metrica = p.metricaAcwr;
    if (p.semana) Object.assign(FA, p.semana);
    if (p.jugador) Object.assign(FJ, p.jugador);
    // "acwr" era el nombre viejo de la pestaña: se traduce en vez de dejar la app en blanco.
    if (p.pestana) F.pestana = p.pestana === "acwr" ? "semana" : p.pestana;
    if (p.parejas) Object.assign(PAREJAS, p.parejas);
    if (p.bip) Object.assign(FB, p.bip);
  } catch (e) { /* preferencias corruptas: se ignoran */ }
}

/* ---------- arranque ---------- */
(async function init() {
  eventos();
  eventosRecorte();
  recuperar();
  cargarFotosLocal();
  await cargar();
  poblarFiltros();
  pintar();
})();
})();

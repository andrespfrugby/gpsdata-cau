(() => {
"use strict";
const C = window.CAU_CONFIG || {};

/* Métricas de cada pestaña. dec = decimales, ref = con qué comparar la barra. */
const PESTANAS = {
  cargar: [],
  volumen: [
    { id:"distancia",  lbl:"Distancia total", uni:"m",  dec:0 },
    { id:"hmld",       lbl:"HMLD",            uni:"m",  dec:0 },
    { id:"sprint",     lbl:"HSR / sprint distance", uni:"m", dec:0 },
    { id:"powerPlays", lbl:"Power plays",     uni:"",   dec:0 },
    { id:"playerLoad", lbl:"Player load",     uni:"",   dec:0 }
  ],
  intensidad: [
    { id:"mMin",       lbl:"Distancia por min", uni:"m/min", dec:1, escala:"rango" },
    { id:"hmldMin",    lbl:"HMLD por min",      uni:"m/min", dec:2 },
    { id:"accDecMin",  lbl:"ACC + DECC >3 por min", uni:"/min", dec:2, escala:"rango" },
    { id:"vmax",       lbl:"Velocidad máxima",  uni:"m/s",   dec:2, escala:"rango" },
    { id:"pctVmax",    lbl:"% de su Vmax",      uni:"%",     dec:1, min:0, max:100, marca:"umbral", color:"vmax" }
  ]
};

let DATOS = [], VMAX = {};
let MOTES = {}, POSICIONES = {};   // maestro que llega del Sheets
let EQUIPO_CARGA = "";             // equipo elegido al arrastrar un CSV sin columna Squad
const F = { squad:"", fecha:"", pestana:"volumen" };

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
  if (m) return new Date(+m[3] < 100 ? 2000 + +m[3] : +m[3], +m[2] - 1, +m[1]);
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

    let hmld = num(get("hmld"));
    if (!hmld) hmld = ["pz25","pz30","pz35","pz40","pz45","pz50"].reduce((t, k) => t + num(get(k)), 0);

    const acc3 = get("acc3") !== undefined ? num(get("acc3")) : num(get("acc34")) + num(get("accM4"));
    const dec3 = get("dec3") !== undefined ? num(get("dec3")) : num(get("dec34")) + num(get("decM4"));

    const sesion = String(get("sesion") || "").trim();
    const etiquetas = String(get("tags") || "").trim().toLowerCase();
    // El split manda: en un triangular el tag pone "training" aunque sean partidos.
    const esPartido = /match/i.test(split) || (etiquetas
      ? /\bgame\b/.test(etiquetas) && etiquetas !== "training"
      : (C.marcadoresPartido || []).some(t => (sesion + " " + split).toLowerCase().includes(t)));
    const mdCol = get("md");
    const md = mdCol !== undefined && mdCol !== "" ? num(mdCol) : (esPartido ? 0 : leerMD(sesion));

    const distancia = num(get("distancia"));
    salida.push({
      squad: String(get("squad") || EQUIPO_CARGA || "Senior").trim(),
      fecha, fechaISO: iso(fecha), sesion, jugador, alias, split, md, esPartido,
      posicion: String(get("posicion") || "").trim() || POSICIONES[jugador] || "Sin posición",
      minutos, distancia, sprint: num(get("sprint")),
      playerLoad: num(get("playerLoad")), vmax: num(get("vmax")),
      powerPlays: num(get("powerPlays")), impactos: num(get("impactos")),
      hmld, acc3, dec3, accDec: acc3 + dec3,
      mMin: num(get("mMin")) || (minutos ? distancia / minutos : 0),
      hmldMin: minutos ? hmld / minutos : 0,
      accDecMin: minutos ? (acc3 + dec3) / minutos : 0
    });
  }
  // Si de la misma sesión llega el split completo y además "all", nos quedamos con el completo.
  const porSesion = new Map();
  for (const r of salida) {
    const k = r.jugador + "|" + r.fechaISO + "|" + r.sesion + (clave(r.split) === "all" ? "" : "|" + r.split);
    const previa = porSesion.get(k);
    if (!previa || (clave(previa.split) === "all" && clave(r.split) !== "all")) porSesion.set(k, r);
  }
  salida = [...porSesion.values()];
  salida.sort((a, b) => a.fecha - b.fecha);
  VMAX = {};
  for (const r of salida) if (r.vmax > (VMAX[r.jugador] || 0)) VMAX[r.jugador] = r.vmax;
  for (const r of salida) r.pctVmax = VMAX[r.jugador] ? (r.vmax / VMAX[r.jugador]) * 100 : 0;
  return salida;
}

async function cargar() {
  const fuente = (C.fuente || "").trim();
  setEstado("Cargando…", false);
  if (!fuente) { DATOS = normaliza(demo()); setEstado("Datos de ejemplo · arrastra tu CSV", false); return; }
  try {
    const res = await fetch(fuente, { redirect:"follow" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const txt = await res.text();
    let brutas;
    if (txt.trim().startsWith("[") || txt.trim().startsWith("{")) {
      const j = JSON.parse(txt);
      brutas = Array.isArray(j) ? j : (j.datos || j.data || j.filas || []);
      if (j.motes) MOTES = j.motes;
      if (j.posiciones) POSICIONES = j.posiciones;
    } else brutas = parseCSV(txt);
    DATOS = normaliza(brutas);
    if (!DATOS.length) {
      setEstado("Conectado · histórico vacío, arrastra tu CSV", true);
      return;
    }
    setEstado("Conectado · " + DATOS.length + " sesiones", true);
  } catch (e) {
    DATOS = normaliza(demo());
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
function poblarFechas() {
  if (!$("#fFecha")) return;
  const vistas = new Map();
  for (const r of DATOS.filter(x => x.squad === F.squad)) {
    if (!vistas.has(r.fechaISO)) vistas.set(r.fechaISO, r);
  }
  const fechas = [...vistas.keys()].sort().reverse();
  if (!fechas.includes(F.fecha)) F.fecha = fechas[0] || "";
  $("#fFecha").innerHTML = fechas.map(f => {
    const r = vistas.get(f);
    const mdTxt = etiquetaMD(r.md);
    return `<option value="${f}"${f === F.fecha ? " selected" : ""}>${esc(fechaLarga(r.fecha))}${mdTxt ? " · " + mdTxt : ""} · ${esc(r.sesion || r.split)}</option>`;
  }).join("");
}
const sesion = () => DATOS.filter(r => r.squad === F.squad && r.fechaISO === F.fecha);

/* ---------- pintado ---------- */
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
}

function panel(met, filas) {
  const datos = filas.map(r => ({ nom:r.jugador, pos:r.posicion, v:r[met.id] || 0 }))
    .sort((a, b) => b.v - a.v);
  const vals = datos.map(d => d.v);
  const media = vals.reduce((t, v) => t + v, 0) / (vals.length || 1);
  const alto = Math.max(...vals), bajo = Math.min(...vals);
  // En intensidad el rango útil es estrecho: si todas las barras arrancan en cero
  // no se distingue nada, así que la escala empieza justo por debajo del peor dato.
  const margen = (alto - bajo) * 0.12 || 1;
  const tope = met.max ?? alto;
  const suelo = met.min ?? (met.escala === "rango" ? Math.max(0, bajo - margen) : 0);
  const ancho = v => Math.max(2, Math.min(100, ((v - suelo) / (tope - suelo || 1)) * 100));
  const umbral = (C.vmax && C.vmax.estimulo) || 90;
  const marcaEn = met.marca === "umbral" ? umbral : media;

  const cuerpo = datos.map(d => {
    const clase = met.color === "vmax"
      ? (d.v >= umbral ? "alta" : d.v >= ((C.vmax && C.vmax.aviso) || 85) ? "" : "baja")
      : (d.v >= media * 1.1 ? "alta" : d.v <= media * 0.9 ? "baja" : "");
    return `<div class="fila">
      <span class="nom" title="${esc(d.pos)}">${esc(d.nom)}</span>
      <span class="pista"><i class="${clase}" style="width:${ancho(d.v).toFixed(1)}%"></i><u style="left:${ancho(marcaEn).toFixed(1)}%"></u></span>
      <span class="val">${nf(d.v, met.dec)}</span>
    </div>`;
  }).join("");

  return `<section class="panel">
    <h3>${met.lbl}${met.uni ? ` <span style="color:var(--text-3);font-size:12px">${met.uni}</span>` : ""}</h3>
    <p class="res">media ${nf(media, met.dec)} · máx ${nf(Math.max(...vals), met.dec)} · mín ${nf(Math.min(...vals), met.dec)}</p>
    ${cuerpo}
    <div class="leyenda">${met.color === "vmax" ? `
      <span><i class="sw" style="background:var(--lav)"></i>llega al ${umbral}%</span>
      <span><i class="sw" style="background:var(--teal)"></i>entre ${(C.vmax && C.vmax.aviso) || 85} y ${umbral}%</span>
      <span><i class="sw" style="background:var(--ink-600)"></i>sin estímulo</span>
      <span><i class="sw" style="background:var(--pink);width:2px;height:12px;border-radius:0"></i>umbral ${umbral}%</span>` : `
      <span><i class="sw" style="background:var(--lav)"></i>+10% sobre la media</span>
      <span><i class="sw" style="background:var(--teal)"></i>en la media</span>
      <span><i class="sw" style="background:var(--ink-600)"></i>−10% por debajo</span>
      <span><i class="sw" style="background:var(--pink);width:2px;height:12px;border-radius:0"></i>media del grupo</span>`}
    </div>
  </section>`;
}

/* ---------- cargar ficheros ---------- */
let ULTIMO = null;   // resultado del último fichero leído

function vistaCargar() {
  $("#cab").innerHTML = "";
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
  VMAX = {};
  for (const r of DATOS) if (r.vmax > (VMAX[r.jugador] || 0)) VMAX[r.jugador] = r.vmax;
  for (const r of DATOS) r.pctVmax = VMAX[r.jugador] ? (r.vmax / VMAX[r.jugador]) * 100 : 0;
  setEstado(DATOS.length + " sesiones cargadas", true);
}

function mostrarResumen(u) {
  const f = u.fechas;
  $("#salida").innerHTML = `<div class="resumen">
    <dl>
      <dt>Archivo</dt><dd>${esc(u.nombre)}</dd>
      <dt>Filas leídas</dt><dd>${nf(u.brutas)}</dd>
      <dt>Sesiones válidas</dt><dd>${nf(u.validas)}</dd>
      <dt>Descartadas por split parcial o pocos minutos</dt><dd>${nf(u.brutas - u.validas)}</dd>
      <dt>Equipos</dt><dd>${u.equipos.map(esc).join(", ")}</dd>
      <dt>Fechas</dt><dd>${f.length === 1 ? esc(f[0]) : esc(f[0]) + " → " + esc(f[f.length-1])}</dd>
      <dt>Total en memoria</dt><dd>${nf(DATOS.length)}</dd>
    </dl>
  </div>
  ${u.guardado === null ? (C.fuente ? `<div class="aviso espera" id="estadoGuardado">Guardando en el Sheets…</div>` : "")
    : u.guardado.ok ? `<div class="aviso ok" id="estadoGuardado">Guardado. ${nf(u.guardado.nuevas)} nuevas y ${nf(u.guardado.actualizadas)} actualizadas · ${nf(u.guardado.total)} sesiones en el histórico.</div>`
    : `<div class="aviso error" id="estadoGuardado">No se pudo guardar: ${esc(u.guardado.error)}. Los datos se ven igual, pero se perderán al cerrar.</div>`}
  <p class="pasos">Ya puedes ir a <b>Volumen</b> o <b>Intensidad</b> y elegir la fecha.</p>`;
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

function pintar() {
  if (F.pestana === "cargar") return vistaCargar();
  cabecera();
  const filas = sesion();
  if (!filas.length) {
    // Diagnóstico: si no hay filas, di por qué, que si no es imposible saberlo.
    const delEquipo = DATOS.filter(r => r.squad === F.squad);
    const fechas = [...new Set(delEquipo.map(r => r.fechaISO))];
    $("#paneles").innerHTML = `<div class="empty">
      <p>No hay filas para <b>${esc(F.squad)}</b> en <b>${esc(F.fecha)}</b>.</p>
      <p style="font-family:'IBM Plex Mono';font-size:12px;margin-top:10px">
        ${DATOS.length} filas cargadas en total · ${delEquipo.length} de este equipo · ${fechas.length} fechas distintas<br>
        equipos detectados: ${[...new Set(DATOS.map(r => r.squad))].map(esc).join(", ") || "ninguno"}
      </p></div>`;
    return;
  }
  $("#paneles").innerHTML = PESTANAS[F.pestana].map(m => panel(m, filas)).join("");
}

/* ---------- eventos ---------- */
function eventos() {
  $("#fSquad").onchange = e => { F.squad = e.target.value; poblarFechas(); pintar(); };
  $("#fFecha").onchange = e => { F.fecha = e.target.value; pintar(); };
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

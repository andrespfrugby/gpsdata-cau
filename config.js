// Ajustes del dashboard. Edita solo este archivo para conectarlo a tu Sheets.
window.CAU_CONFIG = {

  // DE DÓNDE SE LEE. Admite dos cosas:
  //   a) La URL /exec del Apps Script.
  //   b) La URL del Sheets publicado como CSV (acaba en output=csv).
  // La opción b nunca da problemas de permisos, así que si ves "Failed to fetch"
  // publica la hoja Import Data como CSV y pega aquí esa URL.
  fuente: "https://script.google.com/macros/s/AKfycbzlNs1QIG0zcwVE-Y779hZPoe1YwmRmLlckW19E_mUiURtqSTGQZ_rbAI5kUlcXeLV1ow/exec",

  // DÓNDE SE GUARDA lo que arrastras. Siempre la URL /exec.
  // Si la dejas vacía se usa "fuente", que es lo correcto cuando fuente ya es /exec.
  endpoint: "",

  // Tiene que ser idéntica a la constante CLAVE del Codigo.gs.
  clave: "cau2026",

  // Minutos mínimos para que un partido cuente como benchmark de esa posición.
  minutosPartido: {
    "Primera línea": 50,
    "Segunda línea": 55,
    "Tercera línea": 55,
    "Tres cuartos": 60,
    "_defecto": 50
  },

  // Cómo se calcula el techo de cada jugador para los porcentajes de exposición.
  //   "segundo" -> su segundo mejor registro. Inmune a un pico falso del sensor.
  //   "max"     -> su mejor registro, sin más.
  //   "p95"     -> el percentil 95 de sus registros.
  techo: "segundo",

  // A partir de este % de su techo, la celda de exposición se pinta en verde.
  umbralExposicion: 85,

  // Umbral en G de la columna "Impacts" de Catapult, para etiquetarla bien.
  // Déjalo vacío si no lo sabes: no cambia ningún cálculo, solo el título.
  umbralImpacto: 6,

  // Rangos de tus zonas de velocidad, para que salgan en el título del gráfico.
  // Ejemplo: { 4: "5,5 - 7 m/s", 5: "> 7 m/s" }. Vacío = solo el número de zona.
  zonasVelocidad: {
    1: "0 – 1,5 m/s",
    2: "1,5 – 3,5 m/s",
    3: "3,5 – 5,5 m/s",
    4: "5,5 – 7 m/s",
    5: "> 7 m/s"
  },

  // Nombres de split que representan la sesión o el partido completo.
  splitsCompletos: ["Rugby - Full Sessi", "Full Session", "Full Match", "Sesión completa"],

  // Minutos mínimos para que una fila cuente. En 0 entra todo, que es como lo quieres:
  // en un triangular un partido dura 25 min y no tiene sentido descartarlo.
  // Las filas de 0 minutos se descartan igualmente porque no son participación.
  minutosMinimos: 0,

  // Solo se usa si el CSV no trae la columna Tags.
  marcadoresPartido: ["match", "partido", "game", "amistoso", "liga"]
};

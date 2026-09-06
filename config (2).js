// Ajustes del dashboard. Edita solo este archivo para conectarlo a tu Sheets.
window.CAU_CONFIG = {

  // URL de la aplicación web de Apps Script, la que acaba en /exec.
  // Sirve para las dos cosas: leer el histórico al abrir y guardar lo que arrastras.
  // Si la dejas vacía, la app funciona igual pero solo con lo que cargues a mano.
  fuente: "https://script.google.com/macros/s/AKfycbzlNs1QIG0zcwVE-Y779hZPoe1YwmRmLlckW19E_mUiURtqSTGQZ_rbAI5kUlcXeLV1ow/exec",

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

  // Nombres de split que representan la sesión o el partido completo.
  splitsCompletos: ["Rugby - Full Sessi", "Full Session", "Full Match", "Sesión completa"],

  // Minutos mínimos para que una fila cuente. En 0 entra todo, que es como lo quieres:
  // en un triangular un partido dura 25 min y no tiene sentido descartarlo.
  // Las filas de 0 minutos se descartan igualmente porque no son participación.
  minutosMinimos: 0,

  // Solo se usa si el CSV no trae la columna Tags.
  marcadoresPartido: ["match", "partido", "game", "amistoso", "liga"]
};

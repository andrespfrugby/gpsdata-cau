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

  // DEMANDAS DE JUEGO 25/26 · tu estudio con los partidos de Liga Regular DHb
  // y Fase de Ascenso a DH Elite. Fijas: no se recalculan con datos nuevos.
  demandas: {
    etiqueta: "Demandas de juego 25/26",
    escenarios: [["p50","P50 · típico"],["p75","P75 · exigente"],["p90","P90 · peor escenario"],
                 ["media","Media"],["max","Máximo"]],
    metricas: ["Distance (metres)", "Sprint Distance (m)", "HMLD (m)", "Power Plays", "Impacts", "Player Load"],
    valores: {
      "Primera línea": {
        p50:   [3918.56,  10.98,   78.34,  5,    2,    207.24],
        p75:   [4258.74,  18.52,  105.06,  6,    4,    221.19],
        p90:   [4606.92,  34.30,  120.97,  7.60, 5,    234.07],
        media: [3814.71,  13.84,   85.13,  5.13, 2.60, 198.85],
        max:   [4818.39,  44.14,  189.11, 12,    6,    247.26]
      },
      "Segunda línea": {
        p50:   [5955.92, 124.69,  280.62, 22,    3,    277.21],
        p75:   [6170.36, 224.45,  472.21, 28,    5.50, 285.08],
        p90:   [6376.53, 279.43,  531.60, 31,   10.20, 302.69],
        media: [5517.24, 150.08,  337.37, 20.43, 4.52, 257.52],
        max:   [6629.80, 566.09,  953.84, 45,   15,    327.10]
      },
      "Tercera línea": {
        p50:   [5946.15, 250.06,  506.01, 28,    4,    255.13],
        p75:   [6110.78, 346.57,  574.24, 33,    6,    281.95],
        p90:   [6321.65, 376.10,  629.01, 36,    7,    288.84],
        media: [5672.48, 258.76,  471.18, 27.29, 4.10, 255.97],
        max:   [6662.69, 494.42,  756.57, 40,   10,    289.18]
      },
      "Tres cuartos": {
        p50:   [6777.61, 419.55,  704.61, 38,    2,    278.70],
        p75:   [7173.16, 537.13,  847.92, 44,    3,    292.88],
        p90:   [7441.23, 627.18,  944.47, 53,    5.90, 314.05],
        media: [6674.46, 418.24,  694.62, 39.44, 2.65, 277.12],
        max:   [7955.21, 881.71, 1116.18, 64,   11,    350.04]
      }
    }
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

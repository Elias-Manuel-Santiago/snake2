// ============================================================
// Grid.js — Constantes de la grilla y funciones de utilidad
// ============================================================
// Todas las medidas del juego se derivan de estas constantes.
// Cambiar CELL_SIZE, GRID_COLS o GRID_ROWS reescala el juego entero.

/** Tamaño de cada celda en píxeles */
export const CELL_SIZE = 30;

/** Número de columnas (ancho de la grilla en celdas) */
export const GRID_COLS = 20;

/** Número de filas (alto de la grilla en celdas) */
export const GRID_ROWS = 20;

/** Ancho total del canvas en píxeles */
export const CANVAS_WIDTH = CELL_SIZE * GRID_COLS; // 600px

/** Alto del área de juego (sin UI) en píxeles */
export const CANVAS_HEIGHT = CELL_SIZE * GRID_ROWS; // 600px

/** Alto de la barra de HUD superior en píxeles */
export const UI_HEIGHT = 50;

/**
 * Milisegundos que tarda la serpiente en avanzar una celda.
 * Bajar este valor hace el juego más rápido.
 * Se puede modificar durante la partida para aumentar dificultad.
 */
export const MOVE_INTERVAL = 150;

/**
 * Interpolación lineal entre dos valores.
 * @param {number} a - Valor inicial
 * @param {number} b - Valor final
 * @param {number} t - Factor de interpolación (0 = a, 1 = b)
 * @returns {number}
 */
export function lerp(a, b, t) {
    return a + (b - a) * t;
}

/**
 * Convierte coordenadas de grilla al centro de la celda en píxeles,
 * teniendo en cuenta el offset vertical del HUD.
 * @param {number} gridX
 * @param {number} gridY
 * @returns {{ x: number, y: number }}
 */
export function gridToPixelCenter(gridX, gridY) {
    return {
        x: gridX * CELL_SIZE + CELL_SIZE / 2,
        y: gridY * CELL_SIZE + CELL_SIZE / 2 + UI_HEIGHT,
    };
}

/**
 * Configuración de los 5 niveles del modo 1 jugador.
 * applesRequired: manzanas acumuladas para pasar al siguiente nivel.
 * moveInterval: velocidad del tick en ms (menor = más rápido).
 */
export const LEVELS = [
    { level: 1, applesRequired: 2, moveInterval: 170, obstacleInterval: Infinity },
    { level: 2, applesRequired: 15, moveInterval: 155, obstacleInterval: 15000 },
    { level: 3, applesRequired: 25, moveInterval: 130, obstacleInterval: 10000 },
    { level: 4, applesRequired: 35, moveInterval: 90, obstacleInterval: 6500 }, 
    { level: 5, applesRequired: Infinity, moveInterval: 70, obstacleInterval: 4000 }, 
];
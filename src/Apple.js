// ============================================================
// Apple.js — Entidad Manzana
// ============================================================
// Representa la manzana que come la serpiente.
// La lógica de posición se maneja en coordenadas de grilla;
// la posición visual se actualiza moviendo el objeto gráfico.
//
// TODO (sprites): reemplazar el Graphics de abajo por un Sprite:
//   this.sprite = new Sprite(assets.apple);
//   this.sprite.anchor.set(0.5);
//   stage.addChild(this.sprite);
//   y actualizar place() para mover this.sprite en vez de this.graphics

import { Graphics } from 'pixi.js';
import { CELL_SIZE, GRID_COLS, GRID_ROWS, UI_HEIGHT } from './Grid.js';

export class Apple {
    /**
     * @param {import('pixi.js').Container} stage - Stage principal de Pixi
     */
    constructor(stage) {
        /** Posición lógica en la grilla */
        this.gridX = 0;
        this.gridY = 0;

        // Dibujar la manzana centrada en el origen (0,0).
        // Se posiciona moviendo el objeto, no redibujando.
        this.graphics = new Graphics();
        this.graphics.zIndex = 2;
        this.graphics.circle(0, 0, CELL_SIZE / 2 - 3);
        this.graphics.fill(0xe74c3c); // rojo manzana

        // Pequeño brillo decorativo para dar volumen
        this.graphics.circle(-4, -5, 3);
        this.graphics.fill({ color: 0xffffff, alpha: 0.4 });

        stage.addChild(this.graphics);
    }

    /**
     * Mueve la manzana a una celda aleatoria no ocupada por la serpiente.
     * @param {Array<{x: number, y: number}>} snakeSegments - Segmentos actuales de la serpiente
     */
    randomize(snakeSegments) {
        // Construir un Set de posiciones ocupadas para búsqueda O(1)
        const occupied = new Set(snakeSegments.map((s) => `${s.x},${s.y}`));

        let x, y;
        do {
            x = Math.floor(Math.random() * GRID_COLS);
            y = Math.floor(Math.random() * GRID_ROWS);
        } while (occupied.has(`${x},${y}`));

        this.place(x, y);
    }

    /**
     * Ubica la manzana en las coordenadas de grilla indicadas
     * y actualiza la posición visual.
     * @param {number} gridX
     * @param {number} gridY
     */
    place(gridX, gridY) {
        this.gridX = gridX;
        this.gridY = gridY;

        // Mover el objeto gráfico al centro de la celda
        this.graphics.x = gridX * CELL_SIZE + CELL_SIZE / 2;
        this.graphics.y = gridY * CELL_SIZE + CELL_SIZE / 2 + UI_HEIGHT;
    }

    /** Elimina el objeto gráfico del stage y libera memoria */
    destroy() {
        this.graphics.destroy();
    }
}

// ============================================================
// Snake.js — Entidad Serpiente
// ============================================================
// La serpiente mantiene dos capas de estado separadas:
//   • Lógica:  coordenadas de grilla (gridX, gridY) — enteros
//   • Visual:  posición en píxeles — interpolada cada frame
//
// Esto permite movimiento fluido: la lógica avanza de golpe en
// cada "tick", pero el renderizado transiciona suavemente entre
// la posición anterior y la nueva usando lerp().
//
// TODO (sprites/animaciones): reemplazar cada Graphics de segmento
//   por un Sprite o AnimatedSprite. El método addSegmentGraphic()
//   es el lugar donde hacerlo. El método render() ya actualiza
//   .x e .y, así que los sprites se moverán automáticamente.

import { Graphics, Container } from 'pixi.js';
import { CELL_SIZE, UI_HEIGHT, GRID_COLS, GRID_ROWS, lerp } from './Grid.js';

// ── Direcciones de movimiento ──────────────────────────────
export const DIRECTION = {
    UP:    { x:  0, y: -1 },
    DOWN:  { x:  0, y:  1 },
    LEFT:  { x: -1, y:  0 },
    RIGHT: { x:  1, y:  0 },
};

// ── Paletas de colores para cada serpiente ──────────────────
export const SNAKE_COLORS = {
    GREEN: { head: 0x2ecc71, body: 0x27ae60 },  // verde (jugador 1 por defecto)
    RED:   { head: 0xe74c3c, body: 0xc0392b }, // rojo (jugador 1 en 2P)
    BLUE:  { head: 0x3498db, body: 0x2980b9 }, // azul (jugador 2)
};

export class Snake {
    /**
     * @param {import('pixi.js').Container} stage - Stage principal de Pixi
     * @param {number} startX - Posición inicial en la grilla (columna)
     * @param {number} startY - Posición inicial en la grilla (fila)
     * @param {{ wrap?: boolean, direction?: object, colors?: object }} options - Opciones de comportamiento
     * wrap:      si es true, la serpiente sale por el lado opuesto al salir del borde
     * (usado en modo 2 jugadores). Por defecto false (colisión con bordes).
     * direction: dirección inicial de movimiento. El cuerpo se genera en la dirección
     * opuesta para que no haya colisión inmediata. Por defecto DIRECTION.RIGHT.
     * colors:    objeto con { head, body } para colorear la serpiente. Por defecto GREEN.
     */
    constructor(stage, startX, startY, { wrap = false, direction = DIRECTION.RIGHT, colors = SNAKE_COLORS.GREEN } = {}) {
        /**
         * Array de segmentos, el índice 0 es la cabeza.
         * Cada segmento tiene:
         * x, y      → posición lógica actual (grilla)
         * prevX, prevY → posición lógica del tick anterior (para lerp)
         *
         * El cuerpo se genera en la dirección opuesta al movimiento inicial
         * para evitar colisión consigo misma en el primer tick.
         */
        const dx = -direction.x;
        const dy = -direction.y;
        this.segments = [
            { x: startX,           y: startY,           prevX: startX,           prevY: startY },
            { x: startX + dx,      y: startY + dy,      prevX: startX + dx,      prevY: startY + dy },
            { x: startX + dx * 2,  y: startY + dy * 2,  prevX: startX + dx * 2,  prevY: startY + dy * 2 },
        ];

        /** Dirección actual de movimiento */
        this.direction = direction;

        /**
         * Cola de direcciones para manejar inputs rápidos.
         * Si el jugador presiona dos teclas antes del próximo tick,
         * ambas se procesan en orden sin perderse ninguna.
         */
        this.directionQueue = [];

        /**
         * Si es true, la serpiente sale por el lado opuesto al tocar un borde
         * en lugar de morir. Se activa en modo 2 jugadores.
         */
        this.wrap = wrap;

        /** Colores de la serpiente */
        this.colors = colors;

        // Contenedor que agrupa todos los gráficos de la serpiente.
        // Agregar efectos o animaciones al contenedor los aplica a todos.
        this.container = new Container();
        stage.addChild(this.container);

        this.segmentGraphics = [];
        for (let i = 0; i < this.segments.length; i++) {
            this.addSegmentGraphic(i === 0);
        }
    }

    // ── Gráficos ──────────────────────────────────────────────

    /**
     * Crea y agrega un Graphics para un nuevo segmento.
     * La forma se dibuja centrada en (0, 0) para que mover
     * el objeto con .x / .y sea sencillo.
     *
     * @param {boolean} isHead - true si es la cabeza
     * @returns {Graphics}
     */
    addSegmentGraphic(isHead) {
        const g = new Graphics();
        this.drawSegmentShape(g, isHead, this.direction);
        this.container.addChild(g);
        this.segmentGraphics.push(g);
        return g;
    }

    /**
     * Dibuja (o redibuja) la forma de un segmento.
     * Separar el dibujo de la posición facilita cambiar colores
     * en tiempo de ejecución (por ejemplo, al comer o morir).
     *
     * @param {Graphics} g
     * @param {boolean} isHead
     */
    drawSegmentShape(g, isHead, direction = DIRECTION.RIGHT) {
        const size   = isHead ? CELL_SIZE - 2 : CELL_SIZE - 6;
        const radius = isHead ? 8 : 5;
        const color  = isHead ? this.colors.head : this.colors.body;

        g.clear();
        g.roundRect(-size / 2, -size / 2, size, size, radius);
        g.fill(color);

        if (isHead) {
            this.drawEyes(g, direction);
        }
    }

    /**
     * Agrega los ojos a la cabeza. Se dibujan sobre el mismo Graphics.
     * La posición de los ojos varía según la dirección de movimiento.
     * TODO: esto puede reemplazarse con un Sprite de cabeza animado.
     * @param {Graphics} g
     */
    drawEyes(g, direction) {
        const eyeRadius  = 3;
        const eyeForward = 6;
        const eyeSpread  = 5;

        // Centro de los ojos desplazado en la dirección de movimiento.
        // El perpendicular al vector dirección separa los dos ojos.
        const fx =  direction.x * eyeForward;
        const fy =  direction.y * eyeForward;
        const px = -direction.y * eyeSpread / 2;
        const py =  direction.x * eyeSpread / 2;

        g.circle(fx + px, fy + py, eyeRadius);
        g.fill(0xffffff);
        g.circle(fx - px, fy - py, eyeRadius);
        g.fill(0xffffff);

        // Pupilas desplazadas un pixel en la dirección de movimiento
        g.circle(fx + px + direction.x, fy + py + direction.y, eyeRadius - 1.5);
        g.fill(0x1a1a2e);
        g.circle(fx - px + direction.x, fy - py + direction.y, eyeRadius - 1.5);
        g.fill(0x1a1a2e);
    }

    // ── Lógica de movimiento ──────────────────────────────────

    /**
     * Encola una nueva dirección validando que no sea la contraria
     * a la dirección en curso (no se puede hacer media vuelta).
     * @param {{ x: number, y: number }} newDir
     */
    setDirection(newDir) {
        // Comparar contra la última dirección encolada (o la actual si la cola está vacía)
        const lastDir = this.directionQueue.length > 0
            ? this.directionQueue[this.directionQueue.length - 1]
            : this.direction;

        const isOpposite = (newDir.x === -lastDir.x && newDir.y === -lastDir.y);
        const isSame     = (newDir.x ===  lastDir.x && newDir.y ===  lastDir.y);

        if (!isOpposite && !isSame && this.directionQueue.length < 1) {
            this.directionQueue.push(newDir);
        }
    }

    /**
     * Avanza la serpiente un paso en la grilla.
     * Llamado una vez por tick de juego (no cada frame).
     * Si this.wrap es true, aplica wrap de bordes en lugar de permitir colisión.
     *
     * @param {import('./Apple.js').Apple} apple - Manzana actual
     * @returns {boolean} true si la serpiente comió la manzana
     */
    move(apple) {
        if (this.directionQueue.length > 0) {
            this.direction = this.directionQueue.shift();
            this.drawSegmentShape(this.segmentGraphics[0], true, this.direction);
        }

        const head      = this.segments[0];
        const newHeadX  = head.x + this.direction.x;
        const newHeadY  = head.y + this.direction.y;

        const lastSeg  = this.segments[this.segments.length - 1];
        const oldTailX = lastSeg.x;
        const oldTailY = lastSeg.y;

        // Guardar prev NORMALMENTE
        for (const seg of this.segments) {
            seg.prevX = seg.x;
            seg.prevY = seg.y;
        }

        // Mover segmentos
        for (let i = this.segments.length - 1; i > 0; i--) {
            this.segments[i].x = this.segments[i - 1].x;
            this.segments[i].y = this.segments[i - 1].y;
        }

        // Mover cabeza
        if (this.wrap) {
            this.segments[0].x = ((newHeadX % GRID_COLS) + GRID_COLS) % GRID_COLS;
            this.segments[0].y = ((newHeadY % GRID_ROWS) + GRID_ROWS) % GRID_ROWS;
        } else {
            this.segments[0].x = newHeadX;
            this.segments[0].y = newHeadY;
        }

        const ateApple = (this.segments[0].x === apple.gridX && this.segments[0].y === apple.gridY);

        if (ateApple) {
            this.segments.push({
                x:     oldTailX,
                y:     oldTailY,
                prevX: oldTailX,
                prevY: oldTailY,
            });
            this.addSegmentGraphic(false);
        }

        return ateApple;
    }


    /**
     * Verifica si la serpiente chocó con los bordes, consigo misma,
     * o con los segmentos de otra serpiente.
     * Si wrap es true, los bordes no cuentan como colisión.
     *
     * @param {number} gridCols
     * @param {number} gridRows
     * @param {boolean} wrap - Si es true, ignora colisión con bordes
     * @param {Array<{x: number, y: number}>} [otherSegments] - Segmentos de la serpiente rival
     * @returns {boolean} true si hay colisión
     */
    checkCollision(gridCols, gridRows, wrap = false, otherSegments = []) {
        const head = this.segments[0];

        // Colisión con los cuatro bordes (solo si no hay wrap)
        if (!wrap) {
            if (head.x < 0 || head.x >= gridCols || head.y < 0 || head.y >= gridRows) {
                return true;
            }
        }

        // Colisión consigo misma (desde el segmento 1 en adelante)
        for (let i = 1; i < this.segments.length; i++) {
            if (head.x === this.segments[i].x && head.y === this.segments[i].y) {
                return true;
            }
        }

        // Colisión con los segmentos de la serpiente rival (modo 2 jugadores)
        for (const seg of otherSegments) {
            if (head.x === seg.x && head.y === seg.y) {
                return true;
            }
        }

        return false;
    }

    // ── Render ────────────────────────────────────────────────

    /**
     * Actualiza las posiciones visuales de todos los segmentos
     * interpolando entre la posición del tick anterior y la actual.
     * Llamado cada frame por el ticker de Pixi.
     *
     * @param {number} progress - Valor de 0 a 1: qué tan avanzado está el tick actual
     */
    render(progress) {
        for (let i = 0; i < this.segments.length; i++) {
            const seg = this.segments[i];
            const g   = this.segmentGraphics[i];

            let renderX = seg.x;
            let renderY = seg.y;

            // Si la distancia entre la posición lógica previa y la actual es mayor a 1,
            // significa que este segmento en particular cruzó el borde debido al wrap.
            const crossedX = Math.abs(seg.x - seg.prevX) > 1;
            const crossedY = Math.abs(seg.y - seg.prevY) > 1;

            // Si el segmento NO cruzó el borde, interpolamos normalmente.
            // Si SÍ cruzó, evitamos el lerp usando directamente la posición final para que se teletransporte.
            if (!crossedX) {
                renderX = lerp(seg.prevX, seg.x, progress);
            }
            if (!crossedY) {
                renderY = lerp(seg.prevY, seg.y, progress);
            }

            // Interpolar la posición en píxeles
            g.x = renderX * CELL_SIZE + CELL_SIZE / 2;
            g.y = renderY * CELL_SIZE + CELL_SIZE / 2 + UI_HEIGHT;
        }
    }

    /** Elimina el container (y todos los segmentos) del stage */
    destroy() {
        this.container.destroy({ children: true });
    }
}
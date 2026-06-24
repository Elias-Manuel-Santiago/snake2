// ============================================================
// ObstacleSnake.js — Entidad de obstáculo que cruza la pantalla
// ============================================================

import { Graphics, Container } from 'pixi.js';
import { CELL_SIZE, UI_HEIGHT, GRID_COLS, GRID_ROWS, lerp } from './Grid.js';
import { DIRECTION } from './Snake.js';

export class ObstacleSnake {
    constructor(stage) {
        this.stage = stage;
        this.segments = [];
        this.container = new Container();
        this.container.zIndex = 2; // Se dibuja debajo de la serpiente del jugador (zIndex 3)
        stage.addChild(this.container);

        this.segmentGraphics = [];
        this.direction = null;
        this.moveInterval = 80; // Velocidad fija a la que cruzan
        this.timeSinceLastMove = 0;
        this.currentProgress = 0;
        this.isAlive = true;
        this.hasEnteredMap = false; // Evita que se destruya al nacer

        this.spawnX = 0;
        this.spawnY = 0;
        this.axis = 'horizontal'; // 'horizontal' o 'vertical'
        this.lineIndex = 0;       // Qué fila o columna ocupará

        this.length = Math.floor(Math.random() * (12 - 8 + 1) + 8); // Longitud aleatoria entre 8 y 12
        this.color = 0x9b59b6; // Color morado para los obstáculos
        this.headColor = 0x8e44ad;

        this.precalculateRoute();
    }

    precalculateRoute() {
        const edge = Math.floor(Math.random() * 4);

        switch (edge) {
            case 0: // Desde arriba hacia abajo
                this.spawnX = Math.floor(Math.random() * GRID_COLS);
                this.spawnY = 0;
                this.direction = DIRECTION.DOWN;
                this.axis = 'vertical';
                this.lineIndex = this.spawnX;
                break;
            case 1: // Desde abajo hacia arriba
                this.spawnX = Math.floor(Math.random() * GRID_COLS);
                this.spawnY = GRID_ROWS - 1;
                this.direction = DIRECTION.UP;
                this.axis = 'vertical';
                this.lineIndex = this.spawnX;
                break;
            case 2: // Desde la izquierda a la derecha
                this.spawnX = 0;
                this.spawnY = Math.floor(Math.random() * GRID_ROWS);
                this.direction = DIRECTION.RIGHT;
                this.axis = 'horizontal';
                this.lineIndex = this.spawnY;
                break;
            case 3: // Desde la derecha a la izquierda
                this.spawnX = GRID_COLS - 1;
                this.spawnY = Math.floor(Math.random() * GRID_ROWS);
                this.direction = DIRECTION.LEFT;
                this.axis = 'horizontal';
                this.lineIndex = this.spawnX; // Corrección semántica interna
                this.lineIndex = this.spawnY;
                break;
        }
    }

    spawn() {
        for (let i = 0; i < this.length; i++) {
            let x = this.spawnX - this.direction.x * i;
            let y = this.spawnY - this.direction.y * i;

            x = Math.max(0, Math.min(GRID_COLS - 1, x));
            y = Math.max(0, Math.min(GRID_ROWS - 1, y));

            this.segments.push({ x, y, prevX: x, prevY: y });
            this.addSegmentGraphic(i === 0);
        }
    }

    addSegmentGraphic(isHead) {
        const g = new Graphics();
        const size = CELL_SIZE - 4;
        g.roundRect(-size / 2, -size / 2, size, size, 4);
        g.fill(isHead ? this.headColor : this.color);
        this.container.addChild(g);
        this.segmentGraphics.push(g);
    }

    updateTick(deltaMS) {
        if (!this.isAlive) return;

        this.timeSinceLastMove += deltaMS;
        while (this.timeSinceLastMove >= this.moveInterval) {
            this.timeSinceLastMove -= this.moveInterval;
            this.move();
        }
        this.currentProgress = this.timeSinceLastMove / this.moveInterval;
    }

    move() {
        // Guardar posiciones previas
        for (const seg of this.segments) {
            seg.prevX = seg.x;
            seg.prevY = seg.y;
        }

        // Mover cuerpo
        for (let i = this.segments.length - 1; i > 0; i--) {
            this.segments[i].x = this.segments[i - 1].x;
            this.segments[i].y = this.segments[i - 1].y;
        }

        // Mover cabeza
        this.segments[0].x += this.direction.x;
        this.segments[0].y += this.direction.y;

        // Lógica de destrucción simplificada: 
        // Si la cabeza sale del mapa por el lado opuesto, se destruye.
        const tail = this.segments[this.segments.length - 1];
        if (tail.x < -1 || tail.x >= GRID_COLS + 1 || tail.y < -1 || tail.y >= GRID_ROWS + 1) {
            this.isAlive = false;
        }
    }

    render() {
        if (!this.isAlive) return;
        for (let i = 0; i < this.segments.length; i++) {
            const seg = this.segments[i];
            const g = this.segmentGraphics[i];
            const direction = this.getSegmentDirection(i);

            const renderX = lerp(seg.prevX, seg.x, this.currentProgress);
            const renderY = lerp(seg.prevY, seg.y, this.currentProgress);

            g.x = renderX * CELL_SIZE + CELL_SIZE / 2;
            g.y = renderY * CELL_SIZE + CELL_SIZE / 2 + UI_HEIGHT;
        }
    }

    getSegmentDirection(index) {
        if (index === 0) return this.direction;

        const seg = this.segments[index];
        const dx = this.normalizeMovementDelta(seg.x - seg.prevX);
        const dy = this.normalizeMovementDelta(seg.y - seg.prevY);

        if (dx !== 0 || dy !== 0) return { x: dx, y: dy };

        const previousSeg = this.segments[index - 1];
        if (!previousSeg) return this.direction;

        return {
            x: this.normalizeMovementDelta(previousSeg.x - seg.x),
            y: this.normalizeMovementDelta(previousSeg.y - seg.y),
        };
    }

    normalizeMovementDelta(delta) {
        if (delta === 0) return 0;
        return Math.sign(delta);
    }

    /** Para obtener su posición interpolada exacta si hay colisión */
    getInterPos(progress, seg) {
        return {
            x: lerp(seg.prevX, seg.x, progress),
            y: lerp(seg.prevY, seg.y, progress)
        };
    }

    destroy() {
        this.container.destroy({ children: true });
    }
}

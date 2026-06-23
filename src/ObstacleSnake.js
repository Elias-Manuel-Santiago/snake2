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
        this.moveInterval = 100; // Velocidad fija a la que cruzan
        this.timeSinceLastMove = 0;
        this.currentProgress = 0;
        this.isAlive = true;
        this.hasEnteredMap = false; // Evita que se destruya al nacer

        this.length = Math.floor(Math.random() * 4) + 3; // Longitud aleatoria entre 3 y 6
        this.color = 0x9b59b6; // Color morado para los obstáculos
        this.headColor = 0x8e44ad;

        this.spawn();
    }

    /** Genera la serpiente en un borde aleatorio */
    spawn() {
        const edge = Math.floor(Math.random() * 4); 
        let startX, startY;

        switch (edge) {
            case 0: startX = Math.floor(Math.random() * GRID_COLS); startY = 0; this.direction = DIRECTION.DOWN; break;
            case 1: startX = Math.floor(Math.random() * GRID_COLS); startY = GRID_ROWS - 1; this.direction = DIRECTION.UP; break;
            case 2: startX = 0; startY = Math.floor(Math.random() * GRID_ROWS); this.direction = DIRECTION.RIGHT; break;
            case 3: startX = GRID_COLS - 1; startY = Math.floor(Math.random() * GRID_ROWS); this.direction = DIRECTION.LEFT; break;
        }

        for (let i = 0; i < this.length; i++) {
            let x = startX - this.direction.x * i;
            let y = startY - this.direction.y * i;

            // Limitar la posición para que NINGÚN segmento se genere fuera del mapa
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
        const head = this.segments[0];
        if (head.x < -1 || head.x >= GRID_COLS + 1 || head.y < -1 || head.y >= GRID_ROWS + 1) {
            this.isAlive = false;
        }
    }

    render() {
        if (!this.isAlive) return;
        for (let i = 0; i < this.segments.length; i++) {
            const seg = this.segments[i];
            const g = this.segmentGraphics[i];

            const renderX = lerp(seg.prevX, seg.x, this.currentProgress);
            const renderY = lerp(seg.prevY, seg.y, this.currentProgress);

            g.x = renderX * CELL_SIZE + CELL_SIZE / 2;
            g.y = renderY * CELL_SIZE + CELL_SIZE / 2 + UI_HEIGHT;
        }
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
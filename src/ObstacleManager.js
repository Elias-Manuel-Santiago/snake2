// ============================================================
// ObstacleManager.js — Gestión de obstáculos NPC con Alertas
// ============================================================

import { ObstacleSnake } from './ObstacleSnake.js';
import { LEVELS, CELL_SIZE, UI_HEIGHT, CANVAS_WIDTH, CANVAS_HEIGHT } from './Grid.js';
import { Graphics } from 'pixi.js';
import { DJ } from './DJ.js';

export class ObstacleManager {
    constructor() {
        this.obstacles = [];         // Serpientes NPC activas en el mapa
        this.obstacleTimer = 0;      // Timer para el próximo obstáculo
        this.pendingObstacles = [];  // NUEVO: Obstáculos en fase de advertencia
        this.warningContainer = null;// NUEVO: Contenedor para dibujar los rectángulos de alerta
    }

    reset() {
        this.clearAll();
        this.obstacleTimer = 0;
    }

    update(deltaMS, stage, playerSnake, playerProgress, level, isTwoPlayerMode) {
        if (isTwoPlayerMode || level < 1) return false;

        // Asegurar que exista el contenedor de alertas adjunto al stage
        if (!this.warningContainer) {
            this.warningContainer = new Graphics();
            this.warningContainer.zIndex = 1.5; // Por encima del fondo, debajo de las serpientes
            stage.addChild(this.warningContainer);
        }

        const obstacleInterval = LEVELS[level].obstacleInterval;



        // Planificar nuevos obstáculos 
        if (obstacleInterval !== Infinity) {
            this.obstacleTimer += deltaMS;
            if (this.obstacleTimer >= obstacleInterval) {
                this.obstacleTimer = 0;

                const newObs = new ObstacleSnake(stage);
                newObs.container.visible = false;

                this.pendingObstacles.push({
                    obstacle: newObs,
                    timeLeft: 2000,
                    blinkTimer: 0,
                    lastBlinkState: false //Rastrea el estado del frame anterior
                });
            }
        }

        // Actualizar la cuenta regresiva de las alertas y dibujarlas titilando
        this.warningContainer.clear();
        for (let i = this.pendingObstacles.length - 1; i >= 0; i--) {
            const pending = this.pendingObstacles[i];
            pending.timeLeft -= deltaMS;
            pending.blinkTimer += deltaMS;

            // Logica del titileo: cambia de estado cada 200ms
            const isRedVisible = Math.floor(pending.blinkTimer / 200) % 2 === 0;

            if (isRedVisible) {
                this.warningContainer.rect(
                    pending.obstacle.axis === 'horizontal' ? 0 : pending.obstacle.lineIndex * CELL_SIZE,
                    pending.obstacle.axis === 'horizontal' ? (pending.obstacle.lineIndex * CELL_SIZE) + UI_HEIGHT : UI_HEIGHT,
                    pending.obstacle.axis === 'horizontal' ? CANVAS_WIDTH : CELL_SIZE,
                    pending.obstacle.axis === 'horizontal' ? CELL_SIZE : CANVAS_HEIGHT
                );

                // Solo reproduce el sonido si en el frame anterior estaba apagado
                if (!pending.lastBlinkState) {
                    DJ.playSfx('warning');
                }

                // Color rojo semi-transparente (alpha 0.35) para que no tape completamente el mapa
                this.warningContainer.fill({ color: 0xff0000, alpha: 0.35 });
            }

            // Guardamos el estado actual para la próxima iteración/frame
            pending.lastBlinkState = isRedVisible;

            // Si terminaron los 2 segundos, el obstáculo "nace" oficialmente
            if (pending.timeLeft <= 0) {
                DJ.playSfx('obstacle');
                pending.obstacle.container.visible = true;
                pending.obstacle.spawn();
                this.obstacles.push(pending.obstacle);
                this.pendingObstacles.splice(i, 1);
            }
        }

        // ... (resto del código de update)

        // 3. Actualizar, renderizar y verificar choques de los obstáculos activos
        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            const obs = this.obstacles[i];

            if (!obs || !obs.segments || obs.segments.length === 0) {
                if (obs) obs.destroy();
                this.obstacles.splice(i, 1);
                continue;
            }

            obs.updateTick(deltaMS);
            obs.render();

            let npcHitBody = false;
            const npcHeadPos = obs.getInterPos(obs.currentProgress, obs.segments[0]);

            for (let j = 1; j < playerSnake.segments.length; j++) {
                const playerSegPos = playerSnake.getInterPos(playerProgress, playerSnake.segments[j]);
                const dx = npcHeadPos.x - playerSegPos.x;
                const dy = npcHeadPos.y - playerSegPos.y;

                if (dx * dx + dy * dy < 0.25) {
                    npcHitBody = true;
                    break;
                }
            }

            if (npcHitBody) {
                obs.destroy();
                this.obstacles.splice(i, 1);
                continue;
            }

            if (!obs.isAlive) {
                obs.destroy();
                this.obstacles.splice(i, 1);
            }
        }
        return false;
    }

    getValidSegments() {
        return this.obstacles
            .filter(obs => obs && obs.segments && obs.segments.length > 0)
            .flatMap(obs => obs.segments);
    }

    clearAll() {
        this.obstacles.forEach(obs => obs.destroy());
        this.pendingObstacles.forEach(pending => pending.obstacle.destroy());
        this.obstacles = [];
        this.pendingObstacles = [];
        if (this.warningContainer) {
            this.warningContainer.destroy();
            this.warningContainer = null;
        }
    }
}
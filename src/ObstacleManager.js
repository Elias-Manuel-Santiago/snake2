// ============================================================
// ObstacleManager.js — Gestión de obstáculos NPC
// ============================================================

import { ObstacleSnake } from './ObstacleSnake.js';
import { LEVELS } from './Grid.js';

export class ObstacleManager {
    constructor() {
        this.obstacles = []; // Array para guardar las serpientes NPC activas
        this.obstacleTimer = 0; // Timer para saber cuándo generar la siguiente
    }

    /** 
     * LIMPIEZA: Asegurar que los obstáculos se borren al cambiar de escena 
     */
    reset() {
        this.obstacles = [];
        this.obstacleTimer = 0;
    }

    /** 
     * --- LÓGICA DE OBSTÁCULOS NPC (Solo modo 1P) ---
     * Actualiza la lógica de los obstáculos. 
     */
    update(deltaMS, stage, playerSnake, playerProgress, level, isTwoPlayerMode) {
        if (isTwoPlayerMode || level < 1) return false;

        const obstacleInterval = LEVELS[level].obstacleInterval;
        
        // 1. Generar nuevos obstáculos si corresponde
        if (obstacleInterval !== Infinity) {
            this.obstacleTimer += deltaMS;
            if (this.obstacleTimer >= obstacleInterval) {
                this.obstacleTimer = 0;
                this.obstacles.push(new ObstacleSnake(stage));
            }
        }

        // 2. Actualizar, renderizar y verificar choques
        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            const obs = this.obstacles[i];

            // SEGURIDAD: Si el NPC se corrompió o no tiene segmentos, lo limpiamos
            if (!obs || !obs.segments || obs.segments.length === 0) {
                if (obs) obs.destroy();
                this.obstacles.splice(i, 1);
                continue;
            }

            obs.updateTick(deltaMS);
            obs.render();

            // Verificar si la cabeza del NPC chocó contra el cuerpo del jugador
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

            // Si el NPC chocó contra el jugador, se destruye el NPC
            if (npcHitBody) {
                obs.destroy();
                this.obstacles.splice(i, 1);
                continue; 
            }

            // Limpiar los que ya salieron del mapa naturalmente
            if (!obs.isAlive) {
                obs.destroy();
                this.obstacles.splice(i, 1);
            }
        }
        return false;
    }

    /** 
     * Juntar todos los segmentos de los obstáculos NPC en un solo array
     * SEGURIDAD: Filtrar obstáculos válidos antes de pasarlos a la verificación
     */
    getValidSegments() {
        return this.obstacles
            .filter(obs => obs && obs.segments && obs.segments.length > 0)
            .flatMap(obs => obs.segments);
    }

    /** 
     * Destruir los obstáculos al perder para que no se queden congelados 
     */
    clearAll() {
        this.obstacles.forEach(obs => obs.destroy());
        this.obstacles = [];
    }
}
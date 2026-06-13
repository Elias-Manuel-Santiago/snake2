// ============================================================
// UI.js — Interfaz de usuario (HUD)
// ============================================================
// Gestiona todos los elementos de UI:
//   • Barra superior con el contador de manzanas (modo 1P)
//   • Scores de Jugador 1 y Jugador 2 (modo 2P)
//   • Overlay de Game Over con instrucción para reiniciar
//
// TODO: se puede ampliar con: nivel, velocidad, mejor puntaje,
//   animaciones de transición, sonidos, etc.

import { Container, Graphics, Text } from 'pixi.js';
import { CANVAS_WIDTH, CANVAS_HEIGHT, UI_HEIGHT } from './Grid.js';

export class UI {
    /**
     * @param {import('pixi.js').Container} stage - Stage principal de Pixi
     * @param {boolean} [isTwoPlayer=false] - true si es modo 2 jugadores
     */
    constructor(stage, isTwoPlayer = false) {
        this.isTwoPlayer = isTwoPlayer;

        // ── Barra superior (HUD) ─────────────────────────────
        this.hudContainer = new Container();
        stage.addChild(this.hudContainer);

        // Fondo de la barra
        const hudBg = new Graphics();
        hudBg.rect(0, 0, CANVAS_WIDTH, UI_HEIGHT);
        hudBg.fill(0x1a1a2e);
        this.hudContainer.addChild(hudBg);

        // Línea separadora entre la barra y el área de juego
        const separator = new Graphics();
        separator.rect(0, UI_HEIGHT - 2, CANVAS_WIDTH, 2);
        separator.fill(0x2ecc71);
        this.hudContainer.addChild(separator);

        if (!isTwoPlayer) {
            // ── MODO 1 JUGADOR ────────────────────────────────
            
            // Texto del contador de manzanas
            this.scoreText = new Text({
                text: '🍎 0',
                style: {
                    fontFamily: 'Arial, sans-serif',
                    fontSize: 22,
                    fontWeight: 'bold',
                    fill: 0xffffff,
                },
            });
            this.scoreText.x = 16;
            this.scoreText.y = (UI_HEIGHT - this.scoreText.height) / 2;
            this.hudContainer.addChild(this.scoreText);

            // Texto de ayuda con los controles (esquina derecha)
            const helpText = new Text({
                text: 'Moverse: W A S D',
                style: {
                    fontFamily: 'Arial, sans-serif',
                    fontSize: 14,
                    fill: 0x7f8c8d,
                },
            });
            helpText.anchor.set(1, 0.5);
            helpText.x = CANVAS_WIDTH - 12;
            helpText.y = UI_HEIGHT / 2;
            this.hudContainer.addChild(helpText);
        } else {
            // ── MODO 2 JUGADORES ──────────────────────────────

            // ── Score Jugador 1 (izquierda, verde) ────
            this.score1Text = new Text({
                text: 'J1: 0',
                style: {
                    fontFamily: 'Arial, sans-serif',
                    fontSize: 18,
                    fontWeight: 'bold',
                    fill: 'red',
                },
            });
            this.score1Text.x = 16;
            this.score1Text.y = (UI_HEIGHT - this.score1Text.height) / 2;
            this.hudContainer.addChild(this.score1Text);

            // ── Score Jugador 2 (derecha, azul) ────
            this.score2Text = new Text({
                text: 'J2: 0',
                style: {
                    fontFamily: 'Arial, sans-serif',
                    fontSize: 18,
                    fontWeight: 'bold',
                    fill: 'blue',
                },
            });
            this.score2Text.anchor.set(1, 0.5);
            this.score2Text.x = CANVAS_WIDTH - 16;
            this.score2Text.y = UI_HEIGHT / 2;
            this.hudContainer.addChild(this.score2Text);

            // Instrucción con los controles (abajo, más pequeño)
            const helpText = new Text({
                text: 'J1: WASD    J2: IJKL',
                style: {
                    fontFamily: 'Arial, sans-serif',
                    fontSize: 12,
                    fill: 0x7f8c8d,
                },
            });
            helpText.anchor.set(0.5, 1);
            helpText.x = CANVAS_WIDTH / 2;
            helpText.y = UI_HEIGHT - 2;
            this.hudContainer.addChild(helpText);
        }

        // ── Overlay de Game Over ──────────────────────────────
        // Se renderiza encima del área de juego y la serpiente
        this.gameOverContainer = new Container();
        this.gameOverContainer.visible = false;
        stage.addChild(this.gameOverContainer);

        // Fondo semitransparente que cubre solo el área de juego
        const overlayBg = new Graphics();
        overlayBg.rect(0, UI_HEIGHT, CANVAS_WIDTH, CANVAS_HEIGHT);
        overlayBg.fill({ color: 0x000000, alpha: 0.75 });
        this.gameOverContainer.addChild(overlayBg);

        // Texto principal "GAME OVER"
        const gameOverTitle = new Text({
            text: 'GAME OVER',
            style: {
                fontFamily: 'Arial, sans-serif',
                fontSize: 48,
                fontWeight: 'bold',
                fill: 0xe74c3c,
                dropShadow: {
                    alpha: 0.5,
                    angle: Math.PI / 4,
                    blur: 4,
                    color: 0x000000,
                    distance: 4,
                },
            },
        });
        gameOverTitle.anchor.set(0.5);
        gameOverTitle.x = CANVAS_WIDTH / 2;
        gameOverTitle.y = UI_HEIGHT + CANVAS_HEIGHT / 2 - 60;
        this.gameOverContainer.addChild(gameOverTitle);

        // Texto del ganador (solo visible en modo 2 jugadores)
        this.winnerText = new Text({
            text: '',
            style: {
                fontFamily: 'Arial, sans-serif',
                fontSize: 26,
                fontWeight: 'bold',
                fill: 0x2ecc71,
            },
        });
        this.winnerText.anchor.set(0.5);
        this.winnerText.x = CANVAS_WIDTH / 2;
        this.winnerText.y = UI_HEIGHT + CANVAS_HEIGHT / 2 - 10;
        this.gameOverContainer.addChild(this.winnerText);

        // Texto de puntaje final (se actualiza al mostrar el overlay)
        this.finalScoreText = new Text({
            text: '',
            style: {
                fontFamily: 'Arial, sans-serif',
                fontSize: 22,
                fill: 0xecf0f1,
            },
        });
        this.finalScoreText.anchor.set(0.5);
        this.finalScoreText.x = CANVAS_WIDTH / 2;
        this.finalScoreText.y = UI_HEIGHT + CANVAS_HEIGHT / 2 + 30;
        this.gameOverContainer.addChild(this.finalScoreText);

        // Instrucción para reiniciar
        const restartText = new Text({
            text: 'Presioná SPACE para volver al menú',
            style: {
                fontFamily: 'Arial, sans-serif',
                fontSize: 18,
                fill: 0x7f8c8d,
            },
        });
        restartText.anchor.set(0.5);
        restartText.x = CANVAS_WIDTH / 2;
        restartText.y = UI_HEIGHT + CANVAS_HEIGHT / 2 + 75;
        this.gameOverContainer.addChild(restartText);
    }

    // ── Métodos públicos ─────────────────────────────────────

    /**
     * Actualiza el contador de manzanas en el HUD (modo 1 jugador).
     * @param {number} score
     */
    updateScore(score) {
        if (!this.isTwoPlayer && this.scoreText) {
            this.scoreText.text = `🍎 ${score}`;
        }
    }

    /**
     * Actualiza los scores en modo 2 jugadores.
     * @param {number} score1 - Score del jugador 1
     * @param {number} score2 - Score del jugador 2
     */
    updateScores(score1, score2) {
        if (this.isTwoPlayer) {
            this.score1Text.text = `J1: ${score1} 🍎`;
            this.score2Text.text = `J2: ${score2} 🍎`;
        }
    }

    /**
     * Muestra el overlay de Game Over con el puntaje final.
     * En modo 2 jugadores, también muestra quién ganó.
     * @param {number} score - Score final (o score1 en modo 2P)
     * @param {string} [winner] - Texto del ganador (solo en modo 2P). Ej: 'Ganó Jugador 1', 'Empate'
     * @param {number} [score2] - Score del jugador 2 (solo en modo 2P)
     */
    showGameOver(score, winner = '', score2 = null) {
        this.winnerText.text = winner;
        
        if (this.isTwoPlayer && score2 !== null) {
            this.finalScoreText.text = `J1: ${score} manzanas  |  J2: ${score2} manzanas`;
        } else {
            this.finalScoreText.text = `Manzanas comidas: ${score}`;
        }
        
        // Empuja el contenedor de Game Over al final de la lista de hijos del stage,
        // asegurando que se dibuje por encima de las serpientes u otros elementos dinámicos.
        if (this.gameOverContainer.parent) {
            this.gameOverContainer.parent.addChild(this.gameOverContainer);
        }

        this.gameOverContainer.visible = true;
    }

    /** Oculta el overlay de Game Over */
    hideGameOver() {
        this.gameOverContainer.visible = false;
    }

    /** Elimina todos los elementos de UI del stage */
    destroy() {
        this.hudContainer.destroy({ children: true });
        this.gameOverContainer.destroy({ children: true });
    }
}
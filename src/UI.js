// ============================================================
// UI.js — Interfaz de usuario (HUD)
// ============================================================
// Gestiona todos los elementos de UI:
//   • Barra superior con el contador de manzanas
//   • Overlay de Game Over con instrucción para reiniciar
//
// TODO: se puede ampliar con: nivel, velocidad, mejor puntaje,
//   animaciones de transición, sonidos, etc.

import { Container, Graphics, Text } from 'pixi.js';
import { CANVAS_WIDTH, CANVAS_HEIGHT, UI_HEIGHT } from './Grid.js';

export class UI {
    /**
     * @param {import('pixi.js').Container} stage - Stage principal de Pixi
     */
    constructor(stage) {
        // ── Barra superior (HUD) ──────────────────────────────
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
            text: 'WASD / ↑↓←→',
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
        gameOverTitle.y = UI_HEIGHT + CANVAS_HEIGHT / 2 - 40;
        this.gameOverContainer.addChild(gameOverTitle);

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
        this.finalScoreText.y = UI_HEIGHT + CANVAS_HEIGHT / 2 + 10;
        this.gameOverContainer.addChild(this.finalScoreText);

        // Instrucción para reiniciar
        const restartText = new Text({
            text: 'Presioná SPACE para reiniciar',
            style: {
                fontFamily: 'Arial, sans-serif',
                fontSize: 18,
                fill: 0x7f8c8d,
            },
        });
        restartText.anchor.set(0.5);
        restartText.x = CANVAS_WIDTH / 2;
        restartText.y = UI_HEIGHT + CANVAS_HEIGHT / 2 + 55;
        this.gameOverContainer.addChild(restartText);
    }

    // ── Métodos públicos ──────────────────────────────────────

    /**
     * Actualiza el contador de manzanas en el HUD.
     * @param {number} score
     */
    updateScore(score) {
        this.scoreText.text = `🍎 ${score}`;
    }

    /**
     * Muestra el overlay de Game Over con el puntaje final.
     * @param {number} score
     */
    showGameOver(score) {
        this.finalScoreText.text = `Comiste ${score} manzana${score !== 1 ? 's' : ''}`;
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

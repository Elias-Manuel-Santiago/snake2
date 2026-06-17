// ============================================================
// UI.js — Interfaz de usuario (HUD) y Efectos Visuales
// ============================================================
import { Container, Graphics, Text } from 'pixi.js';
import { CANVAS_WIDTH, CANVAS_HEIGHT, UI_HEIGHT, GRID_COLS, GRID_ROWS, CELL_SIZE } from './Grid.js';

export class UI {
    /**
     * @param {import('pixi.js').Container} stage - Stage principal de Pixi
     * @param {boolean} [isTwoPlayer=false] - true si es modo 2 jugadores
     * @param {import('./Game.js').Game} gameInstance - Instancia del juego principal
     */
    constructor(stage, isTwoPlayer = false, gameInstance = null) {
        this.isTwoPlayer = isTwoPlayer;
        this.game = gameInstance;

        // Variables para la animación gradual del borde (Pulso Dorado)
        this.flashTimer = 0;
        this.isFlashing = false;
        this.flashDuration = 1500; // Duración total del efecto (1.5 segundos)

        // Guardamos una referencia al stage para poder añadir elementos correctamente
        this.stage = stage;

        // ── CREACIÓN DEL FONDO (Movido desde Game.js) ─────────
        this.background = new Graphics();
        this.background.zIndex = 1;
        this.drawBackground(0x2ecc71, 0.4); // Dibujo inicial con el verde clásico
        this.stage.addChildAt(this.background, 0);

        // ── Barra superior (HUD) ─────────────────────────────
        this.hudContainer = new Container();
        stage.addChild(this.hudContainer);

        const hudBg = new Graphics();
        hudBg.rect(0, 0, CANVAS_WIDTH, UI_HEIGHT);
        hudBg.fill(0x1a1a2e);
        this.hudContainer.addChild(hudBg);

        const separator = new Graphics();
        separator.rect(0, UI_HEIGHT - 2, CANVAS_WIDTH, 2);
        separator.fill(0x2ecc71);
        this.hudContainer.addChild(separator);

        if (!isTwoPlayer) {
            this.scoreText = new Text({
                text: '🍎 0',
                style: { fontFamily: 'Arial, sans-serif', fontSize: 22, fontWeight: 'bold', fill: 0xffffff }
            });
            this.scoreText.x = 16;
            this.scoreText.y = (UI_HEIGHT - this.scoreText.height) / 2;
            this.hudContainer.addChild(this.scoreText);

            const helpText = new Text({
                text: 'Moverse: W A S D',
                style: { fontFamily: 'Arial, sans-serif', fontSize: 14, fill: 0x7f8c8d }
            });
            helpText.anchor.set(1, 0.5);
            helpText.x = CANVAS_WIDTH - 60;
            helpText.y = UI_HEIGHT / 2;
            this.hudContainer.addChild(helpText);

            this.levelText = new Text({
                text: 'Nivel 1  0/5',
                style: { fontFamily: 'Arial, sans-serif', fontSize: 16, fontWeight: 'bold', fill: 0x2ecc71 }
            });
            this.levelText.anchor.set(0.5, 0.5);
            this.levelText.x = CANVAS_WIDTH / 2;
            this.levelText.y = UI_HEIGHT / 2;
            this.hudContainer.addChild(this.levelText);
        } else {
            this.score1Text = new Text({
                text: 'J1: 0',
                style: { fontFamily: 'Arial, sans-serif', fontSize: 18, fontWeight: 'bold', fill: 'red' }
            });
            this.score1Text.x = 16;
            this.score1Text.y = (UI_HEIGHT - this.score1Text.height) / 2;
            this.hudContainer.addChild(this.score1Text);

            this.score2Text = new Text({
                text: 'J2: 0',
                style: { fontFamily: 'Arial, sans-serif', fontSize: 18, fontWeight: 'bold', fill: 'blue' }
            });
            this.score2Text.anchor.set(1, 0.5);
            this.score2Text.x = CANVAS_WIDTH - 60;
            this.score2Text.y = UI_HEIGHT / 2;
            this.hudContainer.addChild(this.score2Text);

            const helpText = new Text({
                text: 'J1: WASD Dash: LeftShift    J2: IJKL Dash: B',
                style: { fontFamily: 'Arial, sans-serif', fontSize: 12, fill: 0x7f8c8d }
            });
            helpText.anchor.set(0.5, 1);
            helpText.x = CANVAS_WIDTH / 2;
            helpText.y = UI_HEIGHT - 2;
            this.hudContainer.addChild(helpText);
        }

        // Botón visible de pausa
        if (this.game) {
            this.pauseButton = new Container();
            this.pauseButton.x = CANVAS_WIDTH - 40;
            this.pauseButton.y = (UI_HEIGHT - 30) / 2;

            const btnBg = new Graphics().rect(0, 0, 30, 30).fill({ color: 0x2c3e50, alpha: 0.8 });
            const btnIcon = new Text({ text: '⏸', style: { fontFamily: 'Arial', fontSize: 16, fill: 0xffffff } });
            btnIcon.anchor.set(0.5);
            btnIcon.x = 15;
            btnIcon.y = 15;

            this.pauseButton.addChild(btnBg, btnIcon);
            this.pauseButton.interactive = true;
            this.pauseButton.cursor = 'pointer';
            this.pauseButton.on('pointerdown', () => this.game.togglePause());
            this.hudContainer.addChild(this.pauseButton);
        }

        const titleStyleBase = {
            fontFamily: 'Arial, sans-serif',
            fontSize: 48,
            fontWeight: 'bold',
            dropShadow: { alpha: 0.5, angle: Math.PI / 4, blur: 4, color: 0x000000, distance: 4 }
        };
        const subTextStyle = { fontFamily: 'Arial, sans-serif', fontSize: 22, fill: 0xecf0f1 };
        const restartStyle = { fontFamily: 'Arial, sans-serif', fontSize: 16, fill: 0x95a5a6 };

        // Overlay Game Over
        this.gameOverContainer = new Container();
        this.gameOverContainer.visible = false;
        this.gameOverContainer.zIndex = 10;
        stage.addChild(this.gameOverContainer);

        const bgGameOver = new Graphics().rect(0, UI_HEIGHT, CANVAS_WIDTH, CANVAS_HEIGHT).fill({ color: 0x000000, alpha: 0.75 });
        this.gameOverContainer.addChild(bgGameOver);

        const gameOverTitle = new Text({ text: 'GAME OVER', style: { ...titleStyleBase, fill: 0xe74c3c } });
        gameOverTitle.anchor.set(0.5);
        gameOverTitle.x = CANVAS_WIDTH / 2;
        gameOverTitle.y = UI_HEIGHT + CANVAS_HEIGHT / 2 - 60;
        this.gameOverContainer.addChild(gameOverTitle);

        this.winnerText = new Text({ text: '', style: { fontFamily: 'Arial, sans-serif', fontSize: 26, fontWeight: 'bold', fill: 0x2ecc71 } });
        this.winnerText.anchor.set(0.5);
        this.winnerText.x = CANVAS_WIDTH / 2;
        this.winnerText.y = UI_HEIGHT + CANVAS_HEIGHT / 2 - 10;
        this.gameOverContainer.addChild(this.winnerText);

        this.finalScoreText = new Text({ text: '', style: subTextStyle });
        this.finalScoreText.anchor.set(0.5);
        this.finalScoreText.x = CANVAS_WIDTH / 2;
        this.finalScoreText.y = UI_HEIGHT + CANVAS_HEIGHT / 2 + 30;
        this.gameOverContainer.addChild(this.finalScoreText);

        const restartText = new Text({ text: 'Presioná R para reiniciar o SPACE para el menú', style: restartStyle });
        restartText.anchor.set(0.5);
        restartText.x = CANVAS_WIDTH / 2;
        restartText.y = UI_HEIGHT + CANVAS_HEIGHT / 2 + 80;
        this.gameOverContainer.addChild(restartText);

        // Overlay Win
        this.gameWinContainer = new Container();
        this.gameWinContainer.visible = false;
        this.gameWinContainer.zIndex = 11;
        stage.addChild(this.gameWinContainer);

        const bgWin = new Graphics().rect(0, UI_HEIGHT, CANVAS_WIDTH, CANVAS_HEIGHT).fill({ color: 0x000000, alpha: 0.75 });
        this.gameWinContainer.addChild(bgWin);

        const gameWinTitle = new Text({ text: 'VICTORIA', style: { ...titleStyleBase, fill: 0xF5D327 } });
        gameWinTitle.anchor.set(0.5);
        gameWinTitle.x = CANVAS_WIDTH / 2;
        gameWinTitle.y = UI_HEIGHT + CANVAS_HEIGHT / 2 - 60;
        this.gameWinContainer.addChild(gameWinTitle);

        this.finalWinScoreText = new Text({ text: '', style: subTextStyle });
        this.finalWinScoreText.anchor.set(0.5);
        this.finalWinScoreText.x = CANVAS_WIDTH / 2;
        this.finalWinScoreText.y = UI_HEIGHT + CANVAS_HEIGHT / 2 + 10;
        this.gameWinContainer.addChild(this.finalWinScoreText);

        const restartTextWin = new Text({ text: 'Presioná R para reiniciar o SPACE para el menú', style: restartStyle });
        restartTextWin.anchor.set(0.5);
        restartTextWin.x = CANVAS_WIDTH / 2;
        restartTextWin.y = UI_HEIGHT + CANVAS_HEIGHT / 2 + 70;
        this.gameWinContainer.addChild(restartTextWin);

        // Overlay Pausa
        this.pauseContainer = new Container();
        this.pauseContainer.visible = false;
        this.pauseContainer.zIndex = 12;
        stage.addChild(this.pauseContainer);

        const bgPause = new Graphics().rect(0, UI_HEIGHT, CANVAS_WIDTH, CANVAS_HEIGHT).fill({ color: 0x000000, alpha: 0.65 });
        this.pauseContainer.addChild(bgPause);

        const pauseTitle = new Text({ text: 'JUEGO PAUSADO', style: { ...titleStyleBase, fill: 0x3498db, fontSize: 38 } });
        pauseTitle.anchor.set(0.5);
        pauseTitle.x = CANVAS_WIDTH / 2;
        pauseTitle.y = UI_HEIGHT + CANVAS_HEIGHT / 2 - 40;
        this.pauseContainer.addChild(pauseTitle);

        const pauseSubText = new Text({
            text: 'Presioná P o ESC para reanudar\nPresioná M para ir al menú principal',
            style: { ...subTextStyle, fontSize: 16, align: 'center' }
        });
        pauseSubText.anchor.set(0.5);
        pauseSubText.x = CANVAS_WIDTH / 2;
        pauseSubText.y = UI_HEIGHT + CANVAS_HEIGHT / 2 + 20;
        this.pauseContainer.addChild(pauseSubText);

        if (this.game) {
            const menuBtnContainer = new Container();
            menuBtnContainer.x = CANVAS_WIDTH / 2;
            menuBtnContainer.y = UI_HEIGHT + CANVAS_HEIGHT / 2 + 85;

            const btnBg = new Graphics();
            btnBg.roundRect(-80, -18, 160, 36, 6);
            btnBg.fill(0xc0392b);
            btnBg.stroke({ color: 0xe74c3c, width: 2 });

            const btnText = new Text({
                text: 'Salir al Menú',
                style: { fontFamily: 'Arial, sans-serif', fontSize: 14, fontWeight: 'bold', fill: 0xffffff }
            });
            btnText.anchor.set(0.5);

            menuBtnContainer.addChild(btnBg, btnText);
            menuBtnContainer.interactive = true;
            menuBtnContainer.cursor = 'pointer';

            menuBtnContainer.on('pointerover', () => btnBg.fill(0xe74c3c));
            menuBtnContainer.on('pointerout', () => btnBg.fill(0xc0392b));
            menuBtnContainer.on('pointerdown', () => this.game.menu());

            this.pauseContainer.addChild(menuBtnContainer);
        }
    }

    // ── MÉTODOS ATOMIZADOS PARA EL RENDER DEL FONDO Y GRILLES ─────

    /**
     * Dibuja de manera limpia el fondo completo con la grilla y el borde personalizado.
     */
    drawBackground(borderColor, borderAlpha) {
        this.background.clear();

        // Área oscura de juego
        this.background.rect(0, UI_HEIGHT, CANVAS_WIDTH, CANVAS_HEIGHT);
        this.background.fill(0x0d1117);

        // Grilla interna sutil
        for (let col = 0; col <= GRID_COLS; col++) {
            const x = col * CELL_SIZE;
            this.background.moveTo(x, UI_HEIGHT).lineTo(x, UI_HEIGHT + CANVAS_HEIGHT);
        }
        for (let row = 0; row <= GRID_ROWS; row++) {
            const y = row * CELL_SIZE + UI_HEIGHT;
            this.background.moveTo(0, y).lineTo(CANVAS_WIDTH, y);
        }
        this.background.stroke({ color: 0x1e2a3a, width: 1, alpha: 0.9 });

        // Borde exterior dinámico
        this.background.rect(0, UI_HEIGHT, CANVAS_WIDTH, CANVAS_HEIGHT);
        this.background.stroke({ color: borderColor, width: 2, alpha: borderAlpha });
    }


    // ── Métodos públicos base del HUD ───────────────────────

    updateScore(score) {
        if (!this.isTwoPlayer && this.scoreText) {
            this.scoreText.text = `🍎 ${score}`;
        }
    }

    updateLevel(level, current, required) {
        if (!this.isTwoPlayer && this.levelText) {
            this.levelText.text = `Nivel ${level}   ${current}/${required === Infinity ? '-' : required}`;
        }
    }

    updateScores(score1, score2) {
        if (this.isTwoPlayer) {
            this.score1Text.text = `J1: ${score1} 🍎`;
            this.score2Text.text = `J2: ${score2} 🍎`;
        }
    }

    showPauseOverlay(visible) {
        if (visible && this.pauseContainer.parent) {
            this.pauseContainer.parent.addChild(this.pauseContainer);
        }
        this.pauseContainer.visible = visible;
    }

    showGameOver(score, winner = '', score2 = null) {
        this.winnerText.text = winner;

        if (this.isTwoPlayer && score2 !== null) {
            this.finalScoreText.text = `J1: ${score} manzanas  |  J2: ${score2} manzanas`;
        } else {
            this.finalScoreText.text = `Manzanas comidas: ${score}`;
        }

        if (this.gameOverContainer.parent) {
            this.gameOverContainer.parent.addChild(this.gameOverContainer);
        }

        this.gameOverContainer.visible = true;
        this.gameWinContainer.visible = false;
        this.showPauseOverlay(false);
    }

    showGameWin(score) {
        this.finalWinScoreText.text = `Manzanas totales: ${score}`;

        if (this.gameWinContainer.parent) {
            this.gameWinContainer.parent.addChild(this.gameWinContainer);
        }

        this.gameWinContainer.visible = true;
        this.gameOverContainer.visible = false;
        this.showPauseOverlay(false);
    }

    hideGameOver() {
        this.gameOverContainer.visible = false;
        this.gameWinContainer.visible = false;
        this.pauseContainer.visible = false;
    }

    destroy() {
        if (this.background) this.background.destroy();
        this.hudContainer.destroy({ children: true });
        this.gameOverContainer.destroy({ children: true });
        this.gameWinContainer.destroy({ children: true });
        this.pauseContainer.destroy({ children: true });
    }
}
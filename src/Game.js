// ============================================================
// Game.js — Controlador principal del juego
// ============================================================

import { Graphics } from 'pixi.js';
import { Snake, DIRECTION, SNAKE_COLORS } from './Snake.js';
import { Apple } from './Apple.js';
import { UI } from './UI.js';
import { Leaderboard } from './Leaderboard.js';
import { Menu } from './Menu.js';
import {
    GRID_COLS, GRID_ROWS,
    CELL_SIZE,
    CANVAS_WIDTH, CANVAS_HEIGHT,
    UI_HEIGHT,
    MOVE_INTERVAL,
    LEVELS,
} from './Grid.js';

const STATE = {
    PLAYING: 'playing',
    GAME_OVER: 'game_over',
    MENU: 'menu',
    PAUSED: 'paused', // ← NUEVO ESTADO
};

let nivelActual = 0;

export class Game {
    /**
     * @param {import('pixi.js').Application} app - Instancia de Pixi Application
     */
    constructor(app) {
        this.app = app;
        this.state = STATE.MENU;
        this.leaderboard = new Leaderboard();
        this.score = 0;
        this.score2 = 0;
        this.isTwoPlayerMode = false; // ← Flag para saber qué modo reiniciar

        this.timeSinceLastMove = 0;

        this.setupInput();
        this.menu();

        this._onTick = (ticker) => this.update(ticker);
        this.app.ticker.add(this._onTick);

        this.app.stage.sortableChildren = true;
    }

    // ── Ciclo de vida ─────────────────────────────────────────

    menu() {
        this.clearScene();
        this.state = STATE.MENU;
        this.leaderboard.container.style.width = '280px';
        this.leaderboard.showNameInput(true);
        this.leaderboard.currentUsername = '';
        this.leaderboard.render();

        this.leaderboard.showNameInput(true);

        this.menuScreen = new Menu(this.app.stage, (mode) => {
            if (mode === '1p') {
                if (!this.leaderboard.getPlayerName()) {
                    const inputEl = document.getElementById('player-name-input');
                    if (inputEl) inputEl.focus();

                    const errorEl = document.getElementById('leaderboard-error');
                    if (errorEl) errorEl.style.display = 'block';
                    return;
                }

                this.menuScreen.destroy();
                this.menuScreen = null;
                this.isTwoPlayerMode = false;
                this.start();
            }

            if (mode === '2p') {
                this.menuScreen.destroy();
                this.menuScreen = null;
                this.leaderboard.container.innerHTML = '';
                this.leaderboard.container.style.width = 0;
                this.isTwoPlayerMode = true;
                this.start2P();
            }
        });
    }

    start() {
        this.levelScore = 0;
        this.clearScene();

        this.leaderboard.showNameInput(false);
        this.levelScore = 0;

        this.level = 0;
        this.score = 0;
        this.state = STATE.PLAYING;

        this.createBackground();
        // Le pasamos `this` a la UI para que el botón de pausa pueda llamar a métodos de Game
        this.ui = new UI(this.app.stage, false, this);

        const startX = Math.floor(GRID_COLS / 2);
        const startY = Math.floor(GRID_ROWS / 2);

        this.snake = new Snake(this.app.stage, startX, startY, {
            moveInterval: LEVELS[this.level].moveInterval
        });

        this.apple = new Apple(this.app.stage);
        this.apple.randomize(this.snake.segments);

        this.ui.updateScore(this.score);
        this.ui.updateLevel(this.level + 1, 0, LEVELS[this.level].applesRequired);
    }

    start2P() {
        this.clearScene();

        this.score = 0;
        this.score2 = 0;
        this.state = STATE.PLAYING;

        this.createBackground();
        this.ui = new UI(this.app.stage, true, this);

        this.snake = new Snake(
            this.app.stage,
            Math.floor(GRID_COLS / 6),
            Math.floor(GRID_ROWS / 6),
            { wrap: true, direction: DIRECTION.RIGHT, colors: SNAKE_COLORS.RED, moveInterval: 150 }
        );

        this.snake2 = new Snake(
            this.app.stage,
            Math.floor(GRID_COLS * 4 / 5),
            Math.floor(GRID_ROWS * 4 / 5),
            { wrap: true, direction: DIRECTION.LEFT, colors: SNAKE_COLORS.BLUE, moveInterval: 150 }
        );

        this.apple = new Apple(this.app.stage);
        this.apple.randomize([...this.snake.segments, ...this.snake2.segments]);

        this.ui.updateScores(this.score, this.score2);
    }

    /** Alterna el estado de pausa */
    togglePause() {
        if (this.state === STATE.PLAYING) {
            this.state = STATE.PAUSED;
            this.ui.showPauseOverlay(true);
        } else if (this.state === STATE.PAUSED) {
            this.state = STATE.PLAYING;
            this.ui.showPauseOverlay(false);
        }
    }

    /** Método para reiniciar la partida actual directamente */
    restartGame() {
        if (this.isTwoPlayerMode) {
            this.start2P();
        } else {
            this.start();
        }
    }

    clearScene() {
        if (this.snake) this.snake.destroy();
        if (this.snake2) this.snake2.destroy();
        if (this.apple) this.apple.destroy();
        if (this.ui) this.ui.destroy();
        if (this.background) this.background.destroy();
        if (this.menuScreen) this.menuScreen.destroy();

        this.snake = null;
        this.snake2 = null;
        this.apple = null;
        this.ui = null;
        this.background = null;
        this.menuScreen = null;
    }

    createBackground() {
        this.background = new Graphics();
        this.background.zIndex = 1;

        this.background.rect(0, UI_HEIGHT, CANVAS_WIDTH, CANVAS_HEIGHT);
        this.background.fill(0x0d1117);

        for (let col = 0; col <= GRID_COLS; col++) {
            const x = col * CELL_SIZE;
            this.background.moveTo(x, UI_HEIGHT);
            this.background.lineTo(x, UI_HEIGHT + CANVAS_HEIGHT);
        }

        for (let row = 0; row <= GRID_ROWS; row++) {
            const y = row * CELL_SIZE + UI_HEIGHT;
            this.background.moveTo(0, y);
            this.background.lineTo(CANVAS_WIDTH, y);
        }

        this.background.stroke({ color: 0x1e2a3a, width: 1, alpha: 0.9 });
        this.background.rect(0, UI_HEIGHT, CANVAS_WIDTH, CANVAS_HEIGHT);
        this.background.stroke({ color: 0x2ecc71, width: 2, alpha: 0.4 });

        this.app.stage.addChildAt(this.background, 0);
    }

    // ── Input ─────────────────────────────────────────────────

    setupInput() {
        window.addEventListener('keydown', (e) => {
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'Escape'].includes(e.key)) {
                e.preventDefault();
            }

            // Si está en GAME OVER, SPACE va al menú y R reinicia
            if (this.state === STATE.GAME_OVER || this.state === STATE.PAUSED) {
                if (e.code === 'Space') this.menu();
                if (e.code === 'KeyR') this.restartGame();
                return;
            }

            // Control de pausa por teclado (Teclas Escape o P)
            if ((e.code === 'Escape' || e.code === 'KeyP') && (this.state === STATE.PLAYING || this.state === STATE.PAUSED)) {
                this.togglePause();
                return;
            }

            if (this.state !== STATE.PLAYING) return;



            // Jugador 1: WASD o flechas
            switch (e.code) {
                case 'KeyW': this.snake.setDirection(DIRECTION.UP); break;
                case 'KeyS': this.snake.setDirection(DIRECTION.DOWN); break;
                case 'KeyA': this.snake.setDirection(DIRECTION.LEFT); break;
                case 'KeyD': this.snake.setDirection(DIRECTION.RIGHT); break;
                case 'ShiftLeft':
                    if (this.snake2) this.snake.dash = true;
                    break;
            }

            // Jugador 2: IJKL
            if (this.snake2) {
                switch (e.code) {
                    case 'KeyI': this.snake2.setDirection(DIRECTION.UP); break;
                    case 'KeyK': this.snake2.setDirection(DIRECTION.DOWN); break;
                    case 'KeyJ': this.snake2.setDirection(DIRECTION.LEFT); break;
                    case 'KeyL': this.snake2.setDirection(DIRECTION.RIGHT); break;
                    case 'KeyB': this.snake2.dash = true; break;
                }
            }
        });

        window.addEventListener('keyup', (e) => {
            if (this.snake2) {
                switch (e.code) {
                    case 'ShiftLeft': this.snake.dash = false; break;
                    case 'KeyB': this.snake2.dash = false; break;
                }
            }
        });

        let touchStartX = 0;
        let touchStartY = 0;

        window.addEventListener('touchstart', (e) => {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
        }, { passive: true });

        window.addEventListener('touchend', (e) => {
            const dx = e.changedTouches[0].clientX - touchStartX;
            const dy = e.changedTouches[0].clientY - touchStartY;

            if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;

            if (this.state === STATE.GAME_OVER) { this.menu(); return; }
            if (this.state !== STATE.PLAYING) return;

            if (Math.abs(dx) > Math.abs(dy)) {
                this.snake.setDirection(dx > 0 ? DIRECTION.RIGHT : DIRECTION.LEFT);
            } else {
                this.snake.setDirection(dy > 0 ? DIRECTION.DOWN : DIRECTION.UP);
            }
        }, { passive: true });
    }

    update(ticker) {
        if (this.state !== STATE.PLAYING) return; // Detiene la lógica si está pausado o en Game Over

        // 1. ACTUALIZACIÓN DE TIEMPOS INDEPENDIENTES
        this.snake.updateTick(ticker.deltaMS);
        if (this.snake2) {
            this.snake2.updateTick(ticker.deltaMS);
        }

        const p1 = this.snake.currentProgress;
        const p2 = this.snake2 ? this.snake2.currentProgress : 0;

        // 2. VERIFICACIÓN DE COLISIONES INTERPOLADAS
        if (this.state === STATE.PLAYING) {
            let ate1 = false;
            let ate2 = false;

            if (this.snake.checkCollisionApple(this.apple, p1)) {
                ate1 = true;
                this.score++;
                this.levelScore++;
            }
            if (this.snake2 && this.snake2.checkCollisionApple(this.apple, p2)) {
                ate2 = true;
                this.score2++;
            }

            if (ate1 || ate2) {
                if (this.snake2) {
                    this.ui.updateScores(this.score, this.score2);
                    this.apple.randomize([...this.snake.segments, ...this.snake2.segments]);
                } else {
                    this.ui.updateScore(this.score);

                    const nextLevel = this.level + 1;
                    if (this.levelScore >= LEVELS[this.level].applesRequired) {
                        this.level = nextLevel;
                        this.levelScore = 0;
                        this.snake.moveInterval = LEVELS[this.level].moveInterval;

                    }
                    if (this.snake.segments.length == GRID_COLS * GRID_ROWS) {
                        this.state = STATE.GAME_OVER;
                    }


                    this.ui.updateLevel(this.level + 1, this.levelScore, LEVELS[this.level].applesRequired);
                    this.apple.randomize(this.snake.segments);
                }
            }

            if (this.snake2) {
                const head1Pos = this.snake.getInterPos(p1, this.snake.segments[0]);
                const head2Pos = this.snake2.getInterPos(p2, this.snake2.segments[0]);

                const dx = head1Pos.x - head2Pos.x;
                const dy = head1Pos.y - head2Pos.y;
                const distCabezas = dx * dx + dy * dy;
                const umbralCabezas = 0.6;

                if (distCabezas < umbralCabezas * umbralCabezas) {
                    let winnerText = '';
                    if (this.score > this.score2) winnerText = '¡Ganó el Jugador 1! (Más manzanas)';
                    else if (this.score2 > this.score) winnerText = '¡Ganó el Jugador 2! (Más manzanas)';
                    else winnerText = '¡Empate absoluto!';

                    this.state = STATE.GAME_OVER;
                    this.ui.showGameOver(this.score, winnerText, this.score2);
                }

                if (this.state === STATE.PLAYING) {
                    let j1ChocoRival = false;
                    const toleranciaCuadrado = 0.25;
                    for (let i = 0; i < this.snake2.segments.length; i++) {
                        const segPos = this.snake2.getInterPos(p2, this.snake2.segments[i]);
                        const dist = (head1Pos.x - segPos.x) ** 2 + (head1Pos.y - segPos.y) ** 2;
                        if (dist < toleranciaCuadrado) j1ChocoRival = true;
                    }

                    let j2ChocoRival = false;
                    for (let i = 0; i < this.snake.segments.length; i++) {
                        const segPos = this.snake.getInterPos(p1, this.snake.segments[i]);
                        const dist = (head2Pos.x - segPos.x) ** 2 + (head2Pos.y - segPos.y) ** 2;
                        if (dist < toleranciaCuadrado) j2ChocoRival = true;
                    }

                    const j1ChocoMismo = this.snake.segments.slice(1).some(seg => this.snake.segments[0].x === seg.x && this.snake.segments[0].y === seg.y);
                    const j2ChocoMismo = this.snake2.segments.slice(1).some(seg => this.snake2.segments[0].x === seg.x && this.snake2.segments[0].y === seg.y);

                    const p1Perdio = j1ChocoRival || j1ChocoMismo;
                    const p2Perdio = j2ChocoRival || j2ChocoMismo;

                    if (p1Perdio && p2Perdio) {
                        let winnerText = this.score === this.score2 ? '¡Empate absoluto!' :
                            (this.score > this.score2 ? '¡Ganó el Jugador 1! (Más manzanas)' : '¡Ganó el Jugador 2! (Más manzanas)');
                        this.state = STATE.GAME_OVER;
                        this.ui.showGameOver(this.score, winnerText, this.score2);
                    }
                    else if (p1Perdio) {
                        this.state = STATE.GAME_OVER;
                        this.ui.showGameOver(this.score, '¡Ganó el Jugador 2!', this.score2);
                    }
                    else if (p2Perdio) {
                        this.state = STATE.GAME_OVER;
                        this.ui.showGameOver(this.score, '¡Ganó el Jugador 1!', this.score2);
                    }
                }
            } else {
                if (this.snake.checkCollision(GRID_COLS, GRID_ROWS, false, [], p1)) {
                    this.state = STATE.GAME_OVER;
                    this.leaderboard.saveScore(this.score);
                    this.ui.showGameOver(this.score); // Usando showGameWin según la UI provista

                }
            }
        }

        // 3. RENDER
        if (this.state === STATE.PLAYING) {
            this.snake.render(p1);
            if (this.snake2) this.snake2.render(p2);
        }

    }

    destroy() {
        this.app.ticker.remove(this._onTick);
        this.clearScene();
    }
}
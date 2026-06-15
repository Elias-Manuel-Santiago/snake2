// ============================================================
// Game.js — Controlador principal del juego
// ============================================================
// Orquesta todos los sistemas:
//   • Estado de juego (jugando / game over)
//   • Tick de lógica con intervalo fijo
//   • Render con interpolación cada frame
//   • Input de teclado
//   • Creación y destrucción de entidades
//
// La separación entre "tick" (lógica) y "frame" (render) es la clave
// del movimiento fluido: la serpiente salta de celda en celda en cada
// tick, pero el render interpola la posición entre ticks a 60 fps.

import { Graphics } from 'pixi.js';
import { Snake, DIRECTION, SNAKE_COLORS } from './Snake.js';
import { Apple } from './Apple.js';
import { UI } from './UI.js';
import { Menu } from './Menu.js';
import {
    GRID_COLS, GRID_ROWS,
    CELL_SIZE,
    CANVAS_WIDTH, CANVAS_HEIGHT,
    UI_HEIGHT,
    MOVE_INTERVAL,
    LEVELS,
} from './Grid.js';

// Estados posibles del juego (agregar más según se necesite, ej. PAUSED)
const STATE = {
    PLAYING: 'playing',
    GAME_OVER: 'game_over',
    MENU: 'menu',
};

let nivelActual = 0; // nivel 1 por defecto

export class Game {
    /**
     * @param {import('pixi.js').Application} app - Instancia de Pixi Application
     */
    constructor(app) {
        this.app = app;
        this.state = STATE.MENU;
        this.score = 0;
        this.score2 = 0; // Score del jugador 2 en modo 2P

        /**
         * Acumulador de tiempo en milisegundos desde el último tick de lógica.
         * Cuando supera MOVE_INTERVAL se ejecuta un tick.
         */
        this.timeSinceLastMove = 0;

        // Registrar los listeners de teclado (solo una vez en toda la vida del juego)
        this.setupInput();

        // Arrancar en el menú de selección de modo
        this.menu();

        // Registrar el loop principal en el ticker de Pixi.
        // Se guarda como arrow function para poder removerlo con exactamente
        // la misma referencia en destroy().
        this._onTick = (ticker) => this.update(ticker);
        this.app.ticker.add(this._onTick);

        this.app.stage.sortableChildren = true;

    }

    // ── Ciclo de vida ─────────────────────────────────────────

    /** Muestra el menú de selección de modo de juego */
    menu() {
        this.clearScene();
        this.state = STATE.MENU;

        this.menuScreen = new Menu(this.app.stage, (mode) => {
            this.menuScreen.destroy();
            this.menuScreen = null;
            if (mode === '1p') this.start();
            if (mode === '2p') this.start2P();
        });
    }

    /**
     * Inicializa (o reinicializa) una partida de 1 jugador.
     * Destruye entidades anteriores, resetea estado y crea todo de cero.
     */
    start() {
        const savedLevel = this.level ?? 0;
        const savedScore = this.score ?? 0;
        this.levelScore = 0;

        this.clearScene();

        this.level = savedLevel;
        this.score = savedScore;
        this.score2 = 0;
        this.timeSinceLastMove = 0;
        this.moveInterval = LEVELS[this.level].moveInterval;
        this.state = STATE.PLAYING;
        this._pendingLevelUp = false;

        this.createBackground();
        this.ui = new UI(this.app.stage, false);

        const startX = Math.floor(GRID_COLS / 2);
        const startY = Math.floor(GRID_ROWS / 2);
        this.snake = new Snake(this.app.stage, startX, startY);

        this.apple = new Apple(this.app.stage);
        this.apple.randomize(this.snake.segments);

        this.ui.updateScore(this.score);
        this.ui.updateLevel(this.level + 1, 0, LEVELS[this.level].applesRequired);
    }

    /**
     * Inicializa una partida de 2 jugadores.
     * Ambas serpientes tienen wrap activado: no colisionan con los bordes
     * sino que salen por el lado opuesto.
     * Jugador 1 (verde):  WASD,  arranca en el cuarto izquierdo moviéndose a la derecha.
     * Jugador 2 (azul):   IJKL,  arranca en el cuarto derecho moviéndose a la izquierda.
     * Las serpientes sí pueden colisionar entre sí.
     */
    start2P() {
        this.clearScene();

        this.score = 0;
        this.score2 = 0;
        this.timeSinceLastMove = 0;
        this.state = STATE.PLAYING;
        this.moveInterval = LEVELS[0].moveInterval;

        // Fondo y grilla se dibujan primero (se agregarán como primer hijo del stage)
        this.createBackground();

        // UI se crea antes que las serpientes para que quede debajo visualmente
        // isTwoPlayer = true para modo 2 jugadores
        this.ui = new UI(this.app.stage, true);

        // Serpiente 1: lado izquierdo, roja
        this.snake = new Snake(
            this.app.stage,
            Math.floor(GRID_COLS / 6),
            Math.floor(GRID_ROWS / 6),
            { wrap: true, direction: DIRECTION.RIGHT, colors: SNAKE_COLORS.RED }
        );

        // Serpiente 2: lado derecho, azul
        this.snake2 = new Snake(
            this.app.stage,
            Math.floor(GRID_COLS * 4 / 5),
            Math.floor(GRID_ROWS * 4 / 5),
            { wrap: true, direction: DIRECTION.LEFT, colors: SNAKE_COLORS.BLUE }
        );

        // Manzana en posición aleatoria (nunca encima de ninguna serpiente)
        this.apple = new Apple(this.app.stage);
        this.apple.randomize([...this.snake.segments, ...this.snake2.segments]);

        this.ui.updateScores(this.score, this.score2);
    }

    /** Destruye todas las entidades activas y limpia el stage */
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

    // ── Construcción de la escena ─────────────────────────────

    /**
     * Dibuja el fondo oscuro y la cuadrícula decorativa.
     * Se agrega al stage como primer hijo para quedar detrás de todo.
     */
    createBackground() {
        this.background = new Graphics();

        this.background.zIndex = 1;

        // Relleno del área de juego
        this.background.rect(0, UI_HEIGHT, CANVAS_WIDTH, CANVAS_HEIGHT);
        this.background.fill(0x0d1117);

        // Líneas verticales de la grilla
        for (let col = 0; col <= GRID_COLS; col++) {
            const x = col * CELL_SIZE;
            this.background.moveTo(x, UI_HEIGHT);
            this.background.lineTo(x, UI_HEIGHT + CANVAS_HEIGHT);
        }

        // Líneas horizontales de la grilla
        for (let row = 0; row <= GRID_ROWS; row++) {
            const y = row * CELL_SIZE + UI_HEIGHT;
            this.background.moveTo(0, y);
            this.background.lineTo(CANVAS_WIDTH, y);
        }

        // Dibujar las líneas con un color muy sutil para no distraer
        this.background.stroke({ color: 0x1e2a3a, width: 1, alpha: 0.9 });

        // Borde del área de juego
        this.background.rect(0, UI_HEIGHT, CANVAS_WIDTH, CANVAS_HEIGHT);
        this.background.stroke({ color: 0x2ecc71, width: 2, alpha: 0.4 });

        // Insertar detrás de todo lo demás en el stage
        this.app.stage.addChildAt(this.background, 0);
    }

    // ── Input ─────────────────────────────────────────────────

    /** Registra el listener de teclado. Se llama una sola vez. */
    setupInput() {
        window.addEventListener('keydown', (e) => {
            // Prevenir scroll de la página con las flechas
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
                e.preventDefault();
            }

            // Si está en game over, solo SPACE vuelve al menú
            if (this.state === STATE.GAME_OVER) {
                if (e.code === 'Space') this.menu();
                return;
            }

            if (this.state !== STATE.PLAYING) return;

            // Jugador 1: WASD o flechas
            switch (e.code) {
                case 'KeyW': this.snake.setDirection(DIRECTION.UP); break;
                case 'KeyS': this.snake.setDirection(DIRECTION.DOWN); break;
                case 'KeyA': this.snake.setDirection(DIRECTION.LEFT); break;
                case 'KeyD': this.snake.setDirection(DIRECTION.RIGHT); break;
            }

            // Jugador 2: IJKL (solo en modo 2 jugadores)
            if (this.snake2) {
                switch (e.code) {
                    case 'KeyI': this.snake2.setDirection(DIRECTION.UP); break;
                    case 'KeyK': this.snake2.setDirection(DIRECTION.DOWN); break;
                    case 'KeyJ': this.snake2.setDirection(DIRECTION.LEFT); break;
                    case 'KeyL': this.snake2.setDirection(DIRECTION.RIGHT); break;
                }
            }
        });

        // Touch: detectar dirección del swipe (jugador 1 únicamente)
        let touchStartX = 0;
        let touchStartY = 0;

        window.addEventListener('touchstart', (e) => {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
        }, { passive: true });

        window.addEventListener('touchend', (e) => {
            const dx = e.changedTouches[0].clientX - touchStartX;
            const dy = e.changedTouches[0].clientY - touchStartY;

            // Ignorar toques que no sean swipes reales
            if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;

            if (this.state === STATE.GAME_OVER) { this.menu(); return; }
            if (this.state !== STATE.PLAYING) return;

            if (Math.abs(dx) > Math.abs(dy)) {
                // Swipe horizontal
                this.snake.setDirection(dx > 0 ? DIRECTION.RIGHT : DIRECTION.LEFT);
            } else {
                // Swipe vertical
                this.snake.setDirection(dy > 0 ? DIRECTION.DOWN : DIRECTION.UP);
            }
        }, { passive: true });
    }

    // ── Loop principal ────────────────────────────────────────

    /**
     * Se ejecuta cada frame (llamado por el ticker de Pixi).
     * Acumula el tiempo transcurrido y, cuando supera MOVE_INTERVAL,
     * ejecuta uno o más ticks de lógica de juego.
     * Luego llama a render() con el progreso de interpolación.
     *
     * @param {import('pixi.js').Ticker} ticker
     */
    update(ticker) {
        if (this.state !== STATE.PLAYING) return;
        this.timeSinceLastMove += ticker.deltaMS;
        let progress;

        // Procesar todos los ticks pendientes (Lógica pura)
        while (this.timeSinceLastMove >= this.moveInterval) {

            this.timeSinceLastMove -= this.moveInterval;

            // Avanzar serpiente(s)
            this.snake.move();
            if (this.snake2) {
                this.snake2.move();
            }
        }

        // Recalculamos el progreso final para el render y las colisiones de este frame
        progress = this.timeSinceLastMove / this.moveInterval;





        // ── VERIFICACIÓN DE COLISIONES INTERPOLADAS (CADA FRAME) ────────────────
        if (this.state === STATE.PLAYING) {
            let ate1 = false;
            let ate2 = false;
            if (this.snake.checkCollisionApple(this.apple, progress)) {
                ate1 = true;
                this.score++;
                this.levelScore++;
            } if (this.snake2.checkCollisionApple(this.apple, progress)) {
                ate2 = true;
                this.score2++;
            }
            // Actualizar HUD si alguien comió
            if (ate1 || ate2) {
                if (this.snake2) {
                    this.ui.updateScores(this.score, this.score2);
                    this.apple.randomize([...this.snake.segments, ...this.snake2.segments]);
                } else {
                    this.ui.updateScore(this.score);

                    const nextLevel = this.level + 1; {
                        this.level = nextLevel;
                        this._pendingLevelUp = true;
                    }

                    this.ui.updateLevel(this.level + 1, this.levelScore, LEVELS[this.level].applesRequired);
                    this.apple.randomize(this.snake.segments);
                }
            }
            if (this.snake2) {
                // ── MODO 2 JUGADORES ──────────────────────────
                const head1Pos = this.snake.getInterPos(progress, this.snake.segments[0]);
                const head2Pos = this.snake2.getInterPos(progress, this.snake2.segments[0]);

                // REGLA 1: Choque frontal de cabezas directo (Usando distancia interpolada de las cabezas)
                const dx = head1Pos.x - head2Pos.x;
                const dy = head1Pos.y - head2Pos.y;
                const distCabezas = dx * dx + dy * dy;
                const umbralCabezas = 0.6; // Tolerancia de choque frontal

                if (distCabezas < umbralCabezas * umbralCabezas) {
                    let winnerText = '';
                    if (this.score > this.score2) {
                        winnerText = '¡Ganó el Jugador 1! (Más manzanas)';
                    } else if (this.score2 > this.score) {
                        winnerText = '¡Ganó el Jugador 2! (Más manzanas)';
                    } else {
                        winnerText = '¡Empate absoluto!';
                    }
                    this.state = STATE.GAME_OVER;
                    this.ui.showGameOver(this.score, winnerText, this.score2);
                }

                // REGLA 2: Choque contra segmentos de cuerpos (K.O. directo, pasando el progress)
                if (this.state === STATE.PLAYING) {
                    const j1ChocoCuerpo = this.snake.checkCollision(GRID_COLS, GRID_ROWS, true, this.snake2.segments, progress);
                    const j2ChocoCuerpo = this.snake2.checkCollision(GRID_COLS, GRID_ROWS, true, this.snake.segments, progress);

                    if (j1ChocoCuerpo && j2ChocoCuerpo) {
                        let winnerText = this.score === this.score2 ? '¡Empate absoluto!' :
                            (this.score > this.score2 ? '¡Ganó el Jugador 1! (Más manzanas)' : '¡Ganó el Jugador 2! (Más manzanas)');
                        this.state = STATE.GAME_OVER;
                        this.ui.showGameOver(this.score, winnerText, this.score2);
                    }
                    else if (j1ChocoCuerpo) {
                        this.state = STATE.GAME_OVER;
                        this.ui.showGameOver(this.score, '¡Ganó el Jugador 2!', this.score2);
                    }
                    else if (j2ChocoCuerpo) {
                        this.state = STATE.GAME_OVER;
                        this.ui.showGameOver(this.score, '¡Ganó el Jugador 1!', this.score2);
                    }
                }
            } else {
                // ── MODO 1 JUGADOR ────────────────────────────
                // Ahora el modo de un jugador también evalúa colisión consigo mismo de forma fluida
                if (this.snake.checkCollision(GRID_COLS, GRID_ROWS, false, [], progress)) {
                    this.state = STATE.GAME_OVER;
                    this.ui.showGameOver(this.score);
                }
            }
        }

        // Diferir el reinicio de nivel al siguiente frame para no romper el tick actual
        if (this._pendingLevelUp) {
            this.start();
            return;
        }

        // ── RENDER (Interpolación cuadro a cuadro) ────────────
        if (this.state === STATE.PLAYING) {
            this.snake.render(progress);
            if (this.snake2) this.snake2.render(progress);
        }
    }

    /** Remueve el loop del ticker al destruir el juego */
    destroy() {
        this.app.ticker.remove(this._onTick);
        this.clearScene();
    }
}
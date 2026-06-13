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
import { Snake, DIRECTION } from './Snake.js';
import { Apple }            from './Apple.js';
import { UI }               from './UI.js';
import {
    GRID_COLS, GRID_ROWS,
    CELL_SIZE,
    CANVAS_WIDTH, CANVAS_HEIGHT,
    UI_HEIGHT,
    MOVE_INTERVAL,
} from './Grid.js';

// Estados posibles del juego (agregar más según se necesite, ej. PAUSED)
const STATE = {
    PLAYING:   'playing',
    GAME_OVER: 'game_over',
};

export class Game {
    /**
     * @param {import('pixi.js').Application} app - Instancia de Pixi Application
     */
    constructor(app) {
        this.app   = app;
        this.state = STATE.PLAYING;
        this.score = 0;

        /**
         * Acumulador de tiempo en milisegundos desde el último tick de lógica.
         * Cuando supera MOVE_INTERVAL se ejecuta un tick.
         */
        this.timeSinceLastMove = 0;

        // Registrar los listeners de teclado (solo una vez en toda la vida del juego)
        this.setupInput();

        // Iniciar la primera partida
        this.start();

        // Registrar el loop principal en el ticker de Pixi.
        // Se guarda como arrow function para poder removerlo con exactamente
        // la misma referencia en destroy().
        this._onTick = (ticker) => this.update(ticker);
        this.app.ticker.add(this._onTick);
    }

    // ── Ciclo de vida ─────────────────────────────────────────

    /**
     * Inicializa (o reinicializa) una partida nueva.
     * Destruye entidades anteriores, resetea estado y crea todo de cero.
     */
    start() {
        this.clearScene();

        this.score             = 0;
        this.timeSinceLastMove = 0;
        this.state             = STATE.PLAYING;

        // Fondo y grilla se dibujan primero (se agregarán como primer hijo del stage)
        this.createBackground();

        // UI se crea antes que la serpiente para que quede debajo visualmente
        this.ui = new UI(this.app.stage);

        // Serpiente centrada en la grilla, con 3 segmentos iniciales
        const startX = Math.floor(GRID_COLS / 2);
        const startY = Math.floor(GRID_ROWS / 2);
        this.snake = new Snake(this.app.stage, startX, startY);

        // Manzana en posición aleatoria (nunca encima de la serpiente)
        this.apple = new Apple(this.app.stage);
        this.apple.randomize(this.snake.segments);

        this.ui.updateScore(this.score);
    }

    /** Destruye todas las entidades activas y limpia el stage */
    clearScene() {
        if (this.snake)      this.snake.destroy();
        if (this.apple)      this.apple.destroy();
        if (this.ui)         this.ui.destroy();
        if (this.background) this.background.destroy();

        this.snake      = null;
        this.apple      = null;
        this.ui         = null;
        this.background = null;
    }

    // ── Construcción de la escena ─────────────────────────────

    /**
     * Dibuja el fondo oscuro y la cuadrícula decorativa.
     * Se agrega al stage como primer hijo para quedar detrás de todo.
     */
    createBackground() {
        this.background = new Graphics();

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
            if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key)) {
                e.preventDefault();
            }

            // Si está en game over, solo SPACE reinicia
            if (this.state === STATE.GAME_OVER) {
                if (e.code === 'Space') this.start();
                return;
            }

            // Direcciones (WASD o flechas)
            switch (e.code) {
                case 'ArrowUp':    case 'KeyW': this.snake.setDirection(DIRECTION.UP);    break;
                case 'ArrowDown':  case 'KeyS': this.snake.setDirection(DIRECTION.DOWN);  break;
                case 'ArrowLeft':  case 'KeyA': this.snake.setDirection(DIRECTION.LEFT);  break;
                case 'ArrowRight': case 'KeyD': this.snake.setDirection(DIRECTION.RIGHT); break;
            }
        });
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

        // Procesar todos los ticks pendientes (por si el frame tardó mucho)
        while (this.timeSinceLastMove >= MOVE_INTERVAL) {
            this.timeSinceLastMove = 0;
            this.tick();

            // Si el tick terminó el juego, salir del loop
            if (this.state !== STATE.PLAYING) return;
        }

        // Calcular qué tan avanzado estamos dentro del tick actual (0 = recién empezó, 1 = a punto de terminar)
        const progress = this.timeSinceLastMove / MOVE_INTERVAL;

        // Actualizar posiciones visuales interpoladas
        this.snake.render(progress);
    }

    /**
     * Un paso de lógica de juego: mueve la serpiente, evalúa colisiones
     * y verifica si comió la manzana.
     * Llamado por update() una vez por MOVE_INTERVAL milisegundos.
     */
    tick() {
        const ateApple = this.snake.move(this.apple);

        if (ateApple) {
            this.score++;
            this.ui.updateScore(this.score);

            // Reubicar la manzana en un lugar libre
            this.apple.randomize(this.snake.segments);
        }

        // Verificar colisión DESPUÉS de mover (la cabeza ya está en la nueva posición)
        if (this.snake.checkCollision(GRID_COLS, GRID_ROWS)) {
            this.state = STATE.GAME_OVER;
            this.ui.showGameOver(this.score);
        }
    }

    /** Limpia todos los recursos cuando el Game ya no se necesita */
    destroy() {
        this.app.ticker.remove(this._onTick);
        this.clearScene();
    }
}

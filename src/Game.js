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
import { Apple }            from './Apple.js';
import { UI }               from './UI.js';
import { Menu }             from './Menu.js';
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
    MENU:      'menu',
};

export class Game {
    /**
     * @param {import('pixi.js').Application} app - Instancia de Pixi Application
     */
    constructor(app) {
        this.app   = app;
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
        this.clearScene();

        this.score             = 0;
        this.score2            = 0;
        this.timeSinceLastMove = 0;
        this.state             = STATE.PLAYING;

        // Fondo y grilla se dibujan primero (se agregarán como primer hijo del stage)
        this.createBackground();

        // UI se crea antes que la serpiente para que quede debajo visualmente
        // isTwoPlayer = false para modo 1 jugador
        this.ui = new UI(this.app.stage, false);

        // Serpiente centrada en la grilla, con 3 segmentos iniciales
        const startX = Math.floor(GRID_COLS / 2);
        const startY = Math.floor(GRID_ROWS / 2);
        this.snake = new Snake(this.app.stage, startX, startY);

        // Manzana en posición aleatoria (nunca encima de la serpiente)
        this.apple = new Apple(this.app.stage);
        this.apple.randomize(this.snake.segments);

        this.ui.updateScore(this.score);
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

        this.score             = 0;
        this.score2            = 0;
        this.timeSinceLastMove = 0;
        this.state             = STATE.PLAYING;

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
        if (this.snake)      this.snake.destroy();
        if (this.snake2)     this.snake2.destroy();
        if (this.apple)      this.apple.destroy();
        if (this.ui)         this.ui.destroy();
        if (this.background) this.background.destroy();
        if (this.menuScreen) this.menuScreen.destroy();

        this.snake      = null;
        this.snake2     = null;
        this.apple      = null;
        this.ui         = null;
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

            // Si está en game over, solo SPACE vuelve al menú
            if (this.state === STATE.GAME_OVER) {
                if (e.code === 'Space') this.menu();
                return;
            }

            if (this.state !== STATE.PLAYING) return;

            // Jugador 1: WASD o flechas
            switch (e.code) {
                case 'ArrowUp':    case 'KeyW': this.snake.setDirection(DIRECTION.UP);    break;
                case 'ArrowDown':  case 'KeyS': this.snake.setDirection(DIRECTION.DOWN);  break;
                case 'ArrowLeft':  case 'KeyA': this.snake.setDirection(DIRECTION.LEFT);  break;
                case 'ArrowRight': case 'KeyD': this.snake.setDirection(DIRECTION.RIGHT); break;
            }

            // Jugador 2: IJKL (solo en modo 2 jugadores)
            if (this.snake2) {
                switch (e.code) {
                    case 'KeyI': this.snake2.setDirection(DIRECTION.UP);    break;
                    case 'KeyK': this.snake2.setDirection(DIRECTION.DOWN);  break;
                    case 'KeyJ': this.snake2.setDirection(DIRECTION.LEFT);  break;
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

        // Procesar todos los ticks pendientes (por si el frame tardó mucho)
        while (this.timeSinceLastMove >= MOVE_INTERVAL) {
            this.timeSinceLastMove -= MOVE_INTERVAL;
            this.tick();

            // Si el tick terminó el juego, salir del loop
            if (this.state !== STATE.PLAYING) return;
        }

        // Calcular qué tan avanzado estamos dentro del tick actual (0 = recién empezó, 1 = a punto de terminar)
        const progress = this.timeSinceLastMove / MOVE_INTERVAL;

        // Actualizar posiciones visuales interpoladas
        this.snake.render(progress);
        if (this.snake2) this.snake2.render(progress);
    }

    /**
     * Un paso de lógica de juego: mueve la serpiente, evalúa colisiones
     * y verifica si comió la manzana.
     * Llamado por update() una vez por MOVE_INTERVAL milisegundos.
     */
    tick() {
        // En modo 2P la manzana no puede aparecer encima de ninguna serpiente
        const allSegments = this.snake2
            ? [...this.snake.segments, ...this.snake2.segments]
            : this.snake.segments;

        const ate1 = this.snake.move(this.apple);
        const ate2 = this.snake2 ? this.snake2.move(this.apple) : false;

        if (ate1) {
            this.score++;
            if (this.snake2) {
                // Modo 2P: actualizar ambos scores
                this.ui.updateScores(this.score, this.score2);
            } else {
                // Modo 1P: actualizar solo el score
                this.ui.updateScore(this.score);
            }

            // Reubicar la manzana en un lugar libre
            this.apple.randomize(allSegments);
        }

        if (ate2) {
            this.score2++;
            this.ui.updateScores(this.score, this.score2);

            // Reubicar la manzana en un lugar libre
            this.apple.randomize(allSegments);
        }

        // Verificar colisión DESPUÉS de mover (la cabeza ya está en la nueva posición).
        // En modo 2P se pasan los segmentos rivales para detectar colisión entre serpientes.
        const dead1 = this.snake.checkCollision(
            GRID_COLS, GRID_ROWS,
            this.snake.wrap,
            this.snake2 ? this.snake2.segments : []
        );
        const dead2 = this.snake2 && this.snake2.checkCollision(
            GRID_COLS, GRID_ROWS,
            this.snake2.wrap,
            this.snake.segments
        );

        if (dead1 || dead2) {
            this.state = STATE.GAME_OVER;

            // En modo 2P determinar quién ganó.
            // Si ambas mueren en el mismo tick es empate.
            if (this.snake2) {
                let winner;
                if (dead1 && dead2) winner = 'Empate';
                else if (dead1)     winner = 'Ganó Jugador 2';
                else                winner = 'Ganó Jugador 1';
                this.ui.showGameOver(this.score, winner, this.score2);
            } else {
                this.ui.showGameOver(this.score);
            }
        }
    }

    /** Limpia todos los recursos cuando el Game ya no se necesita */
    destroy() {
        this.app.ticker.remove(this._onTick);
        this.clearScene();
    }
}

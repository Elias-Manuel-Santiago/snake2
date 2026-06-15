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
        this.levelScore = 0;

        this.clearScene();
        this.level = 0;
        this.score = 0;
        this.state = STATE.PLAYING;

        this.createBackground();
        this.ui = new UI(this.app.stage, false);

        const startX = Math.floor(GRID_COLS / 2);
        const startY = Math.floor(GRID_ROWS / 2);

        // Enviamos el intervalo del nivel a la serpiente
        this.snake = new Snake(this.app.stage, startX, startY, {
            moveInterval: LEVELS[this.level].moveInterval
        });

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
        this.state = STATE.PLAYING;

        this.createBackground();
        this.ui = new UI(this.app.stage, true);

        // Serpiente 1: Velocidad normal (200ms por celda)
        this.snake = new Snake(
            this.app.stage,
            Math.floor(GRID_COLS / 6),
            Math.floor(GRID_ROWS / 6),
            { wrap: true, direction: DIRECTION.RIGHT, colors: SNAKE_COLORS.RED, moveInterval: 150 }
        );

        // Serpiente 2: ¡Velocidad aumentada! (150ms por celda)
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
                case 'ShiftLeft':
                    if (this.snake) {
                        this.snake.dash = true;
                    }
                    break;
            }

            // Jugador 2: IJKL (solo en modo 2 jugadores)
            if (this.snake2) {
                switch (e.code) {
                    case 'KeyI': this.snake2.setDirection(DIRECTION.UP); break;
                    case 'KeyK': this.snake2.setDirection(DIRECTION.DOWN); break;
                    case 'KeyJ': this.snake2.setDirection(DIRECTION.LEFT); break;
                    case 'KeyL': this.snake2.setDirection(DIRECTION.RIGHT); break;
                    case 'KeyB': this.snake2.dash = true; break;
                }
            }
            console.log(e.code);
        });

        window.addEventListener('keyup', (e) => {
            if (this.snake2) {
                switch (e.code) {
                    case 'ShiftLeft': this.snake.dash = false; break;
                }
                switch (e.code) {
                    case 'KeyB': this.snake2.dash = false; break;
                }
            }
            console.log(e.code);

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

        // 1. ACTUALIZACIÓN DE TIEMPOS INDEPENDIENTES (Lógica)
        this.snake.updateTick(ticker.deltaMS);
        if (this.snake2) {
            this.snake2.updateTick(ticker.deltaMS);
        }

        // Recuperamos el progreso de cada una para evaluar colisiones y renderizado
        const p1 = this.snake.currentProgress;
        const p2 = this.snake2 ? this.snake2.currentProgress : 0;

        // 2. VERIFICACIÓN DE COLISIONES INTERPOLADAS
        if (this.state === STATE.PLAYING) {
            let ate1 = false;
            let ate2 = false;

            // Cada una evalúa la manzana usando su propio progreso visual
            if (this.snake.checkCollisionApple(this.apple, p1)) {
                ate1 = true;
                this.score++;
                this.levelScore++;
            }
            if (this.snake2 && this.snake2.checkCollisionApple(this.apple, p2)) {
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

                    // LEVEL UP!!!!!
                    const nextLevel = this.level + 1;
                    if (this.levelScore >= LEVELS[this.level].applesRequired) {
                        this.level = nextLevel;
                        this.snake.moveInterval = LEVELS[this.level].moveInterval;
                    }

                    this.ui.updateLevel(this.level + 1, this.levelScore, LEVELS[this.level].applesRequired);
                    this.apple.randomize(this.snake.segments);
                }
            }

            if (this.snake2) {
                // ── MODO 2 JUGADORES (Velocidades Desincronizadas) ──
                // Obtenemos posiciones interpoladas combinando los progresos de cada una
                const head1Pos = this.snake.getInterPos(p1, this.snake.segments[0]);
                const head2Pos = this.snake2.getInterPos(p2, this.snake2.segments[0]);

                // REGLA 1: Choque frontal de cabezas directo
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

                // REGLA 2: Choque contra segmentos de cuerpos desincronizados
                if (this.state === STATE.PLAYING) {
                    // Para J1 chocando a J2: usamos el progreso de J1 para su cabeza y el progreso de J2 para los segmentos de la rival
                    const j1ChocoCuerpo = this.snake.checkCollision(GRID_COLS, GRID_ROWS, true, this.snake2.segments, p1);
                    // Modificamos ligeramente checkCollision internamente pasándole p2 al cuerpo rival si fuera necesario, 
                    // pero al usar getInterPos con el progreso adecuado funciona perfecto.

                    // J1 calcula su colisión contra el cuerpo de J2 usando el progreso de J2
                    let j1ChocoRival = false;
                    const toleranciaCuadrado = 0.25; // 0.5 * 0.5
                    for (let i = 0; i < this.snake2.segments.length; i++) {
                        const segPos = this.snake2.getInterPos(p2, this.snake2.segments[i]);
                        const dist = (head1Pos.x - segPos.x) ** 2 + (head1Pos.y - segPos.y) ** 2;
                        if (dist < toleranciaCuadrado) j1ChocoRival = true;
                    }

                    // J2 calcula su colisión contra el cuerpo de J1 usando el progreso de J1
                    let j2ChocoRival = false;
                    for (let i = 0; i < this.snake.segments.length; i++) {
                        const segPos = this.snake.getInterPos(p1, this.snake.segments[i]);
                        const dist = (head2Pos.x - segPos.x) ** 2 + (head2Pos.y - segPos.y) ** 2;
                        if (dist < toleranciaCuadrado) j2ChocoRival = true;
                    }

                    // Colisiones auto-infligidas tradicionales de grilla
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
                // ── MODO 1 JUGADOR ────────────────────────────
                if (this.snake.checkCollision(GRID_COLS, GRID_ROWS, false, [], p1)) {
                    this.state = STATE.GAME_OVER;
                    this.ui.showGameOver(this.score);
                }
            }
        }

        // 3. RENDER (Cada serpiente interpola con su propio progreso de tiempo)
        if (this.state === STATE.PLAYING) {
            this.snake.render(p1);
            if (this.snake2) this.snake2.render(p2);
        }
    }



    /** Remueve el loop del ticker al destruir el juego */
    destroy() {
        this.app.ticker.remove(this._onTick);
        this.clearScene();
    }
}
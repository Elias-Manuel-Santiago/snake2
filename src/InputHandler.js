// ============================================================
// InputHandler.js — Gestión de entradas (Teclado, Touch, UI)
// ============================================================

import { DIRECTION } from './Snake.js';

export class InputHandler {
    /**
     * @param {import('./Game.js').Game} game - Instancia del juego principal
     */
    constructor(game) {
        this.game = game;
        this.setupKeyboard();
        this.setupTouch();
        this.setupDashButtons();
    }

    // ── Input ─────────────────────────────────────────────────

    setupKeyboard() {
        // Declarar 'g' aquí afuera para que sea accesible tanto para keydown como para keyup
        const g = this.game;

        window.addEventListener('keydown', (e) => {
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'Escape'].includes(e.key)) {
                e.preventDefault();
            }

            // Si está en la pantalla de "¿Listo?", cualquier tecla inicia el juego
            if (g.state === 'ready') { g.startPendingGame(); return; }

            if (g.state === 'game_over' || g.state === 'paused') {
                if (e.code === 'Space') g.menu();
                if (e.code === 'KeyR') g.restartGame();
                return;
            }

            if ((e.code === 'Escape' || e.code === 'KeyP') && (g.state === 'playing' || g.state === 'paused')) {
                g.togglePause();
                return;
            }

            if (g.state !== 'playing') return;

            switch (e.code) {
                case 'KeyW': g.snake.setDirection(DIRECTION.UP); break;
                case 'KeyS': g.snake.setDirection(DIRECTION.DOWN); break;
                case 'KeyA': g.snake.setDirection(DIRECTION.LEFT); break;
                case 'KeyD': g.snake.setDirection(DIRECTION.RIGHT); break;
                case 'ShiftLeft': 
                    if (g.isTwoPlayerMode) g.snake.dash = true; // Solo activa dash en PC (modo 2P)                
                    break;
            }

            if (g.snake2) {
                switch (e.code) {
                    case 'KeyI': g.snake2.setDirection(DIRECTION.UP); break;
                    case 'KeyK': g.snake2.setDirection(DIRECTION.DOWN); break;
                    case 'KeyJ': g.snake2.setDirection(DIRECTION.LEFT); break;
                    case 'KeyL': g.snake2.setDirection(DIRECTION.RIGHT); break;
                    case 'KeyB': g.snake2.dash = true; break;
                }
            }
        });

        window.addEventListener('keyup', (e) => { 
            // Solo desactiva dash en PC (modo 2P)
            if (g.snake && e.code === 'ShiftLeft' && g.isTwoPlayerMode) g.snake.dash = false;
            if (g.snake2 && e.code === 'KeyB') g.snake2.dash = false;
        });
    }

    // ── Controles Touch ───────────────────────────────────────

    setupTouch() {
        const g = this.game;
        const touchZoneP1 = document.getElementById('touch-zone-p1');
        const touchZoneP2 = document.getElementById('touch-zone-p2');

        let touchStartX_p1 = 0, touchStartY_p1 = 0;
        let touchStartX_p2 = 0, touchStartY_p2 = 0;
        let touchStartX_global = 0, touchStartY_global = 0;

        // CONTROLES TOUCH (Móviles)
        // --- CONTROLES MODO 1 JUGADOR (Global) ---
        window.addEventListener('touchstart', (e) => {
            if (g.isTwoPlayerMode) return;
            touchStartX_global = e.touches[0].clientX;
            touchStartY_global = e.touches[0].clientY;
        }, { passive: true });

        window.addEventListener('touchend', (e) => {
            if (g.state === 'game_over') { g.menu(); return; }
            
            // Si toca la pantalla en "¿Listo?", iniciar juego
            if (g.state === 'ready') { g.startPendingGame(); return; }

            if (g.isTwoPlayerMode) return;

            const dx = e.changedTouches[0].clientX - touchStartX_global;
            const dy = e.changedTouches[0].clientY - touchStartY_global;

            if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
            if (g.state !== 'playing' || !g.snake) return;

            if (Math.abs(dx) > Math.abs(dy)) {
                g.snake.setDirection(dx > 0 ? DIRECTION.RIGHT : DIRECTION.LEFT);
            } else {
                g.snake.setDirection(dy > 0 ? DIRECTION.DOWN : DIRECTION.UP);
            }
        }, { passive: true });

        // --- CONTROLES MODO 2 JUGADORES (Solo movimiento en las zonas) ---
        if (touchZoneP1 && touchZoneP2) {
            
            touchZoneP1.addEventListener('touchstart', (e) => {
                touchStartX_p1 = e.touches[0].clientX;
                touchStartY_p1 = e.touches[0].clientY;
            }, { passive: true });

            touchZoneP1.addEventListener('touchend', (e) => {
                if (g.state === 'game_over') { g.menu(); return; }
                if (g.state !== 'playing' || !g.snake) return;
                const dx = e.changedTouches[0].clientX - touchStartX_p1;
                const dy = e.changedTouches[0].clientY - touchStartY_p1;

                if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 10) {
                    g.snake.setDirection(dx > 0 ? DIRECTION.RIGHT : DIRECTION.LEFT);
                } else if (Math.abs(dy) > 10) {
                    g.snake.setDirection(dy > 0 ? DIRECTION.DOWN : DIRECTION.UP);
                }
            }, { passive: true });

            touchZoneP2.addEventListener('touchstart', (e) => {
                touchStartX_p2 = e.touches[0].clientX;
                touchStartY_p2 = e.touches[0].clientY;
            }, { passive: true });

            touchZoneP2.addEventListener('touchend', (e) => {
                if (g.state === 'game_over') { g.menu(); return; }
                if (g.state !== 'playing' || !g.snake2) return;
                const dx = e.changedTouches[0].clientX - touchStartX_p2;
                const dy = e.changedTouches[0].clientY - touchStartY_p2;

                if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 10) {
                    g.snake2.setDirection(dx > 0 ? DIRECTION.RIGHT : DIRECTION.LEFT);
                } else if (Math.abs(dy) > 10) {
                    g.snake2.setDirection(dy > 0 ? DIRECTION.DOWN : DIRECTION.UP);
                }
            }, { passive: true });
        }

        // ============================================================
        // BOTONES DE DASH (Solo para Móvil por CSS, pero JS los escucha igual)
        // ============================================================
        this.setupDashButtons();

        // Listener para iniciar con el mouse en PC (Hacer clic en el overlay)
        const startOverlay = document.getElementById('overlay-start');
        if (startOverlay) {
            startOverlay.addEventListener('mousedown', () => {
                if (this.game.state === 'ready') this.game.startPendingGame();
            });
        }
    }

    setupDashButtons() {
        const g = this.game;
        const dashBtnP1 = document.getElementById('dash-btn-p1');
        const dashBtnP2 = document.getElementById('dash-btn-p2');

        if (!dashBtnP1 || !dashBtnP2) return;

        const activateP1 = () => { if (g.snake) g.snake.dash = true; dashBtnP1.classList.add('active'); };
        const deactivateP1 = () => { if (g.snake) g.snake.dash = false; dashBtnP1.classList.remove('active'); };
        
        const activateP2 = () => { if (g.snake2) g.snake2.dash = true; dashBtnP2.classList.add('active'); };
        const deactivateP2 = () => { if (g.snake2) g.snake2.dash = false; dashBtnP2.classList.remove('active'); };

        dashBtnP1.addEventListener('mousedown', activateP1);
        dashBtnP1.addEventListener('mouseup', deactivateP1);
        dashBtnP1.addEventListener('mouseleave', deactivateP1);

        dashBtnP2.addEventListener('mousedown', activateP2);
        dashBtnP2.addEventListener('mouseup', deactivateP2);
        dashBtnP2.addEventListener('mouseleave', deactivateP2);

        // TOUCH (Móvil)
        dashBtnP1.addEventListener('touchstart', (e) => { e.preventDefault(); activateP1(); }, { passive: false });
        dashBtnP1.addEventListener('touchend', (e) => { e.preventDefault(); deactivateP1(); }, { passive: false });
        dashBtnP1.addEventListener('touchcancel', deactivateP1);

        dashBtnP2.addEventListener('touchstart', (e) => { e.preventDefault(); activateP2(); }, { passive: false });
        dashBtnP2.addEventListener('touchend', (e) => { e.preventDefault(); deactivateP2(); }, { passive: false });
        dashBtnP2.addEventListener('touchcancel', deactivateP2);
    }
}
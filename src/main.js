// ============================================================
// main.js — Punto de entrada de la aplicación
// ============================================================
// Inicializa el renderer de PixiJS con las dimensiones del juego
// y arranca la instancia de Game.
//
// El canvas tiene tamaño fijo (no se adapta a la ventana).
// El centrado en pantalla se hace mediante CSS en public/style.css.

import { Application } from 'pixi.js';
import { Game }        from './Game.js';
import { CANVAS_WIDTH, CANVAS_HEIGHT, UI_HEIGHT } from './Grid.js';

(async () => {
    const app = new Application();

    await app.init({
        background: 0x0d1117,
        antialias:  true,
        resizeTo:   window,
    });

    document.getElementById('pixi-container').appendChild(app.canvas);

    const GAME_WIDTH  = CANVAS_WIDTH;
    const GAME_HEIGHT = CANVAS_HEIGHT + UI_HEIGHT;

    const resize = () => {
        const scaleX = app.screen.width  / GAME_WIDTH;
        const scaleY = app.screen.height / GAME_HEIGHT;
        const scale  = Math.min(scaleX, scaleY); // mantener proporciones

        app.stage.scale.set(scale);
        app.stage.x = (app.screen.width  - GAME_WIDTH  * scale) / 2;
        app.stage.y = (app.screen.height - GAME_HEIGHT * scale) / 2;
    };

    app.renderer.on('resize', resize);
    resize();

    new Game(app);
})();

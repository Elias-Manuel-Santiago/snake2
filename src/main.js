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
        width:     CANVAS_WIDTH,
        height:    CANVAS_HEIGHT + UI_HEIGHT, // área de juego + barra HUD
        background: 0x0d1117,
        antialias:  true,
    });

    // Adjuntar el canvas al div contenedor definido en index.ejs
    document.getElementById('pixi-container').appendChild(app.canvas);

    // Crear e iniciar el juego
    new Game(app);
})();

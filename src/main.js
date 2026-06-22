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
import './style.css';

(async () => {
    const app = new Application();

    // Inicializamos con tamaño fijo lógico. NO usamos resizeTo.
    await app.init({
        background: 0x0d1117,
        antialias:  true,
        width: CANVAS_WIDTH,           // 600
        height: CANVAS_HEIGHT + UI_HEIGHT, // 650
    });

    // Forzamos al canvas a llenar su contenedor usando CSS
    const canvas = app.canvas;
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';

    document.getElementById('pixi-container').appendChild(canvas);
    
    new Game(app);
})();
// ============================================================
// main.js — Punto de entrada de la aplicación
// ============================================================
// Inicializa el renderer de PixiJS con las dimensiones del juego
// y arranca la instancia de Game.
//
// El canvas tiene tamaño fijo (no se adapta a la ventana).
// El centrado en pantalla se hace mediante CSS en public/style.css.

import { Application } from 'pixi.js';
import { Game } from './Game.js';
import { CANVAS_WIDTH, CANVAS_HEIGHT, UI_HEIGHT } from './Grid.js';
import { DJ, SOUND_GROUP } from './DJ.js';
import './style.css';

const eatSfxUrl = new URL('./sfx/eat.ogg', import.meta.url).href;
const levelUpSfxUrl = new URL('./sfx/levelup.wav', import.meta.url).href;
const move1Url = new URL('./sfx/move1.wav', import.meta.url).href;
const move2Url = new URL('./sfx/move2.wav', import.meta.url).href;
const move3Url = new URL('./sfx/move3.wav', import.meta.url).href;
const menuClick = new URL('./sfx/menuClick.wav', import.meta.url).href;
const win = new URL('./sfx/win.wav', import.meta.url).href;
const gameOver = new URL('./sfx/gameOver.wav', import.meta.url).href;
const warning = new URL('./sfx/warning.wav', import.meta.url).href;
const obstacle = new URL('./sfx/obstacle.wav', import.meta.url).href;

DJ.registerMany({
    'eat': {src: eatSfxUrl, group: SOUND_GROUP.SFX, loop: false, volume: 0.5},
    'levelup': {src: levelUpSfxUrl, group: SOUND_GROUP.SFX, loop: false, volume: 0.7},
    'move1': {src: move1Url, group: SOUND_GROUP.SFX, loop: false, volume: 0.2},
    'move2': {src: move2Url, group: SOUND_GROUP.SFX, loop: false, volume: 0.2},
    'move3': {src: move3Url, group: SOUND_GROUP.SFX, loop: false, volume: 0.2},
    'menuClick': {src: menuClick, group: SOUND_GROUP.SFX, loop: false, volume: 0.2},
    'win': {src: win, group: SOUND_GROUP.SFX, loop: false, volume: 0.7},
    'gameOver': {src: gameOver, group: SOUND_GROUP.SFX, loop: false, volume: 0.7},
    'warning': {src: warning, group: SOUND_GROUP.SFX, loop: false, volume: 0.4},
    'obstacle': {src: obstacle, group: SOUND_GROUP.SFX, loop: false, volume: 0.3},
});

    (async () => {
        const app = new Application();

        // Inicializamos con tamaño fijo lógico. NO usamos resizeTo.
        await app.init({
            background: 0x0d1117,
            antialias: true,
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

// ============================================================
// GESTIÓN DE TEMA (CLARO / OSCURO)
// ============================================================
const botonTema = document.getElementById('toggle-tema');

if (botonTema) {
    // Recuperar la preferencia guardada, por defecto iniciamos en oscuro ('dark')
    const temaGuardado = localStorage.getItem('theme') || 'dark';
    
    if (temaGuardado === 'dark') {
        document.body.classList.add('dark');
    } else {
        document.body.classList.remove('dark');
    }

    // Escuchar el click para alternar entre temas
    botonTema.addEventListener('click', () => {
        document.body.classList.toggle('dark');
        
        // Guardar la nueva selección
        if (document.body.classList.contains('dark')) {
            localStorage.setItem('theme', 'dark');
        } else {
            localStorage.setItem('theme', 'light');
        }
    });
}
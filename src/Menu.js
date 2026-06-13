// ============================================================
// Menu.js — Pantalla de selección de modo de juego
// ============================================================
// Muestra los botones para elegir entre 1 jugador y 2 jugadores.
// Llama al callback onSelect con '1p' o '2p' según la elección.

import { Container, Graphics, Text } from 'pixi.js';
import { CANVAS_WIDTH, CANVAS_HEIGHT, UI_HEIGHT } from './Grid.js';

export class Menu {
    /**
     * @param {import('pixi.js').Container} stage - Stage principal de Pixi
     * @param {(mode: '1p' | '2p') => void} onSelect - Callback al elegir modo
     */
    constructor(stage, onSelect) {
        this.container = new Container();
        stage.addChild(this.container);

        // Fondo que cubre todo el canvas
        const bg = new Graphics();
        bg.rect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT + UI_HEIGHT);
        bg.fill(0x0d1117);
        this.container.addChild(bg);

        // Título
        const title = new Text({
            text: 'SNAKE',
            style: {
                fontFamily: 'Arial, sans-serif',
                fontSize: 52,
                fontWeight: 'bold',
                fill: 0x2ecc71,
            },
        });
        title.anchor.set(0.5);
        title.x = CANVAS_WIDTH / 2;
        title.y = CANVAS_HEIGHT / 4;
        this.container.addChild(title);

        // Subtítulo con instrucción
        const subtitle = new Text({
            text: 'Seleccioná un modo de juego',
            style: {
                fontFamily: 'Arial, sans-serif',
                fontSize: 16,
                fill: 0x7f8c8d,
            },
        });
        subtitle.anchor.set(0.5);
        subtitle.x = CANVAS_WIDTH / 2;
        subtitle.y = CANVAS_HEIGHT / 4 + 50;
        this.container.addChild(subtitle);

        // Botón 1 jugador
        this._addButton('1 Jugador', 'WASD', CANVAS_HEIGHT / 2 - 30, () => onSelect('1p'));

        // Botón 2 jugadores
        this._addButton('2 Jugadores', 'J1: WASD   J2: IJKL', CANVAS_HEIGHT / 2 + 60, () => onSelect('2p'));
    }

    /**
     * Crea un botón interactivo con etiqueta y descripción de controles.
     * @param {string} label - Texto principal del botón
     * @param {string} hint - Texto secundario con los controles
     * @param {number} y - Posición vertical del botón
     * @param {() => void} onClick - Callback al hacer clic/tap
     */
    _addButton(label, hint, y, onClick) {
        const btn = new Container();
        btn.eventMode = 'static';
        btn.cursor    = 'pointer';

        // Fondo del botón
        const bg = new Graphics();
        bg.roundRect(-140, -35, 280, 70, 8);
        bg.fill(0x1e2a3a);
        bg.stroke({ color: 0x2ecc71, width: 2 });
        btn.addChild(bg);

        // Etiqueta principal
        const text = new Text({
            text: label,
            style: {
                fontFamily: 'Arial, sans-serif',
                fontSize: 22,
                fontWeight: 'bold',
                fill: 0xffffff,
            },
        });
        text.anchor.set(0.5, 0.5);
        text.y = -8;
        btn.addChild(text);

        // Descripción de controles
        const hintText = new Text({
            text: hint,
            style: {
                fontFamily: 'Arial, sans-serif',
                fontSize: 13,
                fill: 0x7f8c8d,
            },
        });
        hintText.anchor.set(0.5, 0.5);
        hintText.y = 18;
        btn.addChild(hintText);

        btn.x = CANVAS_WIDTH / 2;
        btn.y = y;

        // Efecto hover: resaltar el borde al pasar el mouse
        btn.on('pointerover', () => {
            bg.clear();
            bg.roundRect(-140, -35, 280, 70, 8);
            bg.fill(0x1e2a3a);
            bg.stroke({ color: 0x2ecc71, width: 2, alpha: 1 });
            text.style.fill = 0x2ecc71;
        });
        btn.on('pointerout', () => {
            bg.clear();
            bg.roundRect(-140, -35, 280, 70, 8);
            bg.fill(0x1e2a3a);
            bg.stroke({ color: 0x2ecc71, width: 2 });
            text.style.fill = 0xffffff;
        });
        btn.on('pointertap', onClick);

        this.container.addChild(btn);
    }

    /** Elimina el menú del stage y libera memoria */
    destroy() {
        this.container.destroy({ children: true });
    }
}
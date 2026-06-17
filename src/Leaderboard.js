// ============================================================
// Leaderboard.js — Gestión de Puntajes e Interfaz HTML
// ============================================================

export class Leaderboard {
    constructor() {
        this.storageKey = 'snake_leaderboard';
        this.currentUsername = '';
        this.scores = this._loadScores();

        // Crear contenedor principal si no existe en el DOM
        this.container = document.getElementById('leaderboard-container');
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.id = 'leaderboard-container';
            // Insertar en el body o al lado del contenedor de Pixi
            const pixiContainer = document.getElementById('pixi-container');
            pixiContainer.parentNode.insertBefore(this.container, pixiContainer.nextSibling);
        }

        this.render();
    }

    /** Carga los scores de localStorage */
    _loadScores() {
        const stored = localStorage.getItem(this.storageKey);
        return stored ? JSON.parse(stored) : [];
    }

    /** Guarda un nuevo puntaje en la lista y reordena */
    saveScore(score) {
        if (!this.currentUsername) return;

        this.scores.push({ name: this.currentUsername, score: score, date: new Date().toLocaleDateString() });
        // Ordenar de mayor a menor y quedarse con los mejores 10
        this.scores.sort((a, b) => b.score - a.score);
        this.scores = this.scores.slice(0, 10);

        localStorage.setItem(this.storageKey, JSON.stringify(this.scores));
        this.render();
    }

    /** Devuelve el nombre del jugador actual */
    getPlayerName() {
        return this.currentUsername;
    }

    /** Muestra/Oculta la sección para ingresar el nombre */
    showNameInput(visible) {
        const inputSection = document.getElementById('leaderboard-input-section');
        if (inputSection) {
            inputSection.style.display = visible && !this.currentUsername ? 'block' : 'none';
        }
    }

    /** Renderiza la interfaz HTML */
    render() {
        let scoresHTML = this.scores.map((entry, index) => `
            <div class="leaderboard-row ${entry.name === this.currentUsername ? 'current-player' : ''}">
                <span class="rank">#${index + 1}</span>
                <span class="name">${entry.name}</span>
                <span class="score">🍎 ${entry.score}</span>
                <button class="delete-score-btn" data-index="${index}" title="Borrar puntaje">×</button>
            </div>
        `).join('');

        if (this.scores.length === 0) {
            scoresHTML = `<div class="no-scores">¡Sé el primero en el ranking!</div>`;
        }

        this.container.innerHTML = `
            <div class="leaderboard-box">
                <h2>TOP 10 JUGADORES</h2>
                
                <div id="leaderboard-input-section" class="input-section" style="display: ${this.currentUsername ? 'none' : 'block'}">
                    <p>Ingresá tu nombre para jugar 1P:</p>
                    <input type="text" id="player-name-input" placeholder="Tu Nombre..." maxlength="12">
                    <button id="save-name-btn">Confirmar</button>
                    <p id="leaderboard-error" class="error-msg" style="display:none;">Por favor ingresá un nombre válido</p>
                </div>

                ${this.currentUsername ? `<div class="welcome-user">Jugando como: <strong>${this.currentUsername}</strong></div>` : ''}

                <div class="scores-list">
                    ${scoresHTML}
                </div>
            </div>
        `;

        this._setupListeners();
    }

    _setupListeners() {
        const btn = document.getElementById('save-name-btn');
        const input = document.getElementById('player-name-input');
        const error = document.getElementById('leaderboard-error');

        if (btn && input) {
            const confirmName = () => {
                const name = input.value.trim();
                if (name.length >= 2) {
                    this.currentUsername = name;
                    this.render();
                } else {
                    if (error) error.style.display = 'block';
                }
            };

            btn.addEventListener('click', confirmName);
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') confirmName();
                // Evitar que el espacio interfiera con los controles del juego si está escribiendo
                if (e.key === ' ') e.stopPropagation();
            });
            const deleteButtons = this.container.querySelectorAll('.delete-score-btn');
            deleteButtons.forEach(button => {
                button.addEventListener('click', (e) => {
                    const indexToRemove = parseInt(e.target.getAttribute('data-index'), 10);
                    this._deleteScore(indexToRemove);
                });
            });
        }
    }
    _deleteScore(index) {
        // Eliminar el elemento del array
        this.scores.splice(index, 1);
        // Actualizar el almacenamiento local
        localStorage.setItem(this.storageKey, JSON.stringify(this.scores));
        // Volver a dibujar el componente actualizado
        this.render();
    }
}
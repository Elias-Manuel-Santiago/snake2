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

        const existingIndex = this.scores.findIndex(
            entry => entry.name.toLowerCase() === this.currentUsername.toLowerCase()
        );

        if (existingIndex !== -1) {       
            if (score > this.scores[existingIndex].score) {
                this.scores[existingIndex].score = score;
                this.scores[existingIndex].date = new Date().toLocaleDateString();
            }            
        } else {
            this.scores.push({ 
                name: this.currentUsername, 
                score: score, 
                date: new Date().toLocaleDateString() 
            });
        }

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
                    <input type="text" id="player-name-input" placeholder="Solo letras y números" maxlength="12" autocomplete="off" spellcheck="false">
                    <button id="save-name-btn">Confirmar</button>
                    <p id="leaderboard-error" class="error-msg" style="display:none;">Solo letras y números (mín. 2 caracteres)</p>
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
            // Regex que permite SOLO letras (con y sin tildes/ñ) y números
            const validCharsRegex = /^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ]$/;

            // 1. PREVENIR ESCRITURA NO VÁLIDA EN TIEMPO REAL
            input.addEventListener('keydown', (e) => {
                // Permitir teclas de control (Borrar, flechas, enter, tab, etc.)
                if (e.key.length > 1) {
                    if (e.key === 'Enter') this._confirmNameLogic(input, error);
                    if (e.key === ' ') e.stopPropagation(); // Evitar pausa del juego
                    return; 
                }

                if (!validCharsRegex.test(e.key)) { // Si es un carácter imprimible, verificar si es letra o número
                    e.preventDefault(); // Bloquear la tecla
                }
            });

            // 2. SEGURIDAD EXTRA: Prevenir pegado (Paste) con caracteres inválidos
            input.addEventListener('paste', (e) => {
                e.preventDefault(); // Bloqueamos el pegado estándar
                const pasteData = (e.clipboardData || window.clipboardData).getData('text');
                // Filtramos el texto pegado dejando solo letras y números
                const filteredPaste = pasteData.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ]/g, '');
                
                // Insertamos manualmente el texto limpio
                document.execCommand('insertText', false, filteredPaste);
            });

            // 3. BOTÓN DE CONFIRMAR
            btn.addEventListener('click', () => {
                this._confirmNameLogic(input, error);
            });
        }

        const deleteButtons = this.container.querySelectorAll('.delete-score-btn');
        deleteButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const indexToRemove = parseInt(e.target.getAttribute('data-index'), 10);
                this._deleteScore(indexToRemove);
            });
        });
    }

    /** Lógica de validación final al confirmar el nombre */
    _confirmNameLogic(input, error) {
        const name = input.value.trim();
        
        // Regex estricta: Solo alfanuméricos, de 2 a 12 caracteres
        const validationRegex = /^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ]{2,12}$/;

        if (validationRegex.test(name)) {
            if (error) error.style.display = 'none';
            this.currentUsername = name;
            this.render();
        } else {
            if (error) error.style.display = 'block';
        }
    }

    _deleteScore(index) {
        this.scores.splice(index, 1);
        localStorage.setItem(this.storageKey, JSON.stringify(this.scores));
        this.render();
    }
}
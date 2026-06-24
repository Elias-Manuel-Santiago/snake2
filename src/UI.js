// ============================================================
// UI.js — Interfaz de usuario migrada a HTML/CSS
// ============================================================

export class UI {
    constructor(stage, isTwoPlayer = false, gameInstance = null) {
        this.isTwoPlayer = isTwoPlayer;
        this.game = gameInstance;

        // Referencias al DOM
        this.hud = document.getElementById('hud');
        this.scoreText = document.getElementById('score-text');
        this.levelText = document.getElementById('level-text');
        this.helpText = document.getElementById('help-text');

        this.pauseOverlay = document.getElementById('overlay-pause');
        this.gameoverOverlay = document.getElementById('overlay-gameover');
        this.winOverlay = document.getElementById('overlay-win');

        this.winnerText = document.getElementById('winner-text');
        this.finalScoreText = document.getElementById('final-score-text');
        this.finalWinScoreText = document.getElementById('final-win-score-text');

        this.hud.style.display = 'flex'; // MOSTRAR EL HUD AL INICIAR PARTIDA

        // Configurar modo 1P o 2P
        if (isTwoPlayer) {
            this.hud.classList.remove('hud-1p');
            this.hud.classList.add('hud-2p');
            this.scoreText.innerHTML = '<span style="color:red">J1: 0 🍎</span>  <span style="color:blue">J2: 0 🍎</span>';
            this.helpText.textContent = 'J1: WASD (Dash: LShift) | J2: IJKL (Dash: B)';
        } else { // Forzar el restablecimiento del texto cuando se vuelve a 1P
            this.hud.classList.remove('hud-2p');
            this.hud.classList.add('hud-1p');
            this.scoreText.innerHTML = '🍎 0';
            this.helpText.textContent = 'Moverse: W A S D';
            this.levelText.style.display = ''; // Asegura que el nivel se vuelva a ver
        }

        document.getElementById('menu-btn-pause').addEventListener('click', () => {
            if (this.game) this.game.menu();
        });
    }



    updateScore(score) {
        if (!this.isTwoPlayer) this.scoreText.textContent = `🍎 ${score}`;
    }

    updateLevel(level, current, required) {
        if (!this.isTwoPlayer) {
            this.levelText.textContent = `Nivel ${level}   ${current}/${required === Infinity ? '-' : required}`;
        }
    }

    updateScores(score1, score2) {
        if (this.isTwoPlayer) {
            this.scoreText.innerHTML = `<span style="color:red">J1: ${score1} 🍎</span>   <span style="color:blue">J2: ${score2} 🍎</span>`;
        }
    }

    showPauseOverlay(visible) {
        this.pauseOverlay.classList.toggle('active', visible);
    }

    showGameOver(score, winner = '', score2 = null) {

        this.winnerText.textContent = winner;

        if (this.isTwoPlayer && score2 !== null) {
            this.finalScoreText.textContent = `J1: ${score} manzanas  -  J2: ${score2} manzanas`;
        } else {
            this.finalScoreText.textContent = `Manzanas comidas: ${score}`;
        }

        this.gameoverOverlay.classList.add('active');
        this.winOverlay.classList.remove('active');
        this.showPauseOverlay(false);
    }

    showGameWin(score) {
        this.finalWinScoreText.textContent = `Manzanas totales: ${score}`;
        this.winOverlay.classList.add('active');
        this.gameoverOverlay.classList.remove('active');
        this.showPauseOverlay(false);
    }

    hideGameOver() {
        this.gameoverOverlay.classList.remove('active');
        this.winOverlay.classList.remove('active');
        this.pauseOverlay.classList.remove('active');
    }

    destroy() {
        this.hideAllOverlays();
        // OCULTAR EL HUD AL VOLVER AL MENÚ
        this.hud.style.display = 'none';
    }

    showStartOverlay(visible, plataforma) {
        const overlay = document.getElementById('overlay-start');
        if (overlay) {
            overlay.classList.toggle('active', visible);

            // Si nos pasan la plataforma, la agregamos como clase al overlay
            if (plataforma) {
                overlay.classList.remove('desktop', 'movil');
                overlay.classList.add(plataforma);
            }
        }
    }

    hideAllOverlays() {
        this.hideGameOver();
        const overlay = document.getElementById('overlay-start');
        if (overlay) overlay.classList.remove('active');
    }
}
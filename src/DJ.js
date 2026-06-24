// ============================================================
// DJ.js - Sistema centralizado de sonido
// ============================================================

const DEFAULT_GROUP = 'sfx';
const DEFAULT_FADE_MS = 350;

export const SOUND_GROUP = {
    SFX: 'sfx',
    MUSIC: 'music',
    UI: 'ui',
};
/**
 * DJ centraliza la musica y los efectos del juego.
 *
 * Uso rapido:
 *   DJ.register('waka', './sfx/waka.mp3');
 *   await DJ.preload();
 *   DJ.playSfx('waka');
 *
 * Para musica:
 *   DJ.registerMusic('intro', './sfx/intro.mp3');
 *   DJ.playMusic('intro');
 */
export class DJSystem {
    constructor() {
        this.registry = new Map();
        this.buffers = new Map();
        this.activeSfx = new Set();
        this.currentMusic = null;
        this.masterGain = null;
        this.groupGains = new Map();
        this.audioContext = null;
        this.unlocked = false;
        this.muted = false;

        this.volumes = {
            master: 1,
            [SOUND_GROUP.SFX]: 0.85,
            [SOUND_GROUP.MUSIC]: 0.55,
            [SOUND_GROUP.UI]: 0.75,
        };

        this._unlockHandler = () => this.unlock();
        this._installUnlockListeners();
    }

    register(name, src, options = {}) {
        if (!name || !src) {
            console.warn('[DJ] register necesita name y src.');
            return this;
        }

        this.registry.set(name, {
            src,
            group: options.group || DEFAULT_GROUP,
            volume: options.volume ?? 1,
            loop: options.loop ?? false,
            preload: options.preload ?? true,
        });

        return this;
    }

    registerMany(sounds = {}) {
        for (const [name, config] of Object.entries(sounds)) {
            if (typeof config === 'string') {
                this.register(name, config);
            } else {
                this.register(name, config.src, config);
            }
        }

        return this;
    }

    registerSfx(name, src, options = {}) {
        return this.register(name, src, { ...options, group: SOUND_GROUP.SFX });
    }

    registerMusic(name, src, options = {}) {
        return this.register(name, src, {
            loop: true,
            ...options,
            group: SOUND_GROUP.MUSIC,
        });
    }

    has(name) {
        return this.registry.has(name);
    }

    async preload(names = null) {
        const wanted = Array.isArray(names) ? names : [...this.registry.keys()];
        const jobs = wanted.map((name) => this.load(name).catch((error) => {
            console.warn(`[DJ] No se pudo cargar "${name}".`, error);
            return null;
        }));

        await Promise.all(jobs);
        return this;
    }

    async load(name) {
        if (this.buffers.has(name)) return this.buffers.get(name);

        const sound = this.registry.get(name);
        if (!sound) {
            if (!options.silent) console.warn(`[DJ] Sonido no registrado: "${name}".`);
            return null;
        }

        const context = this._getContext();
        const response = await fetch(sound.src);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status} al cargar ${sound.src}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await context.decodeAudioData(arrayBuffer);
        this.buffers.set(name, audioBuffer);

        return audioBuffer;
    }

    async play(name, options = {}) {
        const sound = this.registry.get(name);
        if (!sound) {
            console.warn(`[DJ] Sonido no registrado: "${name}".`);
            return null;
        }

        await this.unlock();

        let buffer = null;
        try {
            buffer = await this.load(name);
        } catch (error) {
            if (!options.silent) console.warn(`[DJ] No se pudo reproducir "${name}".`, error);
            return null;
        }

        if (!buffer) return null;

        const context = this._getContext();
        const source = context.createBufferSource();
        const gain = context.createGain();
        const group = options.group || sound.group || DEFAULT_GROUP;
        const volume = options.volume ?? sound.volume ?? 1;

        source.buffer = buffer;
        source.loop = options.loop ?? sound.loop ?? false;
        gain.gain.value = this.muted ? 0 : volume;

        source.connect(gain);
        gain.connect(this._getGroupGain(group));

        const instance = {
            name,
            group,
            source,
            gain,
            startedAt: context.currentTime,
            stop: (fadeMs = 0) => this._stopInstance(instance, fadeMs),
            setVolume: (nextVolume, fadeMs = 0) => this._setGain(gain, nextVolume, fadeMs),
        };

        source.onended = () => {
            this.activeSfx.delete(instance);
            if (this.currentMusic === instance) this.currentMusic = null;
        };

        source.start(0);

        if (group === SOUND_GROUP.MUSIC) {
            if (this.currentMusic && this.currentMusic !== instance) {
                this.currentMusic.stop(options.fadeOutMs ?? DEFAULT_FADE_MS);
            }
            this.currentMusic = instance;
            const fadeInMs = options.fadeInMs ?? DEFAULT_FADE_MS;
            if (fadeInMs > 0 && !this.muted) {
                gain.gain.value = 0;
                this._setGain(gain, volume, fadeInMs);
            }
        } else {
            this.activeSfx.add(instance);
        }

        return instance;
    }

    playSfx(name, options = {}) {
        return this.play(name, {
            ...options,
            loop: false,
            group: options.group || SOUND_GROUP.SFX,
        });
    }

    playUi(name, options = {}) {
        return this.play(name, {
            ...options,
            loop: false,
            group: SOUND_GROUP.UI,
        });
    }

    playMusic(name, options = {}) {
        return this.play(name, {
            ...options,
            loop: true,
            group: SOUND_GROUP.MUSIC,
        });
    }

    stopMusic(fadeMs = DEFAULT_FADE_MS) {
        if (!this.currentMusic) return;
        this.currentMusic.stop(fadeMs);
        this.currentMusic = null;
    }

    stopAllSfx(fadeMs = 0) {
        for (const instance of [...this.activeSfx]) {
            instance.stop(fadeMs);
        }
        this.activeSfx.clear();
    }

    stopAll(fadeMs = 0) {
        this.stopAllSfx(fadeMs);
        this.stopMusic(fadeMs);
    }

    setMasterVolume(volume, fadeMs = 0) {
        this.volumes.master = this._clampVolume(volume);
        if (this.masterGain) {
            this._setGain(this.masterGain, this.muted ? 0 : this.volumes.master, fadeMs);
        }
    }

    setGroupVolume(group, volume, fadeMs = 0) {
        this.volumes[group] = this._clampVolume(volume);
        if (this.groupGains.has(group)) {
            this._setGain(this.groupGains.get(group), this.muted ? 0 : this.volumes[group], fadeMs);
        }
    }

    mute() {
        this.muted = true;
        if (this.masterGain) this._setGain(this.masterGain, 0, 80);
    }

    unmute() {
        this.muted = false;
        if (this.masterGain) this._setGain(this.masterGain, this.volumes.master, 80);
    }

    toggleMute() {
        if (this.muted) this.unmute();
        else this.mute();
        return this.muted;
    }

    async unlock() {
        const context = this._getContext();
        if (context.state === 'suspended') {
            await context.resume();
        }
        this.unlocked = true;
        this._removeUnlockListeners();
    }

    _getContext() {
        if (!this.audioContext) {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            this.audioContext = new AudioContextClass();
            this.masterGain = this.audioContext.createGain();
            this.masterGain.gain.value = this.muted ? 0 : this.volumes.master;
            this.masterGain.connect(this.audioContext.destination);
        }

        return this.audioContext;
    }

    _getGroupGain(group) {
        if (this.groupGains.has(group)) return this.groupGains.get(group);

        const context = this._getContext();
        const gain = context.createGain();
        gain.gain.value = this.muted ? 0 : (this.volumes[group] ?? 1);
        gain.connect(this.masterGain);
        this.groupGains.set(group, gain);

        return gain;
    }

    _stopInstance(instance, fadeMs = 0) {
        if (!instance?.source) return;

        const stop = () => {
            try {
                instance.source.stop(0);
            } catch {
                // El source puede haber terminado antes del fade.
            }
        };

        if (fadeMs > 0) {
            this._setGain(instance.gain, 0, fadeMs);
            window.setTimeout(stop, fadeMs + 20);
        } else {
            stop();
        }
    }

    _setGain(gainNode, volume, fadeMs = 0) {
        const context = this._getContext();
        const safeVolume = this._clampVolume(volume);

        gainNode.gain.cancelScheduledValues(context.currentTime);
        gainNode.gain.setValueAtTime(gainNode.gain.value, context.currentTime);

        if (fadeMs > 0) {
            gainNode.gain.linearRampToValueAtTime(safeVolume, context.currentTime + fadeMs / 1000);
        } else {
            gainNode.gain.value = safeVolume;
        }
    }

    _clampVolume(volume) {
        return Math.max(0, Math.min(1, Number(volume) || 0));
    }

    _installUnlockListeners() {
        window.addEventListener('pointerdown', this._unlockHandler, { once: true });
        window.addEventListener('keydown', this._unlockHandler, { once: true });
        window.addEventListener('touchstart', this._unlockHandler, { once: true, passive: true });
    }

    _removeUnlockListeners() {
        window.removeEventListener('pointerdown', this._unlockHandler);
        window.removeEventListener('keydown', this._unlockHandler);
        window.removeEventListener('touchstart', this._unlockHandler);
    }
}

export const DJ = new DJSystem();

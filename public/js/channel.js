import { vnPath } from "./main.js";
export class Channel {
    constructor(urls, { loop, fade }) {
        this.audio = null;
        this.loop = true;
        this.fade = true;
        this.maxVolume = 1;
        this.fadingIn = false;
        this.urls = urls;
        if (loop !== undefined && loop !== null)
            this.loop = loop;
        if (fade !== undefined && fade !== null)
            this.fade = fade;
    }
    play(playlist, { loop, fade }) {
        if (this.audio)
            this.pause();
        if (loop === undefined || loop === null)
            loop = this.loop;
        if (fade === undefined || fade === null)
            fade = this.fade;
        this.playlist = playlist;
        this.soundId = 0;
        this.playSound(loop, fade);
    }
    playSound(loop, fade) {
        if (this.soundId >= this.playlist.length)
            return;
        this.audio = new Audio(this.getCurrentUrl());
        if (fade) {
            this.fadingIn = true;
            this.audio.volume = 0;
            this.audio.onplaying = () => {
                let linear = 0;
                const interval = setInterval(() => {
                    if (!this.audio) {
                        clearInterval(interval);
                        return;
                    }
                    linear += 0.034;
                    const newVol = linear ** 2;
                    if (linear < this.maxVolume)
                        this.audio.volume = newVol;
                    else {
                        clearInterval(interval);
                        this.fadingIn = false;
                        this.audio.volume = this.maxVolume;
                    }
                }, 100);
                this.fadeOutTimeout = setTimeout(() => {
                    this.pause();
                    this.nextSoundId(loop);
                    this.playSound(loop, fade);
                }, (this.audio.duration - 3) * 1000);
            };
        }
        else {
            this.audio.volume = this.maxVolume;
            this.audio.onended = () => {
                this.nextSoundId(loop);
                this.playSound(loop, fade);
            };
        }
        this.audio.play();
    }
    pause(fade = this.fade) {
        if (!this.audio) {
            console.info("channel is already paused");
            return;
        }
        const audio = this.audio;
        this.audio = null;
        clearTimeout(this.fadeOutTimeout);
        if (fade) {
            let linear = Math.sqrt(audio.volume);
            const interval = setInterval(() => {
                linear -= 0.034;
                const newVol = linear ** 2;
                if (linear > 0)
                    audio.volume = newVol;
                else {
                    audio.pause();
                    clearInterval(interval);
                }
            }, 100);
        }
        else
            audio.pause();
    }
    nextSoundId(loop) {
        if (loop)
            this.soundId = (this.soundId + 1) % this.playlist.length;
        else
            this.soundId += 1;
    }
    getCurrentUrl() {
        return vnPath + this.urls.get(this.playlist[this.soundId]);
    }
    getSoundNames() {
        const soundNames = [];
        for (const soundName of this.urls.keys())
            soundNames.push(soundName);
        return soundNames;
    }
    setVolume(volume) {
        if (this.audio) {
            if (!this.fadingIn)
                this.audio.volume = volume;
            else if (this.audio.volume > this.maxVolume)
                this.audio.volume = volume;
        }
        this.maxVolume = volume;
    }
}

import { rootDir } from "./main.js";

type channelOptions = {loop:boolean,fade:boolean}

export class Channel {
	audio: HTMLAudioElement = null
	urls: Map<string,string>

	loop: boolean = true
	fade: boolean = true
	private maxVolume: number = 1

	playlist: string[]
	private soundId: number
	private fadingIn: boolean = false
	private fadeOutTimeout: number

	constructor(urls:Map<string,string>, {loop,fade}:channelOptions) {
		this.urls = urls
		if(loop !== undefined && loop !== null)
			this.loop = loop
		if(fade !== undefined && fade !== null)
			this.fade = fade
	}

	play(playlist:string[], {loop,fade}:channelOptions) {
		if (this.audio)
			this.pause()

		if(loop === undefined || loop === null)
			loop = this.loop
		if(fade === undefined || fade === null)
			fade = this.fade

		this.playlist = playlist
		this.soundId = 0

		this.playSound(loop,fade)
	}

	private playSound(loop,fade) {
		if (this.soundId >= this.playlist.length)
			return

		this.audio = new Audio(this.getCurrentUrl())

		if (fade) {
			this.fadingIn = true
			this.audio.volume = 0
			this.audio.onplaying = () => {
				let linear = 0
				const interval = setInterval(() => {
					linear += 0.034
					const newVol = linear**2
					if (linear < this.maxVolume)
						this.audio.volume = newVol
					else {
						this.fadingIn = false
						this.audio.volume = this.maxVolume
						clearInterval(interval)
					}
				}, 100)

				this.fadeOutTimeout = setTimeout(() => {
					this.pause()
					this.nextSoundId(loop)
					this.playSound(loop, fade)
				}, (this.audio.duration - 3)*1000)
			}
		}
		else {
			this.audio.volume = this.maxVolume
			this.audio.onended = () => {
				this.nextSoundId(loop)
				this.playSound(loop, fade)
			}
		}

		this.audio.play()
	}

	pause(fade=this.fade) {
		const audio = this.audio
		this.audio = null

		clearTimeout(this.fadeOutTimeout)

		if (fade) {
			let linear = Math.sqrt(audio.volume)
			const interval = setInterval(() => {
				linear -= 0.034
				const newVol = linear**2
				if (linear > 0)
					audio.volume = newVol
				else {
					audio.pause()
					clearInterval(interval)
				}
			}, 100)
		}
		else
			audio.pause()
	}

	private nextSoundId(loop:boolean) {
		if (loop)
			this.soundId = (this.soundId+1) % this.playlist.length
		else
			this.soundId += 1
	}

	private getCurrentUrl() {
		return rootDir + this.urls.get(this.playlist[this.soundId])
	}

	getSoundNames() {
		const soundNames: string[] = []
		for (const soundName of this.urls.keys())
			soundNames.push(soundName)
		return soundNames
	}

	setVolume(volume) {
		if (this.audio) {
			if (!this.fadingIn)
				this.audio.volume = volume
			else if (this.audio.volume > this.maxVolume)
				this.audio.volume = volume
		}
		this.maxVolume = volume
	}
}
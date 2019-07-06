type channelOptions = {loop:boolean,fade:boolean}

export class Channel {
	private audio: HTMLAudioElement = null
	private urls: Map<string,string>

	private loop: boolean = true
	private fade: boolean = true

	private playlist: string[]
	private soundId: number
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
			this.audio.volume = 0
			this.audio.onplaying = () => {
				const interval = setInterval(() => {
					const newVol = this.audio.volume + 0.034
					if (newVol < 1)
						this.audio.volume = newVol
					else {
						this.audio.volume = 1
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
			this.audio.volume = 1
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
			const interval = setInterval(() => {
				const newVol = audio.volume - 0.034
				if (newVol > 0)
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
		return this.urls.get(this.playlist[this.soundId])
	}

	getSoundNames() {
		const soundNames: string[] = []
		for (const soundName of this.urls.keys())
			soundNames.push(soundName)
		return soundNames
	}
}
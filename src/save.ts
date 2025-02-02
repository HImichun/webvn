import { info, state, characters, sprites, images, channels, vnPath, loadVn, variableStack, loadSave } from "./main.js";
import { Channel } from "./channel.js";
import crel from "./crel.js";
import { readFileAsString } from "./setup.js";

// LOAD

export function loadFromFile() {
	const input = crel("input").attrs({type:"file"}).el as HTMLInputElement
	input.onchange = (e => {
		const files = input.files
		if (!files || !files.length)
			return

		const file = files[0]

		readFileAsString(file)
		.then(save => loadSave(save))
	})
	input.click()
}

// SAVE

export function autosave() {
	const save: Save = {
		shortName: 			info.shortName,
		path:			vnPath,
		state: 			stateToObj(state),
		characters: 	mapToObj(characters),
		sprites: 		spritesToObj(sprites),
		images: 		mapToObj(images),
		channels:		channelsToObj(channels),
		variableStack:	varStackToObj(variableStack)
	}
	localStorage.setItem("autosave", JSON.stringify(save))
}
export function saveToFile() {
	let name: string
	if (info) {
		name = info.shortName
	}
	else {
		const autosave = localStorage.getItem("autosave")
		if (autosave) {
			const autosaveJSON = JSON.parse(autosave) as Save
			name = autosaveJSON.shortName
		}
	}
	download(
		`${name} ${Date.now()}.vns`,
		localStorage.getItem("autosave")
	)
}

function download(fileName, content) {
	const link = crel("a")
		.attrs({
			id: "save",
			href: "data:text/plain;charset=utf-8," + encodeURIComponent(content),
			download: fileName
		})
		.el

	document.body.appendChild(link)
	link.click()
	link.remove()
}

export function varStackToObj(varStack:Variable[]) {
	const arr: SavedVariable[] = []
	for (const variable of varStack) {
		let b = null
		if (variable.block != null) {
			b = 0
			let block = state.block
			while (block.parent) {
				if (block == variable.block)
					break
				b++
				block = block.parent
			}
		}
		const svar: SavedVariable = {
			name: variable.name,
			block: b,
			value: variable.value
		}
		arr.push(svar)
	}
	return arr
}
function spritesToObj(sprites:Map<string,Sprite>) : SavedSprites {
	const obj: SavedSprites = {}
	for (const [spriteName, sprite] of sprites.entries()) {
		const variants: {[name:string]:string[]} = {}
		for (const [varName, srcs] of sprite.variants)
			variants[varName] = srcs
		const spriteObj: SavedSprite = {
			variants,
			shown: sprite.shown,
			position: sprite.position,
			rotated: sprite.rotated,
			variant: sprite.variant
		}
		obj[spriteName] = spriteObj
	}
	return obj
}
function channelsToObj(channels:Map<string,Channel>) : SavedChannels {
	const obj: SavedChannels = {}
	for (const [channelName, channel] of channels.entries()) {
		const urls: {[name:string]:string} = {}
		for (const [soundName, url] of channel.urls)
			urls[soundName] = url
		const channelObj: SavedChannel = {
			urls: urls,
			playing: channel.audio && !channel.audio.paused,
			playlist: channel.playlist,
			loop: channel.loop,
			fade: channel.fade
		}
		obj[channelName] = channelObj
	}
	return obj
}
function stateToObj(state:State) : SavedState {
	const savedState: SavedState = {
		callStack: state.callStack,
		scenario: state.scenario,
		chapter: state.chapter,
		line: state.line,
		background: state.background,
		blockDataStack: getBlockDataStack()
	}

	return savedState
}
export function getBlockDataStack() {
	const blockDataStack: BlockDataStack = []

	let block = state.block
	while(true) {
		blockDataStack.push(block.data)
		if (block.parent)
			block = block.parent
		else
			break
	}

	return blockDataStack
}
function mapToObj<T>(map:Map<string,T>) : {[name:string]:T} {
	const obj = {}
	for(const [key, value] of map.entries()) {
		if (value instanceof Map)
			obj[key] = mapToObj(value)
		else if (value instanceof Set)
			obj[key] = setToString(value)
		else
			obj[key] = value
	}
	return obj
}
function setToString<T>(set:Set<T>) : Array<any> {
	const arr = []
	for(const value of set.values()) {
		if (value instanceof Map)
			arr.push(mapToObj(value))
		else if (value instanceof Set)
			arr.push(setToString(value))
		else
			arr.push(value)
	}
	return arr
}
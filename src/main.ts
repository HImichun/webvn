import { makeBlocks } from "./block.js";
import { makeCommand, executeCommand } from "./command.js";
import { Channel } from "./channel.js";
import { setupEvents, setupLoad, setupMenu, setupSpeed, clearSettings } from "./setup.js";

export const info: Info = {
	name: "",
	shortName: "",
	author: "",
	version: "",
	description: "",
	entryPoint: "",
	scenarios: new Set()
}

export const state: State = {
	scenario: null,
	chapter: null,
	block: null,
	line: 0,
	background: "",
	getScenario: () => scenarios.get(state.scenario),
	getChapter : () => scenarios.get(state.scenario)
								.get(state.chapter),
	getCommand : () => scenarios.get(state.scenario)
								.get(state.chapter)
								.commands[state.line]
}

export const config = {
	textDelay: 40
}

export let rootDir: string
export let scenarios: Scenarios
export const characters: Characters = new Map()
export const sprites: Sprites = new Map()
export const images: Images = new Map()
export const channels: Map<string, Channel> = new Map()
export const elements = {
	scene: document.getElementById("scene"),
	backgrounds: document.getElementById("backgrounds"),
	sprites: document.getElementById("sprites"),
	panel: document.getElementById("panel"),
	name: document.getElementById("name"),
	text: document.getElementById("text"),
	menu: document.getElementById("menu"),
	settings: document.getElementById("settings")
}
export let variableStack: Variable[] = []
export const events = {
	onVnStart: function(){},
	onMainMenu: function(){}
}

export function init() {
	setupEvents()
	setupLoad()
	events.onMainMenu()
}

export async function loadVn(root:string) {
	unloadVn()
	await prepareVn(root)

	executeCommand(CommandType.load, [info.entryPoint])
	startVn()
}

export async function loadSave(file?:string) {
	unloadVn()

	const save: Save = JSON.parse(
		file? file : localStorage.getItem("autosave")
	) as Save

	await prepareVn(save.rootDir)

	// images
	for (const [name, url] of Object.entries(save.images)) {
		await executeCommand(CommandType.image, [
			name, url
		])
	}

	// state
	{
		state.scenario = save.state.scenario
		state.chapter  = save.state.chapter
		state.line	   = save.state.line

		const chapter = state.getChapter()
		let block = chapter.rootBlock
		while (block.children.length >= 1) {
			let child = block.children.find(b =>
				b.startLine <= state.line
				&& b.endLine > state.line
			)
			if (child)
				block = child
			else
				break
		}
		state.block = block

		const background = [save.state.background]
		if (!images.has(save.state.background))
			background.unshift("color")
		executeCommand(CommandType.background, background)
	}

	// sprites
	for (const [name, sprite] of Object.entries(save.sprites)) {
		await executeCommand(CommandType.sprite, [
			name,
			new Set(Object.entries(sprite.variants))
		])
		if (sprite.shown)
			executeCommand(CommandType.show, [
				name,
				sprite.variant,
				sprite.rotated?"rotated":"not-rotated",
				sprite.position.toString(),
			])
	}

	// channels
	for (const [name, channel] of Object.entries(save.channels)) {
		await executeCommand(CommandType.channel, [
			name,
			new Set(Object.entries(channel.urls)),
			channel.loop?"loop":"once",
			channel.fade?"fade":"no-fade"
		])
		if (channel.playing)
			executeCommand(CommandType.play, [
				name,
				new Set(channel.playlist.map(s=>[s]))
			])
	}

	// characters
	for (const [name, character] of Object.entries(save.characters)) {
		executeCommand(CommandType.character, [
			name,
			character.name,
			character.color,
			character.prefix,
			character.postfix
		])
	}

	// variable stack
	{
		const blockStack: Block[] = [state.block]
		let block = state.block
		while (block.parent) {
			blockStack.push(block.parent)
			block = block.parent
		}

		for (const svar of save.variableStack) {
			let block: Block = null
			if (svar.block != null)
				block = blockStack[svar.block]
			const variable: Variable = {
				name: svar.name,
				block: block,
				value: svar.value
			}
			variableStack.push(variable)
		}
	}

	startVn()
}

export function unloadVn() {
	rootDir = "/"
	scenarios = null

	clearSettings()

	// elements
	{
		while(elements.backgrounds.childElementCount)
				elements.backgrounds.firstElementChild.remove()

		elements.menu.classList.add("hidden")
		while(elements.menu.childElementCount)
			elements.menu.firstElementChild.remove()

		elements.panel.classList.add("hidden")
		elements.settings.classList.add("hidden")

		elements.name.innerText = ""
		elements.text.innerText = ""
	}

	// images
	images.forEach((_,key) => images.delete(key))

	// state
	{
		state.scenario = ""
		state.chapter  = ""
		state.line	   = 0
		state.block = null
		state.background = ""
	}

	// sprites
	sprites.forEach((sprite,key) => {
		sprite.element.remove()
		sprites.delete(key)
	})

	// channels
	channels.forEach((channel,key) => {
		channel.fade = false
		if (channel.audio)
			channel.pause()
		channels.delete(key)
	})

	// characters
	characters.forEach((_,key) => characters.delete(key))

	// variable stack
	variableStack = []
}

async function prepareVn(root:string) {
	rootDir = root
	scenarios = await loadFiles(rootDir+"info.json")

	setupMenu()
	setupSpeed()
}

async function startVn() {
	events.onVnStart()
	console.log(state.getScenario())
	while(await loop()) {}
	endVn()
}

export function endVn() {
	unloadVn()
	events.onMainMenu()
}

async function loop() {
	const command = state.getCommand()
	if (!command)
		return false
	const result = await executeCommand(command.type, command.args)

	// console.log(state)
	if (!(result & 0b1))
		state.line++
	if (result & 0b10)
		return false
	return true
}


// compiler

function compile(file:string) : Scenario {
	const scenario: Scenario = new Map()
	const regExp = /chapter (\w+)\s*{([\s\S]*?)}/g
	let match
	while((match = regExp.exec(file)) != null) {
		const chapter: Chapter = compileChapter(match[2])
		scenario.set(match[1], chapter)
	}
	return scenario
}

function compileChapter(text:string) : Chapter {
	const chapter: Chapter = {
		commands: [],
		rootBlock: null
	}

	text.replace(/##[^]*?\n/g, "\n") // remove comments
		.replace(/\[([^]+?)\]/g, (_,set) => "[" + set
			.replace(/(^\s+)|(\s+$)/, "")
			.replace(/\n/g, ",")
			+ "]"
		) // [a\nb] -> [a,b]
		.split("\n")
		.forEach(line => {
			const command = makeCommand(line)
			if(command != null)
				chapter.commands.push(command)
		})

	makeBlocks(chapter)

	return chapter
}

async function loadFiles(path:string) {
	try {
		const result = await fetch(path)
		const infoFile = await result.json()
		const stringProps = [
			"name",
			"shortName",
			"author",
			"version",
			"description",
			"entryPoint"
		]
		if (stringProps.every(prop => typeof infoFile[prop] == "string") &&
			infoFile.scenarios instanceof Array &&
			infoFile.scenarios.every(path => typeof path == "string"))
		{
			stringProps.push("scenarios")
			for (const prop of stringProps)
				info[prop] = infoFile[prop]
		}
		else
			throw "Invalid info file"

		// info is correct now

		const scenarios: Scenarios = new Map()

		for(const path of info.scenarios) {
			const fullPath = rootDir+`${path}.scn`
			const fileName = path
				.replace(/^.*\//, "")
				.replace(/\..*$/, "")
			const result = await fetch(fullPath)
			const file = await result.text()
			const scenario = compile(file)
			scenarios.set(fileName, scenario)
		}
		return scenarios
	}
	catch(e) {
		console.error("Error loading info file.", e)
	}
}
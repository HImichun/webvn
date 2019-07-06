import { makeBlocks } from "./block.js";
import { makeCommand, executeCommand } from "./command.js";
import { Channel } from "./channel.js";

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
	menu: document.getElementById("menu")
}
export const variableStack: Variable[] = []

export async function start(vnName:string) {
	// set root directory of the vn
	rootDir = `/vns/${vnName}/`
	// load scenarios
	scenarios = await load(rootDir+"info.json")
	// log everything
	console.log(scenarios, characters, sprites, images, channels, elements)
	// // start from entry point
	executeCommand(CommandType.load, [info.entryPoint])
	// // start the main loop
	while(await loop()) {}
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

{
	let timeout: number
	window.addEventListener("resize", () => {
		if(timeout)
			clearTimeout(timeout)

		elements.sprites.classList.add("no-transition")

		timeout = setTimeout(()=>{
			elements.sprites.classList.remove("no-transition")
		},100)
	})
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

async function load(path:string) {
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
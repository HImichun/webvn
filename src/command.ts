import { state, characters, images, sprites, elements, channels, vnPath, variableStack, config } from "./main.js";
import * as writer from "./writer.js"
import crel from "./crel.js";
import { Channel } from "./channel.js";
import { autosave } from "./save.js";
import { addToSettings, getCookie, setCookie } from "./setup.js";
import { RangeCE } from "./controlElement.js";

const ALL_BUT_SETTINGS = {include:null, exclude:"#settings, #save"}

export function makeCommand(line: string) : Command {
	if (line.trim().length == 0)
	return null

	let   type: CommandType = null
	const args: CommandArg[] = []

	let start = null // start of token
	let inQuotes = false
	let set: Set<string[]> = null
	let tuple: string[] = null

	const addToken = (i:number) => {
		const token = line.substring(start, i)
		if (type === null) {
			type = typeFromString(token)
			if (type == CommandType.say)
				args.push(token)
		}
		else if (set)
			tuple.push(token)
		else
			args.push(token)
		start = null
	}

	for (let i=0; i<=line.length; i++) {
		const char = line.charAt(i)
		const lastChar = line.charAt(i-1)

		// "" []
		if (lastChar != "\\") {
			// ""
			if (char == "\"") {
				// "<-"
				if (!inQuotes) {
					inQuotes = true
					start = i+1
				}
				// "->"
				else {
					addToken(i)
					inQuotes = false
					start = null
				}
				continue
			}
			// []
			else if (!inQuotes) {
				if (char == "[") {
					set = new Set()
					tuple = []
					continue
				}
				else if (set) {
					if (char == "]") {
						if (start)
							addToken(i)
						if (tuple.length)
							set.add(tuple)
						tuple = null
						args.push(set)
						set = null
						continue
					}
					if (char == ",") {
						if (start)
							addToken(i)
						if (tuple.length)
							set.add(tuple)
						tuple = []
						continue
					}
				}
			}
		}

		if (!inQuotes) {
			// \s
			if (char.trim().length == 0) { // end of word
				if (start !== null) {
					addToken(i)
				}
			}

			// \w
			else if (start === null)
				start = i
		}

	}

	return {type, args}
}

export function executeCommand(type: CommandType, args: CommandArg[]) : Promise<number>|number {
	console.info("executing", type, args)
	switch(type)
	{
		// say
		case CommandType.say: {
			autosave()

			const [
				shortName, ...what
			] = args as string[]

			console.log(shortName + ": " + what.join(" "))
			const character = characters.get(shortName)

			elements.panel.classList.remove("hidden")

			elements.name.innerText = character.name
			elements.name.style.setProperty("--color", character.color)

			elements.text.setAttribute("data-prefix", character.prefix)
			elements.text.setAttribute("data-postfix", character.postfix)

			return new Promise(resolve => {
				const originalDelay = config.textDelay

				waitForClick(ALL_BUT_SETTINGS)
					.then(() => config.textDelay = 5)

				writer.write(what.join(" "))
					.then(() => {
						config.textDelay = originalDelay
						return waitForClick(ALL_BUT_SETTINGS)
					})
					.then(() => resolve())
			})
		}

		// extend
		case CommandType.extend: {
			const [
				...what
			] = args as string[]

			elements.panel.classList.remove("hidden")

			return new Promise(resolve => {
				const originalDelay = config.textDelay

				waitForClick(ALL_BUT_SETTINGS)
					.then(() => config.textDelay = 5)

				writer.append(what.join(" "))
					.then(() => {
						config.textDelay = originalDelay
						return waitForClick(ALL_BUT_SETTINGS)
					})
					.then(() => resolve())
			})
		}

		// global
		case CommandType.global: {
			const [
				name,
				operator,
				...right
			] = args as string[]

			const value = evaluate(right.join(""))
			console.log(value)

			const index = variableStack.findIndex(v => v.name == name)
			if (index != -1) {
				const oldValue = variableStack[index].value

				switch (operator) {
					case  "=":  variableStack[index].value = value; break
					case "+=":  variableStack[index].value = evaluateNoPars([oldValue, "+", value]) ; break
					case "-=":  variableStack[index].value = evaluateNoPars([oldValue, "-", value]) ; break
					case "*=":  variableStack[index].value = evaluateNoPars([oldValue, "*", value]) ; break
					case "/=":  variableStack[index].value = evaluateNoPars([oldValue, "/", value]) ; break
					case "%=":  variableStack[index].value = evaluateNoPars([oldValue, "%", value]) ; break
				}
			}
			else if (operator == "=") {
				variableStack.unshift({
					name: name,
					value: value,
					block: null
				})
			}
			else
				console.error("can't TODO: make a mormal error")

			break
		}

		// var
		case CommandType.var: {
			const [
				name,
				operator,
				...right
			] = args as string[]

			const value = evaluate(right.join(""))
			console.log(value)

			const index = variableStack.findIndex(v => v.name == name)
			if (index != -1) {
				const oldValue = variableStack[index].value

				switch (operator) {
					case  "=":  variableStack[index].value = value; break
					case "+=":  variableStack[index].value = evaluateNoPars([oldValue, "+", value]) ; break
					case "-=":  variableStack[index].value = evaluateNoPars([oldValue, "-", value]) ; break
					case "*=":  variableStack[index].value = evaluateNoPars([oldValue, "*", value]) ; break
					case "/=":  variableStack[index].value = evaluateNoPars([oldValue, "/", value]) ; break
					case "%=":  variableStack[index].value = evaluateNoPars([oldValue, "%", value]) ; break
				}
			}
			else if (operator == "=") {
				variableStack.push({
					name: name,
					value: value,
					block: state.block
				})
			}
			else
				console.error("can't TODO: make a mormal error")

			break
		}

		// character
		case CommandType.character: {
			const [
				shortName, name,
				color, prefix, postfix
			] = args as string[]
			characters.set(shortName, {
				name, color,
				prefix: prefix? prefix: "",
				postfix: postfix? postfix: prefix? prefix: ""
			})
			break
		}

		// image
		case CommandType.image: {
			const [
				name, relSrc
			] = args as [string, string]

			// maybe won't resolve in chrome
			// return new Promise(async resolve => {
				images.set(name, relSrc)

			// 	const preloadEl = new Image()
			// 	preloadEl.src = rootDir + relSrc
			// 	preloadEl.onload = () => resolve()
			// })
			break
		}

		// sprite
		case CommandType.sprite: {
			const [
				name, variants
			] = args as [string, Set<string[]>]

			const element = new Image()
			element.className = "sprite"
			element.ondragstart = e => e.preventDefault()

			return new Promise(async resolve => {
				let variantMap: Map<string,string> = new Map()
				console.log(variants)
				for (const [name,relSrc] of variants.values()) {
					variantMap.set(name, relSrc)

					// never resolves in chrome
					// await new Promise(r => {
					// 	const preloadEl = new Image()
					// 	preloadEl.src = rootDir + relSrc
					// 	preloadEl.onloadend = () => r()
					// })
				}

				const sprite: Sprite = {
					variants: variantMap,
					element: element,
					shown: false,
					position: 0,
					rotated: false,
					variant: "normal"
				}

				sprites.set(name, sprite)
				resolve()
			})
			break
		}

		// channel
		case CommandType.channel: {
			const [
				name, sounds, ...options
			] = args as [string, Set<string[]>, ...string[]]

			let soundMap: Map<string,string> = new Map()
			sounds.forEach(sound =>
				soundMap.set(sound[0], sound[1]))

			const loop =
				options.includes("loop") ? true :
				options.includes("once") ? false :
				undefined
			const fade =
				options.includes("fade") ? true :
				options.includes("no-fade") ? false :
				undefined

			const channel: Channel = new Channel(soundMap, {loop,fade})

			channels.set(name, channel)

			const range = new RangeCE("channel-"+name, 1, name)
			range.onchange(x => channel.setVolume(x**2))
			addToSettings("sound", range.elementContainer)

			break
		}

		// background
		case CommandType.background: {
			const [
				name, colorName
			] = args as [string,string?]

			const backgroundEl = crel("div", "background").el

			if (name == "color") {
				backgroundEl.style.backgroundColor = colorName
				state.background = colorName
			}
			else {
				backgroundEl.style.backgroundImage =
					`url(${
						vnPath
					}${
						images.get(name)
					})`
				state.background = name
			}

			elements.backgrounds.insertAdjacentElement("afterbegin", backgroundEl)

			for (const oldBg of Array.from(elements.backgrounds.children))
				if(oldBg != backgroundEl && !oldBg.classList.contains("fading")) {
					oldBg.classList.add("fading")
					oldBg.animate([
						{filter: "opacity(100%)"},
						{filter: "opacity(0%)"}
					], {duration: 600})
					.onfinish = () => oldBg.remove()
				}

			break
		}

		// show
		case CommandType.show: {
			const [
				name, ...positions
			] = args as CommandArg[]

			let subjects: Set<string[]>

			if (name instanceof Set)
				subjects = name
			else
				subjects = new Set([ [name, ...positions as string[]] ])

			subjects.forEach(([name, ...positions]) => {
				const sprite = sprites.get(name)
				sprite.shown = true
				sprite.element.className = "sprite"

				let p
				if (positions.includes("left"))
					setSpritePos(sprite, .2)
				else if (positions.includes("right"))
					setSpritePos(sprite, .8)
				else if (p = positions.find(pos => !isNaN(+pos)))
					setSpritePos(sprite, p)
				else
					setSpritePos(sprite, .5)

				if (positions.includes("rotated"))
					setSpriteRot(sprite, true)

				const foundVariant = positions.some(position => {
					if (sprite.variants.has(position)) {
						setSpriteVar(sprite, position)
						return true
					}
				})
				if (!foundVariant)
					setSpriteVar(sprite, "normal")

				elements.sprites.appendChild(sprite.element)
				sprite.element.animate([
					{filter: "opacity(0%) blur(5px)"},
					{filter: "opacity(100%) blur(0)"}
				], {duration: 600})
			})

			return new Promise(r => setTimeout(()=>r(), 650))
		}

		// move
		case CommandType.move: {
			const [
				name, ...positions
			] = args as CommandArg[]

			let subjects: Set<string[]>

			if (name instanceof Set)
				subjects = name
			else
				subjects = new Set([ [name, ...positions as string[]] ])

			subjects.forEach(([name, ...positions]) => {
				const sprite = sprites.get(name)

				let p
				if (positions.includes("left"))
					setSpritePos(sprite, .2)
				else if (positions.includes("right"))
					setSpritePos(sprite, .8)
				else if (p = positions.find(pos => !isNaN(+pos)))
					setSpritePos(sprite, p)
				else if (positions.includes("center"))
					setSpritePos(sprite, .5)

				if (positions.includes("rotated"))
					setSpriteRot(sprite, true)
				else if (positions.includes("not-rotated"))
					setSpriteRot(sprite, false)

				positions.some(position => {
					if (sprite.variants.has(position)) {
						setSpriteVar(sprite, position)
						return true
					}
				})
			})

			return new Promise(r => setTimeout(()=>r(), 650))
		}

		// variant
		case CommandType.variant: {
			const [
				name, variant
			] = args as CommandArg[]

			let subjects: Set<string[]>

			if (name instanceof Set)
				subjects = name
			else
				subjects = new Set([ [name, variant as string] ])

			subjects.forEach(([name, variant]) => {
				const sprite = sprites.get(name)
				setSpriteVar(sprite, variant)
			})

			return new Promise(r => setTimeout(()=>r(), 150))
		}

		// hide
		case CommandType.hide: {
			const [
				...names
			] = args as string[]

			if(names.length == 0) {
				elements.panel.classList.add("hidden")
				break
			}

			names.forEach(name => {
				const sprite = sprites.get(name)

				sprite.shown = false

				sprite.element.animate([
					{filter: "opacity(100%) blur(0)"},
					{filter: "opacity(0%) blur(5px)"}
				], {duration:600})
				.onfinish = () => sprite.element.remove()
			})

			return new Promise(r => setTimeout(()=>r(), 350))
		}

		// clear
		case CommandType.clear: {
			sprites.forEach(sprite => {
				if (!sprite.shown)
					return

				sprite.shown = false

				sprite.element.animate([
					{filter: "opacity(100%) blur(0)"},
					{filter: "opacity(0%) blur(5px)"}
				], {duration:600})
				.onfinish = () => sprite.element.remove()
			})

			return new Promise(r => setTimeout(()=>r(), 350))
		}

		// play
		case CommandType.play: {
			let [
				channelName, sound, ...options
			] = args as [string, CommandArg, ...string[]]

			const channel = channels.get(channelName)

			if (typeof sound == "string" && ["loop", "fade", "once", "no-fade"].includes(sound)) {
				options.push(sound)
				sound = null
			}

			const playlist: string[] = []
			if (sound instanceof Set)
				sound.forEach(s => playlist.push(s[0]))
			else if (typeof sound == "string")
				playlist.push(sound)
			else
				playlist.push(...channel.getSoundNames())

			const loop =
				options.includes("loop") ? true :
				options.includes("once") ? false :
				undefined
			const fade =
				options.includes("fade") ? true :
				options.includes("no-fade") ? false :
				undefined

			channel.play(playlist, {loop,fade})

			break
		}

		// pause
		case CommandType.pause: {
			const [
				...channelNames
			] = args as string[]

			channelNames.forEach(channelName => {
				const channel = channels.get(channelName)
				channel.pause()
			})

			break
		}

		// menu
		case CommandType.menu: {
			while (elements.menu.lastElementChild)
				elements.menu.lastElementChild.remove()

			let menuBlock: Block = state.block
			if (menuBlock.type != BlockType.menu)
				for (const childBlock of state.block.children)
					if (childBlock.startLine == state.line) {
						menuBlock = childBlock
						break
					}

			state.block = menuBlock

			const optionBlocks = menuBlock.children

			return new Promise(resolve => {
				const click = (block: Block) => {
					elements.menu.classList.add("hidden")
					const line = block.startLine+1
					state.line = line
					state.block = block
					document.onkeydown = null
					resolve(0b1)
				}

				document.onkeydown = e => {
					let key = e.key
					if ("1234567890".includes(key)) {
						if (key == "0")
							key = "10"
						const i = +key-1
						if (i < optionBlocks.length)
							click(optionBlocks[i])
					}
				}

				for (const i in optionBlocks) {
					const optionBlock = optionBlocks[i]
					console.log(i, optionBlock)
					const line = optionBlock.startLine
					const optionCommand = state.getChapter().commands[line]
					const title = optionCommand.args.join(" ")
					const button = crel("div", "option")
						.text(title)
						.el
					button.addEventListener("click", ()=>click(optionBlock))
					elements.menu.appendChild(button)
				}

				elements.menu.classList.remove("hidden")
			})
		}

		// option
		case CommandType.option: {
			const menuBlock = state.block.parent

			removeBlockVarsFromScope(state.block)
			removeBlockVarsFromScope(menuBlock)

			state.block = menuBlock.parent
			state.line = menuBlock.endLine+1
			return 0b1
		}

		// if
		case CommandType.if: {
			const expression = args as string[]

			const result = evaluate(expression.join("")) == true

			let ifBlock: Block
			for (const childBlock of state.block.children)
				if (childBlock.startLine == state.line) {
					ifBlock = childBlock
					break
				}

			ifBlock.data = +result
			state.block = ifBlock

			if (!result) {
				state.line = ifBlock.endLine
				return 0b1
			}

			break
		}

		// elseif
		case CommandType.elseif: {
			const ifBlock = state.block
			const elseifBlock = ifBlock.closedByBlock

			removeBlockVarsFromScope(ifBlock)

			if (ifBlock.data == 1) {
				let lastInElseChain: Block = elseifBlock
				while (lastInElseChain.closedByBlock)
					lastInElseChain = lastInElseChain.closedByBlock
				state.line = lastInElseChain.endLine
				return 0b1
			}
			else {
				const expression = args as string[]
				const result = evaluate(expression.join("")) == true

				elseifBlock.data = +result
				state.block = elseifBlock

				if (elseifBlock.data != 1) {
					state.line = elseifBlock.endLine
					return 0b1
				}
			}

			break
		}

		// else
		case CommandType.else: {
			const ifBlock = state.block
			const elseBlock = ifBlock.closedByBlock

			removeBlockVarsFromScope(ifBlock)

			if (ifBlock.data == 1) {
				state.line = elseBlock.endLine
				return 0b1
			}
			else
				state.block = elseBlock

			break
		}

		// loop
		case CommandType.loop: {
			let loopBlock: Block
			for (const childBlock of state.block.children)
				if (childBlock.startLine == state.line) {
					loopBlock = childBlock
					break
				}

			state.block = loopBlock

			break
		}

		// break
		case CommandType.break: {
			let loopBlock = state.block
			while (loopBlock.type != BlockType.loop) {
				removeBlockVarsFromScope(loopBlock)
				loopBlock = loopBlock.parent
			}

			removeBlockVarsFromScope(loopBlock)
			state.block = loopBlock.parent
			state.line = loopBlock.endLine+1

			return 0b1
		}

		// end
		case CommandType.end: {
			const block = state.block
			if (block.type != BlockType.loop) {
				removeBlockVarsFromScope(block)
				state.block = block.parent

				break
			}
		   //
		} //
		 //
		// continue
		case CommandType.continue: {
			let loopBlock = state.block
			while (loopBlock.type != BlockType.loop) {
				removeBlockVarsFromScope(loopBlock)
				loopBlock = loopBlock.parent
			}

			removeBlockVarsFromScope(loopBlock)
			state.block = loopBlock.parent
			state.line = loopBlock.startLine

			return 0b1
		}

		// wait
		case CommandType.wait: {
			const [
				time
			] = args as string[]

			return new Promise(resolve => {
				if (time == "click")
					waitForClick(ALL_BUT_SETTINGS)
						.then(() => resolve())
				else
					setTimeout(() => resolve(), +time*1000)
			})
		}

		// load
		case CommandType.load: {
			const scenario = args[0]
			if (typeof scenario == "string") {
				state.scenario = scenario
				state.chapter = "init"
				state.block = state.getChapter().rootBlock
				state.line = 0
			}
			removeBlockVarsFromScope()
			return 0b1
		}

		// jump
		case CommandType.jump: {
			const chapter = args[0]
			if (typeof chapter == "string") {
				state.chapter = chapter
				state.block = state.getChapter().rootBlock
				state.line = 0
			}
			removeBlockVarsFromScope()
			return 0b1
		}
	}
	return 0
}

function setSpritePos(sprite:Sprite, pos:number) {
	sprite.position = pos
	sprite.element.style.setProperty("--pos", pos.toString())
}
function setSpriteRot(sprite:Sprite, rot:boolean) {
	sprite.rotated = rot
	sprite.element.classList[rot?"add":"remove"]("rotated")
}
function setSpriteVar(sprite:Sprite, varName:string) {
	sprite.variant = varName
	const url = vnPath + sprite.variants.get(varName)
	// sprite.element.style.backgroundImage = `url(${url})`
	sprite.element.src = url
}

function waitForClick({include, exclude}: {include?:string, exclude?:string}) {
	return new Promise(resolve => {
		document.onclick = e => {
			if (e.which != 1)
				return
			if (exclude != null && exclude != undefined
				&& (e.target as HTMLElement).closest(exclude) != null)
				return
			if (include != null && include != undefined
				&& (e.target as HTMLElement).closest(include) == null)
				return
			document.onclick = null
			document.onkeydown = null
			resolve()
		}
		document.onkeydown = e => {
			const key = e.key
			if (![" ", "Enter", "ArrowRight"].includes(key))
				return
			document.onclick = null
			document.onkeydown = null
			resolve()
		}
	})
}

/** Works only on the last block which has variables!!
 * If block is not specified, removes all local variables
*/
function removeBlockVarsFromScope(block?: Block) {
	if(block)
		while (variableStack[variableStack.length-1] && variableStack[variableStack.length-1].block == block)
			variableStack.pop()
	else {
		const firstLocalIndex = variableStack.findIndex(v => v.block != null)
		if (firstLocalIndex != -1)
			variableStack.splice(firstLocalIndex, variableStack.length-firstLocalIndex)
	}
}

function evaluate(expression: string) : string|number|boolean {
	const tokens: (string|number|boolean)[] = expression
		.match(/(?:[()])|(?:\$[^\W\d_]+)|(?:(?:>=)|(?:<=)|(?:!=)|[&|=]{2}|[+\-*/_><!])|(?:-?\d*\.?\d)|(?:[^+\-*/_]+)/g)

	const openingPars: number[] = []

	for (let i=0; i<tokens.length; i++) {
		const token = tokens[i]

		if (token == "(")
			openingPars.push(i)
		else if (token == ")") {
			const openingPar = openingPars.pop()
			tokens.splice(
				openingPar,
				i-openingPar+1,
				evaluateNoPars(tokens.slice(openingPar+1, i))
			)
			i = openingPar
		}
	}

	return evaluateNoPars(tokens)
}

function evaluateNoPars(tokens: (string|number|boolean)[]) : string|number|boolean {
	tokens = tokens.map(t =>
		typeof t == "string" && t.charAt(0) == "$"
		?
			variableStack.find(v => v.name == t.substring(1)).value.toString()
		:
			t
	)

	while(tokens.length > 1) {
		let i: number

		if ((i = tokens.findIndex(t => t == "!")) != -1) {
			const right = tokens[i+1]
			tokens.splice(i, 2, !right)
		}
		else if ((i = tokens.findIndex(t => t == "*")) != -1) {
			const left = tokens[i-1]
			const right = tokens[i+1]
			if ((left == "true" || left == "false") && (right == "true" || right == "false"))
				tokens.splice(i-1, 3, left=="true" && right=="true")
			else
				tokens.splice(i-1, 3, +left * +right)
		}
		else if ((i = tokens.findIndex(t => t == "/")) != -1) {
			const left = tokens[i-1]
			const right = tokens[i+1]
			tokens.splice(i-1, 3, +left / +right)
		}
		else if ((i = tokens.findIndex(t => t == "%")) != -1) {
			const left = tokens[i-1]
			const right = tokens[i+1]
			tokens.splice(i-1, 3, +left % +right)
		}
		else if ((i = tokens.findIndex(t => t == "+")) != -1) {
			const left = tokens[i-1]
			const right = tokens[i+1]
			if ((left == "true" || left == "false") && (right == "true" || right == "false"))
				tokens.splice(i-1, 3, left=="true" || right=="true")
			else if (isNaN(+left) || isNaN(+right))
				tokens.splice(i-1, 3, left.toString() + right.toString())
			else
				tokens.splice(i-1, 3, +left + +right)
		}
		else if ((i = tokens.findIndex(t => t == "_")) != -1) {
			const left = tokens[i-1]
			const right = tokens[i+1]
			tokens.splice(i-1, 3, left.toString() + right.toString())
		}
		else if ((i = tokens.findIndex(t => t == "-")) != -1) {
			const left = tokens[i-1]
			const right = tokens[i+1]
			tokens.splice(i-1, 3, +left - +right)
		}
		else if ((i = tokens.findIndex(t => t == "<")) != -1) {
			const left = tokens[i-1]
			const right = tokens[i+1]
			tokens.splice(i-1, 3, left < right)
		}
		else if ((i = tokens.findIndex(t => t == "<=")) != -1) {
			const left = tokens[i-1]
			const right = tokens[i+1]
			tokens.splice(i-1, 3, left <= right)
		}
		else if ((i = tokens.findIndex(t => t == ">")) != -1) {
			const left = tokens[i-1]
			const right = tokens[i+1]
			tokens.splice(i-1, 3, left > right)
		}
		else if ((i = tokens.findIndex(t => t == ">=")) != -1) {
			const left = tokens[i-1]
			const right = tokens[i+1]
			tokens.splice(i-1, 3, left >= right)
		}
		else if ((i = tokens.findIndex(t => t == "==")) != -1) {
			const left = tokens[i-1]
			const right = tokens[i+1]
			tokens.splice(i-1, 3, left == right)
		}
		else if ((i = tokens.findIndex(t => t == "!=")) != -1) {
			const left = tokens[i-1]
			const right = tokens[i+1]
			tokens.splice(i-1, 3, left != right)
		}
		else if ((i = tokens.findIndex(t => t == "&&")) != -1) {
			const left = tokens[i-1]
			const right = tokens[i+1]
			tokens.splice(i-1, 3, left && right)
		}
		else if ((i = tokens.findIndex(t => t == "||")) != -1) {
			const left = tokens[i-1]
			const right = tokens[i+1]
			tokens.splice(i-1, 3, left || right)
		}

		else
			throw "invalid expression"
	}

	return tokens[0]
}

function typeFromString(string) : CommandType {
	switch (string) {
		case "extend":		return CommandType.extend
		case "global":		return CommandType.global
		case "var":			return CommandType.var
		case "character":	return CommandType.character
		case "image":		return CommandType.image
		case "sprite":		return CommandType.sprite
		case "channel":		return CommandType.channel
		case "background":	return CommandType.background
		case "show":		return CommandType.show
		case "move":		return CommandType.move
		case "variant":		return CommandType.variant
		case "hide":		return CommandType.hide
		case "clear":		return CommandType.clear
		case "play":		return CommandType.play
		case "pause":		return CommandType.pause
		case "menu":		return CommandType.menu
		case "option":		return CommandType.option
		case "if":			return CommandType.if
		case "elseif":		return CommandType.elseif
		case "else":		return CommandType.else
		case "loop":		return CommandType.loop
		case "continue":	return CommandType.continue
		case "break":		return CommandType.break
		case "end":			return CommandType.end
		case "wait":		return CommandType.wait
		case "load":		return CommandType.load
		case "jump":		return CommandType.jump
		default:			return CommandType.say
	}
}
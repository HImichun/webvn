// command
declare const enum CommandType {
	say,
	extend,

	global,
	var,

	character,
	image,
	sprite,
	channel,

	background,
	show,
	move,
	variant,
	hide,
	clear,

	play,
	pause,

	menu,
	option,
	if,
	elseif,
	else,
	loop,
	continue,
	break,
	end,

	wait,
	load,
	jump
}
type CommandArg = (string|Set<string[]>)
interface Command {
	type: CommandType,
	args: CommandArg[]
}

// block
declare const enum BlockType {
	root,
	menu,
	option,
	if,
	elseif,
	else,
	loop
}
interface Block {
	type: BlockType
	startLine: number
	endLine: number

	parent: Block | null
	children: Set<Block>

	closesBlock: Block | null
	closedByBlock: Block | null

	data: number
}

// chapter
interface Chapter {
	rootBlock: Block
	commands: Command[]
}

// other
type State = {
	scenario: string,
	chapter: string,
	block: Block,
	line: number,
	getScenario: ()=>Scenario,
	getChapter: ()=>Chapter,
	getCommand: ()=>Command
}
type Info = {
	name: string,
	shortName: string,
	author: string,
	version: string,
	description: string,
	entryPoint: string,
	scenarios: Set<string>
}

interface Variable {
	name: string
	value: any
	block: Block
}

type Scenarios = Map<string, Scenario>
type Scenario  = Map<string, Chapter>

type Characters = Map<string, Character>
interface Character {
	name: string
	color: string
	prefix?: string
	postfix?: string
}

type Sprites = Map<string, Sprite>
interface Sprite {
	variants: Map<string, string>
	element: HTMLImageElement
}

type Images = Map<string, string>
// command
declare const enum CommandType {
	say,
	extend,

	global,
	var,

	character,
	image,
	images,
	sprite,
	channel,

	background,
	scene,
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
	jump,
	call,
	return
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
	children: Block[]

	closesBlock: Block | null
	closedByBlock: Block | null

	data: number
}

declare const enum ControlType {
	button,
	range,
	check,
	radio,
	file
}

interface Chapter {
	rootBlock: Block
	commands: Command[]
}


interface CallStackItem {
	scenario: string
	chapter: string
	blockDataStack: BlockDataStack
	line: number
	localVars: SavedVariableStack
}
/** Holds points from which 'call' was executed. last call point is len-1 */
type CallStack = CallStackItem[]

interface State {
	callStack: CallStack
	scenario: string
	chapter: string
	block: Block
	line: number
	background: [string, string?]
	getScenario: ()=>Scenario
	getChapter: ()=>Chapter
	getCommand: ()=>Command
}
interface Info {
	name: string
	shortName: string
	author: string
	version: string
	description: string
	entryPoint: string
	scenarios: Set<string>
}
interface InfoJSON {
	name: string
	shortName: string
	author: string
	version: string
	description: string
	entryPoint: string
	scenarios: string[]
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
type SpriteVariants = Map<string, string[]>
interface Sprite {
	variants: SpriteVariants
	element: HTMLElement

	shown: boolean
	position: number
	rotated: boolean
	variant: string
}

type Images = Map<string, string>
type ImageLocations = Map<string, {path:string, ext:string}>


// SAVES

/**
 * Holds .data of current block and its ancestors.
 * 0 is current block, len-1 is root block
 * */
type BlockDataStack = number[]
interface SavedState {
	callStack: CallStack
	scenario: string
	chapter: string
	blockDataStack: BlockDataStack
	line: number
	background: [string, string?]
}

interface SavedChannel {
	urls: {[name:string]:string}
	playlist: string[]
	playing: boolean
	loop: boolean
	fade: boolean
}
type SavedChannels = {[name:string]:SavedChannel}

interface SavedSprite {
	variants: {[name:string]:string[]}
	shown: boolean

	position: number
	rotated: boolean
	variant: string
}
type SavedSprites = {[name:string]:SavedSprite}

type SavedCharacters = {[name:string]:Character}
type SavedImages = {[name:string]:string}

/**
 * block is the number of ancestor away from current block.
 * 0 = current block,
 * 1 = parent block,
 * 2 = grandparent block,
 * null = global
 */
interface SavedVariable {
	name: string
	value: any
	block: number
}
type SavedVariableStack = SavedVariable[]

interface Save {
	shortName: string
	path: string
	state: SavedState
	characters: SavedCharacters
	sprites: SavedSprites
	images: SavedImages
	channels: SavedChannels
	variableStack: SavedVariableStack
}
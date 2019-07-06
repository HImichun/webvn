function makeEmptyBlock() : Block
{
	return {
		type: null,
		startLine: null,
		endLine: null,
		parent: null,
		children: new Set(),
		closesBlock: null,
		closedByBlock: null,
		data: 0
	}
}

function addParentToBlock(block: Block, parent: Block) {
	block.parent = parent
	parent.children.add(block)
}

export function makeBlocks(chapter: Chapter) {
	const root = makeEmptyBlock()
	root.type = BlockType.root
	root.startLine = 0

	let blockStack: Block[] = [root]

	const lastBlock = () => blockStack[blockStack.length-1]
	const closeLastBlock = (end:number, closer?: Block) => {
		const closee = blockStack.pop()
		closee.endLine = end
		if (closer) {
			closee.closedByBlock = closer
			closer.closesBlock = closee
		}
	}

	for (let i = 0; i < chapter.commands.length; i++) {
		const commandType = chapter.commands[i].type

		const block = makeEmptyBlock()
		block.startLine = i

		let blockType
		switch (commandType) {
			case CommandType.menu:
				blockType = BlockType.menu
				break
			case CommandType.option:
				blockType = BlockType.option
				if(lastBlock().type == BlockType.option)
					closeLastBlock(i, block)
				break
			case CommandType.if:
				blockType = BlockType.if
				break
			case CommandType.elseif:
				blockType = BlockType.elseif
				if (lastBlock().type == BlockType.if
					|| lastBlock().type == BlockType.elseif)
					closeLastBlock(i, block)
				break
			case CommandType.else:
				blockType = BlockType.else
				if (lastBlock().type == BlockType.if
					|| lastBlock().type == BlockType.elseif)
					closeLastBlock(i, block)
				break
			case CommandType.loop:
				blockType = BlockType.loop
				break
			case CommandType.end:
				closeLastBlock(i)
			default:
				continue
		}

		block.type = blockType
		addParentToBlock(block, lastBlock())
		blockStack.push(block)
	}

	chapter.rootBlock = root
}
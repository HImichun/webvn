function makeEmptyBlock() {
    return {
        type: null,
        startLine: null,
        endLine: null,
        parent: null,
        children: [],
        closesBlock: null,
        closedByBlock: null,
        data: 0
    };
}
function addParentToBlock(block, parent) {
    block.parent = parent;
    parent.children.push(block);
}
export function makeBlocks(chapter) {
    const root = makeEmptyBlock();
    root.type = 0 /* root */;
    root.startLine = 0;
    let blockStack = [root];
    const lastBlock = () => blockStack[blockStack.length - 1];
    const closeLastBlock = (end, closer) => {
        const closee = blockStack.pop();
        closee.endLine = end;
        if (closer) {
            closee.closedByBlock = closer;
            closer.closesBlock = closee;
        }
    };
    for (let i = 0; i < chapter.commands.length; i++) {
        const commandType = chapter.commands[i].type;
        const block = makeEmptyBlock();
        block.startLine = i;
        let blockType;
        switch (commandType) {
            case 16 /* menu */:
                blockType = 1 /* menu */;
                break;
            case 17 /* option */:
                blockType = 2 /* option */;
                if (lastBlock().type == 2 /* option */)
                    closeLastBlock(i, block);
                break;
            case 18 /* if */:
                blockType = 3 /* if */;
                break;
            case 19 /* elseif */:
                blockType = 4 /* elseif */;
                if (lastBlock().type == 3 /* if */
                    || lastBlock().type == 4 /* elseif */)
                    closeLastBlock(i, block);
                break;
            case 20 /* else */:
                blockType = 5 /* else */;
                if (lastBlock().type == 3 /* if */
                    || lastBlock().type == 4 /* elseif */)
                    closeLastBlock(i, block);
                break;
            case 21 /* loop */:
                blockType = 6 /* loop */;
                break;
            case 24 /* end */:
                closeLastBlock(i);
            default:
                continue;
        }
        block.type = blockType;
        addParentToBlock(block, lastBlock());
        blockStack.push(block);
    }
    chapter.rootBlock = root;
}

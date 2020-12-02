import { state, characters, images, sprites, elements, channels, vnPath, variableStack, config, imageLocations } from "./main.js";
import * as writer from "./writer.js";
import crel from "./crel.js";
import { Channel } from "./channel.js";
import { autosave, getBlockDataStack, varStackToObj } from "./save.js";
import { addToSettings } from "./setup.js";
import { RangeCE } from "./controlElement.js";
const ALL_BUT_SETTINGS = { include: null, exclude: "#settings, #save" };
export function makeCommand(line) {
    if (line.trim().length == 0)
        return null;
    let type = null;
    const args = [];
    let start = null; // start of token
    let inQuotes = false;
    let set = null;
    let tuple = null;
    const addToken = (i) => {
        const token = line.substring(start, i);
        if (type === null) {
            type = typeFromString(token);
            if (type == 0 /* say */)
                args.push(token);
        }
        else if (set)
            tuple.push(token);
        else
            args.push(token);
        start = null;
    };
    for (let i = 0; i <= line.length; i++) {
        const char = line.charAt(i);
        const lastChar = line.charAt(i - 1);
        // "" []
        if (lastChar != "\\") {
            // ""
            if (char == "\"") {
                // "<-"
                if (!inQuotes) {
                    inQuotes = true;
                    start = i + 1;
                }
                // "->"
                else {
                    addToken(i);
                    inQuotes = false;
                    start = null;
                }
                continue;
            }
            // []
            else if (!inQuotes) {
                if (char == "[") {
                    set = new Set();
                    tuple = [];
                    continue;
                }
                else if (set) {
                    if (char == "]") {
                        if (start)
                            addToken(i);
                        if (tuple.length)
                            set.add(tuple);
                        tuple = null;
                        args.push(set);
                        set = null;
                        continue;
                    }
                    if (char == ",") {
                        if (start)
                            addToken(i);
                        if (tuple.length)
                            set.add(tuple);
                        tuple = [];
                        continue;
                    }
                }
            }
        }
        if (!inQuotes) {
            // \s
            if (char.trim().length == 0) { // end of word
                if (start !== null) {
                    addToken(i);
                }
            }
            // \w
            else if (start === null)
                start = i;
        }
    }
    return { type, args };
}
export function executeCommand(type, args) {
    console.info("executing", type, args);
    switch (type) {
        // say
        case 0 /* say */: {
            autosave();
            const [shortName, ...what] = args;
            console.log(shortName + ": " + what.join(" "));
            const character = characters.get(shortName);
            elements.panel.classList.remove("hidden");
            elements.name.innerText = character.name;
            elements.name.style.setProperty("--color", character.color);
            elements.text.setAttribute("data-prefix", character.prefix);
            elements.text.setAttribute("data-postfix", character.postfix);
            elements.text.classList.add("hide-postfix");
            return new Promise(resolve => {
                const originalDelay = config.textDelay;
                waitForClick(ALL_BUT_SETTINGS)
                    .then(() => config.textDelay = 5);
                writer.write(what.join(" "))
                    .then(() => {
                    elements.text.classList.remove("hide-postfix");
                    config.textDelay = originalDelay;
                    return waitForClick(ALL_BUT_SETTINGS);
                })
                    .then(() => resolve());
            });
        }
        // extend
        case 1 /* extend */: {
            const [...what] = args;
            elements.panel.classList.remove("hidden");
            elements.text.classList.add("hide-postfix");
            return new Promise(resolve => {
                const originalDelay = config.textDelay;
                waitForClick(ALL_BUT_SETTINGS)
                    .then(() => config.textDelay = 5);
                writer.append(what.join(" "))
                    .then(() => {
                    elements.text.classList.remove("hide-postfix");
                    config.textDelay = originalDelay;
                    return waitForClick(ALL_BUT_SETTINGS);
                })
                    .then(() => resolve());
            });
        }
        // global
        case 2 /* global */: {
            const [name, operator, ...right] = args;
            const value = evaluate(right.join(""));
            console.log(value);
            const index = variableStack.findIndex(v => v.name == name);
            if (index != -1) {
                const oldValue = variableStack[index].value;
                switch (operator) {
                    case "=":
                        variableStack[index].value = value;
                        break;
                    case "+=":
                        variableStack[index].value = evaluateNoPars([oldValue, "+", value]);
                        break;
                    case "-=":
                        variableStack[index].value = evaluateNoPars([oldValue, "-", value]);
                        break;
                    case "*=":
                        variableStack[index].value = evaluateNoPars([oldValue, "*", value]);
                        break;
                    case "/=":
                        variableStack[index].value = evaluateNoPars([oldValue, "/", value]);
                        break;
                    case "%=":
                        variableStack[index].value = evaluateNoPars([oldValue, "%", value]);
                        break;
                }
            }
            else if (operator == "=") {
                variableStack.unshift({
                    name: name,
                    value: value,
                    block: null
                });
            }
            else
                console.error("can't TODO: make a mormal error");
            break;
        }
        // var
        case 3 /* var */: {
            const [name, operator, ...right] = args;
            const value = evaluate(right.join(""));
            console.log(value);
            const index = variableStack.findIndex(v => v.name == name);
            if (index != -1) {
                const oldValue = variableStack[index].value;
                switch (operator) {
                    case "=":
                        variableStack[index].value = value;
                        break;
                    case "+=":
                        variableStack[index].value = evaluateNoPars([oldValue, "+", value]);
                        break;
                    case "-=":
                        variableStack[index].value = evaluateNoPars([oldValue, "-", value]);
                        break;
                    case "*=":
                        variableStack[index].value = evaluateNoPars([oldValue, "*", value]);
                        break;
                    case "/=":
                        variableStack[index].value = evaluateNoPars([oldValue, "/", value]);
                        break;
                    case "%=":
                        variableStack[index].value = evaluateNoPars([oldValue, "%", value]);
                        break;
                }
            }
            else if (operator == "=") {
                variableStack.push({
                    name: name,
                    value: value,
                    block: state.block
                });
            }
            else
                console.error("can't TODO: make a mormal error");
            break;
        }
        // character
        case 4 /* character */: {
            const [shortName, name, color, prefix, postfix] = args;
            characters.set(shortName, {
                name, color,
                prefix: prefix ? prefix : "",
                postfix: postfix ? postfix : prefix ? prefix : ""
            });
            break;
        }
        // image
        case 5 /* image */: {
            const [name, relSrc] = args;
            images.set(name, relSrc);
            break;
        }
        // images
        case 6 /* images */: {
            let [name, path, ext] = args;
            if (path.charAt(path.length - 1))
                path = path + "/";
            imageLocations.set(name, { path, ext });
            break;
        }
        // sprite
        case 7 /* sprite */: {
            const [name, variants] = args;
            const element = document.createElement("div");
            element.className = "sprite";
            element.ondragstart = e => e.preventDefault();
            return new Promise(async (resolve) => {
                let variantMap = new Map();
                console.log(variants);
                for (const [name, ...relSrc] of variants.values()) {
                    variantMap.set(name, relSrc);
                }
                const sprite = {
                    variants: variantMap,
                    element: element,
                    shown: false,
                    position: 0,
                    rotated: false,
                    variant: "normal"
                };
                sprites.set(name, sprite);
                resolve();
            });
            break;
        }
        // channel
        case 8 /* channel */: {
            const [name, sounds, ...options] = args;
            let soundMap = new Map();
            sounds.forEach(sound => soundMap.set(sound[0], sound[1]));
            const loop = options.includes("loop") ? true :
                options.includes("once") ? false :
                    undefined;
            const fade = options.includes("fade") ? true :
                options.includes("no-fade") ? false :
                    undefined;
            const channel = new Channel(soundMap, { loop, fade });
            channels.set(name, channel);
            const range = new RangeCE("channel-" + name, 1, name);
            range.onchange(x => channel.setVolume(x ** 2));
            addToSettings("sound", range.elementContainer);
            break;
        }
        // background
        case 9 /* background */: {
            const [first, second] = args;
            const backgroundEl = crel("div", "background").el;
            if (first == "color") {
                backgroundEl.style.backgroundColor = second;
                state.background = [first, second];
            }
            else {
                let url;
                if (images.has(first)) {
                    url = images.get(first);
                    state.background = [first];
                }
                else
                    for (const [locName, { path, ext }] of imageLocations.entries()) {
                        if (locName == first) {
                            url = path + second + ext;
                            state.background = [first, second];
                            break;
                        }
                    }
                backgroundEl.style.backgroundImage = `url(${vnPath + url})`;
            }
            elements.backgrounds.insertAdjacentElement("afterbegin", backgroundEl);
            for (const oldBg of Array.from(elements.backgrounds.children))
                if (oldBg != backgroundEl && !oldBg.classList.contains("fading")) {
                    oldBg.classList.add("fading");
                    oldBg.animate([
                        { filter: "opacity(100%)" },
                        { filter: "opacity(0%)" }
                    ], { duration: 600 })
                        .onfinish = () => oldBg.remove();
                }
            break;
        }
        case 10 /* scene */: {
            const [first, second] = args;
            executeCommand(15 /* clear */, []);
            executeCommand(9 /* background */, [first, second]);
            break;
        }
        // show
        case 11 /* show */: {
            const [first, ...second] = args;
            if (first == undefined) {
                elements.panel.classList.remove("hidden");
                break;
            }
            let subjects;
            if (first instanceof Set)
                subjects = first;
            else
                subjects = new Set([[first, ...second]]);
            subjects.forEach(([name, ...positions]) => {
                const sprite = sprites.get(name);
                if (sprite.shown) {
                    executeCommand(12 /* move */, [name, ...positions]);
                    return;
                }
                sprite.shown = true;
                sprite.element.className = "sprite";
                let p;
                if (positions.includes("fleft"))
                    setSpritePos(sprite, .05);
                else if (positions.includes("left"))
                    setSpritePos(sprite, .2);
                else if (positions.includes("cleft"))
                    setSpritePos(sprite, .35);
                else if (positions.includes("cright"))
                    setSpritePos(sprite, .65);
                else if (positions.includes("right"))
                    setSpritePos(sprite, .8);
                else if (positions.includes("fright"))
                    setSpritePos(sprite, .95);
                else if (p = positions.find(pos => !isNaN(+pos)))
                    setSpritePos(sprite, p);
                else
                    setSpritePos(sprite, .5);
                if (positions.includes("rotated"))
                    setSpriteRot(sprite, true);
                const foundVariant = positions.some(position => {
                    if (sprite.variants.has(position)) {
                        setSpriteVar(sprite, position);
                        return true;
                    }
                });
                if (!foundVariant)
                    setSpriteVar(sprite, "normal");
                elements.sprites.appendChild(sprite.element);
                sprite.element.animate([
                    { filter: "opacity(0%) blur(5px)" },
                    { filter: "opacity(100%) blur(0)" }
                ], { duration: 600 });
            });
            return new Promise(r => setTimeout(r, 650));
        }
        // move
        case 12 /* move */: {
            const [name, ...positions] = args;
            let subjects;
            if (name instanceof Set)
                subjects = name;
            else
                subjects = new Set([[name, ...positions]]);
            subjects.forEach(([name, ...positions]) => {
                const sprite = sprites.get(name);
                let p;
                if (positions.includes("fleft"))
                    setSpritePos(sprite, .05);
                else if (positions.includes("left"))
                    setSpritePos(sprite, .2);
                else if (positions.includes("cleft"))
                    setSpritePos(sprite, .35);
                else if (positions.includes("center"))
                    setSpritePos(sprite, .5);
                else if (positions.includes("cright"))
                    setSpritePos(sprite, .65);
                else if (positions.includes("right"))
                    setSpritePos(sprite, .8);
                else if (positions.includes("fright"))
                    setSpritePos(sprite, .95);
                if (positions.includes("rotated"))
                    setSpriteRot(sprite, true);
                else if (positions.includes("not-rotated"))
                    setSpriteRot(sprite, false);
                positions.some(position => {
                    if (sprite.variants.has(position)) {
                        setSpriteVar(sprite, position);
                        return true;
                    }
                });
            });
            return new Promise(r => setTimeout(() => r(), 650));
        }
        // variant
        case 13 /* variant */: {
            const [name, variant] = args;
            let subjects;
            if (name instanceof Set)
                subjects = name;
            else
                subjects = new Set([[name, variant]]);
            subjects.forEach(([name, variant]) => {
                const sprite = sprites.get(name);
                setSpriteVar(sprite, variant);
            });
            return new Promise(r => setTimeout(() => r(), 150));
        }
        // hide
        case 14 /* hide */: {
            const [...names] = args;
            if (names.length == 0) {
                elements.panel.classList.add("hidden");
                break;
            }
            names.forEach(name => {
                const sprite = sprites.get(name);
                sprite.shown = false;
                sprite.element.animate([
                    { filter: "opacity(100%) blur(0)" },
                    { filter: "opacity(0%) blur(5px)" }
                ], { duration: 600 })
                    .onfinish = () => sprite.element.remove();
            });
            return new Promise(r => setTimeout(() => r(), 350));
        }
        // clear
        case 15 /* clear */: {
            sprites.forEach(sprite => {
                if (!sprite.shown)
                    return;
                sprite.shown = false;
                sprite.element.animate([
                    { filter: "opacity(100%) blur(0)" },
                    { filter: "opacity(0%) blur(5px)" }
                ], { duration: 600 })
                    .onfinish = () => sprite.element.remove();
            });
            return new Promise(r => setTimeout(() => r(), 350));
        }
        // play
        case 16 /* play */: {
            let [channelName, sound, ...options] = args;
            const channel = channels.get(channelName);
            if (typeof sound == "string" && ["loop", "fade", "once", "no-fade"].includes(sound)) {
                options.push(sound);
                sound = null;
            }
            const playlist = [];
            if (sound instanceof Set)
                sound.forEach(s => playlist.push(s[0]));
            else if (typeof sound == "string")
                playlist.push(sound);
            else
                playlist.push(...channel.getSoundNames());
            const loop = options.includes("loop") ? true :
                options.includes("once") ? false :
                    undefined;
            const fade = options.includes("fade") ? true :
                options.includes("no-fade") ? false :
                    undefined;
            channel.play(playlist, { loop, fade });
            break;
        }
        // pause
        case 17 /* pause */: {
            const [...channelNames] = args;
            channelNames.forEach(channelName => {
                const channel = channels.get(channelName);
                channel.pause();
            });
            break;
        }
        // menu
        case 18 /* menu */: {
            while (elements.menu.lastElementChild)
                elements.menu.lastElementChild.remove();
            let menuBlock = state.block;
            if (menuBlock.type != 1 /* menu */)
                for (const childBlock of state.block.children)
                    if (childBlock.startLine == state.line) {
                        menuBlock = childBlock;
                        break;
                    }
            state.block = menuBlock;
            const optionBlocks = menuBlock.children;
            return new Promise(resolve => {
                const click = (block) => {
                    elements.menu.classList.add("hidden");
                    const line = block.startLine + 1;
                    state.line = line;
                    state.block = block;
                    document.onkeydown = null;
                    resolve(0b1);
                };
                document.onkeydown = e => {
                    let key = e.key;
                    if ("1234567890".includes(key)) {
                        if (key == "0")
                            key = "10";
                        const i = +key - 1;
                        if (i < optionBlocks.length)
                            click(optionBlocks[i]);
                    }
                };
                for (const i in optionBlocks) {
                    const optionBlock = optionBlocks[i];
                    console.log(i, optionBlock);
                    const line = optionBlock.startLine;
                    const optionCommand = state.getChapter().commands[line];
                    const title = optionCommand.args.join(" ");
                    const button = crel("div", "option")
                        .text(title)
                        .el;
                    button.addEventListener("click", () => click(optionBlock));
                    elements.menu.appendChild(button);
                }
                elements.menu.classList.remove("hidden");
            });
        }
        // option
        case 19 /* option */: {
            const menuBlock = state.block.parent;
            removeBlockVarsFromScope(state.block);
            removeBlockVarsFromScope(menuBlock);
            state.block = menuBlock.parent;
            state.line = menuBlock.endLine + 1;
            return 0b1;
        }
        // if
        case 20 /* if */: {
            const expression = args;
            const result = evaluate(expression.join("")) == true;
            let ifBlock;
            for (const childBlock of state.block.children)
                if (childBlock.startLine == state.line) {
                    ifBlock = childBlock;
                    break;
                }
            ifBlock.data = +result;
            state.block = ifBlock;
            if (!result) {
                state.line = ifBlock.endLine;
                return 0b1;
            }
            break;
        }
        // elseif
        case 21 /* elseif */: {
            const ifBlock = state.block;
            const elseifBlock = ifBlock.closedByBlock;
            removeBlockVarsFromScope(ifBlock);
            if (ifBlock.data == 1) {
                let lastInElseChain = elseifBlock;
                while (lastInElseChain.closedByBlock)
                    lastInElseChain = lastInElseChain.closedByBlock;
                state.line = lastInElseChain.endLine;
                return 0b1;
            }
            else {
                const expression = args;
                const result = evaluate(expression.join("")) == true;
                elseifBlock.data = +result;
                state.block = elseifBlock;
                if (elseifBlock.data != 1) {
                    state.line = elseifBlock.endLine;
                    return 0b1;
                }
            }
            break;
        }
        // else
        case 22 /* else */: {
            const ifBlock = state.block;
            const elseBlock = ifBlock.closedByBlock;
            removeBlockVarsFromScope(ifBlock);
            if (ifBlock.data == 1) {
                state.line = elseBlock.endLine;
                return 0b1;
            }
            else
                state.block = elseBlock;
            break;
        }
        // loop
        case 23 /* loop */: {
            let loopBlock;
            for (const childBlock of state.block.children)
                if (childBlock.startLine == state.line) {
                    loopBlock = childBlock;
                    break;
                }
            state.block = loopBlock;
            break;
        }
        // break
        case 25 /* break */: {
            let loopBlock = state.block;
            while (loopBlock.type != 6 /* loop */) {
                removeBlockVarsFromScope(loopBlock);
                loopBlock = loopBlock.parent;
            }
            removeBlockVarsFromScope(loopBlock);
            state.block = loopBlock.parent;
            state.line = loopBlock.endLine + 1;
            return 0b1;
        }
        // end
        case 26 /* end */: {
            const block = state.block;
            if (block.type != 6 /* loop */) {
                removeBlockVarsFromScope(block);
                state.block = block.parent;
                break;
            }
            //
        } //
        //
        // continue
        case 24 /* continue */: {
            let loopBlock = state.block;
            while (loopBlock.type != 6 /* loop */) {
                removeBlockVarsFromScope(loopBlock);
                loopBlock = loopBlock.parent;
            }
            removeBlockVarsFromScope(loopBlock);
            state.block = loopBlock.parent;
            state.line = loopBlock.startLine;
            return 0b1;
        }
        // wait
        case 27 /* wait */: {
            const [time] = args;
            return new Promise(resolve => {
                if (config.fastForward) {
                    resolve();
                }
                else if (time == "click") {
                    waitForClick(ALL_BUT_SETTINGS).then(() => resolve());
                }
                else {
                    setTimeout(() => resolve(), +time * 1000);
                }
            });
        }
        // load
        case 28 /* load */: {
            const [scenario] = args;
            state.scenario = scenario;
            state.chapter = "init";
            state.block = state.getChapter().rootBlock;
            state.line = 0;
            removeBlockVarsFromScope();
            return 0b1;
        }
        // jump
        case 29 /* jump */: {
            const [chapter] = args;
            state.chapter = chapter;
            state.block = state.getChapter().rootBlock;
            state.line = 0;
            removeBlockVarsFromScope();
            return 0b1;
        }
        // call
        case 30 /* call */: {
            const [first, second] = args;
            // push current frame to callStack
            state.callStack.push({
                scenario: state.scenario,
                chapter: state.chapter,
                line: state.line,
                blockDataStack: getBlockDataStack(),
                localVars: varStackToObj(variableStack).filter(v => v.block !== null)
            });
            let chapter;
            // load call
            if (second) {
                state.scenario = first;
                chapter = second;
            }
            // jump call
            else {
                chapter = first;
            }
            state.chapter = chapter;
            state.block = state.getChapter().rootBlock;
            state.line = 0;
            // remove local variables
            removeBlockVarsFromScope();
            return 0b1;
        }
        // return
        case 31 /* return */: {
            const prevFrame = state.callStack.pop();
            state.scenario = prevFrame.scenario;
            state.chapter = prevFrame.chapter;
            state.line = prevFrame.line + 1;
            // set current block and put data into it and its ancestors
            {
                let block = state.getChapter().rootBlock;
                while (block.children.length >= 1) {
                    block.data = prevFrame.blockDataStack.pop();
                    let child = block.children.find(b => b.startLine <= state.line
                        && b.endLine > state.line);
                    if (child)
                        block = child;
                    else
                        break;
                }
                state.block = block;
            }
            // variable stack
            {
                // remove local variables
                removeBlockVarsFromScope();
                // set local variables
                const blockStack = [state.block];
                let block = state.block;
                while (block.parent) {
                    blockStack.push(block.parent);
                    block = block.parent;
                }
                for (const svar of prevFrame.localVars) {
                    let block = null;
                    if (svar.block != null)
                        block = blockStack[svar.block];
                    const variable = {
                        name: svar.name,
                        block: block,
                        value: svar.value
                    };
                    variableStack.push(variable);
                }
            }
            return 0b1;
        }
    }
    return 0;
}
function setSpritePos(sprite, pos) {
    sprite.position = pos;
    sprite.element.style.setProperty("--pos", pos.toString());
}
function setSpriteRot(sprite, rot) {
    sprite.rotated = rot;
    sprite.element.classList[rot ? "add" : "remove"]("rotated");
}
function setSpriteVar(sprite, varName) {
    sprite.variant = varName;
    const urls = `url(${sprite.variants.get(varName)
        .map(v => vnPath + v)
        .reverse()
        .join("), url(")})`;
    sprite.element.style.backgroundImage = urls;
}
function waitForClick({ include, exclude }) {
    return new Promise(resolve => {
        if (config.fastForward) {
            resolve();
            return;
        }
        document.onclick = e => {
            if (e.which != 1)
                return;
            if (exclude != null && exclude != undefined
                && e.target.closest(exclude) != null)
                return;
            if (include != null && include != undefined
                && e.target.closest(include) == null)
                return;
            document.onclick = null;
            document.onkeydown = null;
            resolve();
        };
        document.onkeydown = e => {
            const key = e.key;
            if (![" ", "Enter", "ArrowRight", "Control"].includes(key))
                return;
            document.onclick = null;
            document.onkeydown = null;
            resolve();
        };
    });
}
/** Works only on the last block which has variables!!
 * If block is not specified, removes all local variables
*/
function removeBlockVarsFromScope(block) {
    if (block)
        while (variableStack[variableStack.length - 1] && variableStack[variableStack.length - 1].block == block)
            variableStack.pop();
    else {
        const firstLocalIndex = variableStack.findIndex(v => v.block != null);
        if (firstLocalIndex != -1)
            variableStack.splice(firstLocalIndex, variableStack.length - firstLocalIndex);
    }
}
function evaluate(expression) {
    const tokens = expression
        .match(/(?:[()])|(?:\$[^\W\d_]+)|(?:(?:>=)|(?:<=)|(?:!=)|[&|=]{2}|[+\-*/_><!])|(?:-?\d*\.?\d)|(?:[^+\-*/_]+)/g);
    const openingPars = [];
    for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];
        if (token == "(")
            openingPars.push(i);
        else if (token == ")") {
            const openingPar = openingPars.pop();
            tokens.splice(openingPar, i - openingPar + 1, evaluateNoPars(tokens.slice(openingPar + 1, i)));
            i = openingPar;
        }
    }
    return evaluateNoPars(tokens);
}
function evaluateNoPars(tokens) {
    tokens = tokens.map(t => typeof t == "string" && t.charAt(0) == "$"
        ?
            variableStack.find(v => v.name == t.substring(1)).value.toString()
        :
            t);
    while (tokens.length > 1) {
        let i;
        if ((i = tokens.findIndex(t => t == "!")) != -1) {
            const right = tokens[i + 1];
            tokens.splice(i, 2, !right);
        }
        else if ((i = tokens.findIndex(t => t == "*")) != -1) {
            const left = tokens[i - 1];
            const right = tokens[i + 1];
            if ((left == "true" || left == "false") && (right == "true" || right == "false"))
                tokens.splice(i - 1, 3, left == "true" && right == "true");
            else
                tokens.splice(i - 1, 3, +left * +right);
        }
        else if ((i = tokens.findIndex(t => t == "/")) != -1) {
            const left = tokens[i - 1];
            const right = tokens[i + 1];
            tokens.splice(i - 1, 3, +left / +right);
        }
        else if ((i = tokens.findIndex(t => t == "%")) != -1) {
            const left = tokens[i - 1];
            const right = tokens[i + 1];
            tokens.splice(i - 1, 3, +left % +right);
        }
        else if ((i = tokens.findIndex(t => t == "+")) != -1) {
            const left = tokens[i - 1];
            const right = tokens[i + 1];
            if ((left == "true" || left == "false") && (right == "true" || right == "false"))
                tokens.splice(i - 1, 3, left == "true" || right == "true");
            else if (isNaN(+left) || isNaN(+right))
                tokens.splice(i - 1, 3, left.toString() + right.toString());
            else
                tokens.splice(i - 1, 3, +left + +right);
        }
        else if ((i = tokens.findIndex(t => t == "_")) != -1) {
            const left = tokens[i - 1];
            const right = tokens[i + 1];
            tokens.splice(i - 1, 3, left.toString() + right.toString());
        }
        else if ((i = tokens.findIndex(t => t == "-")) != -1) {
            const left = tokens[i - 1];
            const right = tokens[i + 1];
            tokens.splice(i - 1, 3, +left - +right);
        }
        else if ((i = tokens.findIndex(t => t == "<")) != -1) {
            const left = tokens[i - 1];
            const right = tokens[i + 1];
            tokens.splice(i - 1, 3, left < right);
        }
        else if ((i = tokens.findIndex(t => t == "<=")) != -1) {
            const left = tokens[i - 1];
            const right = tokens[i + 1];
            tokens.splice(i - 1, 3, left <= right);
        }
        else if ((i = tokens.findIndex(t => t == ">")) != -1) {
            const left = tokens[i - 1];
            const right = tokens[i + 1];
            tokens.splice(i - 1, 3, left > right);
        }
        else if ((i = tokens.findIndex(t => t == ">=")) != -1) {
            const left = tokens[i - 1];
            const right = tokens[i + 1];
            tokens.splice(i - 1, 3, left >= right);
        }
        else if ((i = tokens.findIndex(t => t == "==")) != -1) {
            const left = tokens[i - 1];
            const right = tokens[i + 1];
            tokens.splice(i - 1, 3, left == right);
        }
        else if ((i = tokens.findIndex(t => t == "!=")) != -1) {
            const left = tokens[i - 1];
            const right = tokens[i + 1];
            tokens.splice(i - 1, 3, left != right);
        }
        else if ((i = tokens.findIndex(t => t == "&&")) != -1) {
            const left = tokens[i - 1];
            const right = tokens[i + 1];
            tokens.splice(i - 1, 3, left && right);
        }
        else if ((i = tokens.findIndex(t => t == "||")) != -1) {
            const left = tokens[i - 1];
            const right = tokens[i + 1];
            tokens.splice(i - 1, 3, left || right);
        }
        else
            throw "invalid expression";
    }
    return tokens[0];
}
function typeFromString(string) {
    switch (string) {
        case "extend": return 1 /* extend */;
        case "global": return 2 /* global */;
        case "var": return 3 /* var */;
        case "character": return 4 /* character */;
        case "image": return 5 /* image */;
        case "images": return 6 /* images */;
        case "sprite": return 7 /* sprite */;
        case "channel": return 8 /* channel */;
        case "background": return 9 /* background */;
        case "scene": return 10 /* scene */;
        case "show": return 11 /* show */;
        case "move": return 12 /* move */;
        case "variant": return 13 /* variant */;
        case "hide": return 14 /* hide */;
        case "clear": return 15 /* clear */;
        case "play": return 16 /* play */;
        case "pause": return 17 /* pause */;
        case "menu": return 18 /* menu */;
        case "option": return 19 /* option */;
        case "if": return 20 /* if */;
        case "elseif": return 21 /* elseif */;
        case "else": return 22 /* else */;
        case "loop": return 23 /* loop */;
        case "continue": return 24 /* continue */;
        case "break": return 25 /* break */;
        case "end": return 26 /* end */;
        case "wait": return 27 /* wait */;
        case "load": return 28 /* load */;
        case "jump": return 29 /* jump */;
        case "call": return 30 /* call */;
        case "return": return 31 /* return */;
        default: return 0 /* say */;
    }
}

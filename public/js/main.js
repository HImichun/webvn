import { makeBlocks } from "./block.js";
import { makeCommand, executeCommand } from "./command.js";
import { setupEvents, setupLoadDrop, setupMenu, setupSpeed, clearSettings, unHideUi } from "./setup.js";
export let info;
export const state = {
    callStack: [],
    scenario: null,
    chapter: null,
    block: null,
    line: 0,
    background: [""],
    getScenario: () => scenarios.get(state.scenario),
    getChapter: () => scenarios.get(state.scenario)
        .get(state.chapter),
    getCommand: () => scenarios.get(state.scenario)
        .get(state.chapter)
        .commands[state.line]
};
export const config = {
    textDelay: 40,
    fastForward: false
};
export let vnPath;
export let scenarios;
export const characters = new Map();
export const sprites = new Map();
export const images = new Map();
export const imageLocations = new Map();
export const channels = new Map();
export const elements = {
    scene: document.getElementById("scene"),
    backgrounds: document.getElementById("backgrounds"),
    sprites: document.getElementById("sprites"),
    panel: document.getElementById("panel"),
    name: document.getElementById("name"),
    text: document.getElementById("text"),
    menu: document.getElementById("menu"),
    settings: document.getElementById("settings")
};
export let variableStack = [];
export const events = {
    onVnStart: function () { },
    onMainMenu: function () { }
};
export function init() {
    setupEvents();
    setupLoadDrop();
    events.onMainMenu();
}
export async function loadVn(path) {
    unloadVn();
    if (!/https?:\/\//.test(path)) {
        // _vns/nv/
        if (path.startsWith("/")) {
            path = path.substring(1);
        }
        path = location.origin + location.pathname + path;
    }
    // /vns/vn_
    if (!path.endsWith("/")) {
        path += "/";
    }
    await prepareVn(path);
    executeCommand(28 /* load */, [info.entryPoint]);
    startVn();
}
export async function loadSave(file) {
    unloadVn();
    const save = JSON.parse(file ? file : localStorage.getItem("autosave"));
    await prepareVn(save.path);
    // images
    for (const [name, url] of Object.entries(save.images)) {
        await executeCommand(5 /* image */, [
            name, url
        ]);
    }
    // state
    {
        state.callStack = save.state.callStack;
        state.scenario = save.state.scenario;
        state.chapter = save.state.chapter;
        state.line = save.state.line;
        // find current block and put data into it
        let block = state.getChapter().rootBlock;
        while (block.children.length >= 1) {
            block.data = save.state.blockDataStack.pop();
            let child = block.children.find(b => b.startLine <= state.line
                && b.endLine > state.line);
            if (child)
                block = child;
            else
                break;
        }
        state.block = block;
        const background = save.state.background;
        executeCommand(9 /* background */, background);
    }
    // sprites
    for (const [name, sprite] of Object.entries(save.sprites)) {
        const variants = Object.entries(sprite.variants).map(([n, s]) => [n, ...s]);
        await executeCommand(7 /* sprite */, [
            name,
            new Set(variants)
        ]);
        if (sprite.shown)
            executeCommand(11 /* show */, [
                name,
                sprite.variant,
                sprite.rotated ? "rotated" : "not-rotated",
                sprite.position.toString(),
            ]);
    }
    // channels
    for (const [name, channel] of Object.entries(save.channels)) {
        await executeCommand(8 /* channel */, [
            name,
            new Set(Object.entries(channel.urls)),
            channel.loop ? "loop" : "once",
            channel.fade ? "fade" : "no-fade"
        ]);
        if (channel.playing)
            executeCommand(16 /* play */, [
                name,
                new Set(channel.playlist.map(s => [s]))
            ]);
    }
    // characters
    for (const [name, character] of Object.entries(save.characters)) {
        executeCommand(4 /* character */, [
            name,
            character.name,
            character.color,
            character.prefix,
            character.postfix
        ]);
    }
    // variable stack
    {
        const blockStack = [state.block];
        let block = state.block;
        while (block.parent) {
            blockStack.push(block.parent);
            block = block.parent;
        }
        for (const svar of save.variableStack) {
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
    startVn();
}
export function unloadVn() {
    vnPath = null;
    scenarios = null;
    clearSettings();
    // elements
    {
        while (elements.backgrounds.childElementCount)
            elements.backgrounds.firstElementChild.remove();
        elements.menu.classList.add("hidden");
        while (elements.menu.childElementCount)
            elements.menu.firstElementChild.remove();
        elements.panel.classList.add("hidden");
        elements.settings.classList.add("hidden");
        elements.name.innerText = "";
        elements.text.innerText = "";
    }
    // images
    for (const [key,] of images)
        images.delete(key);
    // state
    {
        state.scenario = "";
        state.chapter = "";
        state.line = 0;
        state.block = null;
        state.background = [""];
    }
    // sprites
    for (const [key,] of sprites) {
        const sprite = sprites.get(key);
        sprite.element.remove();
        sprites.delete(key);
    }
    // channels
    for (const [key,] of channels) {
        const channel = channels.get(key);
        channel.fade = false;
        if (channel.audio)
            channel.pause();
        channels.delete(key);
    }
    // characters
    for (const [key,] of characters)
        characters.delete(key);
    // variable stack
    variableStack = [];
}
async function prepareVn(path) {
    vnPath = path;
    info = await makeInfo();
    scenarios = await makeScenarios();
    setupMenu();
    setupSpeed();
    unHideUi();
}
async function startVn() {
    events.onVnStart();
    state.getScenario();
    while (await loop()) { }
    endVn();
}
export function endVn() {
    unloadVn();
    events.onMainMenu();
}
async function loop() {
    const command = state.getCommand();
    if (!command)
        return false;
    const result = await executeCommand(command.type, command.args);
    if (!(result & 0b1))
        state.line++;
    if (result & 0b10)
        return false;
    return true;
}
async function makeScenarios() {
    const scenarios = new Map();
    for (const scenarioName of info.scenarios) {
        const path = vnPath + scenarioName + ".scn";
        const scenarioResult = await fetch(path);
        const scenarioText = await scenarioResult.text();
        const scenario = compileScenario(scenarioText);
        scenarios.set(scenarioName, scenario);
    }
    return scenarios;
}
async function makeInfo() {
    const infoResult = await fetch(vnPath + "info.json");
    const infoJSON = await infoResult.json();
    const scenarios = new Set();
    for (const scenario of infoJSON.scenarios)
        scenarios.add(scenario);
    return {
        ...infoJSON,
        scenarios
    };
}
// compiler
function compileScenario(file) {
    const chapterNames = file
        .match(/^\s*chapter\s+(\w+)\s*$/gm)
        .map(match => match.split(" ")[1].trim());
    const chapterTexts = file
        .split(/^\s*chapter\s+\w+\s*/gm)
        .map(c => c.trim())
        .filter(c => c != "");
    const scenario = new Map(chapterNames.map((n, i) => [n, compileChapter(chapterTexts[i])]));
    return scenario;
}
function compileChapter(text) {
    const chapter = {
        commands: [],
        rootBlock: null
    };
    text.replace(/##[^]*?\n/g, "\n") // remove comments
        .replace(/\[([^]+?)\]/g, (_, set) => "[" + set
        .replace(/(^\s+)|(\s+$)/, "")
        .replace(/\n/g, ",")
        + "]") // [a\nb] -> [a,b]
        .split("\n")
        .forEach(line => {
        const command = makeCommand(line);
        if (command != null)
            chapter.commands.push(command);
    });
    makeBlocks(chapter);
    return chapter;
}

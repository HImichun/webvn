import { info, state, characters, sprites, images, channels, rootDir, variableStack } from "./main.js";
import crel from "./crel.js";
// SAVE
export function autosave() {
    const save = {
        vn: info.shortName,
        rootDir: rootDir,
        state: stateToObj(state),
        characters: mapToObj(characters),
        sprites: spritesToObj(sprites),
        images: mapToObj(images),
        channels: channelsToObj(channels),
        variableStack: varStackToObj(variableStack)
    };
    localStorage.setItem("autosave", JSON.stringify(save));
}
export function save() {
    download(`${info.name} ${Date.now()}.vns`, localStorage.getItem("autosave"));
}
function download(fileName, content) {
    const link = crel("a")
        .attrs({
        id: "save",
        href: "data:text/plain;charset=utf-8," + encodeURIComponent(content),
        download: fileName
    })
        .el;
    document.body.appendChild(link);
    link.click();
    link.remove();
}
function varStackToObj(varStack) {
    const arr = [];
    for (const variable of varStack) {
        let b = null;
        if (variable.block != null) {
            b = 0;
            let block = state.block;
            while (block.parent) {
                if (block == variable.block)
                    break;
                b++;
                block = block.parent;
            }
        }
        const svar = {
            name: variable.name,
            block: b,
            value: variable.value
        };
        arr.push(svar);
    }
    return arr;
}
function spritesToObj(sprites) {
    const obj = {};
    for (const [spriteName, sprite] of sprites.entries()) {
        const variants = {};
        for (const [varName, variant] of sprite.variants)
            variants[varName] = variant;
        const spriteObj = {
            variants,
            shown: sprite.shown,
            position: sprite.position,
            rotated: sprite.rotated,
            variant: sprite.variant
        };
        obj[spriteName] = spriteObj;
    }
    return obj;
}
function channelsToObj(channels) {
    const obj = {};
    for (const [channelName, channel] of channels.entries()) {
        const urls = {};
        for (const [soundName, url] of channel.urls)
            urls[soundName] = url;
        const channelObj = {
            urls: urls,
            playing: channel.audio && !channel.audio.paused,
            playlist: channel.playlist,
            loop: channel.loop,
            fade: channel.fade
        };
        obj[channelName] = channelObj;
    }
    return obj;
}
function stateToObj(state) {
    const blockDataStack = [];
    let block = state.block;
    while (true) {
        blockDataStack.push(block.data);
        if (block.parent)
            block = block.parent;
        else
            break;
    }
    const savedState = {
        scenario: state.scenario,
        chapter: state.chapter,
        line: state.line,
        background: state.background,
        blockDataStack
    };
    return savedState;
}
function mapToObj(map) {
    const obj = {};
    for (const [key, value] of map.entries()) {
        if (value instanceof Map)
            obj[key] = mapToObj(value);
        else if (value instanceof Set)
            obj[key] = setToString(value);
        else
            obj[key] = value;
    }
    return obj;
}
function setToString(set) {
    const arr = [];
    for (const value of set.values()) {
        if (value instanceof Map)
            arr.push(mapToObj(value));
        else if (value instanceof Set)
            arr.push(setToString(value));
        else
            arr.push(value);
    }
    return arr;
}

import { init, loadVn, loadSave, events } from "./main.js";
import crel from "./crel.js";
import { getCookie } from "./setup.js";
import { save } from "./save.js";
let mainMenu;
events.onMainMenu = create;
events.onVnStart = remove;
init();
function create() {
    mainMenu = crel("div")
        .attrs({ id: "main-menu" })
        .children([
        continueSave(),
        startNew(),
        downloadSave(),
        loadUrl(),
        drop()
    ])
        .el;
    document.body.appendChild(mainMenu);
}
function remove() {
    if (!mainMenu)
        return;
    mainMenu.remove();
    mainMenu = null;
}
function continueSave() {
    const btn = crel("button", "continue").text("Continue").el;
    btn.onclick = () => loadSave();
    return btn;
}
function startNew() {
    const saveTxt = getCookie("autosave");
    const btn = crel("button", "new-game").text("New Game").el;
    if (saveTxt != null) {
        const save = JSON.parse(saveTxt);
        const rootDir = save.rootDir;
        btn.onclick = () => {
            loadVn(rootDir);
        };
    }
    else
        btn.disabled = true;
    return btn;
}
function downloadSave() {
    const btn = crel("button", "download").text("Download autosave").el;
    btn.onclick = save;
    return btn;
}
function loadUrl() {
    const input = crel("input", "selectable").attrs({
        type: "text",
        placeholder: "https://..."
    }).el;
    const btn = crel("button").text("load").el;
    btn.onclick = () => {
        loadVn(input.value);
    };
    return crel("div", "load-url").children([
        input, btn
    ]).el;
}
function drop() {
    return crel("div", "drag-drop").text(
    // "Drag and drop a save or vn file to load it"
    "Drag and drop a save file to load it").el;
}

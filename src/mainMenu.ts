import {init, loadVn, loadSave, events} from "./main.js"
import crel from "./crel.js";
import { getCookie } from "./setup.js";
import { saveToFile } from "./save.js";

let mainMenu

events.onMainMenu = create
events.onVnStart = remove

init()

function create() {
	mainMenu = crel("div")
		.attrs({id:"main-menu"})
		.children([
			continueSave(),
			startNew(),
			downloadSave(),
			loadUrl(),
			drop()
		])
		.el

	document.body.appendChild(mainMenu)
}

function remove() {
	if (!mainMenu)
		return
	mainMenu.remove()
	mainMenu = null
}

function continueSave() {
	const btn = crel("button","continue").text("Continue").el
	btn.onclick = () =>	loadSave()
	return btn
}
function startNew() {
	const saveText = getCookie("autosave")

	const btn = crel("button","new-game").text("New Game").el as HTMLButtonElement

	if (saveText != null) {
		const save = JSON.parse(saveText) as Save
		btn.onclick = () => loadVn(save.path)
	}
	else {
		btn.disabled = true
	}

	return btn
}
function downloadSave() {
	const btn = crel("button","download").text("Download autosave").el
	btn.onclick = saveToFile
	return btn
}
function loadUrl() {
	const input = crel("input", "selectable").attrs({
		type:"text",
		placeholder: "vns/example"
	}).el as HTMLInputElement

	const btn = crel("button").text("load").el
	btn.onclick = () => {
		loadVn(input.value)
	}

	return crel("div","load-url").children([
		input, btn
	]).el
}
function drop() {
	return crel("div","drag-drop").text(
		// "Drag and drop a save or vn file to load it"
		"Drag and drop a save file to load it"
	).el
}
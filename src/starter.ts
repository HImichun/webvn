import {init, loadVn, loadSave} from "./main.js"
import crel from "./crel.js";

init()

const testBut = crel("button").text("test").el
testBut.onclick = ()=>loadVn("/vns/test/")

const playerBut = crel("button").text("player").el
playerBut.onclick = ()=>loadVn("/vns/player/")

const loadBut = crel("button").text("load").el
loadBut.onclick = ()=>loadSave()

const butContainer = crel("div").children([
	testBut, playerBut, loadBut
]).el
butContainer.style.position = "absolute"
butContainer.onclick = ()=>butContainer.remove()

document.body.appendChild(butContainer)
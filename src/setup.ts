import { elements, loadSave, config, events, endVn } from "./main.js"
import { saveToFile, loadFromFile } from "./save.js"
import crel from "./crel.js"
import { RangeCE, ButtonCE, FileCE } from "./controlElement.js";

export function setupMenu() {
	addToSettings("menu",
		new ButtonCE("Save")
			.onclick(saveToFile)
			.elementContainer
	)

	addToSettings("menu",
		new FileCE("Load")
			.onclick(loadFromFile)
			.elementContainer
	)

	addToSettings("menu",
		new ButtonCE("Exit")
			.onclick(endVn)
			.elementContainer
	)

	elements.settings.classList.remove("hidden")
}

export function setupLoadDrop() {
	document.ondragover = e => {
		e.preventDefault()
	}
	document.ondrop = e => {
		e.preventDefault()
		const dt = e.dataTransfer

		try {
			if (dt.files.length == 1 && dt.files[0].name.endsWith(".vns")) {
				const file = dt.files[0]

				readFileAsString(file)
				.then(save => loadSave(save))
			}
		}
		catch(err) {
			alert("Can not load this file")
			console.error(err)
		}
	}
}

export function readFileAsString(file:File) : Promise<string> {
	return new Promise(resolve => {
		const fr = new FileReader()
		fr.readAsText(file.slice(), "utf-8")
		fr.onloadend = () => {
			resolve(fr.result as string)
		}
	})
}

export function hideUi() {
	document.body.classList.add("hidden")
}
export function unHideUi() {
	document.body.classList.remove("hidden")
}
export function toggleHideUi() {
	document.body.classList.toggle("hidden")
}

export function setupEvents() {
	// click
	{
		document.addEventListener("click", e => {
			if (e.which == 2) {
				toggleHideUi()
			}
		})
		document.addEventListener("keydown", e => {
			if (e.key == "h" || e.key == "c") {
				toggleHideUi()
			}
			else if (e.key == "Escape") {
				if (!document.body.classList.contains("hidden")) {
					elements.settings.animate([
						{transform: "translateY(calc(-100% - 50px))"},
						{transform: "translateY(calc(-100% + 100px))", offset:.7},
						{transform: "translateY(-100%)"}
					], {duration:300, easing:"ease-out"})
					toggleHideUi()
				}
				else {
					elements.settings.animate([
						{transform: "translateY(-100%)"},
						{transform: "translateY(calc(-100% + 100px))", offset:.4},
						{transform: "translateY(-100%)"}
					], {duration:300, easing:"ease-out"})
				}
			}
		})
	}
	// resize
	{
		let timeout: number
		window.addEventListener("resize", () => {
			if(timeout)
				clearTimeout(timeout)

			elements.sprites.classList.add("no-transition")

			timeout = setTimeout(()=>{
				elements.sprites.classList.remove("no-transition")
			},100)
		})
	}
}

export function setupSpeed() {
	const range = new RangeCE("speed", .5, "Text Speed")
	range.onchange(x => config.textDelay = -x*90 + 100)
	addToSettings("preferences", range.elementContainer)
}

export function addToSettings(sectionName: string, element: HTMLElement) {
	const sections = Array.from(elements.settings.children)

	let section = sections.find(s => s.classList.contains(sectionName)) as HTMLElement
	if (!section) {
		section = crel("div", "section " + sectionName)
			.children([
				crel("p", "label").text(sectionName)
			]).el
		elements.settings.appendChild(section)
	}

	section.appendChild(element)
}

export function clearSettings() {
	while (elements.settings.childElementCount)
		elements.settings.firstChild.remove()
}

export function setCookie(name:string, value:string) {
	localStorage.setItem(name, value)
}
export function getCookie(name:string) {
	return localStorage.getItem(name)
}
import { elements, loadSave, config, events, endVn } from "./main.js"
import { save } from "./save.js"
import crel from "./crel.js"
import { RangeCE, ButtonCE } from "./controlElement.js";

export function setupMenu() {
	new ButtonCE(
		addToSettings("menu", "save", ControlType.button)
	).onclick(save)

	new ButtonCE(
		addToSettings("menu", "exit", ControlType.button)
	).onclick(endVn)

	elements.settings.classList.remove("hidden")
}

export function setupLoad() {
	document.ondragover = e => {
		e.preventDefault()
	}
	document.ondrop = e => {
		e.preventDefault()
		const dt = e.dataTransfer
		const fr = new FileReader()

		try {
			if (dt.files.length == 1 && dt.files[0].name.endsWith(".vns")) {
				const file = dt.files[0]
				fr.readAsText(file.slice(), "utf-8")
				fr.onloadend = () => {
					loadSave(fr.result as string)
				}
			}
		}
		catch(err) {
			alert("Can not load this file")
			console.error(err)
		}
	}
}

export function setupEvents() {
	// click
	{
		let isUiHidden = false
		const toggleHide = () => {
			isUiHidden = !isUiHidden
			document.body.classList[isUiHidden?"add":"remove"]("hidden")
		}
		document.addEventListener("click", e => {
			if (e.which == 2)
				toggleHide()
		})
		document.addEventListener("keydown", e => {
			if (e.key == "h" || e.key == "c")
				toggleHide()
			else if (e.key == "Escape") {
				if (isUiHidden) {
					elements.settings.animate([
						{transform: "translateY(calc(-100% - 50px))"},
						{transform: "translateY(calc(-100% + 100px))", offset:.7},
						{transform: "translateY(-100%)"}
					], {duration:300, easing:"ease-out"})
					toggleHide()
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
	const range = new RangeCE(
		addToSettings("Preferences", "Text speed", ControlType.range),
		"speed",
		.5
	)
	range.onchange(x => config.textDelay = -x*90 + 100)
}

export function addToSettings(sectionName: string, text: string, type: ControlType) {
	const sections = Array.from(elements.settings.children)

	let section = sections.find(s => s.classList.contains(sectionName)) as HTMLElement
	if (!section) {
		section = crel("div", "section " + sectionName)
			.children([
				crel("p", "label").text(sectionName)
			]).el
		elements.settings.appendChild(section)
	}

	let controlEl = crel("div").el
	let description: HTMLElement
	switch (type) {
		case ControlType.button:
			controlEl.innerText = text
			break
		case ControlType.range:
			description = crel("p").text(text).el
			break
	}

	const label = crel("label").children([
		description || null,
		controlEl
	]).el
	section.appendChild(label)

	return controlEl
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
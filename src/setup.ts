import { elements, rootDir, scenarios, characters, sprites, images, channels, info, state, loadSave } from "./main.js";
import { save } from "./save.js";
import { addToSettings } from "./command.js";

export function setupSaveLoad() {
	const saveBtn = addToSettings("save-load", "save", ControlType.button)
	// const loadBtn = addToSettings("save-load", "load", ControlType.button)

	saveBtn.onclick	= save
	// loadBtn.onclick = load

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
				fr.onloadend = e => {
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





import { elements, config } from "./main.js";

export function write(what: string) {
	if (config.fastForward) {
		fastForward(what)
		return new Promise(r=>r())
	}
	clear()
	return append(what)
}

function clear() {
	while (elements.text.firstChild)
		elements.text.firstChild.remove()
}

export async function append(what: string) {
	what = what
		.replace("<", "&lt;")
		.replace(">", "&gt;")

	let isEscaped = false
	let element: HTMLElement = document.createElement("p")
	const spans: HTMLElement[] = []

	for (let i = 0; i < what.length; i++) {
		const char = what.charAt(i)
		if (isEscaped) {
			switch (char) {
				case "n":
					element.appendChild(document.createElement("br"));
					break;
				case "w": 
					const pauseSpan = document.createElement("span")
					pauseSpan.className = "pause"
					spans.push(pauseSpan);
					break;
			}
			isEscaped = false
		}
		else {
			if (char == "\\") {
				isEscaped = true
			}
			else if (char == "[") {
				let tag = what.substr(i+1, what.substr(i+1).indexOf("]"))
				if (tag.charAt(0) == "/") {
					element = element.parentElement
				}
				else {
					let el: HTMLElement
					switch (tag) {
						case "i": el = document.createElement("em"); break;
						case "b": el = document.createElement("strong"); break;
					}
					element.appendChild(el)
					element = el
				}
				i += tag.length + 1
			}
			else {
				const span = document.createElement("span")
				span.className = "hidden"
				span.innerText = char
				element.appendChild(span)
				spans.push(span)
			}
		}
	}

	elements.text.appendChild(element)

	for (const s of spans) {
		if (config.fastForward) {
			fastForward(what)
		}
		else if (s.classList.contains("pause")) {
			await wait(config.textDelay*10)
		}
		else {
			await wait()
		}
		s.classList.remove("hidden")
	}
}

function fastForward(what) {
	while (elements.text.firstChild)
		elements.text.firstChild.remove()

	const element: HTMLElement = document.createElement("p")
	element.innerHTML = what
		.replace("\\n", "\n")
		.replace("\\w", "")
		.replace("[i]", "<em>").replace("[/i]", "</em>")
		.replace("[b]", "<strong>").replace("[/b]", "</strong>")
	elements.text.append(element)
}

function wait(time=config.textDelay) {
	return new Promise(r => setTimeout(()=>r(), time))
}
import { elements, config } from "./main.js";

export function write(what: string) {
	clear()
	return append(what)
}

function clear() {
	elements.text.innerText = ""
}

export async function append(what: string) {
	let isEscaped = false
	for (let i = 0; i < what.length; i++) {
		const char = what.charAt(i)
		if(isEscaped) {
			switch (char) {
				case "\\":
					elements.text.append("\\")
					await wait()
					break;
				case "n":
					elements.text.append("\n")
					await wait()
					break
				case "w":
					await wait(config.textDelay*10)
			}
			isEscaped = false
		}
		else {
			if (char == "\\")
				isEscaped = true
			else {
				elements.text.append(char)
				await wait()
			}
		}
	}
}

function wait(time=config.textDelay) {
	return new Promise(r => setTimeout(()=>r(), time))
}
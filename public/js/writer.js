import { elements, config } from "./main.js";
export function write(what) {
    clear();
    return append(what);
}
function clear() {
    while (elements.text.firstChild)
        elements.text.firstChild.remove();
}
export async function append(what) {
    // let isEscaped = false
    // for (let i = 0; i < what.length; i++) {
    // 	const char = what.charAt(i)
    // 	if(isEscaped) {
    // 		switch (char) {
    // 			case "\\":
    // 				elements.text.append("\\")
    // 				await wait()
    // 				break;
    // 			case "n":
    // 				elements.text.append("\n")
    // 				await wait()
    // 				break
    // 			case "w":
    // 				await wait(config.textDelay*10)
    // 		}
    // 		isEscaped = false
    // 	}
    // 	else {
    // 		if (char == "\\")
    // 			isEscaped = true
    // 		else if (char == "[") {
    // 			let tag = what.substr(i+1, what.substr(i+1).indexOf("]"))
    // 			if (tag.charAt(0) == "/") {
    // 				tag = tag.substring(1)
    // 				switch (tag) {
    // 					case "i": appendTag("i", true); break
    // 					case "b": appendTag("b", true); break
    // 				}
    // 			}
    // 			else switch (tag) {
    // 				case "i": appendTag("i"); break
    // 				case "b": appendTag("b"); break
    // 			}
    // 		}
    // 		else {
    // 			elements.text.append(char)
    // 			await wait()
    // 		}
    // 	}
    // }
    what = what
        .replace("<", "&lt;")
        .replace(">", "&gt;");
    let isEscaped = false;
    let element = document.createElement("p");
    const spans = [];
    for (let i = 0; i < what.length; i++) {
        const char = what.charAt(i);
        if (isEscaped) {
            switch (char) {
                case "n":
                    element.appendChild(document.createElement("br"));
                    break;
                case "w":
                    const pauseSpan = document.createElement("span");
                    pauseSpan.className = "pause";
                    spans.push(pauseSpan);
                    break;
            }
            isEscaped = false;
        }
        else {
            if (char == "\\") {
                isEscaped = true;
            }
            else if (char == "[") {
                let tag = what.substr(i + 1, what.substr(i + 1).indexOf("]"));
                if (tag.charAt(0) == "/") {
                    element = element.parentElement;
                }
                else {
                    let el;
                    switch (tag) {
                        case "i":
                            el = document.createElement("em");
                            break;
                        case "b":
                            el = document.createElement("strong");
                            break;
                    }
                    element.appendChild(el);
                    element = el;
                }
                i += tag.length + 1;
            }
            else {
                const span = document.createElement("span");
                span.className = "hidden";
                span.innerText = char;
                element.appendChild(span);
                spans.push(span);
            }
        }
    }
    elements.text.appendChild(element);
    for (const s of spans) {
        if (s.classList.contains("pause"))
            await wait(config.textDelay * 10);
        else
            await wait();
        s.classList.remove("hidden");
    }
}
function wait(time = config.textDelay) {
    return new Promise(r => setTimeout(() => r(), time));
}

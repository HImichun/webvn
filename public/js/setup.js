import { elements, loadSave, config, endVn } from "./main.js";
import { saveToFile, loadFromFile } from "./save.js";
import crel from "./crel.js";
import { RangeCE, ButtonCE, FileCE } from "./controlElement.js";
export function setupMenu() {
    addToSettings("menu", new ButtonCE("Save")
        .onclick(saveToFile)
        .elementContainer);
    addToSettings("menu", new FileCE("Load")
        .onclick(loadFromFile)
        .elementContainer);
    addToSettings("menu", new ButtonCE("Exit")
        .onclick(endVn)
        .elementContainer);
    elements.settings.classList.remove("hidden");
}
export function setupLoadDrop() {
    document.ondragover = e => {
        e.preventDefault();
    };
    document.ondrop = e => {
        e.preventDefault();
        const dt = e.dataTransfer;
        try {
            if (dt.files.length == 1 && dt.files[0].name.endsWith(".vns")) {
                const file = dt.files[0];
                readFileAsString(file)
                    .then(save => loadSave(save));
            }
        }
        catch (err) {
            alert("Can not load this file");
            console.error(err);
        }
    };
}
export function readFileAsString(file) {
    return new Promise(resolve => {
        const fr = new FileReader();
        fr.readAsText(file.slice(), "utf-8");
        fr.onloadend = () => {
            resolve(fr.result);
        };
    });
}
export function setupEvents() {
    // click
    {
        let isUiHidden = false;
        const toggleHide = () => {
            isUiHidden = !isUiHidden;
            document.body.classList[isUiHidden ? "add" : "remove"]("hidden");
        };
        document.addEventListener("click", e => {
            if (e.which == 2)
                toggleHide();
        });
        document.addEventListener("keydown", e => {
            if (e.key == "h" || e.key == "c")
                toggleHide();
            else if (e.key == "Escape") {
                if (isUiHidden) {
                    elements.settings.animate([
                        { transform: "translateY(calc(-100% - 50px))" },
                        { transform: "translateY(calc(-100% + 100px))", offset: .7 },
                        { transform: "translateY(-100%)" }
                    ], { duration: 300, easing: "ease-out" });
                    toggleHide();
                }
                else {
                    elements.settings.animate([
                        { transform: "translateY(-100%)" },
                        { transform: "translateY(calc(-100% + 100px))", offset: .4 },
                        { transform: "translateY(-100%)" }
                    ], { duration: 300, easing: "ease-out" });
                }
            }
        });
    }
    // resize
    {
        let timeout;
        window.addEventListener("resize", () => {
            if (timeout)
                clearTimeout(timeout);
            elements.sprites.classList.add("no-transition");
            timeout = setTimeout(() => {
                elements.sprites.classList.remove("no-transition");
            }, 100);
        });
    }
}
export function setupSpeed() {
    const range = new RangeCE("speed", .5, "Text Speed");
    range.onchange(x => config.textDelay = -x * 90 + 100);
    addToSettings("preferences", range.elementContainer);
}
export function addToSettings(sectionName, element) {
    const sections = Array.from(elements.settings.children);
    let section = sections.find(s => s.classList.contains(sectionName));
    if (!section) {
        section = crel("div", "section " + sectionName)
            .children([
            crel("p", "label").text(sectionName)
        ]).el;
        elements.settings.appendChild(section);
    }
    section.appendChild(element);
}
export function clearSettings() {
    while (elements.settings.childElementCount)
        elements.settings.firstChild.remove();
}
export function setCookie(name, value) {
    localStorage.setItem(name, value);
}
export function getCookie(name) {
    return localStorage.getItem(name);
}

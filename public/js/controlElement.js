import { getCookie, setCookie } from "./setup.js";
import crel from "./crel.js";
class ControlElement {
    constructor(elementContainer, elementTarget) {
        this.elementContainer = elementContainer;
        this.elementTarget = elementTarget || elementContainer;
        this.elementTarget.onclick = e => {
            if (this._onclick)
                this._onclick();
        };
    }
    onclick(cb) {
        this._onclick = cb;
        return this;
    }
}
class StoredControlElement extends ControlElement {
    constructor(elementContainer, elementTarget, name, defaultValue, convert) {
        super(elementContainer, elementTarget);
        this.elementTarget.onclick = e => {
            if (this._onclick)
                this._onclick();
            this.change(e);
        };
        this.elementTarget.onmousemove = e => {
            if (e.buttons & 1)
                this.change(e);
        };
        this.name = name;
        this.default = defaultValue;
        this.convert = convert;
        const stored = getCookie(this.name);
        if (stored !== null) {
            const x = convert(stored);
            this.value = x;
            this.elementContainer.style.setProperty("--x", x.toString());
        }
        else
            this.set(this.default);
    }
    get stored() {
        return this.convert(getCookie(this.name));
    }
    set stored(val) {
        setCookie(this.name, val.toString());
    }
    get() {
        return this.value;
    }
    set(x) {
        this.value = x;
        this.stored = x;
        this.elementContainer.style.setProperty("--x", x.toString());
    }
    onchange(cb) {
        this._onchange = cb;
        this._onchange(this.value);
        return this;
    }
}
export class ButtonCE extends ControlElement {
    constructor(text) {
        const element = crel("button").text(text).el;
        super(element);
    }
}
export class FileCE extends ControlElement {
    constructor(text) {
        const input = crel("input", "hidden").attrs({ type: "file" }).el;
        const element = crel("label", "file")
            .children([
            crel("button").text(text),
            input
        ])
            .el;
        super(element);
        this.input = input;
    }
    onchange(cb) {
        this.input.onchange = cb;
        return this;
    }
}
export class RangeCE extends StoredControlElement {
    constructor(name, defaultValue, label = "") {
        const elementTarget = crel("div", "range").el;
        const elementContainer = crel("label").children([
            crel("p").text(label),
            elementTarget
        ]).el;
        super(elementContainer, elementTarget, name, defaultValue, Number);
    }
    change(e) {
        if (this._onclick)
            this._onclick();
        const x = e.layerX / this.elementTarget.clientWidth;
        this.set(x);
        if (this._onchange)
            this._onchange(x);
    }
}

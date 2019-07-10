import { getCookie, setCookie } from "./setup.js";
class ControlElement {
    constructor(element, className) {
        this.element = element;
        this.element.className = "control " + className;
        this.element.onclick = e => {
            if (this._onclick)
                this._onclick();
        };
    }
    onclick(cb) {
        this._onclick = cb;
    }
}
class StoredControlElement extends ControlElement {
    constructor(element, name, defaultValue, className, convert) {
        super(element, className);
        this.element.onclick = e => {
            if (this._onclick)
                this._onclick();
            this.change(e);
        };
        this.element.onmousemove = e => {
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
            this.element.style.setProperty("--x", x.toString());
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
        this.element.style.setProperty("--x", x.toString());
    }
    onchange(cb) {
        this._onchange = cb;
        this._onchange(this.value);
    }
}
export class ButtonCE extends ControlElement {
    constructor(element) {
        super(element, "button");
    }
}
export class RangeCE extends StoredControlElement {
    constructor(element, name, defaultValue) {
        super(element, name, defaultValue, "range", Number);
    }
    change(e) {
        if (this._onclick)
            this._onclick();
        const x = e.layerX / this.element.clientWidth;
        this.set(x);
        if (this._onchange)
            this._onchange(x);
    }
}

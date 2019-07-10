import { getCookie, setCookie } from "./setup.js";

abstract class ControlElement {
	protected element: HTMLElement
	protected _onclick: ()=>void

	constructor(element:HTMLElement, className:string) {
		this.element = element
		this.element.className = "control " + className
		this.element.onclick = e => {
			if (this._onclick)
				this._onclick()
		}
	}

	onclick(cb:()=>void) {
		this._onclick = cb
	}
}

abstract class StoredControlElement<T> extends ControlElement {
	protected name: string
	protected value: T
	protected element: HTMLElement
	protected default: T
	protected convert: (s:string)=>T
	protected _onchange: (value:T)=>void

	constructor(element:HTMLElement, name:string, defaultValue:T, className:string, convert:(s:string)=>T) {
		super(element, className)

		this.element.onclick = e => {
			if (this._onclick)
				this._onclick()
			this.change(e)
		}
		this.element.onmousemove = e => {
			if (e.buttons & 1)
				this.change(e)
		}

		this.name = name
		this.default = defaultValue
		this.convert = convert

		const stored = getCookie(this.name)
		if (stored !== null) {
			const x = convert(stored)
			this.value = x
			this.element.style.setProperty("--x", x.toString())
		}
		else
			this.set(this.default)
	}

	protected get stored(): T {
		return this.convert(getCookie(this.name))
	}
	protected set stored(val:T) {
		setCookie(this.name, val.toString())
	}

	get() {
		return this.value
	}
	set(x:T) {
		this.value = x
		this.stored = x
		this.element.style.setProperty("--x", x.toString())
	}

	onchange(cb:(value:T)=>void) {
		this._onchange = cb
		this._onchange(this.value)
	}

	protected abstract change(e:MouseEvent)
}

export class ButtonCE extends ControlElement {
	constructor(element:HTMLElement) {
		super(element, "button")
	}
}

export class RangeCE extends StoredControlElement<number> {
	constructor(element:HTMLElement, name:string, defaultValue:number) {
		super(element, name, defaultValue, "range", Number)
	}

	protected change (e:MouseEvent) {
		if (this._onclick)
			this._onclick()
		const x = e.layerX / this.element.clientWidth
		this.set(x)
		if (this._onchange)
			this._onchange(x)
	}
}
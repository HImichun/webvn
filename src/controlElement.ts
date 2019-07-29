import { getCookie, setCookie } from "./setup.js";
import crel from "./crel.js";

abstract class ControlElement {
	elementContainer: HTMLElement
	protected elementTarget: HTMLElement
	protected _onclick: ()=>void

	constructor(elementContainer:HTMLElement, elementTarget?:HTMLElement) {
		this.elementContainer = elementContainer
		this.elementTarget = elementTarget || elementContainer
		this.elementTarget.onclick = e => {
			if (this._onclick)
				this._onclick()
		}
	}

	onclick(cb:()=>void) {
		this._onclick = cb
		return this
	}
}

abstract class StoredControlElement<T> extends ControlElement {
	protected name: string
	protected value: T
	protected default: T
	protected convert: (s:string)=>T
	protected _onchange: (value:T)=>void

	constructor(elementContainer:HTMLElement, elementTarget:HTMLElement, name:string, defaultValue:T, convert:(s:string)=>T) {
		super(elementContainer, elementTarget)

		this.elementTarget.onclick = e => {
			if (this._onclick)
				this._onclick()
			this.change(e)
		}
		this.elementTarget.onmousemove = e => {
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
			this.elementContainer.style.setProperty("--x", x.toString())
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
		this.elementContainer.style.setProperty("--x", x.toString())
	}

	onchange(cb:(value:T)=>void) {
		this._onchange = cb
		this._onchange(this.value)
		return this
	}

	protected abstract change(e:MouseEvent)
}

export class ButtonCE extends ControlElement {
	constructor(text:string) {
		const element = crel("button").text(text).el
		super(element)
	}
}

export class FileCE extends ControlElement {
	protected input: HTMLInputElement

	constructor(text:string) {
		const input = crel("input", "hidden").attrs({type:"file"}).el as HTMLInputElement

		const element = crel("label", "file")
			.children([
				crel("button").text(text),
				input
			])
			.el

		super(element)
		this.input = input
	}

	onchange(cb:(any)=>void) {
		this.input.onchange = cb
		return this
	}
}

export class RangeCE extends StoredControlElement<number> {
	constructor(name:string, defaultValue:number, label:string="") {
		const elementTarget = crel("div", "range").el
		const elementContainer = crel("label").children([
			crel("p").text(label),
			elementTarget
		]).el
		super(elementContainer, elementTarget, name, defaultValue, Number)
	}

	protected change (e:MouseEvent) {
		if (this._onclick)
			this._onclick()
		const x = e.layerX / this.elementTarget.clientWidth
		this.set(x)
		if (this._onchange)
			this._onchange(x)
	}
}
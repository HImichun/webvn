class Crel {
	el: HTMLElement

	constructor(tag:string, className?:string) {
		this.el = document.createElement(tag)
		if(className)
			this.class(className)
	}

	class(className:string) : Crel {
		this.el.className = className
		return this
	}

	attrs(attrs:{[attr:string]:string}) : Crel {
		for(const attr in attrs)
			this.el.setAttribute(attr, attrs[attr])
		return this
	}

	text(text:string) : Crel {
		this.el.innerText = text
		return this
	}

	html(html:string) : Crel {
		this.el.innerHTML = html
		return this
	}

	children(children:(HTMLElement|Crel|(()=>Crel|HTMLElement))[]) : Crel {
		for(let child of children) {
			if(child instanceof Function)
				child = child()
			if(child instanceof Crel)
				this.el.appendChild(child.el)
			else if(child instanceof HTMLElement)
				this.el.appendChild(child)
		}
		return this
	}
}

export default function crel(tag:string, className?:string) : Crel {
	return new Crel(tag,className)
}
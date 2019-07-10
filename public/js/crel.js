class Crel {
    constructor(tag, className) {
        this.el = document.createElement(tag);
        if (className)
            this.class(className);
    }
    class(className) {
        this.el.className = className;
        return this;
    }
    attrs(attrs) {
        for (const attr in attrs)
            this.el.setAttribute(attr, attrs[attr]);
        return this;
    }
    text(text) {
        this.el.innerText = text;
        return this;
    }
    html(html) {
        this.el.innerHTML = html;
        return this;
    }
    children(children) {
        for (let child of children) {
            if (child instanceof Function)
                child = child();
            if (child instanceof Crel)
                this.el.appendChild(child.el);
            else if (child instanceof HTMLElement)
                this.el.appendChild(child);
        }
        return this;
    }
}
export default function crel(tag, className) {
    return new Crel(tag, className);
}

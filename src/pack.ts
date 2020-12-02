import crel from "./crel.js";

const button = document.getElementById("pack") as HTMLButtonElement

button.onclick = () => {
	const input = crel("input").attrs({
		type:"file",
		multiple: "true",
		webkitdirectory: "true"
	}).el as HTMLInputElement

	input.onchange = () => pack(input.files)

	input.click()
}

export function pack(files: FileList) {
	for (const file of Array(files)) {
		console.log(file)
	}
}
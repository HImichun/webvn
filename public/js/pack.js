import crel from "./crel.js";
const button = document.getElementById("pack");
button.onclick = () => {
    const input = crel("input").attrs({
        type: "file",
        multiple: "true",
        webkitdirectory: "true"
    }).el;
    input.onchange = () => pack(input.files);
    input.click();
};
export function pack(files) {
    for (const file of Array(files)) {
        console.log(file);
    }
}

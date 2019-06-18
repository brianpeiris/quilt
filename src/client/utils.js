export async function imageFromDataTransfer(dataTransfer) {
  if (dataTransfer.files[0]) {
    const [file] = dataTransfer.files;
    return { name: file.name, url: URL.createObjectURL(file) };
  }
  if (dataTransfer.getData("text/html")) {
    const html = dataTransfer.getData("text/html");
    const div = document.createElement("div");
    div.innerHTML = html;
    const img = div.querySelector("img");
    const url = img && img.src;

    if (url && url.startsWith("data:")) {
      return { name: "image", url };
    }
  }
  if (dataTransfer.types.includes("text/uri-list")) {
    const data = dataTransfer.getData("text/uri-list");
    return { name: "image", url: `/proxy/${encodeURIComponent(data)}` };
  }
}

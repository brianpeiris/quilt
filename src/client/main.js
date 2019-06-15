/* global THREE, Konva */

import { imageFromDataTransfer } from "./utils.js";

const scene = new THREE.Scene();

(() => {
  const renderer = new THREE.WebGLRenderer();
  renderer.setSize(512, 512);
  renderer.domElement.id = "avatar";
  document.body.insertBefore(renderer.domElement, document.body.children[0]);
  renderer.setClearColor(0xaaaaaa);

  const light = new THREE.DirectionalLight();
  light.position.set(0, 1, 1);
  scene.add(light);
  scene.add(new THREE.AmbientLight(0xbbbbbb));

  const camera = new THREE.PerspectiveCamera();
  camera.position.set(0, 0.5, 1);
  camera.aspect = renderer.domElement.width / renderer.domElement.height;
  camera.updateProjectionMatrix();

  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enablePan = false;
  controls.target.set(0, 0.35, 0);
  controls.update();

  renderer.setAnimationLoop(() => renderer.render(scene, camera));
})();

const WIDTH = 512;
const HEIGHT = 512;
const stage = window.stage = new Konva.Stage({ container: "stage", width: WIDTH, height: HEIGHT });
stage.draggable(true);
let loading = false;
let mapImage;
const updateMap = () => {
  if (!mapImage || loading) return;
  const origDraw = stage.draw;
  stage.draw = () => {};
  transformer.hide();
  uvLayer.hide();
  loading = true;
  const canvas = stage.toCanvas();
  canvas.toBlob(blob => {
    URL.revokeObjectURL(mapImage.src);
    mapImage.src = URL.createObjectURL(blob);
    window.export.href = mapImage.src;
    uvLayer.show();
    stage.draw = origDraw;
  });
};
stage.on("dragmove", updateMap);

const transformer = new Konva.Transformer();
transformer.on("transform", updateMap);

function switchTransformer(node) {
  transformer.show();

  const oldLayer = transformer.getLayer();
  transformer.detach();
  transformer.remove();
  if (oldLayer) oldLayer.draw();

  const layer = node.getLayer();
  layer.add(transformer);
  transformer.attachTo(node);
  layer.draw();

  updateLayers(false);
}

const stageEl = document.getElementById("stage");
window.addEventListener("dragover", e => e.preventDefault());
window.addEventListener("drop", async e => {
  e.preventDefault();
  const imageEl = document.createElement("img");
  const image = await imageFromDataTransfer(e.dataTransfer);
  const { name, url } = image;
  imageEl.onload = () => {
    const layer = new Konva.Layer();
    const image = new Konva.Image({ image: imageEl });
    image.draggable(true);
    layer.add(image);
    layer.name(name);
    image.on("mousedown", () => switchTransformer(image));
    stage.add(layer);
    switchTransformer(image);
    uvLayer.moveToTop();
    updateLayers();
  };
  imageEl.src = url;
});
window.addEventListener("keyup", e => {
  const selectedOption = window.layers.selectedOptions[0];
  const selectedNode = selectedOption && selectedOption._node;
  if (e.key === "Delete" && selectedNode) {
    selectedNode.remove();
  }
});
window.addEventListener("wheel", e => {
  const delta = 0.1 * -Math.sign(e.deltaY);
  const scale = stage.scale();
  stage.scaleX(scale.x + delta);
  stage.scaleY(scale.y + delta);
  const transformNode = transformer.getNode();
  if (transformNode) switchTransformer(transformNode);
  stage.draw();
});
window.moveUp.onclick = () => {
  window.layers.selectedOptions[0]._node.moveUp();
  uvLayer.moveToTop();
  updateLayers();
};
window.moveDown.onclick = () => {
  window.layers.selectedOptions[0]._node.moveDown();
  updateLayers();
};
window.toggleVisibility.onclick = () => {
  const node = window.layers.selectedOptions[0]._node;
  node.visible(!node.visible());
  updateLayers();
};
window.delete.onclick = () => {
  window.layers.selectedOptions[0]._node.remove();
  updateLayers();
};
function updateLayers(mapUpdate = true) {
  let numChildren = 0;
  stage.getChildren().each((child, i) => {
    if (!window.layers.children[i]) {
      const layerEl = document.createElement("option");
      window.layers.insertBefore(layerEl, window.layers.children[0]);
    }
    numChildren++;
  });
  while (window.layers.children[numChildren]) {
    window.layers.removeChild(window.layers.children[numChildren]);
  }
  const selectedNode = transformer.getNode();
  const selectedLayer = selectedNode && selectedNode.getLayer();
  stage.getChildren().each((child, i) => {
    const option = window.layers.children[window.layers.children.length - 1 - i];
    option.textContent = child.name() + (child.visible() ? "" : "👻");
    option._node = child;
    if (selectedLayer === child) option.selected = true;
  });
  if (mapUpdate) updateMap();
}

const uvLayer = new Konva.FastLayer();
uvLayer.name("uvs");
stage.add(uvLayer);
updateLayers();
const uvCanvas = document.createElement("canvas");
uvCanvas.width = WIDTH;
uvCanvas.height = HEIGHT;
const uvImage = new Konva.Image({ image: uvCanvas })
uvLayer.add(uvImage);
const ctx = uvCanvas.getContext("2d");
ctx.lineWidth = 1;
ctx.strokeStyle = "lightgrey";

let avatar;
function loadGLB(url) {
  new THREE.GLTFLoader().load(url, gltf => {
    if (avatar) scene.remove(avatar);
    avatar = gltf.scene;
    scene.add(avatar);

    const mesh = gltf.scene.getObjectByProperty("type", "SkinnedMesh");
    const geo = mesh.geometry;
    const uvs = geo.attributes.uv.array;
    const index = geo.index.array;
    const w = WIDTH;
    const h = HEIGHT;

    for (let i = 0; i < index.length; i += 3) {
      let idx = index[i] * 2;
      ctx.moveTo(uvs[idx] * w, uvs[idx + 1] * h);
      idx = index[i + 1] * 2;
      ctx.lineTo(uvs[idx] * w, uvs[idx + 1] * h);
      idx = index[i + 2] * 2;
      ctx.lineTo(uvs[idx] * w, uvs[idx + 1] * h);
      idx = index[i] * 2;
      ctx.lineTo(uvs[idx] * w, uvs[idx + 1] * h);
    }
    ctx.stroke();

    uvImage.image(uvCanvas);
    uvImage.draw();

    mapImage = mesh.material.map.image;
    mapImage.onload = () => {
      mesh.material.map.needsUpdate = true;
      transformer.show();
      transformer.getLayer().draw();
      loading = false;
    };

    setInterval(() => {}, 100);
  });
}

loadGLB("https://cdn.glitch.com/31df4c32-0e35-4740-8569-69390991ffeb%2FAvatarBot_Base.glb");

const glbfile = document.getElementById("glbfile");
glbfile.onchange = () => loadGLB(URL.createObjectURL(glbfile.files[0]));

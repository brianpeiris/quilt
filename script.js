/* global THREE, Konva */

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
  scene.add(new THREE.AmbientLight(0x888888));

  const camera = new THREE.PerspectiveCamera();
  camera.position.set(0, 0.5, 1)
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
const stage = new Konva.Stage({ container: "stage", width: WIDTH, height: HEIGHT });
let mapImage;
function updateMap() {
  if (!mapImage) return;
  transformer.hide();
  stage.toCanvas().toBlob(blob => {
    mapImage.src = URL.createObjectURL(blob);
  });
}
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
stageEl.addEventListener("dragover", e => e.preventDefault());
stageEl.addEventListener("drop", e => {
  e.preventDefault();
  const imageEl = document.createElement("img");
  imageEl.onload = () => {
    const layer = new Konva.Layer();
    const image = new Konva.Image({ image: imageEl });
    image.draggable(true);
    layer.add(image);
    layer.name(e.dataTransfer.files[0].name);
    image.on("mousedown", () => switchTransformer(image));
    stage.add(layer);
    switchTransformer(image);
    uvLayer.moveToTop();
    updateLayers();
  };
  imageEl.src = URL.createObjectURL(e.dataTransfer.files[0]);
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
window.export.onclick = () => {
  transformer.hide();
  stage.toCanvas().toBlob(blob => {
    transformer.show();
    window.open(URL.createObjectURL(blob));
  });
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

const uvLayer = new Konva.Layer();
uvLayer.name("uvs");
stage.add(uvLayer);
updateLayers();
const ctx = uvLayer.getCanvas().getContext();
ctx.lineWidth = 1;
ctx.strokeStyle = "lightgrey";

function loadGLB(url) {
  new THREE.GLTFLoader().load(url, gltf => {
    scene.add(gltf.scene);

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

    mapImage = mesh.material.map.image;
    mapImage.onload = () => {
      mesh.material.map.needsUpdate = true;
      transformer.show();
      transformer.getLayer().draw();
    };

    setInterval(() => {}, 100);
  });
}

loadGLB("https://cdn.glitch.com/31df4c32-0e35-4740-8569-69390991ffeb%2FAvatarBot_Base.glb");

document.getElementById("glbfile").onchange = () => loadGLB(URL.createObjectURL(this.files[0]));

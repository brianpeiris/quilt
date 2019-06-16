import React from "react";
import ReactDOM from "react-dom";
import Konva from "react-konva";

class Layer {
  constructor(name, src) {
    this.name = name;
    this.src = src;
    this.x = 0;
    this.y = 0;
    this.rotation = 0;
    this.scaleX = 1;
    this.scaleY = 1;
    this.visible = true;
  }
}

export default class App {
  constructor() {
    this.layers = [
      new Layer("dog", "https://i.imgur.com/m7Vgs.png?dog"),
      new Layer("cthulu", "https://i.imgur.com/5Du8g5e.png?cthulu"),
      new Layer("digbee", "https://i.imgur.com/GaheCcb.jpg?digbee"),
      new Layer("thimble", "https://i.imgur.com/bIfA0Wg.jpg")
    ];
  }
  moveDown(index) {
    const shouldMove = index !== 0;
    if (!shouldMove) return;
    const temp = this.layers[index - 1];
    this.layers[index - 1] = this.layers[index];
    this.layers[index] = temp;
    return true;
  }
  moveUp(index) {
    const shouldMove = index !== this.layers.length - 1;
    if (!shouldMove) return;
    const temp = this.layers[index + 1];
    this.layers[index + 1] = this.layers[index];
    this.layers[index] = temp;
    return true;
  }
  toggleVisibility(index) {
    this.layers[index].visible = !this.layers[index].visible;
  }
  delete(index) {
    this.layers.splice(index, 1);
  }
}

class ImageNode_ extends React.Component {
  constructor(props) {
    super(props);
    this.image = new Image();
    this.state = { image: null };
  }
  componentDidMount() {
    this.updateImage();
  }
  componentDidUpdate() {
    this.updateImage();
  }
  updateImage() {
    if (this.props.src === this.image.src) return;
    this.image.onload = () => this.setState({ image: this.image });
    this.image.src = this.props.src;
  }
  render() {
    return <Konva.Image ref={this.props.forwardedRef} image={this.state.image} {...this.props}></Konva.Image>;
  }
}
const ImageNode = React.forwardRef((props, ref) => <ImageNode_ {...props} forwardedRef={ref} />);
ImageNode.displayName = "ImageNode";

class AppUI extends React.Component {
  constructor(props) {
    super(props);
    this.imageRefs = [];
    this.transformerRef = React.createRef();
    this.state = {};
  }
  getImageRef = i => {
    if (!this.imageRefs[i]) {
      this.imageRefs[i] = React.createRef();
    }
    return this.imageRefs[i];
  };
  layerSelected = selectedIndex => {
    const transformer = this.transformerRef.current;
    if (this.props.app.layers.length) {
      const node = (window.node = this.imageRefs[selectedIndex].current);
      transformer.attachTo(node);
    } else {
      transformer.detach();
    }

    setTimeout(() => {
      // Layer selected is called on mouse down, but we don't want to interrupt a drag, so we postpone the state update.
      this.setState({ selectedIndex });

      // We also want to give the transformer a chance to attach to the new node before updating it.
      transformer.forceUpdate();
      transformer.getLayer().batchDraw();
    });
  };
  layerUpdated = layer => {
    return e => {
      const { x, y } = e.currentTarget.position();
      layer.x = x;
      layer.y = y;
      const { x: scaleX, y: scaleY } = e.currentTarget.scale();
      layer.scaleX = scaleX;
      layer.scaleY = scaleY;
      layer.rotation = e.currentTarget.rotation();
      this.forceUpdate();
      this.transformerRef.current.getLayer().batchDraw();
    };
  };
  zoomStage = e => {
    e.evt.preventDefault();
    const stage = e.currentTarget;
    const oldScale = stage.scaleX();

    const mousePointTo = {
      x: stage.getPointerPosition().x / oldScale - stage.x() / oldScale,
      y: stage.getPointerPosition().y / oldScale - stage.y() / oldScale
    };

    const newScale = e.evt.deltaY < 0 ? oldScale * 1.1 : oldScale / 1.1;
    stage.scale({ x: newScale, y: newScale });

    const newPos = {
      x: -(mousePointTo.x - stage.getPointerPosition().x / newScale) * newScale,
      y: -(mousePointTo.y - stage.getPointerPosition().y / newScale) * newScale
    };
    stage.position(newPos);
    stage.batchDraw();
  };
  render() {
    const { layers } = this.props.app;
    const layersReversed = Array.from(layers).reverse();
    return (
      <div>
        <Konva.Stage className="stage" width={512} height={512}>
          {layers.map((layer, i) => {
            return (
              <Konva.Layer key={i}>
                <ImageNode
                  src={layer.src}
                  x={layer.x}
                  y={layer.y}
                  rotation={layer.rotation}
                  scaleX={layer.scaleX}
                  scaleY={layer.scaleY}
                  visible={layer.visible}
                />
              </Konva.Layer>
            );
          })}
        </Konva.Stage>
        <Konva.Stage className="stage" width={512} height={512} draggable="true" onWheel={this.zoomStage}>
          {layers.map((layer, i) => {
            return (
              <Konva.Layer key={i}>
                <ImageNode
                  src={layer.src}
                  ref={this.getImageRef(i)}
                  onMouseDown={() => this.layerSelected(i)}
                  x={layer.x}
                  y={layer.y}
                  rotation={layer.rotation}
                  scaleX={layer.scaleX}
                  scaleY={layer.scaleY}
                  visible={layer.visible}
                  draggable="true"
                  onDragMove={this.layerUpdated(layer)}
                  onTransform={this.layerUpdated(layer)}
                />
              </Konva.Layer>
            );
          })}
          <Konva.Layer>
            <Konva.Transformer
              ref={this.transformerRef}
              onTransform={() => {
                // Since our transformer is an a different layer than the node it's attached to, we have to update
                // it manually.
                this.transformerRef.current
                  .getNode()
                  .getLayer()
                  .batchDraw();
              }}
            />
          </Konva.Layer>
        </Konva.Stage>
        <button
          onClick={() => {
            if (this.props.app.moveDown(this.state.selectedIndex)) {
              this.layerSelected(this.state.selectedIndex - 1);
            }
          }}
        >
          down
        </button>
        <button
          onClick={() => {
            if (this.props.app.moveUp(this.state.selectedIndex)) {
              this.layerSelected(this.state.selectedIndex + 1);
            }
          }}
        >
          up
        </button>
        <button
          onClick={() => {
            this.props.app.toggleVisibility(this.state.selectedIndex);
            this.forceUpdate();
          }}
        >
          hide
        </button>
        <button
          onClick={() => {
            const index = this.state.selectedIndex;
            this.props.app.delete(index);
            this.layerSelected(Math.min(index, this.props.app.layers.length - 1));
          }}
        >
          delete
        </button>
        <select
          id="layers"
          size="10"
          onChange={({ target }) => this.layerSelected(layers.length - target.selectedIndex - 1)}
          value={this.state.selectedIndex}
        >
          {layersReversed.map((layer, i) => (
            <option key={i} value={layers.length - i - 1}>
              {layer.name} {layer.visible ? "" : "(hidden)"}
            </option>
          ))}
        </select>
        <div style={{ whiteSpace: "pre" }}>{JSON.stringify(this.props.app, null, 2)}</div>
      </div>
    );
  }
}

window.app = new App();
ReactDOM.render(<AppUI app={window.app} />, document.getElementById("root"));

/*
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
*/

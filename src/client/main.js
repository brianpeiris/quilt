import React from "react";
import ReactDOM from "react-dom";
import * as _Konva from "konva";
import Konva from "react-konva";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";

import { imageFromDataTransfer } from "./utils.js";

// Disable Konva warnings because of transformer false positive
_Konva.Util.warn = () => {};

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
    this.layers = [];
  }
  get hasLayers() {
    return !!this.layers.length;
  }
  moveDown(index) {
    if (!this.hasLayers) return;
    const shouldMove = index !== 0;
    if (!shouldMove) return;
    const temp = this.layers[index - 1];
    this.layers[index - 1] = this.layers[index];
    this.layers[index] = temp;
    return true;
  }
  moveUp(index) {
    if (!this.hasLayers) return;
    const shouldMove = index !== this.layers.length - 1;
    if (!shouldMove) return;
    const temp = this.layers[index + 1];
    this.layers[index + 1] = this.layers[index];
    this.layers[index] = temp;
    return true;
  }
  toggleVisibility(index) {
    if (!this.hasLayers) return;
    this.layers[index].visible = !this.layers[index].visible;
  }
  delete(index) {
    if (!this.hasLayers) return;
    this.layers.splice(index, 1);
  }
  add(name, url) {
    this.layers.push(new Layer(name, url));
  }
}

class Preview extends React.Component {
  constructor(props) {
    super(props);
    this.canvasRef = React.createRef();
    this.scene = new THREE.Scene();
  }
  componentDidMount() {
    this.initRenderer();
  }
  componentDidUpdate() {
    if (this.props.map !== this.mapImage.src) {
      this.mapImage.src = this.props.map;
    }
  }
  initRenderer() {
    const renderer = new THREE.WebGLRenderer({ canvas: this.canvasRef.current });
    renderer.setSize(512, 512);
    renderer.setClearColor(0xaaaaaa);

    const light = new THREE.DirectionalLight();
    light.position.set(0, 1, 1);
    this.scene.add(light);
    this.scene.add(new THREE.AmbientLight(0xbbbbbb));

    const camera = new THREE.PerspectiveCamera();
    camera.position.set(0, 0.5, 1);
    camera.aspect = renderer.domElement.width / renderer.domElement.height;
    camera.updateProjectionMatrix();

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false;
    controls.target.set(0, 0.35, 0);
    controls.update();

    renderer.setAnimationLoop(() => renderer.render(this.scene, camera));
    this.loadGLB("https://cdn.glitch.com/31df4c32-0e35-4740-8569-69390991ffeb%2FAvatarBot_Base.glb");
  }
  loadGLB(url) {
    new GLTFLoader().load(url, gltf => {
      if (this.avatar) this.scene.remove(this.avatar);
      this.avatar = gltf.scene;
      this.scene.add(this.avatar);
      const mesh = gltf.scene.getObjectByProperty("type", "SkinnedMesh");
      this.mapImage = mesh.material.map.image;
      this.mapImage.onload = () => {
        mesh.material.map.needsUpdate = true;
      };

      /*
        const geo = mesh.geometry;
        const uvs = geo.attributes.uv.array;
        const index = geo.index.array;
        const w = 512;
        const h = 512;

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
      */
    });
  }
  render() {
    return <canvas ref={this.canvasRef} />;
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
    this.mapStage = React.createRef();
  }
  state = {
    selectedIndex: "",
    mapSrc: null
  };
  componentDidMount() {
    window.addEventListener("dragover", e => e.preventDefault());
    window.addEventListener("drop", async e => {
      e.preventDefault();
      const image = await imageFromDataTransfer(e.dataTransfer);
      const { name, url } = image;
      this.props.app.add(name, url);
      this.forceUpdate();
      // :( More setTimeout magic. This time we need to wait for a render and dom update for selection to work.
      setTimeout(() => this.selectLayer(this.props.app.layers.length - 1), 20);
    });
    window.addEventListener("keyup", e => {
      if (e.key === "Delete") {
        this.deleteSelectedLayer();
      }
    });
  }
  getImageRef = i => {
    if (!this.imageRefs[i]) {
      this.imageRefs[i] = React.createRef();
    }
    return this.imageRefs[i];
  };
  selectLayer = selectedIndex => {
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

      this.updateMap();
    }, 20);
  };
  deleteSelectedLayer = () => {
    const index = this.state.selectedIndex;
    this.props.app.delete(index);
    this.selectLayer(Math.min(index, this.props.app.layers.length - 1));
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
      this.updateMap();
    };
  };
  updateMap = () => {
    if (this.generating) return;
    this.generating = true;
    this.mapStage.current.toCanvas().toBlob(blob => {
      URL.revokeObjectURL(this.state.mapSrc);
      this.setState({ mapSrc: URL.createObjectURL(blob) });
      this.generating = false;
    });
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
    this.transformerRef.current.forceUpdate();
    stage.batchDraw();
  };
  render() {
    const { layers } = this.props.app;
    const layersReversed = Array.from(layers).reverse();
    return (
      <div>
        <Preview map={this.state.mapSrc} />
        <Konva.Stage className="stage hidden" width={512} height={512} ref={this.mapStage}>
          <Konva.Layer>
            <Konva.Rect fill="black" width={512} height={512} />
          </Konva.Layer>
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
          <Konva.Layer>
            <Konva.Rect fill="black" width={512} height={512} />
          </Konva.Layer>
          {layers.map((layer, i) => {
            return (
              <Konva.Layer key={i}>
                <ImageNode
                  src={layer.src}
                  ref={this.getImageRef(i)}
                  onMouseDown={() => this.selectLayer(i)}
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
              this.selectLayer(this.state.selectedIndex - 1);
            }
          }}
        >
          down
        </button>
        <button
          onClick={() => {
            if (this.props.app.moveUp(this.state.selectedIndex)) {
              this.selectLayer(this.state.selectedIndex + 1);
            }
          }}
        >
          up
        </button>
        <button
          onClick={() => {
            this.props.app.toggleVisibility(this.state.selectedIndex);
            this.forceUpdate();
            // :( More setTimeout magic. This time we need to wait for a render and dom update before updating the map.
            setTimeout(() => this.updateMap(), 20);
          }}
        >
          hide
        </button>
        <button onClick={this.deleteSelectedLayer}>delete</button>
        <select
          id="layers"
          size="10"
          onChange={({ target }) => this.selectLayer(layers.length - target.selectedIndex - 1)}
          value={this.state.selectedIndex}
        >
          {layersReversed.map((layer, i) => (
            <option key={i} value={layers.length - i - 1}>
              {layer.name} {layer.visible ? "" : "(hidden)"}
            </option>
          ))}
        </select>
        <a target="_blank" rel="noopener noreferrer" href={this.state.mapSrc}>
          export
        </a>
        {/*<div style={{ whiteSpace: "pre" }}>{JSON.stringify(this.props.app, null, 2)}</div>*/}
      </div>
    );
  }
}

window.app = new App();
ReactDOM.render(<AppUI app={window.app} />, document.getElementById("root"));

/*
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

const glbfile = document.getElementById("glbfile");
glbfile.onchange = () => loadGLB(URL.createObjectURL(glbfile.files[0]));
*/

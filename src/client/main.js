import React from "react";
import ReactDOM from "react-dom";
import * as _Konva from "konva";
import Konva from "react-konva";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import "@fortawesome/fontawesome-free/css/all.css";
import * as cx from "classnames";

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
    this.uvCanvas = document.createElement("canvas");
    this.uvCanvas.width = 1024;
    this.uvCanvas.height = 1024;
    this.ctx = this.uvCanvas.getContext("2d");
    this.ctx.lineWidth = 1;
    this.ctx.strokeStyle = "grey";
  }
  componentDidMount() {
    this.initRenderer();
  }
  componentDidUpdate() {
    if (this.props.map && this.props.map !== this.mapImage.src) {
      this.mapImage.src = this.props.map;
    }
  }
  initRenderer() {
    const canvas = this.canvasRef.current;
    const renderer = new THREE.WebGLRenderer({ canvas });
    this.renderer = renderer;
    renderer.setClearColor(0xaaaaaa);

    const light = new THREE.DirectionalLight();
    light.position.set(0, 1, 1);
    this.scene.add(light);
    this.scene.add(new THREE.AmbientLight(0xbbbbbb));

    const camera = new THREE.PerspectiveCamera();
    this.camera = camera;
    camera.position.set(0, 0.5, 1.2);
    camera.updateProjectionMatrix();

    const controls = new OrbitControls(camera, canvas);
    controls.enablePan = false;
    controls.rotateSpeed = 3;
    controls.target.set(0, 0.35, 0);
    controls.update();

    renderer.setAnimationLoop(() => renderer.render(this.scene, camera));
    const gltfURL = new URLSearchParams(location.search).get("gltf");
    this.loadGLB(gltfURL ? `/proxy/${encodeURIComponent(gltfURL)}` : "/default-avatar.glb");

    window.addEventListener("resize", this.resize);
    this.resize();
  }
  resize = () => {
    const canvas = this.canvasRef.current;
    const w = canvas.parentNode.clientWidth;
    const h = canvas.parentNode.clientHeight;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  };
  loadGLB(url) {
    THREE.DefaultLoadingManager.setURLModifier(url => {
      if (url.startsWith("http")) {
        return `/proxy/${encodeURIComponent(url)}`;
      } else {
        return url;
      }
    });
    new GLTFLoader().load(url, gltf => {
      if (this.avatar) this.scene.remove(this.avatar);
      this.avatar = gltf.scene;
      this.scene.add(this.avatar);
      const mesh = gltf.scene.getObjectByProperty("type", "SkinnedMesh");
      this.mapImage = mesh.material.map.image;
      if (this.mapImage.src && !this.mapImage.src.startsWith("blob:")) {
        this.props.onBaseImageLoaded(this.mapImage.src);
      }
      this.mapImage.onload = () => {
        mesh.material.map.needsUpdate = true;
      };

      const geo = mesh.geometry;
      const uvs = geo.attributes.uv.array;
      const index = geo.index.array;
      const w = 1024;
      const h = 1024;

      for (let i = 0; i < index.length; i += 3) {
        let idx = index[i] * 2;
        this.ctx.moveTo(uvs[idx] * w, uvs[idx + 1] * h);
        idx = index[i + 1] * 2;
        this.ctx.lineTo(uvs[idx] * w, uvs[idx + 1] * h);
        idx = index[i + 2] * 2;
        this.ctx.lineTo(uvs[idx] * w, uvs[idx + 1] * h);
        idx = index[i] * 2;
        this.ctx.lineTo(uvs[idx] * w, uvs[idx + 1] * h);
      }
      this.ctx.stroke();

      this.uvCanvas.toBlob(blob => {
        this.props.onUvImageUpdated(URL.createObjectURL(blob));
      });
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
    if (!this.props.src || this.props.src === this.image.src) return;
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
    this.stageRef = React.createRef();
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
    window.addEventListener("resize", this.resize);
    this.resize();
  }
  resize = () => {
    const stage = this.stageRef.current;
    const container = stage.getContainer();
    const w = container.clientWidth;
    const h = container.clientHeight;
    stage.width(w);
    stage.height(h);
    const s = h / 1024;
    stage.x(w / 2 - (1024 / 2) * s);
    stage.scaleX(s);
    stage.scaleY(s);
  };
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
    });
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
    // Force the transformer to update its anchor dimensions as we zoom.
    this.transformerRef.current.forceUpdate();
    stage.batchDraw();
  };
  render() {
    const { layers } = this.props.app;
    const layersReversed = Array.from(layers).reverse();
    return (
      <div className="container">
        <div>
          <Preview
            map={this.state.mapSrc}
            onBaseImageLoaded={baseImageSrc => this.setState({ baseImageSrc })}
            onUvImageUpdated={uvImageSrc => this.setState({ uvImageSrc })}
          />
        </div>
        <Konva.Stage className="hidden" width={1024} height={1024} ref={this.mapStage}>
          <Konva.Layer>
            <Konva.Rect fill="black" width={1024} height={1024} />
            <ImageNode src={this.state.baseImageSrc} listening={false} />
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
        <Konva.Stage width={1024} height={1024} draggable="true" onWheel={this.zoomStage} ref={this.stageRef}>
          <Konva.Layer>
            <Konva.Rect fill="black" width={1024} height={1024} />
            <ImageNode src={this.state.baseImageSrc} listening={false} />
            {layers.map((layer, i) => {
              return (
                <ImageNode
                  key={i}
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
              );
            })}
            <ImageNode src={this.state.uvImageSrc} globalCompositeOperation="difference" listening={false} />
            <Konva.Transformer ref={this.transformerRef} />
          </Konva.Layer>
        </Konva.Stage>
        {this.props.app.layers.length === 0 && (
          <div className="start">
            Drag and drop an image file or URL here,
            <br />
            or click on the &#xf067; button in the sidebar.
          </div>
        )}
        <div className="controls">
          <div className="buttons">
            <label className="button fas">
              <input
                type="file"
                onChange={e => {
                  const file = e.target.files[0];
                  this.props.app.add(file.name, URL.createObjectURL(file));
                  this.forceUpdate();
                  // :( More setTimeout magic. This time we need to wait for a render and dom update for selection to work.
                  setTimeout(() => this.selectLayer(this.props.app.layers.length - 1), 20);
                  e.target.value = null;
                }}
              />
              &#xf067;
            </label>
            <button
              className="fas"
              onClick={() => {
                if (this.props.app.moveUp(this.state.selectedIndex)) {
                  this.selectLayer(this.state.selectedIndex + 1);
                }
              }}
            >
              &#xf077;
            </button>
            <button
              className="fas"
              onClick={() => {
                if (this.props.app.moveDown(this.state.selectedIndex)) {
                  this.selectLayer(this.state.selectedIndex - 1);
                }
              }}
            >
              &#xf078;
            </button>
            <button
              className="fas"
              onClick={() => {
                this.props.app.toggleVisibility(this.state.selectedIndex);
                this.forceUpdate();
                // :( More setTimeout magic. This time we need to wait for a render and dom update before updating the map.
                setTimeout(() => this.updateMap(), 0);
              }}
            >
              &#xf070;
            </button>
            <button className="fas" onClick={this.deleteSelectedLayer}>
              &#xf00d;
            </button>
          </div>
          <select
            className="layers"
            size="10"
            onChange={({ target }) => this.selectLayer(layers.length - target.selectedIndex - 1)}
            value={this.state.selectedIndex}
          >
            {layersReversed.map((layer, i) => (
              <option key={i} value={layers.length - i - 1} className="fas">
                {layer.name} {layer.visible ? "" : "\uf070"}
              </option>
            ))}
          </select>
          <a className={cx("export", { disabled: !this.state.mapSrc })} download href={this.state.mapSrc}>
            &#xf019; Export
          </a>
          <div className="logo">
            <h1>Quilt</h1>
            <a href="https://github.com/brianpeiris/quilt" target="_blank" rel="noopener noreferrer">
              source code
            </a>
          </div>
        </div>
      </div>
    );
  }
}

window.app = new App();
ReactDOM.render(<AppUI app={window.app} />, document.getElementById("root"));

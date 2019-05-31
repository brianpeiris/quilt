/* global THREE, Konva */
const renderer = new THREE.WebGLRenderer();
document.body.append(renderer.domElement);
const scene = new THREE.Scene();
const light = new THREE.DirectionalLight();
light.position.set(0, 1, 1);
scene.add(light);
scene.add(new THREE.AmbientLight(0x888888))
const camera = new THREE.PerspectiveCamera();
camera.position.z = 3;
camera.aspect = renderer.domElement.width / renderer.domElement.height;
camera.updateProjectionMatrix();
const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enablePan = false;
controls.target.set(0, 0.25, 0)
controls.update();
renderer.setAnimationLoop(animate)
function animate(){
  renderer.render(scene, camera);
}

var stage = new Konva.Stage({
  container: 'stage',   // id of container <div>
  width: 512,
  height: 512
});

var imglayer = new Konva.Layer();

// create our shape
var circle = new Konva.Circle({
  x: stage.width() / 2,
  y: stage.height() / 2,
  radius: 70,
  fill: 'red',
  stroke: 'black',
  strokeWidth: 4
});
circle.draggable(true)
imglayer.add(circle);
stage.add(imglayer)

var layer = new Konva.Layer();

stage.add(layer);



const ctx = layer.getCanvas().getContext();

function loadGLB(url) {
  
  new THREE.GLTFLoader().load(url, gltf => {
    scene.add(gltf.scene);
    const mesh = gltf.scene.getObjectByProperty("type", "SkinnedMesh");
    const geo = mesh.geometry;
    const uvs = geo.attributes.uv.array;
    const index = geo.index.array;
    const width = 500;
    const height = 500;
    for (let i = 0; i < index.length; i+=3){
      ctx.moveTo(uvs[index[i] * 2] * width, uvs[index[i] * 2 + 1] * height);
      ctx.lineTo(uvs[index[i + 1] * 2] * width, uvs[index[i + 1] * 2 + 1] * height);
      ctx.lineTo(uvs[index[i + 2] * 2] * width, uvs[index[i + 2] * 2 + 1] * height);
      ctx.lineTo(uvs[index[i] * 2] * width, uvs[index[i] * 2 + 1] * height);
    }
    ctx.stroke();
    
    mesh.material.map.image.onload = () => {
      console.log(mesh.material.map.image.readyState);
      mesh.material.map.needsUpdate = true;
    }
setInterval(()=>{
  imglayer.canvas._canvas.toBlob(blob =>{
    mesh.material.map.image.src = URL.createObjectURL(blob);
  })
}, 100)
  })
}
loadGLB("https://cdn.glitch.com/31df4c32-0e35-4740-8569-69390991ffeb%2FAvatarBot_Base.glb");
window.glbfile.onchange = () => {
  loadGLB(URL.createObjectURL(window.glbfile.files[0]))
};

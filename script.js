/* global THREE */
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
const controls = new THREE.OrbitControls(camera);
controls.enablePan = false;
controls.target.set(0, 0.25, 0)
controls.update();
renderer.setAnimationLoop(animate)
function animate(){
  renderer.render(scene, camera);
}
const ctx = window.uv.getContext("2d");
window.glbfile.onchange = () => {
  new THREE.GLTFLoader().load(URL.createObjectURL(window.glbfile.files[0]), gltf => {
    scene.add(gltf.scene);
    const geo = gltf.scene.getObjectByProperty("type", "SkinnedMesh").geometry;
    const uvs = geo.attributes.uv.array;
    const index = geo.index;
    for (let i = 0; i < index.count; i+=3){
      ctx.lineTo(uvs[i] * window.uv.width, uvs[i + 1] * window.uv.height);
      ctx.lineTo(uvs[i + 2] * window.uv.width, uvs[i + 3] * window.uv.height);
      ctx.lineTo(uvs[i + 4] * window.uv.width, uvs[i + 5] * window.uv.height);
    }
    ctx.stroke();
  })
};
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
function loadGLB(url) {
  
  new THREE.GLTFLoader().load(url, gltf => {
    scene.add(gltf.scene);
    const geo = gltf.scene.getObjectByProperty("type", "SkinnedMesh").geometry;
    const uvs = geo.attributes.uv.array;
    const index = geo.index.array;
    for (let i = 0; i < index.length; i+=3){
      ctx.lineTo(uvs[index[i]] * window.uv.width, uvs[index[i] + 1] * window.uv.height);
      ctx.lineTo(uvs[index[i + 1]] * window.uv.width, uvs[index[i + 1] + 1] * window.uv.height);
      ctx.lineTo(uvs[index[i + 2]] * window.uv.width, uvs[index[i + 2] + 1] * window.uv.height);
    }
    ctx.stroke();
  })
}
loadGLB("https://cdn.glitch.com/31df4c32-0e35-4740-8569-69390991ffeb%2FAvatarBot_Base.glb");
window.glbfile.onchange = () => {
  loadGLB(URL.createObjectURL(window.glbfile.files[0]))
};
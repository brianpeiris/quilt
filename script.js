/* global THREE */
const renderer = new THREE.WebGLRenderer();
document.body.append(renderer.domElement);
const scene = new THREE.Scene();
const light = new THREE.DirectionalLight();
light.position.set(0, 1, 1);
scene.add(light);
const camera = new THREE.PerspectiveCamera();
camera.position.z = 3;
camera.aspect = renderer.domElement.width / renderer.domElement.height;
camera.updateProjectionMatrix();
const controls = new THREE.OrbitControls(camera);
controls.enablePan = false;
renderer.setAnimationLoop(animate)
function animate(){
  renderer.render(scene, camera);
}
window.glbfile.onchange = () => {
  new THREE.GLTFLoader().load(URL.createObjectURL(window.glbfile.files[0]), gltf => {
    scene.add(gltf.scene);
  })
};
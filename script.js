/* global THREE */
const renderer = new THREE.WebGLRenderer();
document.body.append(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera();
camera.position.z = 3;
camera.aspect = renderer.domElement.width / renderer.domElement.height;
camera.updateProjectionMatrix();
scene.add(new THREE.Mesh(new THREE.BoxBufferGeometry()))
renderer.setAnimationLoop(animate)
function animate(){
  renderer.render(scene, camera);
}
glbfile.onchange = () => {
  new THREE.GltfLoader
};
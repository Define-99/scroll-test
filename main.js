import * as THREE from 'https://cdn.skypack.dev/three@0.128.0';
import { GLTFLoader } from 'https://cdn.skypack.dev/three@0.128.0/examples/jsm/loaders/GLTFLoader.js';
import { EffectComposer } from 'https://cdn.skypack.dev/three@0.128.0/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'https://cdn.skypack.dev/three@0.128.0/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'https://cdn.skypack.dev/three@0.128.0/examples/jsm/postprocessing/UnrealBloomPass.js';

// 🎨 Change background color and transparency here
const backgroundColor = 0x776143;
const backgroundAlpha = 1.0;

const canvas = document.getElementById('threeCanvas');
const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
renderer.setClearColor(backgroundColor, backgroundAlpha);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.physicallyCorrectLights = true;

// Scene and camera
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);

// Lighting
scene.add(new THREE.AmbientLight(0xffffff, 0.3));
const dirLight = new THREE.DirectionalLight(0xffffff, 2);
dirLight.position.set(5, 5, 5);
scene.add(dirLight);

// Environment map
const envLoader = new THREE.CubeTextureLoader();
const envMap = envLoader.load([
  'https://cdn.jsdelivr.net/gh/mrdoob/three.js@master/examples/textures/cube/Bridge2/posx.jpg',
  'https://cdn.jsdelivr.net/gh/mrdoob/three.js@master/examples/textures/cube/Bridge2/negx.jpg',
  'https://cdn.jsdelivr.net/gh/mrdoob/three.js@master/examples/textures/cube/Bridge2/posy.jpg',
  'https://cdn.jsdelivr.net/gh/mrdoob/three.js@master/examples/textures/cube/Bridge2/negy.jpg',
  'https://cdn.jsdelivr.net/gh/mrdoob/three.js@master/examples/textures/cube/Bridge2/posz.jpg',
  'https://cdn.jsdelivr.net/gh/mrdoob/three.js@master/examples/textures/cube/Bridge2/negz.jpg'
]);
scene.environment = envMap;

// Wrapper group
const wrapper = new THREE.Group();
scene.add(wrapper);

// ✅ Mobile/Desktop wrapper position controls
const mobileWrapperPosition = new THREE.Vector3(0, 0.5, 0);   // centered
const desktopWrapperPosition = new THREE.Vector3(1, 1, 0);  // shifted right

function updateLayout() {
  const isMobile = window.innerWidth <= 768;
  if (isMobile) {
    camera.position.set(0, 2.5, 3);
    camera.lookAt(0, 0, 0);
    wrapper.position.copy(mobileWrapperPosition);
  } else {
    camera.position.set(2, 2.5, 3);
    camera.lookAt(0, 0, 0);
    wrapper.position.copy(desktopWrapperPosition);
  }
}
updateLayout();

// Load GLB
const loader = new GLTFLoader();
loader.load('./glb/diamond.glb', (gltf) => {
  const model = gltf.scene;
  wrapper.add(model);
  wrapper.scale.set(0.5, 0.5, 0.5);
});

// Bloom
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.4,
  0.5,
  0.2
);
composer.addPass(bloomPass);

// Scroll + idle rotation
let idleRotation = 0;
let scrollAngle = 0;
let scrollOffsetCaptured = false;
let scrollOffset = 0;

window.addEventListener('message', (event) => {
  if (event.data?.type === 'scrollProgress') {
    const progress = event.data.value;
    if (!scrollOffsetCaptured) {
      scrollOffset = idleRotation;
      scrollOffsetCaptured = true;
    }
    scrollAngle = progress * Math.PI * 2 + scrollOffset;
  }
});

// Animation loop
function animate() {
  requestAnimationFrame(animate);
  idleRotation += 0.002;
  wrapper.rotation.y = scrollAngle + idleRotation;
  composer.render();
}
animate();

// Handle resize
window.addEventListener('resize', () => {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  composer.setSize(w, h);
  updateLayout();
});

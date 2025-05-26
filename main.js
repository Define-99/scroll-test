import * as THREE from 'https://cdn.skypack.dev/three@0.128.0';
import { GLTFLoader } from 'https://cdn.skypack.dev/three@0.128.0/examples/jsm/loaders/GLTFLoader.js';
import { EXRLoader } from 'https://cdn.skypack.dev/three@0.128.0/examples/jsm/loaders/EXRLoader.js';
import { PMREMGenerator } from 'https://cdn.skypack.dev/three@0.128.0';
import { EffectComposer } from 'https://cdn.skypack.dev/three@0.128.0/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'https://cdn.skypack.dev/three@0.128.0/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'https://cdn.skypack.dev/three@0.128.0/examples/jsm/postprocessing/UnrealBloomPass.js';

const backgroundColor = 0xFFB5B5;
const backgroundAlpha = 1.0;

const canvas = document.getElementById('threeCanvas');
const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
renderer.setClearColor(backgroundColor, backgroundAlpha);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.7;

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(backgroundColor, 4, 7);
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);

const wrapper = new THREE.Group();

// ✨ Gold dust particle group
const particles = new THREE.Group();
scene.add(particles);

const particleCount = 200;
// Random size per particle between 0.005 and 0.025
const minSize = 0.002;
const maxSize = 0.007;

const material = new THREE.MeshBasicMaterial({ color: 0xFF4848 });

for (let i = 0; i < particleCount; i++) {
  const size = minSize + Math.random() * (maxSize - minSize);
  const geometry = new THREE.SphereGeometry(size, 6, 6);
  const particle = new THREE.Mesh(geometry, material);
  particle.position.set(
    (Math.random() - 0.5) * 4,
    (Math.random() - 0.5) * 4,
    (Math.random() - 0.5) * 4
  );
  particles.add(particle);
}
scene.add(wrapper);

const mobileWrapperPosition = new THREE.Vector3(0, 0.5, 0);
const desktopWrapperPosition = new THREE.Vector3(1, 1, 0);

function updateLayout() {
  const isMobile = window.innerWidth <= 768;
  camera.position.set(isMobile ? 0 : 2, 2.5, 3);
  camera.lookAt(0, 0, 0);
  wrapper.position.copy(isMobile ? mobileWrapperPosition : desktopWrapperPosition);
}
updateLayout();

scene.add(new THREE.AmbientLight(0xffffff, 0.2));
const light = new THREE.DirectionalLight(0xffe5b4, 0.8);
light.position.set(3, -4, 2);
scene.add(light);

const pmremGenerator = new PMREMGenerator(renderer);
pmremGenerator.compileEquirectangularShader();

new EXRLoader()
  .setPath('/hdri/')
  .load('brown_photostudio_01_1k.exr', (texture) => {
    const envMap = pmremGenerator.fromEquirectangular(texture).texture;
    texture.dispose();
    pmremGenerator.dispose();
    scene.environment = envMap;

    const loader = new GLTFLoader();
    loader.load('./glb/diamond.glb', (gltf) => {
      const model = gltf.scene;
      wrapper.add(model);
      wrapper.scale.set(0.5, 0.5, 0.5);

      const goldMaterial = new THREE.MeshStandardMaterial({
        color: 0xEBCA67, // Strong gold tone
        metalness: 1.0,
        roughness: 0.,
        envMap: envMap,
        envMapIntensity: 1.2,
        combine: THREE.MixOperation,  // Mix base color and env map
        reflectivity: 1,
        clearcoat: 1.0,
        clearcoatRoughness: 0.5
      });

      const diamondMaterial = new THREE.MeshStandardMaterial({
        color: 0xB30000, 
        metalness: 0.8,
        roughness: 0.0,
        transparent: true,
        opacity: 0.925,
        side: THREE.DoubleSide,
        envMap: envMap,
        envMapIntensity: 2,
        reflectivity: 2.0,
        clearcoat: 1.0,
        clearcoatRoughness: 0.0
      });

      model.traverse((child) => {
        if (child.isMesh) {
          if (child.name === 'Object_3') {
            child.material = goldMaterial;
          } else if (child.name === 'Object_2') {
            child.material = diamondMaterial;
          }
        }
      });
    });
  });

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.15, 0.4, 0.2);
composer.addPass(bloomPass);

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

function animate() {
  requestAnimationFrame(animate);

  // Animate dust
  particles.rotation.y += 0.001;
  particles.children.forEach(p => {
    const time = Date.now() * 0.001;
    p.position.x += Math.sin(time + p.position.y) * 0.0003;
    p.position.y += Math.cos(time + p.position.z) * 0.0003;
    p.position.z += Math.sin(time + p.position.x) * 0.0003;
  });
  idleRotation += 0.002;
  wrapper.rotation.y = scrollAngle + idleRotation;
  composer.render();
}
animate();

window.addEventListener('resize', () => {
  const width = window.innerWidth;
  const height = window.innerHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
  composer.setSize(width, height);
  updateLayout();
});

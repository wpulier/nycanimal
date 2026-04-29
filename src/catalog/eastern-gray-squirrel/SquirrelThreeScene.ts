import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

type SquirrelThreeSceneOptions = {
  host: HTMLElement;
  modelUrl: string;
};

type SquirrelThreeScene = {
  dispose: () => void;
};

function disposeMaterial(material: THREE.Material) {
  for (const value of Object.values(material)) {
    if (value instanceof THREE.Texture) {
      value.dispose();
    }
  }

  material.dispose();
}

export function createSquirrelThreeScene({ host, modelUrl }: SquirrelThreeSceneOptions): SquirrelThreeScene {
  let frameId = 0;
  let disposed = false;
  let hasInteracted = false;

  const scene = new THREE.Scene();
  scene.background = null;

  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
  camera.position.set(0, 1.1, 5.6);

  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.style.touchAction = "none";
  renderer.domElement.setAttribute("aria-label", "Interactive 3D squirrel model");
  host.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = false;
  controls.enableZoom = true;
  controls.minDistance = 3.6;
  controls.maxDistance = 7;
  controls.rotateSpeed = 0.74;
  controls.zoomSpeed = 0.62;
  controls.target.set(0, 0, 0);
  controls.touches.ONE = THREE.TOUCH.ROTATE;
  controls.touches.TWO = THREE.TOUCH.DOLLY_ROTATE;

  const markInteracted = () => {
    hasInteracted = true;
  };
  controls.addEventListener("start", markInteracted);

  scene.add(new THREE.HemisphereLight(0xfff3d0, 0x3f5131, 2.2));

  const keyLight = new THREE.DirectionalLight(0xfff6d8, 2.8);
  keyLight.position.set(3, 4, 5);
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0x9fbf7e, 1.4);
  fillLight.position.set(-4, 2, 2);
  scene.add(fillLight);

  const perch = new THREE.Mesh(
    new THREE.CylinderGeometry(1.9, 2.2, 0.1, 48),
    new THREE.MeshStandardMaterial({ color: 0x6f8f4d, roughness: 0.92 }),
  );
  perch.position.y = -1.15;
  scene.add(perch);

  const modelRoot = new THREE.Group();
  scene.add(modelRoot);

  const resize = () => {
    const width = Math.max(host.clientWidth, 1);
    const height = Math.max(host.clientHeight, 1);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  };

  const observer = new ResizeObserver(resize);
  observer.observe(host);
  resize();

  new GLTFLoader().load(modelUrl, (gltf) => {
    if (disposed) return;

    const model = gltf.scene;
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxAxis = Math.max(size.x, size.y, size.z) || 1;

    model.position.sub(center);
    model.scale.multiplyScalar(2.5 / maxAxis);
    model.rotation.y = -0.38;
    modelRoot.add(model);
  });

  const animate = () => {
    if (!hasInteracted) {
      modelRoot.rotation.y = Math.sin(performance.now() * 0.00065) * 0.18;
    }

    perch.rotation.y += 0.002;
    controls.update();
    renderer.render(scene, camera);
    frameId = requestAnimationFrame(animate);
  };

  animate();

  return {
    dispose: () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      observer.disconnect();
      controls.removeEventListener("start", markInteracted);
      controls.dispose();

      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach(disposeMaterial);
        }
      });

      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}

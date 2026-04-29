"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import styles from "@/app/page.module.css";

export function SquirrelModelStage({ modelUrl }: { modelUrl: string }) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let frameId = 0;
    let disposed = false;
    const scene = new THREE.Scene();
    scene.background = null;

    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
    camera.position.set(0, 1.1, 5.6);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    host.appendChild(renderer.domElement);

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
      modelRoot.rotation.y = Math.sin(performance.now() * 0.00065) * 0.22;
      perch.rotation.y += 0.002;
      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      observer.disconnect();
      renderer.dispose();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((material) => material.dispose());
        }
      });
      renderer.domElement.remove();
    };
  }, [modelUrl]);

  return (
    <div className={styles.squirrelModelStage}>
      <div ref={hostRef} className={styles.squirrelModelCanvas} />
    </div>
  );
}

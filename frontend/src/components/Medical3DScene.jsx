import { useEffect, useRef } from "react";
import * as THREE from "three";

export default function Medical3DScene() {
  const mountRef = useRef(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. Scene setup
    const scene = new THREE.Scene();
    
    // 2. Camera setup
    const width = container.clientWidth || 300;
    const height = container.clientHeight || 300;
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    camera.position.z = 5.5;

    // 3. Renderer setup
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // 4. Main group (Static, zero animation)
    const mainGroup = new THREE.Group();
    scene.add(mainGroup);

    // 5. Central 3D Medical Core
    const coreGeometry = new THREE.TorusKnotGeometry(1.1, 0.28, 120, 16, 2, 3);
    const coreMaterial = new THREE.MeshPhongMaterial({
      color: 0x005A51,
      emissive: 0x002D28,
      specular: 0x38BDF8,
      shininess: 90,
      flatShading: false,
      wireframe: false,
    });
    const medicalCore = new THREE.Mesh(coreGeometry, coreMaterial);
    medicalCore.rotation.x = 0.4;
    medicalCore.rotation.y = 0.5;
    mainGroup.add(medicalCore);

    // 6. Outer Ring 1
    const ringGeometry = new THREE.TorusGeometry(2.1, 0.03, 16, 100);
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0x10B981,
      transparent: true,
      opacity: 0.7,
    });
    const pulseRing = new THREE.Mesh(ringGeometry, ringMaterial);
    pulseRing.rotation.x = Math.PI / 3;
    mainGroup.add(pulseRing);

    // Outer Ring 2
    const ring2Geometry = new THREE.TorusGeometry(2.3, 0.02, 16, 100);
    const ring2Material = new THREE.MeshBasicMaterial({
      color: 0x06B6D4,
      transparent: true,
      opacity: 0.5,
    });
    const pulseRing2 = new THREE.Mesh(ring2Geometry, ring2Material);
    pulseRing2.rotation.x = -Math.PI / 4;
    pulseRing2.rotation.y = Math.PI / 6;
    mainGroup.add(pulseRing2);

    // 7. Ambient Particle Field
    const particleCount = 180;
    const particleGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      const radius = 2.5 + Math.random() * 1.5;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);
    }

    particleGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    const particleMaterial = new THREE.PointsMaterial({
      color: 0x38BDF8,
      size: 0.06,
      transparent: true,
      opacity: 0.75,
    });

    const particleSystem = new THREE.Points(particleGeometry, particleMaterial);
    mainGroup.add(particleSystem);

    // 8. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambientLight);

    const pointLight1 = new THREE.PointLight(0x005A51, 3, 50);
    pointLight1.position.set(5, 5, 5);
    scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0x10B981, 2, 50);
    pointLight2.position.set(-5, -5, 3);
    scene.add(pointLight2);

    // 9. Single Render (No animation loop)
    renderer.render(scene, camera);

    // 10. Resize handler
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.render(scene, camera);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      coreGeometry.dispose();
      coreMaterial.dispose();
      ringGeometry.dispose();
      ringMaterial.dispose();
      ring2Geometry.dispose();
      ring2Material.dispose();
      particleGeometry.dispose();
      particleMaterial.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div className="w-full h-full min-h-[220px] sm:min-h-[260px] relative flex items-center justify-center select-none pointer-events-none">
      <div ref={mountRef} className="w-full h-full absolute inset-0" />
    </div>
  );
}

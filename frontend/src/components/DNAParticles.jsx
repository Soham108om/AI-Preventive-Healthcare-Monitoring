import { useEffect, useRef } from "react";
import * as THREE from "three";

export default function DNAParticles() {

  const mountRef = useRef(null);

  useEffect(() => {

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(
      60,
      mountRef.current.clientWidth / mountRef.current.clientHeight,
      0.1,
      1000
    );

    camera.position.z = 8;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });

    renderer.setSize(
      mountRef.current.clientWidth,
      mountRef.current.clientHeight
    );

    mountRef.current.appendChild(renderer.domElement);

    const particleCount = 400;

    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);

    const radius = 2;
    const height = 6;

    for (let i = 0; i < particleCount; i++) {

      const angle = i * 0.3;
      const y = (i / particleCount) * height - height / 2;

      const strand = i % 2 === 0 ? 1 : -1;

      const x = Math.cos(angle) * radius * strand;
      const z = Math.sin(angle) * radius;

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
    }

    geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(positions, 3)
    );

    const material = new THREE.PointsMaterial({
      color: "#38BDF8",
      size: 0.05,
      transparent: true,
      opacity: 0.8
    });

    const particles = new THREE.Points(geometry, material);

    scene.add(particles);

    let frameId;

    const animate = () => {

      particles.rotation.y += 0.003;

      renderer.render(scene, camera);

      frameId = requestAnimationFrame(animate);
    };

    animate();

    const handleResize = () => {

      const width = mountRef.current.clientWidth;
      const height = mountRef.current.clientHeight;

      renderer.setSize(width, height);

      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };

    window.addEventListener("resize", handleResize);

    return () => {

      cancelAnimationFrame(frameId);

      window.removeEventListener("resize", handleResize);

      mountRef.current.removeChild(renderer.domElement);
    };

  }, []);

  return (
    <div
      ref={mountRef}
      style={{
        width: "100%",
        height: "100%",
      }}
    />
  );
}
'use client';

import { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Points, PointMaterial, Float } from '@react-three/drei';
import * as THREE from 'three';

function Stars({ count = 5000 }) {
  const ref = useRef<THREE.Points>(null);

  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = 100 + Math.random() * 400;
      const theta = 2 * Math.PI * Math.random();
      const phi = Math.acos(2 * Math.random() - 1);
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);
    }
    return pos;
  }, [count]);

  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.x += 0.0002;
      ref.current.rotation.y += 0.0003;
    }
  });

  return (
    <Points ref={ref} positions={positions} stride={3} frustumCulled={false}>
      <PointMaterial
        transparent
        color="#ffffff"
        size={0.5}
        sizeAttenuation={true}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </Points>
  );
}

function TwinklingStar({ position, size = 0.1, color = '#ffffff' }: { position: [number, number, number], size?: number, color?: string }) {
  const ref = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (ref.current) {
      const t = state.clock.getElapsedTime();
      const scale = 0.5 + Math.sin(t * 2 + position[0]) * 0.3;
      ref.current.scale.setScalar(scale);
    }
  });

  return (
    <Float speed={1} rotationIntensity={0.2} floatIntensity={0.5}>
      <mesh ref={ref} position={position}>
        <sphereGeometry args={[size, 8, 8]} />
        <meshBasicMaterial color={color} transparent opacity={0.9} />
      </mesh>
    </Float>
  );
}

function Nebula() {
  const ref = useRef<THREE.Mesh>(null);

  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        color1: { value: new THREE.Color('#1a0a2e') },
        color2: { value: new THREE.Color('#16213e') },
        color3: { value: new THREE.Color('#0f3460') },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform vec3 color1;
        uniform vec3 color2;
        uniform vec3 color3;
        varying vec2 vUv;

        float noise(vec2 p) {
          return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
        }

        void main() {
          vec2 uv = vUv;
          float n = noise(uv * 10.0 + time * 0.1);
          vec3 color = mix(color1, color2, uv.x + n * 0.2);
          color = mix(color, color3, uv.y * 0.5);
          gl_FragColor = vec4(color, 1.0);
        }
      `,
      side: THREE.BackSide,
    });
  }, []);

  useFrame((state) => {
    if (ref.current) {
      material.uniforms.time.value = state.clock.getElapsedTime();
    }
  });

  return (
    <mesh ref={ref} material={material}>
      <sphereGeometry args={[500, 32, 32]} />
    </mesh>
  );
}

export default function StarField() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return <div className="fixed inset-0 z-0 bg-black" />;
  }

  return (
    <div className="fixed inset-0 z-0">
      <Canvas camera={{ position: [0, 0, 50], fov: 75 }}>
        <Nebula />
        <Stars count={8000} />
        <ambientLight intensity={0.2} />
      </Canvas>
    </div>
  );
}

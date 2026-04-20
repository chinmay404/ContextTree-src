"use client";

import React, { useRef, useMemo, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, RoundedBox, Sphere, MeshDistortMaterial } from "@react-three/drei";
import * as THREE from "three";

/* ──────────────────────────────────────────────────────────────────────────
   Floating Node - Represents a conversation node
   ──────────────────────────────────────────────────────────────────────── */

function FloatingNode({
  position,
  color,
  scale = 1,
  speed = 1,
}: {
  position: [number, number, number];
  color: string;
  scale?: number;
  speed?: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.3 * speed) * 0.1;
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.1 * speed;
    }
  });

  return (
    <Float speed={2 * speed} rotationIntensity={0.2} floatIntensity={0.5}>
      <RoundedBox
        ref={meshRef}
        position={position}
        scale={scale}
        args={[1, 0.65, 0.12]}
        radius={0.06}
        smoothness={4}
      >
        <meshStandardMaterial
          color={color}
          transparent
          opacity={0.85}
          roughness={0.2}
          metalness={0.1}
        />
      </RoundedBox>
    </Float>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   Connection Line - Animated bezier curve between nodes
   ──────────────────────────────────────────────────────────────────────── */

function ConnectionLine({
  start,
  end,
  color,
}: {
  start: [number, number, number];
  end: [number, number, number];
  color: string;
}) {
  const lineRef = useRef<THREE.Line>(null);

  const curve = useMemo(() => {
    return new THREE.CubicBezierCurve3(
      new THREE.Vector3(...start),
      new THREE.Vector3(start[0], (start[1] + end[1]) / 2 - 0.3, start[2]),
      new THREE.Vector3(end[0], (start[1] + end[1]) / 2 + 0.3, end[2]),
      new THREE.Vector3(...end)
    );
  }, [start, end]);

  const points = useMemo(() => curve.getPoints(24), [curve]);
  const geometry = useMemo(
    () => new THREE.BufferGeometry().setFromPoints(points),
    [points]
  );

  useFrame((state) => {
    if (lineRef.current) {
      const material = lineRef.current.material as THREE.LineBasicMaterial;
      material.opacity = 0.25 + Math.sin(state.clock.elapsedTime * 2) * 0.1;
    }
  });

  return (
    <line ref={lineRef} geometry={geometry}>
      <lineBasicMaterial color={color} transparent opacity={0.3} linewidth={2} />
    </line>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   Particle Field - Ambient floating particles
   ──────────────────────────────────────────────────────────────────────── */

function ParticleField({ count = 40 }: { count?: number }) {
  const particlesRef = useRef<THREE.Points>(null);

  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 10;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 8;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 5;
    }
    return pos;
  }, [count]);

  useFrame((state) => {
    if (particlesRef.current) {
      particlesRef.current.rotation.y = state.clock.elapsedTime * 0.015;
      particlesRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.08) * 0.03;
    }
  });

  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.03}
        color="#6366f1"
        transparent
        opacity={0.4}
        sizeAttenuation
      />
    </points>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   Central Sphere - Animated distorted sphere representing AI
   ──────────────────────────────────────────────────────────────────────── */

function CentralSphere() {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.15;
      meshRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.2) * 0.1;
    }
    if (glowRef.current) {
      const scale = 1.2 + Math.sin(state.clock.elapsedTime * 1.5) * 0.08;
      glowRef.current.scale.setScalar(scale);
    }
  });

  return (
    <group position={[0, 0, 0]}>
      {/* Inner sphere with distortion */}
      <Sphere ref={meshRef} args={[0.5, 32, 32]}>
        <MeshDistortMaterial
          color="#4f46e5"
          distort={0.3}
          speed={2}
          roughness={0.2}
          metalness={0.3}
        />
      </Sphere>
      {/* Outer glow */}
      <Sphere ref={glowRef} args={[0.5, 16, 16]} scale={1.2}>
        <meshBasicMaterial color="#818cf8" transparent opacity={0.08} />
      </Sphere>
    </group>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   Branch Structure - The main 3D tree visualization
   ──────────────────────────────────────────────────────────────────────── */

function BranchStructure() {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.15) * 0.08;
      groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.3) * 0.05;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Central AI sphere */}
      <CentralSphere />

      {/* Root node - top */}
      <FloatingNode position={[0, 1.8, 0]} color="#4f46e5" scale={0.85} speed={0.7} />

      {/* Branch A - left */}
      <FloatingNode position={[-1.4, -0.4, 0.4]} color="#06b6d4" scale={0.65} speed={1} />
      <FloatingNode position={[-2.1, -1.4, 0.6]} color="#06b6d4" scale={0.55} speed={0.85} />

      {/* Branch B - right */}
      <FloatingNode position={[1.4, -0.4, -0.4]} color="#a855f7" scale={0.65} speed={1.1} />
      <FloatingNode position={[2.1, -1.4, -0.6]} color="#a855f7" scale={0.55} speed={0.95} />

      {/* Connection lines */}
      <ConnectionLine start={[0, 1.5, 0]} end={[0, 0.6, 0]} color="#4f46e5" />
      <ConnectionLine start={[0, 0, 0]} end={[-1.4, -0.4, 0.4]} color="#06b6d4" />
      <ConnectionLine start={[0, 0, 0]} end={[1.4, -0.4, -0.4]} color="#a855f7" />
      <ConnectionLine start={[-1.4, -0.4, 0.4]} end={[-2.1, -1.4, 0.6]} color="#06b6d4" />
      <ConnectionLine start={[1.4, -0.4, -0.4]} end={[2.1, -1.4, -0.6]} color="#a855f7" />
    </group>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   Main Scene
   ──────────────────────────────────────────────────────────────────────── */

function Scene() {
  return (
    <>
      {/* Soft ambient lighting for light theme */}
      <ambientLight intensity={0.8} />
      <directionalLight position={[5, 8, 5]} intensity={0.6} color="#ffffff" />
      <directionalLight position={[-5, 3, -5]} intensity={0.3} color="#a855f7" />
      <pointLight position={[3, 3, 3]} intensity={0.2} color="#06b6d4" />

      <BranchStructure />
      <ParticleField count={50} />
    </>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   Exported Component
   ──────────────────────────────────────────────────────────────────────── */

export function Landing3DScene({ className }: { className?: string }) {
  return (
    <div className={className}>
      <Canvas
        camera={{ position: [0, 0, 6], fov: 40 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        style={{ background: "transparent" }}
      >
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
      </Canvas>
    </div>
  );
}

export default Landing3DScene;

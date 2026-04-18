"use client";

/**
 * KnowledgeTree3D — stylized branching tree for the landing hero.
 * Trunk → primary branches → secondary branches → nodes → drifting leaves.
 * Gentle sway, mouse parallax, scroll-tied camera rotation.
 * Respects prefers-reduced-motion.
 */

import React, { useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { CatmullRomLine, Float, Html, AdaptiveDpr } from "@react-three/drei";
import * as THREE from "three";
import { useReducedMotion } from "framer-motion";

const COLORS = {
  moss: "#2D5F3F",
  mossSoft: "#5B8A6D",
  amber: "#C97B2F",
  paper: "#FBF9F4",
  inkGlow: "#4338CA",
} as const;

type BranchSpec = {
  start: THREE.Vector3;
  end: THREE.Vector3;
  control: THREE.Vector3;
  radius: number;
};

function buildTree(): {
  trunk: BranchSpec;
  primaries: BranchSpec[];
  secondaries: BranchSpec[];
  nodePositions: THREE.Vector3[];
} {
  const trunk: BranchSpec = {
    start: new THREE.Vector3(0, 0, 0),
    end: new THREE.Vector3(0, 3, 0),
    control: new THREE.Vector3(0.05, 1.5, 0.05),
    radius: 0.08,
  };

  const primaries: BranchSpec[] = [0, 1, 2, 3].map((i) => {
    const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const yStart = 2.0 + i * 0.3;
    const reach = 1.8 + (i % 2) * 0.6;
    const yEnd = yStart + 1.0 + (i % 2) * 0.4;
    return {
      start: new THREE.Vector3(0, yStart, 0),
      end: new THREE.Vector3(
        Math.cos(angle) * reach,
        yEnd,
        Math.sin(angle) * reach
      ),
      control: new THREE.Vector3(
        Math.cos(angle) * reach * 0.5,
        yStart + 0.3,
        Math.sin(angle) * reach * 0.5
      ),
      radius: 0.04,
    };
  });

  const secondaries: BranchSpec[] = primaries.flatMap((p, i) => {
    const midpoint = p.start.clone().lerp(p.end, 0.6);
    const direction = p.end.clone().sub(p.start).normalize();
    const perpendicular = new THREE.Vector3()
      .crossVectors(direction, new THREE.Vector3(0, 1, 0))
      .normalize();
    return [
      {
        start: midpoint,
        end: midpoint
          .clone()
          .add(perpendicular.clone().multiplyScalar(0.8))
          .add(new THREE.Vector3(0, 0.4 + (i % 2) * 0.2, 0)),
        control: midpoint
          .clone()
          .add(perpendicular.clone().multiplyScalar(0.4))
          .add(new THREE.Vector3(0, 0.2, 0)),
        radius: 0.022,
      },
      {
        start: midpoint,
        end: midpoint
          .clone()
          .sub(perpendicular.clone().multiplyScalar(0.8))
          .add(new THREE.Vector3(0, 0.3 + (i % 2) * 0.25, 0)),
        control: midpoint
          .clone()
          .sub(perpendicular.clone().multiplyScalar(0.4))
          .add(new THREE.Vector3(0, 0.2, 0)),
        radius: 0.022,
      },
    ];
  });

  const nodePositions: THREE.Vector3[] = [
    ...primaries.map((b) => b.start),
    ...primaries.map((b) => b.end),
    ...secondaries.map((b) => b.end),
  ];

  return { trunk, primaries, secondaries, nodePositions };
}

function Branch({ spec, delay = 0 }: { spec: BranchSpec; delay?: number }) {
  const points = useMemo(() => {
    const curve = new THREE.QuadraticBezierCurve3(
      spec.start,
      spec.control,
      spec.end
    );
    return curve.getPoints(20);
  }, [spec]);

  const groupRef = useRef<THREE.Group>(null);
  const startTime = useRef<number | null>(null);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime();
    if (startTime.current === null) startTime.current = t + delay;
    const progress = Math.min(1, Math.max(0, (t - startTime.current) / 0.6));
    const eased = 1 - Math.pow(1 - progress, 3);
    groupRef.current.scale.setScalar(eased);
  });

  return (
    <group ref={groupRef}>
      <CatmullRomLine
        points={points}
        color={COLORS.moss}
        lineWidth={spec.radius * 40}
        transparent
        opacity={0.88}
      />
    </group>
  );
}

function Node({
  position,
  isActive = false,
  delay = 0,
  label,
}: {
  position: THREE.Vector3;
  isActive?: boolean;
  delay?: number;
  label?: string;
}) {
  const ref = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const startTime = useRef<number | null>(null);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime();

    if (startTime.current === null) startTime.current = t + delay;
    const intro = Math.min(1, Math.max(0, (t - startTime.current) / 0.4));
    const introScale = intro < 0.5 ? intro * 2 : 1.2 - (intro - 0.5) * 0.4;

    const pulse = isActive ? 1 + Math.sin(t * 2 + position.x * 3) * 0.08 : 1;
    const hoverScale = hovered ? 1.35 : 1;
    ref.current.scale.setScalar(introScale * pulse * hoverScale);

    ref.current.rotation.y = t * 0.2;
  });

  return (
    <mesh
      ref={ref}
      position={position}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
    >
      <sphereGeometry args={[0.09, 24, 24]} />
      <meshStandardMaterial
        color={COLORS.paper}
        emissive={isActive ? COLORS.amber : COLORS.mossSoft}
        emissiveIntensity={isActive ? 0.6 : 0.2}
        roughness={0.3}
        metalness={0.1}
      />
      {hovered && label && (
        <Html
          distanceFactor={8}
          position={[0.25, 0.1, 0]}
          style={{ pointerEvents: "none" }}
        >
          <div
            style={{
              background: "rgba(10, 14, 26, 0.92)",
              color: COLORS.paper,
              padding: "6px 10px",
              borderRadius: "6px",
              fontSize: "11px",
              fontFamily: "var(--font-geist-sans)",
              fontWeight: 500,
              whiteSpace: "nowrap",
              letterSpacing: "-0.01em",
            }}
          >
            {label}
          </div>
        </Html>
      )}
    </mesh>
  );
}

function Leaves({ count = 60 }: { count?: number }) {
  const pointsRef = useRef<THREE.Points>(null);

  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const radius = 1.5 + Math.random() * 1.5;
      const y = 2.5 + Math.random() * 1.5;
      arr[i * 3] = Math.cos(theta) * radius;
      arr[i * 3 + 1] = y;
      arr[i * 3 + 2] = Math.sin(theta) * radius;
    }
    return arr;
  }, [count]);

  useFrame(({ clock }) => {
    if (!pointsRef.current) return;
    const t = clock.getElapsedTime();
    const geom = pointsRef.current.geometry;
    const attr = geom.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < count; i++) {
      const ox = positions[i * 3];
      const oy = positions[i * 3 + 1];
      const oz = positions[i * 3 + 2];
      attr.setXYZ(
        i,
        ox + Math.sin(t * 0.4 + i) * 0.06,
        oy + Math.cos(t * 0.3 + i * 0.7) * 0.04,
        oz + Math.cos(t * 0.5 + i * 0.3) * 0.06
      );
    }
    attr.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.08}
        color={COLORS.inkGlow}
        transparent
        opacity={0.7}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

const TREE_LABELS = [
  "Main thread · Calculus",
  "Branch · Python impl.",
  "Branch · Real-world example",
  "Branch · Historical note",
  "Branch · Mathematical proof",
  "Branch · Related concept",
];

function TreeGroup({ reducedMotion }: { reducedMotion: boolean }) {
  const groupRef = useRef<THREE.Group>(null);
  const { trunk, primaries, secondaries, nodePositions } = useMemo(
    buildTree,
    []
  );

  useFrame(({ clock }) => {
    if (!groupRef.current || reducedMotion) return;
    const t = clock.getElapsedTime();
    groupRef.current.rotation.z = Math.sin(t * 0.3) * 0.015;
    groupRef.current.rotation.x = Math.cos(t * 0.25) * 0.01;
  });

  return (
    <group ref={groupRef} position={[0, -1.5, 0]}>
      <Branch spec={trunk} delay={0} />

      {primaries.map((p, i) => (
        <Branch key={`p-${i}`} spec={p} delay={0.4 + i * 0.12} />
      ))}

      {secondaries.map((s, i) => (
        <Branch key={`s-${i}`} spec={s} delay={0.9 + i * 0.08} />
      ))}

      {nodePositions.map((pos, i) => (
        <Node
          key={`n-${i}`}
          position={pos}
          isActive={i % 5 === 0}
          delay={1.3 + i * 0.04}
          label={TREE_LABELS[i % TREE_LABELS.length]}
        />
      ))}

      {!reducedMotion && <Leaves count={60} />}
    </group>
  );
}

function CameraRig({
  scrollProgress,
  reducedMotion,
}: {
  scrollProgress: React.MutableRefObject<number>;
  reducedMotion: boolean;
}) {
  const { camera, mouse } = useThree();
  const target = useMemo(() => new THREE.Vector3(0, 0.5, 0), []);

  useFrame(() => {
    if (reducedMotion) {
      camera.position.set(0, 1.5, 8);
      camera.lookAt(target);
      return;
    }

    const scrollAngle = scrollProgress.current * (Math.PI / 12);
    const baseZ = 8 + scrollProgress.current * 1.5;
    const baseX = Math.sin(scrollAngle) * baseZ;
    const baseZfinal = Math.cos(scrollAngle) * baseZ;

    const mouseX = mouse.x * 0.3;
    const mouseY = mouse.y * 0.2;

    camera.position.x += (baseX + mouseX - camera.position.x) * 0.06;
    camera.position.y += (1.5 + mouseY - camera.position.y) * 0.06;
    camera.position.z += (baseZfinal - camera.position.z) * 0.06;
    camera.lookAt(target);
  });

  return null;
}

export default function KnowledgeTree3D({
  scrollProgressRef,
  className,
}: {
  scrollProgressRef: React.MutableRefObject<number>;
  className?: string;
}) {
  const reducedMotion = useReducedMotion() ?? false;

  return (
    <div className={className} aria-hidden="true">
      <Canvas
        dpr={[1, 2]}
        camera={{ fov: 35, position: [0, 1.5, 15], near: 0.1, far: 50 }}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: "high-performance",
        }}
        style={{ background: "transparent" }}
      >
        <AdaptiveDpr pixelated={false} />
        <ambientLight intensity={0.4} color={COLORS.paper} />
        <directionalLight
          position={[5, 8, 5]}
          intensity={1.2}
          color="#ffffff"
          castShadow={false}
        />
        <pointLight position={[-3, 2, -5]} intensity={0.6} color={COLORS.amber} />

        <Float
          speed={reducedMotion ? 0 : 1.2}
          rotationIntensity={reducedMotion ? 0 : 0.08}
          floatIntensity={reducedMotion ? 0 : 0.2}
        >
          <TreeGroup reducedMotion={reducedMotion} />
        </Float>

        <CameraRig
          scrollProgress={scrollProgressRef}
          reducedMotion={reducedMotion}
        />
      </Canvas>
    </div>
  );
}

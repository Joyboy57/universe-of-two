"use client";
import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

export type SceneProps = {
  meDaylight: number;
  partnerDaylight: number | null;
  single?: boolean;
  still?: boolean;
  dust?: number;
};

const R = 1.9; // orbit radius
const NIGHT = new THREE.Color("#4a3f7c");
// Warm and bright in your daytime, cool and dim in your night
const tint = (base: string, daylight: number) =>
  NIGHT.clone().lerp(new THREE.Color(base), 0.3 + 0.7 * daylight);

function Body({ base, daylight, phase, speed, still }: {
  base: string; daylight: number; phase: number; speed: number; still: boolean;
}) {
  const group = useRef<THREE.Group>(null);
  const color = useMemo(() => tint(base, daylight), [base, daylight]);

  useFrame((state) => {
    const t = (still ? 0 : state.clock.elapsedTime) * speed + phase;
    group.current?.position.set(Math.cos(t) * R, 0, Math.sin(t) * R);
  });

  return (
    <group ref={group}>
      <mesh>
        <sphereGeometry args={[0.36, 48, 48]} />
        <meshPhysicalMaterial
          color={color} emissive={color} emissiveIntensity={0.15 + 0.55 * daylight}
          roughness={0.25} clearcoat={1} clearcoatRoughness={0.15}
        />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.62, 32, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.1 + 0.14 * daylight} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  );
}

function Dust({ count, still }: { count: number; still: boolean }) {
  const ref = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const a = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = 2.6 + Math.random() * 3.2;
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(2 * Math.random() - 1);
      a[i * 3] = r * Math.sin(ph) * Math.cos(th);
      a[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th) * 0.7;
      a[i * 3 + 2] = r * Math.cos(ph);
    }
    return a;
  }, [count]);

  useFrame((_, dt) => { if (ref.current && !still) ref.current.rotation.y += dt * 0.03; });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.04} color="#e8a0b4" transparent opacity={0.75} sizeAttenuation depthWrite={false} />
    </points>
  );
}

function World({ meDaylight, partnerDaylight, single, still = false, dust = 120 }: SceneProps) {
  const root = useRef<THREE.Group>(null);

  // Gentle parallax: the whole system leans toward your finger or cursor
  useFrame((state, dt) => {
    if (!root.current || still) return;
    root.current.rotation.y = THREE.MathUtils.damp(root.current.rotation.y, state.pointer.x * 0.4, 3, dt);
    root.current.rotation.x = THREE.MathUtils.damp(root.current.rotation.x, 0.85 - state.pointer.y * 0.25, 3, dt);
  });

  return (
    <group ref={root} rotation={[0.85, 0, 0.2]}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[R, 0.012, 8, 160]} />
        <meshBasicMaterial color="#e4b8c8" transparent opacity={0.7} />
      </mesh>

      <mesh>
        <sphereGeometry args={[0.13, 24, 24]} />
        <meshBasicMaterial color="#e8a0b4" />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.5, 32, 32]} />
        <meshBasicMaterial color="#e8a0b4" transparent opacity={0.16} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>

      <Body base="#e8a0b4" daylight={meDaylight} phase={0.6} speed={0.35} still={still} />
      {!single && <Body base="#b07a9a" daylight={partnerDaylight ?? 0.5} phase={0.6 + Math.PI} speed={0.35} still={still} />}
      <Dust count={dust} still={still} />
    </group>
  );
}

export default function UniverseScene(props: SceneProps) {
  return (
    <Canvas
      frameloop={props.still ? "demand" : "always"}
      dpr={[1, 1.75]}
      camera={{ position: [0, 0, 6.4], fov: 38 }}
      gl={{ alpha: true, antialias: true, powerPreference: "low-power" }}
      onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
      style={{ background: "transparent" }}
    >
      <ambientLight intensity={1.3} />
      <directionalLight position={[3, 4, 5]} intensity={2.4} />
      <World {...props} />
    </Canvas>
  );
}

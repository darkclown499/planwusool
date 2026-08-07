import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { ContactShadows, Environment, Lightformer, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';

export interface ParallaxMouse {
  x: number;
  y: number;
}

interface Device3DPhoneProps {
  mouseRef?: React.MutableRefObject<ParallaxMouse>;
  brandColor?: string;
  className?: string;
}

/** Body proportions matching the 428×926 live preview window (aspect ≈ 0.462). */
const BODY_W = 5;
const BODY_H = 10.8;
const BODY_D = 0.42;

function PhoneBody() {
  return (
    <group>
      {/* Titanium frame / chassis */}
      <RoundedBox args={[BODY_W, BODY_H, BODY_D]} radius={0.16} smoothness={8}>
        <meshPhysicalMaterial
          color="#9aa0aa"
          metalness={0.92}
          roughness={0.3}
          clearcoat={0.3}
          clearcoatRoughness={0.4}
          envMapIntensity={1.3}
        />
      </RoundedBox>

      {/* Dark screen plane — sits behind the live iframe (covers the whole front, bezel rim is the titanium body) */}
      <RoundedBox
        args={[BODY_W - 0.18, BODY_H - 0.18, 0.05]}
        radius={0.13}
        smoothness={8}
        position={[0, 0, BODY_D / 2 + 0.015]}
      >
        <meshPhysicalMaterial color="#05060b" roughness={0.35} metalness={0.15} envMapIntensity={0.6} />
      </RoundedBox>

      {/* Side buttons — titanium */}
      <mesh position={[BODY_W / 2 + 0.04, 1.15, 0.55]}>
        <boxGeometry args={[0.08, 0.3, 0.16]} />
        <meshPhysicalMaterial color="#c7cad0" metalness={0.95} roughness={0.3} />
      </mesh>
      <mesh position={[BODY_W / 2 + 0.04, 1.75, -0.05]}>
        <boxGeometry args={[0.08, 0.5, 0.16]} />
        <meshPhysicalMaterial color="#8a8e96" metalness={0.95} roughness={0.3} />
      </mesh>
      <mesh position={[BODY_W / 2 + 0.04, 2.4, 0.55]}>
        <boxGeometry args={[0.08, 0.3, 0.16]} />
        <meshPhysicalMaterial color="#c7cad0" metalness={0.95} roughness={0.3} />
      </mesh>
      <mesh position={[-BODY_W / 2 - 0.04, 1.85, 0.55]}>
        <boxGeometry args={[0.08, 0.62, 0.16]} />
        <meshPhysicalMaterial color="#c7cad0" metalness={0.95} roughness={0.3} />
      </mesh>
      <mesh position={[-BODY_W / 2 - 0.04, 2.4, -0.55]}>
        <boxGeometry args={[0.08, 0.3, 0.16]} />
        <meshPhysicalMaterial color="#8a8e96" metalness={0.95} roughness={0.3} />
      </mesh>
    </group>
  );
}

function Pedestal({ brandColor }: { brandColor: string }) {
  return (
    <group position={[0, -BODY_H / 2 - 0.14, 0]}>
      {/* Glass disc */}
      <mesh>
        <cylinderGeometry args={[3.55, 3.55, 0.16, 72]} />
        <meshPhysicalMaterial
          color="#ffffff"
          transmission={0.95}
          roughness={0.05}
          thickness={1.6}
          clearcoat={1}
          clearcoatRoughness={0.08}
          ior={1.5}
          envMapIntensity={1.5}
        />
      </mesh>
      {/* Glowing brand ring on the top edge */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.082, 0]}>
        <ringGeometry args={[3.38, 3.5, 72]} />
        <meshBasicMaterial color={brandColor} transparent opacity={0.65} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
    </group>
  );
}

function ParallaxRig({
  children,
  mouseRef,
}: {
  children: React.ReactNode;
  mouseRef: React.RefObject<ParallaxMouse>;
}) {
  const group = useRef<THREE.Group>(null);
  const smooth = useRef({ x: 0, y: 0 });

  useFrame(() => {
    const target = mouseRef.current ?? { x: 0, y: 0 };
    smooth.current.x += (target.y * -0.07 - smooth.current.x) * 0.08;
    smooth.current.y += (target.x * 0.09 - smooth.current.y) * 0.08;
    if (group.current) {
      group.current.rotation.x = smooth.current.x;
      group.current.rotation.y = smooth.current.y;
    }
  });

  return <group ref={group}>{children}</group>;
}

export default function Device3DPhone({ mouseRef, brandColor = '#10b77f', className = '' }: Device3DPhoneProps) {
  const fallback = useRef<ParallaxMouse>({ x: 0, y: 0 });
  const ref = mouseRef ?? (fallback as React.MutableRefObject<ParallaxMouse>);

  return (
    <div className={`pointer-events-none absolute inset-0 ${className}`} aria-hidden="true">
      <Canvas
        dpr={[1, 2]}
        gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
        camera={{ fov: 35, position: [1.6, 1.4, 18.6], near: 0.1, far: 100 }}
        onCreated={({ camera }) => camera.lookAt(0, 0, 0)}
        style={{ pointerEvents: 'none' }}
      >
        <ambientLight intensity={0.55} />
        <directionalLight position={[6, 8, 6]} intensity={2.2} />
        <directionalLight position={[-6, 2, -4]} intensity={0.6} color="#eef1f6" />
        <pointLight position={[-5, -3, 3]} intensity={10} color={brandColor} distance={16} />

        <ParallaxRig mouseRef={ref}>
          <PhoneBody />
          <Pedestal brandColor={brandColor} />
        </ParallaxRig>

        <ContactShadows position={[0, -BODY_H / 2 - 0.34, 0]} opacity={0.55} scale={13} blur={2.6} far={1.6} />

        <Environment resolution={256}>
          <group rotation={[-Math.PI / 3, 0, 0]}>
            <Lightformer intensity={2.2} rotation-x={Math.PI / 2} position={[0, 6, -9]} scale={[12, 12, 1]} />
            <Lightformer intensity={1.4} color="#ffffff" position={[-6, 1, -1]} rotation-y={Math.PI / 2} scale={[18, 0.2, 1]} />
            <Lightformer intensity={1.4} color={brandColor} position={[6, -1, -1]} rotation-y={-Math.PI / 2} scale={[18, 0.2, 1]} />
            <Lightformer intensity={0.9} color="#ffffff" position={[0, 0, 6]} scale={[9, 9, 1]} />
          </group>
        </Environment>
      </Canvas>
    </div>
  );
}

import { useRef, useState, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import * as THREE from "three";

interface PenaltyField3DProps {
  onDirectionSelect: (direction: "gauche" | "centre" | "droite") => void;
  isLocked: boolean;
  goalkeeperPosition?: "gauche" | "centre" | "droite";
}

function Field() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
      <planeGeometry args={[20, 30]} />
      <meshStandardMaterial color="#2d5a27" />
    </mesh>
  );
}

function Goal() {
  return (
    <group position={[0, 1.5, -12]}>
      {/* Poteaux */}
      <mesh position={[-3.5, 2, 0]}>
        <cylinderGeometry args={[0.1, 0.1, 4]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      <mesh position={[3.5, 2, 0]}>
        <cylinderGeometry args={[0.1, 0.1, 4]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      <mesh position={[-3.5, 0, 0]}>
        <cylinderGeometry args={[0.1, 0.1, 4]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      <mesh position={[3.5, 0, 0]}>
        <cylinderGeometry args={[0.1, 0.1, 4]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      {/* Barre transversale */}
      <mesh position={[0, 4, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.1, 0.1, 7.2]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      {/* Filet (simplifié) */}
      <mesh position={[0, 2, 0.5]}>
        <planeGeometry args={[7.2, 4]} />
        <meshStandardMaterial color="#ffffff" transparent opacity={0.3} />
      </mesh>
    </group>
  );
}

function Goalkeeper({ position }: { position: "gauche" | "centre" | "droite" }) {
  const groupRef = useRef<THREE.Group>(null);
  const targetX = position === "gauche" ? -2 : position === "droite" ? 2 : 0;
  
  useFrame((state, delta) => {
    if (groupRef.current) {
      groupRef.current.position.x = THREE.MathUtils.lerp(
        groupRef.current.position.x,
        targetX,
        delta * 5
      );
    }
  });

  return (
    <group ref={groupRef} position={[0, 0, -10]}>
      {/* Corps du gardien */}
      <mesh position={[0, 1, 0]}>
        <cylinderGeometry args={[0.3, 0.3, 1, 8]} />
        <meshStandardMaterial color="#ff6b35" />
      </mesh>
      {/* Tête */}
      <mesh position={[0, 1.8, 0]}>
        <sphereGeometry args={[0.25, 16, 16]} />
        <meshStandardMaterial color="#ffcc99" />
      </mesh>
      {/* Bras */}
      <mesh position={[-0.5, 1.2, 0]}>
        <cylinderGeometry args={[0.1, 0.1, 0.6, 8]} />
        <meshStandardMaterial color="#ff6b35" />
      </mesh>
      <mesh position={[0.5, 1.2, 0]}>
        <cylinderGeometry args={[0.1, 0.1, 0.6, 8]} />
        <meshStandardMaterial color="#ff6b35" />
      </mesh>
      {/* Jambes */}
      <mesh position={[-0.2, 0.3, 0]}>
        <cylinderGeometry args={[0.12, 0.12, 0.5, 8]} />
        <meshStandardMaterial color="#1a1a2e" />
      </mesh>
      <mesh position={[0.2, 0.3, 0]}>
        <cylinderGeometry args={[0.12, 0.12, 0.5, 8]} />
        <meshStandardMaterial color="#1a1a2e" />
      </mesh>
    </group>
  );
}

function Ball({ onShoot }: { onShoot: (direction: "gauche" | "centre" | "droite") => void }) {
  const ballRef = useRef<THREE.Mesh>(null);
  const [isShooting, setIsShooting] = useState(false);
  const [shootDirection, setShootDirection] = useState<"gauche" | "centre" | "droite">("centre");

  useFrame((state, delta) => {
    if (ballRef.current && isShooting) {
      const targetX = shootDirection === "gauche" ? -3 : shootDirection === "droite" ? 3 : 0;
      const targetZ = -12;
      
      ballRef.current.position.x = THREE.MathUtils.lerp(
        ballRef.current.position.x,
        targetX,
        delta * 3
      );
      ballRef.current.position.z = THREE.MathUtils.lerp(
        ballRef.current.position.z,
        targetZ,
        delta * 3
      );
      ballRef.current.position.y = THREE.MathUtils.lerp(
        ballRef.current.position.y,
        2,
        delta * 2
      );
      
      // Rotation du ballon
      ballRef.current.rotation.x += delta * 5;
      ballRef.current.rotation.z += delta * 3;
    }
  });

  const handleClick = () => {
    if (!isShooting) {
      setIsShooting(true);
      onShoot(shootDirection);
      setTimeout(() => {
        setIsShooting(false);
        if (ballRef.current) {
          ballRef.current.position.set(0, 0.5, 8);
        }
      }, 1500);
    }
  };

  return (
    <mesh ref={ballRef} position={[0, 0.5, 8]} onClick={handleClick}>
      <sphereGeometry args={[0.3, 32, 32]} />
      <meshStandardMaterial color="#ffffff" />
      {/* Lignes du ballon */}
      <mesh position={[0, 0, 0.31]}>
        <sphereGeometry args={[0.31, 32, 32]} />
        <meshStandardMaterial color="#000000" wireframe />
      </mesh>
    </mesh>
  );
}

function Scene({ onDirectionSelect, goalkeeperPosition }: { onDirectionSelect: (direction: "gauche" | "centre" | "droite") => void; goalkeeperPosition?: "gauche" | "centre" | "droite" }) {
  const [selectedDirection, setSelectedDirection] = useState<"gauche" | "centre" | "droite">("centre");

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      <Field />
      <Goal />
      <Goalkeeper position={goalkeeperPosition || "centre"} />
      <Ball onShoot={(dir) => {
        setSelectedDirection(dir);
        onDirectionSelect(dir);
      }} />
      
      {/* Indicateurs de direction */}
      <group position={[0, 0.5, 6]}>
        <mesh position={[-2, 0, 0]} onClick={() => setSelectedDirection("gauche")}>
          <sphereGeometry args={[0.2, 16, 16]} />
          <meshStandardMaterial color={selectedDirection === "gauche" ? "#4CAF50" : "#ffffff"} />
        </mesh>
        <mesh position={[0, 0, 0]} onClick={() => setSelectedDirection("centre")}>
          <sphereGeometry args={[0.2, 16, 16]} />
          <meshStandardMaterial color={selectedDirection === "centre" ? "#4CAF50" : "#ffffff"} />
        </mesh>
        <mesh position={[2, 0, 0]} onClick={() => setSelectedDirection("droite")}>
          <sphereGeometry args={[0.2, 16, 16]} />
          <meshStandardMaterial color={selectedDirection === "droite" ? "#4CAF50" : "#ffffff"} />
        </mesh>
      </group>
    </>
  );
}

export default function PenaltyField3D({ onDirectionSelect, isLocked, goalkeeperPosition }: PenaltyField3DProps) {
  return (
    <div className="w-full h-[400px] md:h-[500px] rounded-3xl overflow-hidden border-2 border-white/10 bg-gradient-to-br from-[#1a1a2e] to-[#0f3460]">
      <Canvas>
        <PerspectiveCamera makeDefault position={[0, 5, 15]} />
        <OrbitControls enableZoom={false} enablePan={false} maxPolarAngle={Math.PI / 2.5} />
        <Scene onDirectionSelect={onDirectionSelect} goalkeeperPosition={goalkeeperPosition} />
      </Canvas>
    </div>
  );
}

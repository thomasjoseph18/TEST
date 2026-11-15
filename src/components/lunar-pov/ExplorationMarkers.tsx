import { useRef } from 'react';
import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import type * as THREE from 'three';
import { ExplorationPoint } from '../../types';
import { EXPLORATION_POINTS } from '../../data/exploration';

interface MarkerConfig {
  id: string;
  position: [number, number, number];
  achievementId: string;
}

const MOON_MARKER_CONFIGS: MarkerConfig[] = [
  { id: 'moon-shackleton-rim',  position: [60,  0, -80],  achievementId: 'peak_light_scout' },
  { id: 'moon-psr-cold-trap',   position: [-70, 0, -60],  achievementId: 'cryo_ice_prospector' },
  { id: 'moon-apollo-11',       position: [20,  0, -120], achievementId: 'apollo_historian' },
  { id: 'moon-lunar-rover',     position: [-40, 0,  90],  achievementId: 'lunar_rover_driver' },
];

const MOON_POINTS = EXPLORATION_POINTS.filter((p) => p.destination === 'moon');

interface SingleMarkerProps {
  point: ExplorationPoint;
  position: [number, number, number];
  achievementId: string;
  isSelected: boolean;
  onSelectPoint: (pt: ExplorationPoint) => void;
  onUnlockAchievement?: (id: string, atSol?: number) => void;
}

function SingleMarker({
  point,
  position,
  achievementId,
  isSelected,
  onSelectPoint,
  onUnlockAchievement,
}: SingleMarkerProps) {
  const orbRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (orbRef.current) {
      orbRef.current.rotation.y += delta * 1.2;
      // Gentle float
      orbRef.current.position.y = Math.sin(Date.now() * 0.0015) * 0.3 + 2.6;
    }
  });

  const color = isSelected ? '#ffcc44' : '#00ccff';
  const emissive = isSelected ? '#ff9900' : '#0088cc';

  const handleClick = () => {
    onSelectPoint(point);
    if (onUnlockAchievement) {
      onUnlockAchievement(achievementId, undefined);
    }
  };

  return (
    <group position={position}>
      {/* Beacon pole */}
      <mesh>
        <boxGeometry args={[0.15, 4, 0.15]} />
        <meshStandardMaterial
          color={color}
          emissive={emissive}
          emissiveIntensity={1.5}
          metalness={0.6}
          roughness={0.3}
        />
      </mesh>

      {/* Base ring */}
      <mesh position={[0, 0.1, 0]}>
        <torusGeometry args={[0.8, 0.08, 8, 24]} />
        <meshStandardMaterial
          color={color}
          emissive={emissive}
          emissiveIntensity={1.0}
        />
      </mesh>

      {/* Pulsing orb on top */}
      <mesh ref={orbRef} position={[0, 2.6, 0]}>
        <sphereGeometry args={[0.45, 16, 16]} />
        <meshStandardMaterial
          color={color}
          emissive={emissive}
          emissiveIntensity={2.0}
          transparent
          opacity={0.9}
        />
      </mesh>

      {/* Point light at orb */}
      <pointLight
        position={[0, 2.6, 0]}
        color={color}
        intensity={isSelected ? 2.0 : 0.8}
        distance={15}
      />

      {/* Html label above orb */}
      <Html
        position={[0, 5.2, 0]}
        distanceFactor={12}
        occlude
        center
        style={{ pointerEvents: 'auto' }}
      >
        <div
          onClick={handleClick}
          style={{
            background: isSelected
              ? 'rgba(20,10,0,0.92)'
              : 'rgba(0,10,20,0.88)',
            border: `1.5px solid ${isSelected ? '#ffcc44' : '#00ccff'}`,
            borderRadius: '8px',
            padding: '6px 10px',
            cursor: 'pointer',
            userSelect: 'none',
            minWidth: '130px',
            textAlign: 'center',
            boxShadow: isSelected
              ? '0 0 12px rgba(255,180,0,0.6)'
              : '0 0 10px rgba(0,180,255,0.5)',
            transition: 'all 0.2s ease',
          }}
        >
          <div
            style={{
              color: isSelected ? '#ffcc44' : '#00ddff',
              fontFamily: 'monospace',
              fontSize: '10px',
              fontWeight: 'bold',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              marginBottom: '2px',
              lineHeight: 1.3,
            }}
          >
            {point.title}
          </div>
          <div
            style={{
              color: isSelected ? '#ffee99' : '#88eeff',
              fontFamily: 'monospace',
              fontSize: '9px',
              opacity: 0.85,
            }}
          >
            ▶ INSPECT SITE
          </div>
        </div>
      </Html>
    </group>
  );
}

interface ExplorationMarkersProps {
  onSelectPoint: (point: ExplorationPoint) => void;
  selectedPointId: string | null;
  onUnlockAchievement?: (id: string, atSol?: number) => void;
}

export function ExplorationMarkers({
  onSelectPoint,
  selectedPointId,
  onUnlockAchievement,
}: ExplorationMarkersProps) {
  return (
    <>
      {MOON_MARKER_CONFIGS.map((cfg) => {
        const point = MOON_POINTS.find((p) => p.id === cfg.id);
        if (!point) return null;
        return (
          <SingleMarker
            key={cfg.id}
            point={point}
            position={cfg.position}
            achievementId={cfg.achievementId}
            isSelected={selectedPointId === cfg.id}
            onSelectPoint={onSelectPoint}
            onUnlockAchievement={onUnlockAchievement}
          />
        );
      })}
    </>
  );
}

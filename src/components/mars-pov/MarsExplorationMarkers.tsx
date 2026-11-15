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

const MARS_MARKER_CONFIGS: MarkerConfig[] = [
  { id: 'mars-jezero-delta',       position: [-40, 0, -75], achievementId: 'paleolake_geologist' },
  { id: 'mars-moxie-station',      position: [ 65, 0, -55], achievementId: 'oxygen_alchemist' },
  { id: 'mars-dust-storm-basin',   position: [-60, 0,  85], achievementId: 'martian_meteorologist' },
  { id: 'mars-subsurface-glacier', position: [ 85, 0,  50], achievementId: 'martian_glaciologist' },
];

const MARS_POINTS = EXPLORATION_POINTS.filter((p) => p.destination === 'mars');

interface SingleMarsMarkerProps {
  point: ExplorationPoint;
  position: [number, number, number];
  achievementId: string;
  isSelected: boolean;
  onSelectPoint: (pt: ExplorationPoint) => void;
  onUnlockAchievement?: (id: string, atSol?: number) => void;
}

function SingleMarsMarker({
  point,
  position,
  achievementId,
  isSelected,
  onSelectPoint,
  onUnlockAchievement,
}: SingleMarsMarkerProps) {
  const orbRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (orbRef.current) {
      orbRef.current.rotation.y += delta * 1.0;
      orbRef.current.position.y = Math.sin(Date.now() * 0.0013) * 0.3 + 2.6;
    }
  });

  // Orange/amber glow for Mars (not cyan like Moon)
  const color   = isSelected ? '#ffcc44' : '#fb923c';
  const emissive = isSelected ? '#ff9900' : '#c2410c';

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

      {/* Html label */}
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
              ? 'rgba(20,8,0,0.92)'
              : 'rgba(20,6,0,0.88)',
            border: `1.5px solid ${isSelected ? '#ffcc44' : '#fb923c'}`,
            borderRadius: '8px',
            padding: '6px 10px',
            cursor: 'pointer',
            userSelect: 'none',
            minWidth: '130px',
            textAlign: 'center',
            boxShadow: isSelected
              ? '0 0 12px rgba(255,180,0,0.6)'
              : '0 0 10px rgba(251,146,60,0.5)',
            transition: 'all 0.2s ease',
          }}
        >
          <div
            style={{
              color: isSelected ? '#ffcc44' : '#fb923c',
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
              color: isSelected ? '#ffee99' : '#fed7aa',
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

interface MarsExplorationMarkersProps {
  onSelectPoint: (point: ExplorationPoint) => void;
  selectedPointId: string | null;
  onUnlockAchievement?: (id: string, atSol?: number) => void;
}

export function MarsExplorationMarkers({
  onSelectPoint,
  selectedPointId,
  onUnlockAchievement,
}: MarsExplorationMarkersProps) {
  return (
    <>
      {MARS_MARKER_CONFIGS.map((cfg) => {
        const point = MARS_POINTS.find((p) => p.id === cfg.id);
        if (!point) return null;
        return (
          <SingleMarsMarker
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

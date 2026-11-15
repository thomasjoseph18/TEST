import { useRef, useState, useEffect, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { PointerLockControls, KeyboardControls, useKeyboardControls } from '@react-three/drei';
import * as THREE from 'three';
import { MarsTerrain, marsHeight } from './MarsTerrain';
import { MarsSky } from './MarsSky';
import { MarsHabitatMesh } from './MarsHabitatMesh';
import { MarsExplorationMarkers } from './MarsExplorationMarkers';
import { ExplorationPoint } from '../../types';

const KEYBOARD_MAP = [
  { name: 'forward',  keys: ['ArrowUp',    'KeyW'] },
  { name: 'backward', keys: ['ArrowDown',  'KeyS'] },
  { name: 'left',     keys: ['ArrowLeft',  'KeyA'] },
  { name: 'right',    keys: ['ArrowRight', 'KeyD'] },
  { name: 'sprint',   keys: ['ShiftLeft',  'ShiftRight'] },
];

// Slightly lower walk speed — heavier suit on Mars
const WALK_SPEED   = 8;
const SPRINT_SPEED = 20;
const EYE_HEIGHT   = 1.75;

const _forward = new THREE.Vector3();
const _right   = new THREE.Vector3();

function CameraController({ _lowPerformanceMode: __unused }: { _lowPerformanceMode: boolean }) {
  const { camera } = useThree();
  const [, getKeys] = useKeyboardControls<string>();
  const initialised = useRef(false);

  useEffect(() => {
    if (!initialised.current) {
      const startX = 0;
      const startZ = 12;
      camera.position.set(startX, marsHeight(startX, startZ) + EYE_HEIGHT, startZ);
      initialised.current = true;
    }
  }, [camera]);

  useFrame((_, delta) => {
    const { forward, backward, left, right, sprint } = getKeys() as {
      forward: boolean; backward: boolean; left: boolean; right: boolean; sprint: boolean;
    };

    const speed = sprint ? SPRINT_SPEED : WALK_SPEED;
    const dt = Math.min(delta, 0.05);

    if (forward || backward || left || right) {
      camera.getWorldDirection(_forward);
      _forward.y = 0;
      _forward.normalize();
      _right.crossVectors(_forward, camera.up).normalize();

      if (forward)  camera.position.addScaledVector(_forward,  speed * dt);
      if (backward) camera.position.addScaledVector(_forward, -speed * dt);
      if (right)    camera.position.addScaledVector(_right,    speed * dt);
      if (left)     camera.position.addScaledVector(_right,   -speed * dt);
    }

    // Terrain-aware eye height
    const groundY = marsHeight(camera.position.x, camera.position.z);
    camera.position.y = groundY + EYE_HEIGHT;

    // Boundary clamp
    camera.position.x = Math.max(-185, Math.min(185, camera.position.x));
    camera.position.z = Math.max(-185, Math.min(185, camera.position.z));
  });

  return null;
}

interface MarsSurfaceSceneProps {
  lowPerformanceMode: boolean;
  onUnlockAchievement?: (id: string, atSol?: number) => void;
  onPointSelected: (point: ExplorationPoint | null) => void;
  onPointerLockChange?: (locked: boolean) => void;
}

export function MarsSurfaceScene({
  lowPerformanceMode,
  onUnlockAchievement,
  onPointSelected,
  onPointerLockChange,
}: MarsSurfaceSceneProps) {
  const [selectedPoint, setSelectedPoint] = useState<ExplorationPoint | null>(null);

  const handleSelectPoint = useCallback((pt: ExplorationPoint) => {
    setSelectedPoint(pt);
    onPointSelected(pt);
  }, [onPointSelected]);

  const handlePointerLock   = useCallback(() => { if (onPointerLockChange) onPointerLockChange(true);  }, [onPointerLockChange]);
  const handlePointerUnlock = useCallback(() => { if (onPointerLockChange) onPointerLockChange(false); }, [onPointerLockChange]);

  return (
    <KeyboardControls map={KEYBOARD_MAP}>
      <MarsSky lowPerformanceMode={lowPerformanceMode} />
      <MarsTerrain lowPerformanceMode={lowPerformanceMode} />
      <MarsHabitatMesh />
      <MarsExplorationMarkers
        onSelectPoint={handleSelectPoint}
        selectedPointId={selectedPoint?.id ?? null}
        onUnlockAchievement={onUnlockAchievement}
      />
      <CameraController _lowPerformanceMode={lowPerformanceMode} />
      <PointerLockControls
        makeDefault
        onLock={handlePointerLock}
        onUnlock={handlePointerUnlock}
      />
    </KeyboardControls>
  );
}

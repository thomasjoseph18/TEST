import { useRef, useState, useEffect, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { PointerLockControls, KeyboardControls, useKeyboardControls } from '@react-three/drei';
import * as THREE from 'three';
import { LunarTerrain, lunarHeight } from './LunarTerrain';
import { LunarSky } from './LunarSky';
import { HabitatMesh } from './HabitatMesh';
import { ExplorationMarkers } from './ExplorationMarkers';
import { ExplorationPoint } from '../../types';

const KEYBOARD_MAP = [
  { name: 'forward',  keys: ['ArrowUp',    'KeyW'] },
  { name: 'backward', keys: ['ArrowDown',  'KeyS'] },
  { name: 'left',     keys: ['ArrowLeft',  'KeyA'] },
  { name: 'right',    keys: ['ArrowRight', 'KeyD'] },
  { name: 'sprint',   keys: ['ShiftLeft',  'ShiftRight'] },
];

const WALK_SPEED   = 9;
const SPRINT_SPEED = 22;
const EYE_HEIGHT   = 1.75;

const _forward  = new THREE.Vector3();
const _right    = new THREE.Vector3();

function CameraController({ lowPerformanceMode: _lowPerformanceMode }: { lowPerformanceMode: boolean }) {
  const { camera } = useThree();
  const [, getKeys] = useKeyboardControls<string>();
  const initialised = useRef(false);

  useEffect(() => {
    if (!initialised.current) {
      // Start just outside the habitat landing pad, facing it
      const startX = 0;
      const startZ = 12;
      camera.position.set(startX, lunarHeight(startX, startZ) + EYE_HEIGHT, startZ);
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

    // Terrain-aware eye height: sample height function at current XZ
    const groundY = lunarHeight(camera.position.x, camera.position.z);
    camera.position.y = groundY + EYE_HEIGHT;

    // Boundary clamp — stay on terrain plane
    camera.position.x = Math.max(-185, Math.min(185, camera.position.x));
    camera.position.z = Math.max(-185, Math.min(185, camera.position.z));
  });

  return null;
}

interface LunarPOVSceneProps {
  lowPerformanceMode: boolean;
  onUnlockAchievement?: (id: string, atSol?: number) => void;
  onPointSelected: (point: ExplorationPoint | null) => void;
  onPointerLockChange?: (locked: boolean) => void;
}

export function LunarPOVScene({
  lowPerformanceMode,
  onUnlockAchievement,
  onPointSelected,
  onPointerLockChange,
}: LunarPOVSceneProps) {
  const [selectedPoint, setSelectedPoint] = useState<ExplorationPoint | null>(null);

  const handleSelectPoint = useCallback((pt: ExplorationPoint) => {
    setSelectedPoint(pt);
    onPointSelected(pt);
  }, [onPointSelected]);

  const handlePointerLock   = useCallback(() => { if (onPointerLockChange) onPointerLockChange(true);  }, [onPointerLockChange]);
  const handlePointerUnlock = useCallback(() => { if (onPointerLockChange) onPointerLockChange(false); }, [onPointerLockChange]);

  return (
    <KeyboardControls map={KEYBOARD_MAP}>
      <LunarSky lowPerformanceMode={lowPerformanceMode} />
      <LunarTerrain lowPerformanceMode={lowPerformanceMode} />
      <HabitatMesh />
      <ExplorationMarkers
        onSelectPoint={handleSelectPoint}
        selectedPointId={selectedPoint?.id ?? null}
        onUnlockAchievement={onUnlockAchievement}
      />
      <CameraController lowPerformanceMode={lowPerformanceMode} />
      <PointerLockControls
        makeDefault
        onLock={handlePointerLock}
        onUnlock={handlePointerUnlock}
      />
    </KeyboardControls>
  );
}

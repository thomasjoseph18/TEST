import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { Destination } from '../../types';
import { Planet, Starfield } from '../props';
import { AstronautFigure, NovaBot } from '../widgets';
import { audio } from '../audio';

/** Mission debrief backdrop: the world you just trained on, a slow camera drift, NOVA and a crewmate. */
export function DebriefScene({ destination, success, onReady }: { destination: Destination; success: boolean; onReady: () => void }) {
  const { scene, camera, gl } = useThree();
  const ready = useRef(0);
  useEffect(() => {
    scene.background = new THREE.Color('#010208');
    gl.toneMappingExposure = 1.1;
    audio.ambience('space');
    return () => { audio.ambience('none'); };
  }, [scene, gl]);
  useFrame((s) => {
    const t = s.clock.elapsedTime;
    camera.position.set(Math.sin(t * 0.08) * 3 - 6, 1.2 + Math.sin(t * 0.11) * 0.3, 12);
    camera.lookAt(-4.5, 0.2, 0);
    if (ready.current < 4 && ++ready.current === 4) onReady();
  });
  return (
    <>
      <ambientLight intensity={0.25} />
      <directionalLight position={[8, 4, 10]} intensity={3.2} color="#fff6e6" />
      <pointLight position={[-6, 0, 6]} intensity={success ? 30 : 8} color={success ? '#7dffc0' : '#ffb84a'} distance={30} />
      <Starfield count={1500} radius={400} size={1.8} />
      <Planet kind={destination} radius={7} position={[-9, -1, -6]} rotationSpeed={0.02} />
      <Planet kind="earth" radius={1.2} position={[6, 5, -22]} rotationSpeed={0.03} />
      <group position={[-2.2, -2.2, 5]}>
        <AstronautFigure position={[0, 0, 0]} rotY={0.5} />
        <NovaBot position={[1.4, 0.6, 0.2]} scale={1.1} />
      </group>
    </>
  );
}

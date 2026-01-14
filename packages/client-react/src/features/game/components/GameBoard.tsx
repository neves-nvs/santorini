import React, { Suspense, useRef, memo, useEffect } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera, OrthographicCamera } from "@react-three/drei";
import { OrthographicCamera as OrthoImpl, PerspectiveCamera as PerspImpl } from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import Board3D from "./Board3D";

interface DebugState {
  showAxis: boolean;
  showGrid: boolean;
  showWireframe: boolean;
  showStats: boolean;
  showBoundingBoxes: boolean;
  useSampleBoard: boolean;
}

export type CameraType = "perspective" | "orthographic";

interface GameBoardProps {
  debugState?: DebugState;
  onCellClick?: (x: number, y: number) => void;
  cameraType?: CameraType;
}

// Camera settings
const ORTHO_POSITION: [number, number, number] = [10, 10, 10];
const PERSP_POSITION: [number, number, number] = [6, 6, 6]; // Closer for perspective
const ORTHO_ZOOM = 1;
const PERSP_FOV = 50;
const BOARD_EXTENT = 3.5; // How much world space to fit (smaller = board fills more screen)

// Resize handler - adjusts cameras to fit board in viewport
const CameraResizeHandler: React.FC<{
  orthoRef: React.RefObject<OrthoImpl | null>;
  perspRef: React.RefObject<PerspImpl | null>;
  isOrtho: boolean;
}> = ({ orthoRef, perspRef, isOrtho }) => {
  const { size } = useThree();

  useEffect(() => {
    const aspect = size.width / size.height;

    // Adjust orthographic frustum
    if (orthoRef.current) {
      const cam = orthoRef.current;
      if (aspect >= 1) {
        cam.top = BOARD_EXTENT;
        cam.bottom = -BOARD_EXTENT;
        cam.left = -BOARD_EXTENT * aspect;
        cam.right = BOARD_EXTENT * aspect;
      } else {
        cam.left = -BOARD_EXTENT;
        cam.right = BOARD_EXTENT;
        cam.top = BOARD_EXTENT / aspect;
        cam.bottom = -BOARD_EXTENT / aspect;
      }
      cam.updateProjectionMatrix();
    }

    // Adjust perspective aspect
    if (perspRef.current) {
      perspRef.current.aspect = aspect;
      perspRef.current.updateProjectionMatrix();
    }
  }, [size, orthoRef, perspRef, isOrtho]);

  return null;
};

const GameBoard: React.FC<GameBoardProps> = memo(({ debugState, onCellClick, cameraType = "orthographic" }) => {
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const orthoRef = useRef<OrthoImpl | null>(null);
  const perspRef = useRef<PerspImpl | null>(null);
  const isOrtho = cameraType === "orthographic";

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        position: "fixed",
        top: 0,
        left: 0,
        zIndex: 0,
      }}
    >
      <Canvas shadows style={{ width: "100%", height: "100%" }}>
        <Suspense
          fallback={
            <mesh position={[0, 1, 0]}>
              <boxGeometry args={[1, 1, 1]} />
              <meshStandardMaterial color="#888888" />
            </mesh>
          }
        >
          {/* Resize handler */}
          <CameraResizeHandler orthoRef={orthoRef} perspRef={perspRef} isOrtho={isOrtho} />

          {/* Two cameras - only one is active via makeDefault */}
          <OrthographicCamera
            ref={orthoRef}
            makeDefault={isOrtho}
            position={ORTHO_POSITION}
            zoom={ORTHO_ZOOM}
            near={0.1}
            far={1000}
          />
          <PerspectiveCamera
            ref={perspRef}
            makeDefault={!isOrtho}
            position={PERSP_POSITION}
            fov={PERSP_FOV}
            near={0.1}
            far={1000}
          />

          {/* Lighting */}
          <ambientLight intensity={0.4} />
          <directionalLight
            position={[10, 10, 5]}
            intensity={1}
            castShadow
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
          />

          {/* Environment */}
          <color attach="background" args={["#87CEEB"]} />
          <hemisphereLight args={["#87CEEB", "#8B4513", 0.6]} />

          {/* 3D Board */}
          <Board3D debugState={debugState} onCellClick={onCellClick} />

          {/* Camera Controls */}
          <OrbitControls
            ref={controlsRef}
            enablePan={false}
            enableZoom={true}
            enableRotate={true}
            enableDamping={true}
            target={[0, 0, 0]}
            maxPolarAngle={Math.PI / 2.2}
            minZoom={isOrtho ? 0.5 : undefined}
            maxZoom={isOrtho ? 3 : undefined}
            minDistance={isOrtho ? undefined : 6}
            maxDistance={isOrtho ? undefined : 20}
          />
        </Suspense>
      </Canvas>
    </div>
  );
});

export default GameBoard;

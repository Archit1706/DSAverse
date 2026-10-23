"use client";

/* The WebGL half of <Scene3D>. Loaded with next/dynamic (ssr: false), so this
   module — and three.js with it — never runs on the server and never ships to
   a page that does not render a 3D scene. */

import React, { useEffect, useRef } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import * as P from './scene3d-primitives';
import { VIEW_DIRECTIONS } from './scene3d-views';

const ease = (t) => 1 - Math.pow(1 - t, 3);

/* Moves the camera to a snap view, or along its current line for zoom.
   Animated over ~350 ms; with frameloop="demand" each frame has to be asked
   for explicitly with invalidate(). */
function CameraRig({ view, viewNonce, zoom, distance }) {
    const { camera, controls, invalidate } = useThree();
    const zoomRef = useRef(zoom);
    zoomRef.current = zoom;

    const animateTo = (end) => {
        const start = camera.position.clone();
        const t0 = performance.now();
        let raf;
        const tick = (now) => {
            const t = Math.min((now - t0) / 350, 1);
            camera.position.lerpVectors(start, end, ease(t));
            if (controls) { controls.target.set(0, 0, 0); controls.update(); }
            else camera.lookAt(0, 0, 0);
            invalidate();
            if (t < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    };

    // Snap to a named view (re-snaps when the same button is pressed again).
    useEffect(() => {
        const dir = new THREE.Vector3(...VIEW_DIRECTIONS[view]).normalize();
        return animateTo(dir.multiplyScalar(distance / zoomRef.current));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [view, viewNonce, distance]);

    // Zoom keeps the current direction and changes only the distance.
    useEffect(() => {
        const dir = camera.position.clone().normalize();
        return animateTo(dir.multiplyScalar(distance / zoom));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [zoom]);

    return null;
}

export default function Scene3DCanvas({ children, view, viewNonce, zoom, distance, axisSize, grid }) {
    const start = new THREE.Vector3(...VIEW_DIRECTIONS[view]).normalize().multiplyScalar(distance / zoom);
    return (
        <Canvas
            frameloop="demand"
            dpr={[1, 2]}
            camera={{ position: start.toArray(), up: [0, 0, 1], fov: 42, near: 0.1, far: 500 }}
            onCreated={({ gl }) => { gl.setClearColor('#020617'); }}
            style={{ touchAction: 'none' }}
        >
            <ambientLight intensity={0.75} />
            <directionalLight position={[6, -4, 9]} intensity={0.9} />
            <directionalLight position={[-6, 5, -4]} intensity={0.25} />
            {/* Wheel-zoom is off on purpose: on a scrolling page it would hijack the
                scroll whenever the pointer crossed the canvas. Zoom has buttons. */}
            <OrbitControls makeDefault enableZoom={false} enablePan={false} rotateSpeed={0.8} />
            <CameraRig view={view} viewNonce={viewNonce} zoom={zoom} distance={distance} />
            {grid && <P.Grid3D size={axisSize} />}
            <P.Axes3D size={axisSize} />
            {typeof children === 'function' ? children(P) : children}
        </Canvas>
    );
}

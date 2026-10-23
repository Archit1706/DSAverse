"use client";

/* 3D building blocks for <Scene3D>. Pages never import this file: Scene3D
   hands these to the scene's render prop, so three.js and drei load only on
   the client, only when a 3D scene actually mounts.

   Coordinates are maths coordinates — x right, y away, z up — because the
   camera is set up with z as "up". Pass plain arrays: [x, y, z]. */

import React, { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { Line } from '@react-three/drei';

const v3 = (p) => new THREE.Vector3(p[0], p[1], p[2] ?? 0);
const Y_AXIS = new THREE.Vector3(0, 1, 0);

/**
 * Text pinned to a 3D point, always drawn on top.
 *
 * Rendered as a sprite with the text painted onto a canvas texture. drei's
 * <Html> was the first choice, but it mounts a separate React root per label
 * and unmounts it synchronously, which under React 19 throws "removeChild"
 * errors whenever a scene re-renders. drei's <Text> fetches its font from a
 * CDN. A canvas texture needs neither.
 */
export function Label3D({ at, children, color = '#cbd5e1', size = 12 }) {
    const text = String(children ?? '');
    const { texture, aspect } = useMemo(() => {
        const px = 64;
        const font = `600 ${px}px ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif`;
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        ctx.font = font;
        const w = Math.max(Math.ceil(ctx.measureText(text).width) + 20, 24);
        const h = px + 20;
        canvas.width = w;
        canvas.height = h;
        ctx.font = font;                       // resizing a canvas resets its state
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.lineJoin = 'round';
        ctx.lineWidth = 10;
        ctx.strokeStyle = '#020617';           // a dark halo keeps it legible over the shapes
        ctx.strokeText(text, w / 2, h / 2);
        ctx.fillStyle = color;
        ctx.fillText(text, w / 2, h / 2);
        const tex = new THREE.CanvasTexture(canvas);
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = 4;
        return { texture: tex, aspect: w / h };
    }, [text, color]);
    useEffect(() => () => texture.dispose(), [texture]);

    const height = size / 40;   // world units: the default 12 is about 0.3 tall
    return (
        <sprite position={at} scale={[height * aspect, height, 1]} renderOrder={10}>
            <spriteMaterial map={texture} transparent depthTest={false} depthWrite={false} />
        </sprite>
    );
}

/** The three axes, from -size to +size, with x / y / z labels. */
export function Axes3D({ size = 4, color = '#64748b', labels = true }) {
    return (
        <group>
            <Line points={[[-size, 0, 0], [size, 0, 0]]} color={color} lineWidth={1.5} />
            <Line points={[[0, -size, 0], [0, size, 0]]} color={color} lineWidth={1.5} />
            <Line points={[[0, 0, -size], [0, 0, size]]} color={color} lineWidth={1.5} />
            {labels && (
                <>
                    <Label3D at={[size + 0.35, 0, 0]} color="#94a3b8">x</Label3D>
                    <Label3D at={[0, size + 0.35, 0]} color="#94a3b8">y</Label3D>
                    <Label3D at={[0, 0, size + 0.35]} color="#94a3b8">z</Label3D>
                </>
            )}
        </group>
    );
}

/** A faint unit grid in the xy-plane, as one geometry rather than many lines. */
export function Grid3D({ size = 4, color = '#1e293b' }) {
    const geometry = useMemo(() => {
        const pts = [];
        for (let i = -size; i <= size; i++) {
            pts.push(-size, i, 0, size, i, 0);
            pts.push(i, -size, 0, i, size, 0);
        }
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
        return g;
    }, [size]);
    return (
        <lineSegments geometry={geometry}>
            <lineBasicMaterial color={color} />
        </lineSegments>
    );
}

/** A solid arrow (cylinder shaft + cone head) from `from` to `to`. */
export function Arrow3D({ from = [0, 0, 0], to, color = '#fbbf24', label, radius = 0.035, headLength = 0.28, headRadius = 0.09 }) {
    const { position, quaternion, shaftLength, length } = useMemo(() => {
        const a = v3(from), b = v3(to);
        const dir = b.clone().sub(a);
        const len = dir.length();
        const q = new THREE.Quaternion();
        if (len > 1e-9) q.setFromUnitVectors(Y_AXIS, dir.clone().normalize());
        return { position: a, quaternion: q, length: len, shaftLength: Math.max(len - headLength, 0) };
    }, [from, to, headLength]);

    if (length < 1e-6) return <Point3D at={from} color={color} />;
    const head = Math.min(headLength, length);
    return (
        <group position={position} quaternion={quaternion}>
            {shaftLength > 0 && (
                <mesh position={[0, shaftLength / 2, 0]}>
                    <cylinderGeometry args={[radius, radius, shaftLength, 12]} />
                    <meshStandardMaterial color={color} />
                </mesh>
            )}
            <mesh position={[0, length - head / 2, 0]}>
                <coneGeometry args={[headRadius, head, 16]} />
                <meshStandardMaterial color={color} />
            </mesh>
            {label && <Label3D at={[0, length + 0.3, 0]} color={color} size={14}>{label}</Label3D>}
        </group>
    );
}

export function Point3D({ at, color = '#fbbf24', size = 0.08, label }) {
    return (
        <group position={at}>
            <mesh>
                <sphereGeometry args={[size, 16, 16]} />
                <meshStandardMaterial color={color} />
            </mesh>
            {label && <Label3D at={[0.25, 0, 0.25]} color={color}>{label}</Label3D>}
        </group>
    );
}

/** A polyline through 3D points. */
export function Line3D({ points, color = '#94a3b8', width = 2, dashed = false }) {
    return <Line points={points} color={color} lineWidth={width} dashed={dashed} dashSize={0.15} gapSize={0.1} />;
}

/**
 * The plane n · x = d, drawn as a square of side `size` centred on the point
 * of the plane closest to the origin (or on `point`, if given).
 */
export function Plane3D({ normal, d = 0, point, size = 6, color = '#a78bfa', opacity = 0.22 }) {
    const { position, quaternion } = useMemo(() => {
        const n = v3(normal);
        const len = n.length() || 1;
        const unit = n.clone().divideScalar(len);
        const centre = point ? v3(point) : unit.clone().multiplyScalar(d / len);
        const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), unit);
        return { position: centre, quaternion: q };
    }, [normal, d, point]);
    return (
        <mesh position={position} quaternion={quaternion}>
            <planeGeometry args={[size, size]} />
            <meshStandardMaterial color={color} transparent opacity={opacity} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
    );
}

/** A flat polygon through 3D points (a triangle fan from the first point). */
export function Polygon3D({ points, color = '#facc15', opacity = 0.3, edges = true }) {
    const geometry = useMemo(() => {
        const pos = [];
        for (let i = 1; i < points.length - 1; i++) pos.push(...points[0], ...points[i], ...points[i + 1]);
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        g.computeVertexNormals();
        return g;
    }, [points]);
    return (
        <group>
            <mesh geometry={geometry}>
                <meshStandardMaterial color={color} transparent opacity={opacity} side={THREE.DoubleSide} depthWrite={false} />
            </mesh>
            {edges && <Line points={[...points, points[0]]} color={color} lineWidth={1.5} />}
        </group>
    );
}

/**
 * The parallelepiped spanned by a, b and c from `origin`. Its volume is
 * |det [a b c]|, which is why the Determinant page uses it.
 */
export function Parallelepiped({ a, b, c, origin = [0, 0, 0], color = '#a78bfa', opacity = 0.28, edgeColor }) {
    const { geometry, edgePoints } = useMemo(() => {
        const o = v3(origin), A = v3(a), B = v3(b), C = v3(c);
        const p = [
            o.clone(),                                  // 0
            o.clone().add(A),                           // 1
            o.clone().add(B),                           // 2
            o.clone().add(A).add(B),                    // 3
            o.clone().add(C),                           // 4
            o.clone().add(A).add(C),                    // 5
            o.clone().add(B).add(C),                    // 6
            o.clone().add(A).add(B).add(C),             // 7
        ];
        const faces = [[0, 1, 3, 2], [4, 5, 7, 6], [0, 1, 5, 4], [2, 3, 7, 6], [0, 2, 6, 4], [1, 3, 7, 5]];
        const pos = [];
        for (const [i, j, k, l] of faces) {
            pos.push(...p[i].toArray(), ...p[j].toArray(), ...p[k].toArray());
            pos.push(...p[i].toArray(), ...p[k].toArray(), ...p[l].toArray());
        }
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        g.computeVertexNormals();
        const E = [[0, 1], [0, 2], [0, 4], [1, 3], [1, 5], [2, 3], [2, 6], [3, 7], [4, 5], [4, 6], [5, 7], [6, 7]];
        const segs = E.flatMap(([i, j]) => [p[i].toArray(), p[j].toArray()]);
        return { geometry: g, edgePoints: segs };
    }, [a, b, c, origin]);
    return (
        <group>
            <mesh geometry={geometry}>
                <meshStandardMaterial color={color} transparent opacity={opacity} side={THREE.DoubleSide} depthWrite={false} />
            </mesh>
            <Line points={edgePoints} segments color={edgeColor ?? color} lineWidth={1.5} />
        </group>
    );
}

/**
 * z = f(x, y) over a rectangle, coloured from `low` to `high` by height.
 * Optional wireframe overlay makes the shape readable when it is shallow.
 */
export function Surface3D({ f, xRange = [-3, 3], yRange = [-3, 3], segments = 48, low = '#1d4ed8', high = '#f59e0b', opacity = 0.9, wireframe = true }) {
    const geometry = useMemo(() => {
        const [x0, x1] = xRange, [y0, y1] = yRange;
        const n = segments;
        const pos = [], col = [], idx = [];
        let zMin = Infinity, zMax = -Infinity;
        const zs = [];
        for (let i = 0; i <= n; i++) {
            for (let j = 0; j <= n; j++) {
                const x = x0 + ((x1 - x0) * i) / n;
                const y = y0 + ((y1 - y0) * j) / n;
                const z = f(x, y);
                const zz = Number.isFinite(z) ? z : 0;
                zs.push(zz);
                zMin = Math.min(zMin, zz); zMax = Math.max(zMax, zz);
                pos.push(x, y, zz);
            }
        }
        const cLow = new THREE.Color(low), cHigh = new THREE.Color(high);
        for (const z of zs) {
            const t = zMax > zMin ? (z - zMin) / (zMax - zMin) : 0.5;
            const c = cLow.clone().lerp(cHigh, t);
            col.push(c.r, c.g, c.b);
        }
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                const a = i * (n + 1) + j, b = a + 1, c = a + (n + 1), d = c + 1;
                idx.push(a, c, b, b, c, d);
            }
        }
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
        g.setIndex(idx);
        g.computeVertexNormals();
        return g;
    }, [f, xRange, yRange, segments, low, high]);
    return (
        <group>
            <mesh geometry={geometry}>
                <meshStandardMaterial vertexColors transparent opacity={opacity} side={THREE.DoubleSide} />
            </mesh>
            {wireframe && (
                <mesh geometry={geometry}>
                    <meshBasicMaterial color="#0f172a" wireframe transparent opacity={0.35} />
                </mesh>
            )}
        </group>
    );
}

export { THREE };

"use client";

import React, { Component, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Box, Plus, Minus, RotateCcw } from 'lucide-react';
import { VIEW_LABELS } from './scene3d-views';

const Canvas3D = dynamic(() => import('./Scene3DCanvas'), {
    ssr: false,
    loading: () => <Placeholder text="Loading 3D view…" />,
});

function Placeholder({ text, children }) {
    return (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center px-6">
            <Box className="h-6 w-6 text-slate-600" />
            <p className="text-sm text-slate-400">{text}</p>
            {children}
        </div>
    );
}

/* WebGL can be missing (old hardware, some locked-down machines) or fail at
   context creation. Either way the page should still teach. */
class CanvasBoundary extends Component {
    constructor(props) { super(props); this.state = { failed: false }; }
    static getDerivedStateFromError() { return { failed: true }; }
    componentDidCatch() { /* the fallback says what happened */ }
    render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

function useWebGLSupport() {
    const [ok, setOk] = useState(null);   // null until checked on the client
    useEffect(() => {
        try {
            const c = document.createElement('canvas');
            setOk(Boolean(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl'))));
        } catch {
            setOk(false);
        }
    }, []);
    return ok;
}

/**
 * An orbitable 3D scene in maths coordinates (x right, y away, z up).
 *
 *   <Scene3D ariaLabel="…" fallback={<p>Volume = 6</p>}>
 *       {(P) => (
 *           <>
 *               <P.Arrow3D to={[1, 0, 0]} color={MATH_COLORS.i} label="î" />
 *               <P.Parallelepiped a={[1,0,0]} b={[0,1,0]} c={[0,0,1]} />
 *           </>
 *       )}
 *   </Scene3D>
 *
 * The children are a function that receives the primitives (Arrow3D, Point3D,
 * Line3D, Label3D, Plane3D, Polygon3D, Parallelepiped, Surface3D, Axes3D,
 * Grid3D, THREE). Passing them in, rather than having pages import them, is
 * what keeps three.js out of the server bundle and off every non-3D page.
 * Plain R3F elements (<mesh>, <meshStandardMaterial>) also work in there.
 *
 * Drag rotates. Iso / Top / Front / Side snap the camera; + / − zoom. Wheel
 * zoom is deliberately off so the page still scrolls over the canvas.
 */
export default function Scene3D({
    children,
    height = 380,
    initialView = 'iso',
    distance = 11,
    axisSize = 4,
    grid = true,
    fallback,
    ariaLabel = '3D view',
    className = '',
}) {
    const webgl = useWebGLSupport();
    const [view, setView] = useState(initialView);
    const [viewNonce, setViewNonce] = useState(0);
    const [zoom, setZoom] = useState(1);

    const snap = (v) => { setView(v); setViewNonce(n => n + 1); };
    const fallbackNode = (
        <Placeholder text="This 3D view needs WebGL, which is not available in this browser. The numbers alongside show the same result.">
            {fallback}
        </Placeholder>
    );

    return (
        <div
            role="img"
            aria-label={ariaLabel}
            className={`relative rounded-lg border border-slate-700/60 bg-[#020617] overflow-hidden ${className}`}
            style={{ height }}
        >
            {webgl === null ? null : webgl === false ? fallbackNode : (
                <CanvasBoundary fallback={fallbackNode}>
                    <Canvas3D view={view} viewNonce={viewNonce} zoom={zoom} distance={distance} axisSize={axisSize} grid={grid}>
                        {children}
                    </Canvas3D>
                </CanvasBoundary>
            )}

            {webgl && (
                <>
                    <div className="absolute top-2 right-2 flex flex-wrap justify-end gap-1">
                        {Object.entries(VIEW_LABELS).map(([key, label]) => (
                            <button key={key} type="button" onClick={() => snap(key)}
                                aria-pressed={view === key}
                                className={`text-[11px] px-2 py-1 rounded-md border transition-colors ${view === key
                                    ? 'bg-white/15 border-white/25 text-white'
                                    : 'bg-slate-900/80 border-slate-700 text-slate-400 hover:text-slate-200'}`}>
                                {label}
                            </button>
                        ))}
                    </div>
                    <div className="absolute bottom-2 right-2 flex gap-1">
                        <button type="button" aria-label="Zoom in" onClick={() => setZoom(z => Math.min(z * 1.25, 4))}
                            className="p-1.5 rounded-md bg-slate-900/80 border border-slate-700 text-slate-300 hover:text-white">
                            <Plus className="h-3.5 w-3.5" />
                        </button>
                        <button type="button" aria-label="Zoom out" onClick={() => setZoom(z => Math.max(z / 1.25, 0.4))}
                            className="p-1.5 rounded-md bg-slate-900/80 border border-slate-700 text-slate-300 hover:text-white">
                            <Minus className="h-3.5 w-3.5" />
                        </button>
                        <button type="button" aria-label="Reset view" onClick={() => { setZoom(1); snap(initialView); }}
                            className="p-1.5 rounded-md bg-slate-900/80 border border-slate-700 text-slate-300 hover:text-white">
                            <RotateCcw className="h-3.5 w-3.5" />
                        </button>
                    </div>
                    <p className="absolute bottom-2 left-3 text-[10px] text-slate-500 pointer-events-none">
                        Drag to rotate
                    </p>
                </>
            )}
        </div>
    );
}

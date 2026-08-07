"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Play, Pause, SkipBack, SkipForward, RotateCcw, Info,
    Box, Fingerprint, FolderTree, Network, Gauge, Layers3, Zap, Server,
} from 'lucide-react';

// ── Acts ──────────────────────────────────────────────────────────────────────
const ACTS = [
    { id: 1, label: 'Just a Process', icon: Box         },
    { id: 2, label: 'PID Namespace',  icon: Fingerprint },
    { id: 3, label: 'Mount NS',       icon: FolderTree  },
    { id: 4, label: 'Net · UTS · User', icon: Network   },
    { id: 5, label: 'cgroups',        icon: Gauge       },
    { id: 6, label: 'Layers',         icon: Layers3     },
    { id: 7, label: 'Build Cache',    icon: Zap         },
    { id: 8, label: 'vs VMs',         icon: Server      },
];

// ── Kernel feature chips (persistent) ──────────────────────────────────────────
const KERNEL_CHIPS = [
    { id: 'pid',  label: 'pid ns' },
    { id: 'mnt',  label: 'mnt ns' },
    { id: 'net',  label: 'net ns' },
    { id: 'uts',  label: 'uts ns' },
    { id: 'user', label: 'user ns' },
    { id: 'cg',   label: 'cgroups' },
    { id: 'ovl',  label: 'overlayfs' },
];

// ── Persistent stage: the two views, one kernel ────────────────────────────────
function HostStage({ step }) {
    const rows = (list, x, w, tone) => (list || []).map((r, i) => (
        <g key={r.k} className="ct-row" style={{ opacity: 1, transitionDelay: `${i * 45}ms` }}>
            <text x={x + 14} y={122 + i * 26} fontSize="10" fill="#64748b" fontFamily="monospace">{r.k}</text>
            <text x={x + w - 14} y={122 + i * 26} textAnchor="end" fontSize="10.5" fontFamily="monospace"
                fill={r.hot ? tone : '#cbd5e1'}>{r.v}</text>
        </g>
    ));

    return (
        <svg viewBox="0 0 760 430" width="100%" className="max-h-[430px] select-none">
            <style>{`
                .ct-box { transition: fill .4s ease, stroke .4s ease, stroke-width .35s ease; }
                .ct-row { transition: opacity .4s ease, fill .4s ease; }
                .ct-fade { transition: opacity .5s ease; }
                .ct-flow { stroke-dasharray: 6 5; animation: ctdash .6s linear infinite; }
                @keyframes ctdash { to { stroke-dashoffset: -22; } }
            `}</style>

            {step.heading && (
                <text x="380" y="26" textAnchor="middle" fontSize="12" fill="#94a3b8" fontFamily="monospace">{step.heading}</text>
            )}

            {/* ── Inside the container ── */}
            <rect x="44" y="44" width="320" height="238" rx="11" className="ct-box"
                fill="#0b1120" stroke={step.focus === 'inside' ? '#22c55e' : '#334155'}
                strokeWidth={step.focus === 'inside' ? 2.2 : 1.4} />
            <text x="60" y="66" fontSize="10" fontWeight="bold" fill="#4ade80" fontFamily="monospace">inside the container</text>
            <text x="60" y="82" fontSize="8.5" fill="#475569" fontFamily="monospace">what the process believes</text>
            <line x1="58" y1="94" x2="350" y2="94" stroke="#1e293b" strokeWidth="1" />
            {rows(step.inside, 44, 320, '#4ade80')}

            {/* ── On the host ── */}
            <rect x="396" y="44" width="320" height="238" rx="11" className="ct-box"
                fill="#0b1120" stroke={step.focus === 'host' ? '#f59e0b' : '#334155'}
                strokeWidth={step.focus === 'host' ? 2.2 : 1.4} />
            <text x="412" y="66" fontSize="10" fontWeight="bold" fill="#fbbf24" fontFamily="monospace">on the host</text>
            <text x="412" y="82" fontSize="8.5" fill="#475569" fontFamily="monospace">what is actually true</text>
            <line x1="410" y1="94" x2="702" y2="94" stroke="#1e293b" strokeWidth="1" />
            {rows(step.outside, 396, 320, '#fbbf24')}

            {/* the namespace "lens" between the two views */}
            {step.lens && (
                <g className="ct-fade">
                    <ellipse cx="380" cy="163" rx="17" ry="58" fill="#1e1b4b" stroke="#818cf8" strokeWidth="1.8" opacity="0.9" />
                    <text x="380" y="160" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#c7d2fe" fontFamily="monospace">ns</text>
                    <text x="380" y="174" textAnchor="middle" fontSize="7.5" fill="#818cf8" fontFamily="monospace">lens</text>
                </g>
            )}

            {/* ── Shared kernel ── */}
            <rect x="44" y="298" width="672" height="52" rx="10" className="ct-box"
                fill={step.focus === 'kernel' ? '#3f3f46' : '#1a1420'}
                stroke={step.focus === 'kernel' ? '#e4e4e7' : '#7f1d1d'} strokeWidth={step.focus === 'kernel' ? 2.2 : 1.5} />
            <text x="60" y="318" fontSize="10.5" fontWeight="bold" fill="#fca5a5" fontFamily="monospace">one shared Linux kernel</text>
            {KERNEL_CHIPS.map((c, i) => {
                const on = (step.chips || []).includes(c.id);
                return (
                    <g key={c.id} className="ct-box">
                        <rect x={196 + i * 74} y={306} width={68} height={20} rx="5"
                            fill={on ? '#7c2d12' : '#111827'} stroke={on ? '#f59e0b' : '#334155'} strokeWidth={on ? 1.6 : 1} />
                        <text x={230 + i * 74} y={320} textAnchor="middle" fontSize="8.5"
                            fill={on ? '#fed7aa' : '#475569'} fontFamily="monospace">{c.label}</text>
                    </g>
                );
            })}
            <text x="60" y="340" fontSize="8.5" fill="#7f1d1d" fontFamily="monospace">
                every container on this box runs on this one kernel — there is no second one
            </text>

            {/* ── Hardware ── */}
            <rect x="44" y="362" width="672" height="36" rx="9" fill="#020617" stroke="#334155" strokeWidth="1.3" />
            <text x="380" y="385" textAnchor="middle" fontSize="10" fill="#475569" fontFamily="monospace">hardware — CPU · RAM · disk · NIC</text>
        </svg>
    );
}

// ── Act 5: cgroup meters ───────────────────────────────────────────────────────
function CgroupScene({ level, oom }) {
    const meters = [
        { name: 'memory.max', used: oom ? 512 : 310, limit: 512, unit: 'MB', color: oom ? '#ef4444' : '#22c55e' },
        { name: 'cpu.max', used: 50, limit: 100, unit: '% of 1 core', color: '#38bdf8' },
        { name: 'pids.max', used: 24, limit: 100, unit: 'processes', color: '#a78bfa' },
    ];
    return (
        <div className="w-full py-2 font-mono">
            <div className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold mb-4">
                namespaces control what a process can <span className="text-slate-300">see</span> · cgroups control what it can <span className="text-slate-300">use</span>
            </div>
            <div className="space-y-5">
                {meters.map((m, i) => (
                    <div key={m.name} className="transition-opacity duration-500" style={{ opacity: i < level ? 1 : 0.12 }}>
                        <div className="flex justify-between text-xs mb-1.5">
                            <span className="text-slate-300">{m.name}</span>
                            <span style={{ color: m.color }}>{m.used} / {m.limit} {m.unit}</span>
                        </div>
                        <div className="h-6 rounded-lg bg-slate-900/70 border border-slate-800 overflow-hidden">
                            <div className="h-full rounded-lg transition-all duration-700"
                                style={{ width: `${(m.used / m.limit) * 100}%`, background: m.color, transitionDelay: `${i * 120}ms` }} />
                        </div>
                    </div>
                ))}
            </div>

            <div className={`mt-6 rounded-xl border p-4 transition-opacity duration-500 ${oom ? 'opacity-100 border-red-500/50 bg-red-500/5' : 'opacity-0 border-slate-800'}`}>
                <div className="text-red-400 text-sm mb-1">memory limit reached → the kernel OOM-kills the process</div>
                <div className="text-[11px] text-slate-500 leading-relaxed">
                    exit code 137 (128 + SIGKILL). Note what does <span className="text-slate-300">not</span> happen: the container is not
                    politely asked to free memory, and the host is not affected. The cgroup is a hard ceiling enforced by the kernel.
                </div>
            </div>
        </div>
    );
}

// ── Act 6: image layers ────────────────────────────────────────────────────────
const LAYERS = [
    { id: 0, cmd: 'FROM debian:12-slim', size: '74 MB', ro: true },
    { id: 1, cmd: 'RUN apt-get install -y curl', size: '18 MB', ro: true },
    { id: 2, cmd: 'COPY package.json .', size: '4 KB', ro: true },
    { id: 3, cmd: 'RUN npm install', size: '112 MB', ro: true },
    { id: 4, cmd: 'COPY . .', size: '2 MB', ro: true },
];
function LayerScene({ level, cow }) {
    return (
        <div className="w-full py-2 font-mono">
            <div className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold mb-3">
                an image is a stack of read-only layers, union-mounted into one filesystem
            </div>

            {/* writable layer on top */}
            <div className={`rounded-xl border-2 border-dashed px-4 py-2.5 mb-1.5 transition-all duration-500 ${
                level >= 6 ? 'opacity-100 border-green-500/70 bg-green-500/10' : 'opacity-10 border-slate-700'
            }`}>
                <div className="flex justify-between items-center">
                    <span className="text-green-300 text-xs">container writable layer</span>
                    <span className="text-[10px] text-slate-500">read-write · discarded when the container is removed</span>
                </div>
                {cow && (
                    <div className="text-[11px] text-amber-300 mt-1.5">
                        writing /app/config.json → copied up from layer 4 first (copy-on-write)
                    </div>
                )}
            </div>

            {[...LAYERS].reverse().map((l, idx) => {
                const i = LAYERS.length - 1 - idx;
                return (
                    <div key={l.id} className="rounded-lg border px-4 py-2 mb-1.5 transition-all duration-500 border-slate-700/70 bg-slate-900/50"
                        style={{ opacity: i < level ? 1 : 0.1, transitionDelay: `${idx * 60}ms` }}>
                        <div className="flex justify-between items-center">
                            <span className="text-slate-300 text-xs">{l.cmd}</span>
                            <span className="text-[10px] text-slate-500">{l.size} · read-only</span>
                        </div>
                    </div>
                );
            })}

            <p className={`text-[11px] text-slate-500 mt-4 leading-relaxed transition-opacity duration-500 ${level >= 6 ? 'opacity-100' : 'opacity-0'}`}>
                Read-only layers are shared: run ten containers from this image and there is still exactly one copy of those
                206 MB on disk. Each container adds only its own thin writable layer — which is why starting a container is
                nearly free, and why anything written inside vanishes unless you mount a volume.
            </p>
        </div>
    );
}

// ── Act 7: build cache ─────────────────────────────────────────────────────────
function CacheScene({ variant }) {
    const bad = [
        { cmd: 'FROM node:20-slim', hit: true },
        { cmd: 'COPY . .', hit: false },
        { cmd: 'RUN npm install', hit: false, slow: true },
    ];
    const good = [
        { cmd: 'FROM node:20-slim', hit: true },
        { cmd: 'COPY package*.json ./', hit: true },
        { cmd: 'RUN npm install', hit: true, slow: true },
        { cmd: 'COPY . .', hit: false },
    ];
    const render = (list, label, ok) => (
        <div className={`rounded-xl border p-4 transition-colors duration-500 ${ok ? 'border-green-500/50 bg-green-500/5' : 'border-red-500/50 bg-red-500/5'}`}>
            <div className={`text-xs mb-3 ${ok ? 'text-green-300' : 'text-red-300'}`}>{label}</div>
            <div className="space-y-1.5">
                {list.map((l, i) => (
                    <div key={i} className="flex items-center gap-3 text-[11px]">
                        <span className={`px-2 py-0.5 rounded shrink-0 w-16 text-center ${
                            l.hit ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'
                        }`}>{l.hit ? 'CACHED' : 'rebuild'}</span>
                        <span className="text-slate-300">{l.cmd}</span>
                        {l.slow && <span className="text-slate-600 ml-auto shrink-0">{l.hit ? '0s' : '~90s'}</span>}
                    </div>
                ))}
            </div>
        </div>
    );
    return (
        <div className="w-full py-2 font-mono space-y-4">
            <div className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">
                you changed one line of source — what gets rebuilt?
            </div>
            {render(bad, 'copying everything first', false)}
            <div className={`transition-opacity duration-500 ${variant >= 2 ? 'opacity-100' : 'opacity-10'}`}>
                {render(good, 'copying the manifest first', true)}
            </div>
            <p className={`text-[11px] text-slate-500 leading-relaxed transition-opacity duration-500 ${variant >= 2 ? 'opacity-100' : 'opacity-0'}`}>
                A layer is cached only if its instruction and every layer beneath it are unchanged. COPY . . changes on
                every source edit, so anything after it always rebuilds. Copy the dependency manifest first, install, then
                copy the source — dependencies then rebuild only when they actually change.
            </p>
        </div>
    );
}

// ── Act 8: containers vs VMs ───────────────────────────────────────────────────
function VmScene({ level }) {
    const stack = (title, layers, accent) => (
        <div className="flex-1">
            <div className="text-xs mb-2" style={{ color: accent }}>{title}</div>
            <div className="space-y-1.5">
                {layers.map((l, i) => (
                    <div key={i} className="rounded-lg px-3 py-2 text-[11px] border"
                        style={{ borderColor: l.hl ? accent : '#334155', background: l.hl ? `${accent}18` : '#0f172a', color: l.hl ? accent : '#94a3b8' }}>
                        {l.t}
                    </div>
                ))}
            </div>
        </div>
    );
    return (
        <div className="w-full py-2 font-mono">
            <div className="flex gap-5">
                {stack('virtual machines', [
                    { t: 'app A · app B' },
                    { t: 'guest OS + guest kernel ×2', hl: true },
                    { t: 'hypervisor' },
                    { t: 'host OS + host kernel' },
                    { t: 'hardware' },
                ], '#a78bfa')}
                <div className="transition-opacity duration-500" style={{ opacity: level >= 2 ? 1 : 0.1 }}>
                    {stack('containers', [
                        { t: 'app A · app B' },
                        { t: 'container runtime' },
                        { t: 'one shared host kernel', hl: true },
                        { t: 'hardware' },
                    ], '#22c55e')}
                </div>
            </div>

            <div className={`grid grid-cols-2 gap-3 mt-5 transition-opacity duration-500 ${level >= 3 ? 'opacity-100' : 'opacity-0'}`}>
                {[
                    { t: 'Start time', a: 'seconds — a kernel must boot', b: 'milliseconds — it is just fork+exec' },
                    { t: 'Size', a: 'gigabytes — a whole OS', b: 'megabytes — layers, shared' },
                    { t: 'Isolation', a: 'hardware-enforced by the hypervisor', b: 'kernel features — one kernel bug is a shared boundary' },
                    { t: 'Kernel choice', a: 'any OS, any kernel version', b: 'must match the host kernel' },
                ].map(r => (
                    <div key={r.t} className="rounded-xl border border-slate-700/60 bg-slate-900/50 p-3">
                        <div className="text-[11px] text-slate-300 mb-1.5">{r.t}</div>
                        <div className="text-[10px] text-violet-300">VM: {r.a}</div>
                        <div className="text-[10px] text-green-300 mt-0.5">container: {r.b}</div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ── Recap ───────────────────────────────────────────────────────────────────────
function RecapCards({ wins }) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full">
            {wins.map((w, i) => (
                <div key={i} className="px-3 py-2.5 rounded-xl border border-zinc-700/60 bg-slate-900/50">
                    <div className="text-xs font-semibold text-zinc-200">{w.t}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{w.d}</div>
                </div>
            ))}
        </div>
    );
}

// ── Step generation ─────────────────────────────────────────────────────────────
function generateSteps() {
    const steps = [];
    const s = (act, actName, data, explanation) => steps.push({ act, actName, ...data, explanation });

    // ═══ ACT 1: Just a Process ═══
    s(1, 'Just a Process', {
        heading: 'docker run -d nginx',
        inside:  [{ k: 'running', v: 'nginx' }, { k: 'feels like', v: 'its own machine' }],
        outside: [{ k: 'ps aux | grep nginx', v: 'nginx' }, { k: 'it is', v: 'a normal process' }],
        chips: [], caption: '' },
        'Start a container and it feels like you booted a tiny machine. You did not. Run ps on the host and the process is right there in the same list as your text editor, scheduled by the same scheduler. There is no guest kernel, no virtual hardware, and nothing being emulated.');
    s(1, 'Just a Process', {
        heading: 'a container is a process wearing a costume',
        focus: 'kernel',
        inside:  [{ k: 'running', v: 'nginx' }],
        outside: [{ k: 'running', v: 'nginx (pid 4821)' }],
        chips: ['pid', 'mnt', 'net', 'uts', 'user', 'cg', 'ovl'] },
        '"Container" is not a thing the Linux kernel implements. There is no container object, no container syscall. It is a marketing word for an ordinary process started with a set of kernel features switched on — namespaces to restrict what it can see, cgroups to cap what it can use, and a union filesystem for its root directory. Docker is the tooling that assembles those features; the kernel does the work.');

    // ═══ ACT 2: PID Namespace ═══
    s(2, 'The PID Namespace', {
        heading: 'unshare(CLONE_NEWPID) — a fresh process-ID number line',
        focus: 'inside', lens: true, chips: ['pid'],
        inside:  [{ k: 'ps aux', v: '' }, { k: 'PID 1', v: 'nginx', hot: true }, { k: 'total processes', v: '2' }],
        outside: [{ k: 'ps aux', v: '' }, { k: 'PID 4821', v: 'nginx', hot: true }, { k: 'total processes', v: '312' }] },
        'Start with the PID namespace. Inside, nginx is process 1 and can see two processes total. On the host it is PID 4821 among three hundred others. Same process, two identities — the kernel keeps a separate mapping per namespace, and a process can only see PIDs within its own.');
    s(2, 'The PID Namespace', {
        heading: 'the isolation is one-way',
        focus: 'host', lens: true, chips: ['pid'],
        inside:  [{ k: 'can see host processes?', v: 'no', hot: true }],
        outside: [{ k: 'can see container processes?', v: 'yes — all of them', hot: true }, { k: 'kill 4821', v: 'works', hot: true }] },
        'And the relationship is asymmetric. The container cannot see the host, but the host sees everything and can signal any of it. This is a containment boundary, not a symmetric partition — which is worth remembering when reasoning about what a container actually protects you from.');
    s(2, 'The PID Namespace', {
        heading: 'being PID 1 has real consequences',
        chips: ['pid'],
        inside:  [{ k: 'PID 1 default signal handlers', v: 'none', hot: true }, { k: 'docker stop → SIGTERM', v: 'may be ignored', hot: true }, { k: 'reaps orphaned children?', v: 'only if it implements it' }],
        outside: [{ k: 'after 10s grace', v: 'SIGKILL' }] },
        'Being PID 1 is not just cosmetic. The kernel gives PID 1 special treatment: it does not get the default signal handlers, so a process that never installed a SIGTERM handler will simply ignore docker stop and get SIGKILLed after the grace period. PID 1 is also responsible for reaping orphaned children, and an app that does not will accumulate zombies. This is the entire reason tini and --init exist.');

    // ═══ ACT 3: Mount Namespace ═══
    s(3, 'The Mount Namespace', {
        heading: 'a private filesystem tree',
        focus: 'inside', lens: true, chips: ['mnt', 'ovl'],
        inside:  [{ k: 'ls /', v: 'bin etc usr app', hot: true }, { k: '/app/server.js', v: 'exists' }, { k: 'sees host /home?', v: 'no', hot: true }],
        outside: [{ k: 'the same files live at', v: '/var/lib/docker/', hot: true }, { k: '', v: 'overlay2/a3f…/merged' }] },
        'The mount namespace gives the process its own view of the filesystem tree. Inside it sees a clean root with its own /bin, /etc and /app. On the host those exact files sit in a directory under /var/lib/docker. Nothing was copied into a virtual disk — the root was simply swapped, with pivot_root rather than chroot, which is harder to escape.');
    s(3, 'The Mount Namespace', {
        heading: 'this is why the container image can be a different distro',
        chips: ['mnt', 'ovl'],
        inside:  [{ k: 'cat /etc/os-release', v: 'Alpine Linux', hot: true }, { k: 'uname -r', v: '6.8.0-generic', hot: true }],
        outside: [{ k: 'cat /etc/os-release', v: 'Ubuntu 24.04', hot: true }, { k: 'uname -r', v: '6.8.0-generic', hot: true }] },
        'Here is the detail that explains what a container image really is. Run Alpine on an Ubuntu host and /etc/os-release genuinely says Alpine — but uname reports the host kernel, identically in both views. An image is a userland: libraries, binaries, config. It never contains a kernel. "Running Alpine in a container" means running Alpine\'s userland on your kernel.');

    // ═══ ACT 4: Network, UTS, User ═══
    s(4, 'Network, UTS and User', {
        heading: 'CLONE_NEWNET — its own network stack',
        focus: 'inside', lens: true, chips: ['net'],
        inside:  [{ k: 'ip addr', v: 'eth0 172.17.0.2', hot: true }, { k: 'listening on', v: ':80' }, { k: 'sees host interfaces?', v: 'no' }],
        outside: [{ k: 'veth pair', v: 'veth8a2f ↔ docker0', hot: true }, { k: 'published as', v: '0.0.0.0:8080' }] },
        'The network namespace gives the container its own interfaces, routing table and port space. Its eth0 is one end of a virtual ethernet pair; the other end is plugged into a bridge on the host. Because the port space is separate, ten containers can each listen on port 80 without conflict — publishing a port is just a NAT rule the runtime adds.');
    s(4, 'Network, UTS and User', {
        heading: 'CLONE_NEWUTS — its own hostname',
        chips: ['uts'],
        inside:  [{ k: 'hostname', v: 'a3f91c2b4e77', hot: true }],
        outside: [{ k: 'hostname', v: 'archi-laptop', hot: true }] },
        'The UTS namespace is the small one: it isolates the hostname. That is why a container\'s hostname defaults to its own short container ID, and why setting a hostname inside does not touch the host.');
    s(4, 'Network, UTS and User', {
        heading: 'CLONE_NEWUSER — root inside need not be root outside',
        focus: 'host', lens: true, chips: ['user'],
        inside:  [{ k: 'whoami', v: 'root', hot: true }, { k: 'uid', v: '0' }],
        outside: [{ k: 'with userns-remap', v: 'uid 165536', hot: true }, { k: 'by default in Docker', v: 'uid 0 — real root', hot: true }] },
        'The user namespace can map UIDs, so root inside is an unprivileged user outside. This is the one to be careful about: Docker does not enable user namespaces by default, so unless you have turned on userns-remap, root in the container is genuinely root on the host — which is why mounting the Docker socket or running --privileged is effectively handing over the machine. Rootless Docker and Podman default to remapping, which is a meaningfully different security posture.');

    // ═══ ACT 5: cgroups ═══
    s(5, 'cgroups', { cgroup: 1 },
        'Namespaces control what a process can see. They say nothing about what it can consume — a containerised process with no limits will happily eat all the RAM on the box. That job belongs to control groups.');
    s(5, 'cgroups', { cgroup: 3 },
        'A cgroup is a kernel-enforced budget: memory ceiling, CPU share, process count, I/O bandwidth. docker run --memory=512m writes to memory.max in the cgroup filesystem, and the kernel enforces it from then on. cgroups v2 is the current default and unified the older per-controller hierarchies.');
    s(5, 'cgroups', { cgroup: 3, oom: true },
        'Hit the memory ceiling and there is no negotiation — the kernel OOM-kills the process, and you get exit code 137. Worth knowing: many runtimes do not see the cgroup limit through the usual APIs, so a JVM or Node process can size its heap against the host\'s total RAM and get killed at what looks like normal utilisation. Modern JVMs are container-aware; not everything is.');

    // ═══ ACT 6: Layers ═══
    s(6, 'Image Layers', { layers: 2 },
        'Now the filesystem. An image is not a disk file — it is a stack of layers, one per build instruction. Each layer records only what changed relative to the one beneath it, and each is content-addressed by a hash of its contents.');
    s(6, 'Image Layers', { layers: 5 },
        'Five instructions, five read-only layers. A union filesystem — overlayfs on modern Linux — presents them merged as a single directory tree. A file in an upper layer shadows the same path lower down, which is how a layer can appear to modify or delete something it did not create.');
    s(6, 'Image Layers', { layers: 6 },
        'Starting a container adds one thin writable layer on top. Everything below stays read-only and is shared: run ten containers from this image and those 206 MB exist once on disk, not ten times. That sharing is why container startup is nearly free — no copying is involved.');
    s(6, 'Image Layers', { layers: 6, cow: true },
        'Writes use copy-on-write. Modify a file that lives in a read-only layer and overlayfs first copies it up into the writable layer, then edits the copy. Two consequences follow directly: first writes to a large file are slow, and everything in that writable layer disappears when the container is removed — which is exactly why volumes exist for anything you want to keep.');

    // ═══ ACT 7: Build Cache ═══
    s(7, 'The Build Cache', { cache: 1 },
        'Layers being content-addressed gives you the build cache — and also the single most common Dockerfile mistake. If an instruction and everything beneath it are unchanged, the builder reuses the existing layer. Change one thing and that layer plus every layer above it must be rebuilt.');
    s(7, 'The Build Cache', { cache: 2 },
        'So COPY . . before RUN npm install is a trap: any source edit invalidates the copy layer, which invalidates the install below it, and you reinstall every dependency on every build. Copy the manifest first, install, then copy the source — now dependencies rebuild only when package.json actually changes. Same image, dramatically different build times. Multi-stage builds extend the idea: build in a fat stage, copy just the artefact into a slim final image.');

    // ═══ ACT 8: vs VMs ═══
    s(8, 'Containers vs VMs', { vm: 1 },
        'It is worth being precise about the difference, because "lightweight VM" is the wrong mental model. A virtual machine virtualizes hardware: the hypervisor presents virtual devices, and each guest boots its own complete kernel and OS on top.');
    s(8, 'Containers vs VMs', { vm: 2 },
        'A container virtualizes nothing. There is one kernel, and containers are processes on it with a restricted view. That single architectural difference produces every practical distinction — start time, image size, memory overhead and density all follow from whether a kernel has to boot.');
    s(8, 'Containers vs VMs', { vm: 3 },
        'Which also sets the trade-offs honestly. A VM\'s isolation is enforced by hardware; a container\'s is enforced by kernel features, so a kernel vulnerability is a boundary shared by every container on the box — that is why hostile multi-tenant workloads still get VMs, or hybrids like Firecracker and gVisor. And since the kernel is shared, you cannot run a Windows container on a Linux host, or vice versa: Docker Desktop on macOS and Windows quietly runs a Linux VM, and every "native" container you start there is inside it.');
    s(8, 'Containers vs VMs', {
        recap: true,
        wins: [
            { t: 'No such thing as a container', d: 'The kernel has no container object. It is a normal process with namespaces, cgroups and a union filesystem switched on.' },
            { t: 'Namespaces see, cgroups use', d: 'Namespaces restrict what a process can perceive — PIDs, mounts, network, hostname, UIDs. cgroups cap what it can consume.' },
            { t: 'Images are userland, never a kernel', d: 'Alpine on an Ubuntu host really is Alpine userland — but uname reports the host kernel, because there is only one.' },
            { t: 'Layers are shared and copy-on-write', d: 'Read-only layers are shared across containers; writes copy up into a thin layer that dies with the container. Hence volumes, and hence cache ordering.' },
        ],
    }, 'A container is a process the kernel has been asked to lie to — about which processes exist, which filesystem is root, what the hostname is, and who it is running as — plus a budget it cannot exceed and a clever filesystem underneath. Once you see it that way the behaviours stop being surprising: why PID 1 ignores your SIGTERM, why data vanishes on restart, why reordering two Dockerfile lines saves ninety seconds a build, and why --privileged is not a small thing to type.');

    return steps;
}

// ── Router ──────────────────────────────────────────────────────────────────────
function VisualizationPanel({ step }) {
    if (!step) return null;
    if (step.recap)  return <RecapCards wins={step.wins} />;
    if (step.cgroup) return <CgroupScene level={step.cgroup} oom={step.oom} />;
    if (step.layers) return <LayerScene level={step.layers} cow={step.cow} />;
    if (step.cache)  return <CacheScene variant={step.cache} />;
    if (step.vm)     return <VmScene level={step.vm} />;
    return <HostStage step={step} />;
}

// ── Quiz ────────────────────────────────────────────────────────────────────────
const QUIZ = [
    {
        question: 'You run an Alpine-based image on an Ubuntu host. What does `uname -r` report inside the container?',
        options: [
            'Alpine\'s kernel version — the image ships its own kernel',
            'The Ubuntu host\'s kernel version, because an image contains only userland and there is one shared kernel',
            'An error, since containers have no kernel',
            'A virtualized kernel version chosen by the runtime',
        ],
        correct: 1,
        explanation: 'A container image is userland only — libraries, binaries, config. It never contains a kernel. /etc/os-release genuinely says Alpine because those are Alpine\'s files, but uname reports the host kernel because that is the only kernel running. This is also why you cannot run a Windows container on a Linux host: Docker Desktop on macOS/Windows quietly runs a Linux VM.',
    },
    {
        question: 'What is the difference between what namespaces do and what cgroups do?',
        options: [
            'Namespaces are for networking, cgroups are for storage',
            'They are two names for the same kernel feature',
            'Namespaces restrict what a process can see (PIDs, mounts, network, hostname, UIDs); cgroups cap what it can consume (memory, CPU, PIDs, I/O)',
            'Namespaces are enforced by Docker, cgroups by the kernel',
        ],
        correct: 2,
        explanation: 'They are complementary and both kernel features. Namespaces partition visibility — a PID namespace gives a fresh process-ID number line, a mount namespace a private filesystem tree. cgroups enforce resource budgets. A container with namespaces but no cgroups is isolated but can still exhaust the host\'s RAM.',
    },
    {
        question: 'Why does putting `COPY . .` before `RUN npm install` in a Dockerfile make builds slow?',
        options: [
            'COPY is inherently a slow instruction',
            'npm requires the source to be present before installing',
            'A layer is cached only if its instruction and all layers beneath it are unchanged — so any source edit invalidates the COPY layer and forces the install below it to rerun',
            'Docker rebuilds every layer on every build regardless of order',
        ],
        correct: 2,
        explanation: 'Layers are content-addressed and cached in order. COPY . . changes whenever any source file changes, which invalidates it and every layer above it — including the dependency install. Copying package.json first, running install, then copying the source means dependencies are reinstalled only when the manifest actually changes.',
    },
];

function QuizPanel({ quizState, setQuizState }) {
    const q = QUIZ[quizState.current];
    if (quizState.complete) {
        return (
            <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-5 text-center">
                <div className="text-2xl font-bold text-white mb-1">{quizState.score}/{QUIZ.length}</div>
                <div className="text-zinc-400 text-sm mb-4">
                    {quizState.score === QUIZ.length ? 'Perfect — you see through the costume now!' : 'Review the explanations to reinforce the mechanisms.'}
                </div>
                <button onClick={() => setQuizState({ current: 0, selected: null, answered: false, score: 0, complete: false })}
                    className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-sm text-white transition-colors">Retake Quiz</button>
            </div>
        );
    }
    return (
        <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-4">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 mb-2">Question {quizState.current + 1} / {QUIZ.length}</div>
            <p className="text-slate-200 text-sm font-medium mb-3 leading-relaxed">{q.question}</p>
            <div className="space-y-2">
                {q.options.map((opt, i) => {
                    let cls = 'border-slate-700 text-slate-400 hover:border-zinc-500 hover:text-slate-200';
                    if (quizState.answered) {
                        if (i === q.correct) cls = 'border-green-500 bg-green-500/10 text-green-300';
                        else if (i === quizState.selected) cls = 'border-red-500 bg-red-500/10 text-red-300';
                        else cls = 'border-slate-800 text-slate-600';
                    }
                    return (
                        <button key={i} onClick={() => {
                            if (quizState.answered) return;
                            const correct = i === q.correct;
                            setQuizState(st => ({ ...st, selected: i, answered: true, score: correct ? st.score + 1 : st.score }));
                        }} className={`w-full text-left px-3 py-2 rounded-lg border text-xs transition-all ${cls}`}>{opt}</button>
                    );
                })}
            </div>
            {quizState.answered && <div className="mt-3 text-xs text-slate-500 bg-slate-800/50 rounded-lg p-2 leading-relaxed">{q.explanation}</div>}
            {quizState.answered && (
                <button onClick={() => {
                    if (quizState.current + 1 >= QUIZ.length) setQuizState(st => ({ ...st, complete: true }));
                    else setQuizState(st => ({ ...st, current: st.current + 1, selected: null, answered: false }));
                }} className="mt-3 w-full py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-xs text-white transition-colors">
                    {quizState.current + 1 >= QUIZ.length ? 'See Score' : 'Next Question'}
                </button>
            )}
        </div>
    );
}

// ── Page ────────────────────────────────────────────────────────────────────────
const STEPS = generateSteps();

export default function ContainersPage() {
    const [currentStep, setCurrentStep] = useState(0);
    const [isPlaying,   setIsPlaying]   = useState(false);
    const [speed,       setSpeed]       = useState(1300);
    const [quizState,   setQuizState]   = useState({ current: 0, selected: null, answered: false, score: 0, complete: false });

    useEffect(() => {
        if (!isPlaying || STEPS.length === 0) return;
        if (currentStep >= STEPS.length - 1) { setIsPlaying(false); return; }
        const t = setTimeout(() => setCurrentStep(s => s + 1), speed);
        return () => clearTimeout(t);
    }, [isPlaying, currentStep, speed]);

    const step = STEPS[currentStep];
    const pct  = Math.round(((currentStep + 1) / STEPS.length) * 100);

    return (
        <div className="min-h-screen bg-slate-950 text-white">
            {/* Header */}
            <div className="bg-gradient-to-r from-zinc-600 to-slate-700 px-4 py-6">
                <div className="max-w-7xl mx-auto">
                    <Link href="/under-the-hood" className="flex items-center gap-1.5 text-zinc-300 hover:text-white text-sm mb-4 w-fit transition-colors">
                        <ArrowLeft className="h-4 w-4" />Back to Under the Hood
                    </Link>
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold text-white leading-tight">How Containers Work</h1>
                            <p className="text-zinc-300 text-sm mt-1">
                                Namespaces, cgroups, overlay layers — a container is a process the kernel has been asked to lie to
                            </p>
                        </div>
                        <div className="text-right shrink-0">
                            <div className="text-xs text-zinc-400 font-mono">{currentStep + 1} / {STEPS.length}</div>
                            <div className="text-[10px] text-zinc-600 mt-0.5">steps</div>
                        </div>
                    </div>

                    {/* Act timeline */}
                    <div className="flex flex-wrap gap-1.5 mt-4">
                        {ACTS.map(act => {
                            const ActIcon = act.icon;
                            const isCurrent = step?.act === act.id;
                            const isDone    = step?.act > act.id;
                            return (
                                <button key={act.id} onClick={() => {
                                    const firstStepOfAct = STEPS.findIndex(s => s.act === act.id);
                                    if (firstStepOfAct >= 0) { setCurrentStep(firstStepOfAct); setIsPlaying(false); }
                                }}
                                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                        isCurrent ? 'bg-white/20 text-white border border-white/30'
                                        : isDone ? 'bg-white/5 text-zinc-400 border border-white/10'
                                        : 'bg-transparent text-zinc-600 border border-transparent hover:border-white/10 hover:text-zinc-400'
                                    }`}>
                                    <ActIcon className="h-3 w-3" />{act.label}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Progress bar */}
            <div className="h-0.5 bg-slate-800">
                <div className="h-full bg-gradient-to-r from-zinc-500 to-slate-400 transition-all duration-300" style={{ width: `${pct}%` }} />
            </div>

            {/* Main layout */}
            <div className="max-w-7xl mx-auto px-4 py-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Visualization */}
                    <div className="lg:col-span-2">
                        <div className="bg-slate-900/70 border border-slate-700/50 rounded-2xl overflow-hidden">
                            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800/60">
                                <div>
                                    <span className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">Act {step?.act} of 8</span>
                                    <span className="text-slate-600 mx-2">·</span>
                                    <span className="text-sm font-semibold text-slate-200">{step?.actName}</span>
                                </div>
                                <span className="text-[10px] text-slate-600 font-mono">step {currentStep + 1}</span>
                            </div>
                            <div className="px-5 py-3 min-h-[440px] flex items-center">
                                <VisualizationPanel step={step} />
                            </div>
                        </div>

                        {/* Controls */}
                        <div className="mt-4 bg-slate-900/50 border border-slate-800/60 rounded-xl px-5 py-4 flex flex-col sm:flex-row items-center gap-4">
                            <div className="flex items-center gap-2">
                                <button onClick={() => { setCurrentStep(0); setIsPlaying(false); }}
                                    className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors" title="Reset">
                                    <RotateCcw className="h-4 w-4" />
                                </button>
                                <button onClick={() => setCurrentStep(s => Math.max(0, s - 1))}
                                    className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors" title="Previous">
                                    <SkipBack className="h-4 w-4" />
                                </button>
                                <button onClick={() => setIsPlaying(p => !p)}
                                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-white transition-colors text-sm font-medium">
                                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                                    {isPlaying ? 'Pause' : 'Play'}
                                </button>
                                <button onClick={() => setCurrentStep(s => Math.min(STEPS.length - 1, s + 1))}
                                    className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors" title="Next">
                                    <SkipForward className="h-4 w-4" />
                                </button>
                            </div>
                            <div className="flex items-center gap-2 sm:ml-auto">
                                <span className="text-xs text-slate-500">Speed</span>
                                <input type="range" min="200" max="2000" value={speed}
                                    onChange={e => setSpeed(Number(e.target.value))} className="w-24 accent-zinc-400" />
                                <span className="text-xs text-slate-600 font-mono w-14">{speed > 1500 ? 'slow' : speed < 500 ? 'fast' : 'normal'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-4">
                        <div className="bg-zinc-500/10 border border-zinc-500/20 rounded-xl p-4">
                            <div className="flex items-start gap-2">
                                <Info className="h-4 w-4 text-zinc-400 mt-0.5 shrink-0" />
                                <p className="text-zinc-300 text-sm leading-relaxed">{step?.explanation}</p>
                            </div>
                        </div>

                        {/* Reference */}
                        <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-4">
                            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mb-3">Kernel features</p>
                            <div className="space-y-1.5 text-xs">
                                {[
                                    { acts: [2],    label: 'PID ns',    note: 'own process IDs' },
                                    { acts: [3],    label: 'Mount ns',  note: 'own root tree' },
                                    { acts: [4],    label: 'Net ns',    note: 'own interfaces' },
                                    { acts: [4],    label: 'UTS ns',    note: 'own hostname' },
                                    { acts: [4],    label: 'User ns',   note: 'UID remapping' },
                                    { acts: [5],    label: 'cgroups v2', note: 'resource ceilings' },
                                    { acts: [6, 7], label: 'overlayfs', note: 'layers · copy-on-write' },
                                    { acts: [1, 8], label: 'Kernel',    note: 'exactly one, shared' },
                                ].map(row => (
                                    <div key={row.label} className={`flex justify-between gap-2 px-2 py-1 rounded-lg transition-colors ${step && row.acts.includes(step.act) ? 'bg-zinc-700/50 text-zinc-200' : 'text-slate-500'}`}>
                                        <span>{row.label}</span>
                                        <span className="font-mono text-[10px] text-right">{row.note}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Quiz */}
                        <div>
                            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mb-2 px-1">Active Recall</p>
                            <QuizPanel quizState={quizState} setQuizState={setQuizState} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

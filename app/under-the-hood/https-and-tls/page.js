"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Play, Pause, SkipBack, SkipForward, RotateCcw, Info,
    Unlock, KeyRound, Palette, BadgeCheck, ArrowLeftRight, RefreshCw, Lock, ShieldCheck,
    CheckCircle, ChevronRight,
} from 'lucide-react';

// ── Acts ──────────────────────────────────────────────────────────────────────
const ACTS = [
    { id: 1, label: 'Why HTTPS',    icon: Unlock        },
    { id: 2, label: 'Two Cryptos',  icon: KeyRound      },
    { id: 3, label: 'Diffie-Hellman',icon: Palette      },
    { id: 4, label: 'Certificates', icon: BadgeCheck    },
    { id: 5, label: 'Handshake',    icon: ArrowLeftRight},
    { id: 6, label: '1-RTT',        icon: RefreshCw     },
    { id: 7, label: 'Encrypted',    icon: Lock          },
    { id: 8, label: 'Guarantees',   icon: ShieldCheck   },
];

// ── Channel (Client — Eve — Server) — persistent top band ───────────────────────
const PKT_X = { client: 150, mid: 370, server: 590 };

function ChannelSvg({ step }) {
    const pk = step.packet;
    const px = pk ? PKT_X[pk.at] : -80;
    const pColor = pk ? (pk.color === 'enc' ? '#15803d' : pk.color === 'key' ? '#7e22ce' : '#b91c1c') : '#334155';
    const eve = step.eve;

    return (
        <svg viewBox="0 0 740 190" width="100%" className="select-none">
            <style>{`
                .tl-fade { transition: opacity .45s ease; }
                @keyframes tldash { to { stroke-dashoffset: -18; } }
                .tl-flow { stroke-dasharray: 5 4; animation: tldash .6s linear infinite; }
            `}</style>
            <defs>
                <marker id="tlah" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto" markerUnits="userSpaceOnUse">
                    <path d="M0,0 L6,3 L0,6 Z" fill="context-stroke" />
                </marker>
            </defs>

            {/* wire */}
            <line x1="150" y1="150" x2="590" y2="150" stroke={step.lockOn ? '#166534' : '#334155'} strokeWidth="2.5" className={pk ? 'tl-flow' : ''} />

            {/* Client */}
            <rect x="30" y="110" width="120" height="76" rx="10" fill="#12203a" stroke="#3b82f6" strokeWidth="1.6" />
            <text x="90" y="132" textAnchor="middle" fontSize="11" fill="#93c5fd" fontFamily="monospace">Client</text>
            <text x="90" y="176" textAnchor="middle" fontSize="9" fill="#64748b" fontFamily="monospace">browser</text>
            {step.lockOn && <text x="128" y="126" fontSize="13" fill="#22c55e">🔒</text>}

            {/* Server */}
            <rect x="590" y="110" width="120" height="76" rx="10" fill="#0f2a1a" stroke="#22c55e" strokeWidth="1.6" />
            <text x="650" y="132" textAnchor="middle" fontSize="11" fill="#86efac" fontFamily="monospace">Server</text>
            <text x="650" y="176" textAnchor="middle" fontSize="9" fill="#64748b" fontFamily="monospace">example.com</text>
            {step.lockOn && <text x="596" y="126" fontSize="13" fill="#22c55e">🔒</text>}

            {/* Eve on the wire */}
            <g className="tl-fade" style={{ opacity: eve ? 1 : 0.25 }}>
                <line x1="370" y1="150" x2="370" y2="92" stroke="#475569" strokeWidth="1.2" strokeDasharray="3 3" />
                <circle cx="370" cy="78" r="17" fill={eve && eve.safe ? '#14532d' : '#3a0d0d'} stroke={eve && eve.safe ? '#22c55e' : '#ef4444'} strokeWidth="1.8" />
                <text x="370" y="83" textAnchor="middle" fontSize="13">{eve && eve.safe ? '🙈' : '👁'}</text>
                <text x="370" y="104" textAnchor="middle" fontSize="8" fill="#94a3b8" fontFamily="monospace">Eve (on the wire)</text>
            </g>

            {/* Eve's view bubble */}
            {eve && (
                <g className="tl-fade">
                    <rect x="410" y="20" width="300" height="46" rx="8"
                        fill={eve.safe ? '#0f2a1a' : '#2a0d0d'} stroke={eve.safe ? '#22c55e' : '#ef4444'} strokeWidth="1.4" />
                    <text x="422" y="38" fontSize="9" fill={eve.safe ? '#4ade80' : '#f87171'} fontFamily="monospace">Eve sees:</text>
                    <text x="422" y="55" fontSize="11" fill={eve.safe ? '#bbf7d0' : '#fca5a5'} fontFamily="monospace">{eve.text}</text>
                </g>
            )}

            {/* gliding packet */}
            <g style={{ transform: `translate(${px}px, 150px)`, transition: 'transform 0.75s cubic-bezier(0.45,0,0.15,1)', opacity: pk ? 1 : 0 }}>
                <rect x="-46" y="-14" width="92" height="28" rx="6" fill={pColor} stroke="#e2e8f0" strokeWidth="1.3" />
                <text y="4" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#f8fafc" fontFamily="monospace">{pk ? pk.label : ''}</text>
            </g>
        </svg>
    );
}

// ── Detail renderers (morph below the channel) ──────────────────────────────────
const PAINT = {
    common: { c: '#eab308', label: 'common' },
    cSecret: { c: '#3b82f6', label: 'client secret' },
    sSecret: { c: '#ef4444', label: 'server secret' },
    cPublic: { c: '#22c55e', label: 'client public' },
    sPublic: { c: '#f97316', label: 'server public' },
    shared: { c: '#92400e', label: 'shared secret' },
};
function Blob({ k, size = 40, dim }) {
    const p = PAINT[k];
    return (
        <div className="flex flex-col items-center gap-1" style={{ opacity: dim ? 0.25 : 1, transition: 'opacity .5s ease' }}>
            <div className="rounded-full border-2 border-slate-900/40" style={{ width: size, height: size, background: p.c, transition: 'background .5s ease' }} />
            <span className="text-[10px] text-slate-400 font-mono">{p.label}</span>
        </div>
    );
}
function PaintDetail({ phase }) {
    return (
        <div className="w-full flex flex-col items-center gap-4 py-2">
            <div className="flex items-center gap-4 flex-wrap justify-center">
                <Blob k="common" />
                <span className="text-slate-600 text-xs">public — sent in the clear</span>
            </div>
            {phase !== 'common' && (
                <div className="flex items-center gap-8">
                    <div className="flex items-center gap-2"><Blob k="cSecret" size={34} /><span className="text-[10px] text-blue-400">kept private</span></div>
                    <div className="flex items-center gap-2"><span className="text-[10px] text-red-400">kept private</span><Blob k="sSecret" size={34} /></div>
                </div>
            )}
            {(phase === 'publics' || phase === 'shared') && (
                <div className="flex items-center gap-3 text-sm text-slate-500">
                    <Blob k="common" size={22} /><span>+</span><Blob k="cSecret" size={22} /><span>=</span><Blob k="cPublic" size={30} />
                    <span className="mx-2 text-slate-700">|</span>
                    <Blob k="common" size={22} /><span>+</span><Blob k="sSecret" size={22} /><span>=</span><Blob k="sPublic" size={30} />
                </div>
            )}
            {phase === 'shared' && (
                <div className="flex flex-col items-center gap-2 px-4 py-3 rounded-xl border border-amber-700/50 bg-amber-900/10">
                    <div className="flex items-center gap-3 text-sm text-slate-400">
                        <Blob k="sPublic" size={22} /><span>+</span><Blob k="cSecret" size={22} /><span className="text-slate-600">=</span>
                        <Blob k="shared" size={30} />
                        <span className="text-slate-600">=</span>
                        <Blob k="cPublic" size={22} /><span>+</span><Blob k="sSecret" size={22} />
                    </div>
                    <span className="text-[11px] text-amber-300">both sides derive the SAME secret — which never crossed the wire</span>
                </div>
            )}
        </div>
    );
}

const CHAIN = [
    { name: 'example.com', sub: 'leaf / end-entity cert', leaf: true },
    { name: "Let's Encrypt R3", sub: 'intermediate CA' },
    { name: 'ISRG Root X1', sub: 'root CA — in browser trust store', root: true },
];
function CertDetail({ phase }) {
    if (phase === 'mitm') {
        return (
            <div className="flex flex-col items-center gap-3 py-4">
                <div className="flex items-center gap-3">
                    <span className="px-3 py-2 rounded-lg border border-blue-500/40 bg-blue-500/10 text-xs font-mono text-blue-300">Client</span>
                    <ArrowLeftRight className="h-4 w-4 text-red-400" />
                    <span className="px-3 py-2 rounded-lg border border-red-500/50 bg-red-500/10 text-xs font-mono text-red-300">Eve pretends to be the server?</span>
                    <ArrowLeftRight className="h-4 w-4 text-red-400" />
                    <span className="px-3 py-2 rounded-lg border border-green-500/40 bg-green-500/10 text-xs font-mono text-green-300">Server</span>
                </div>
                <p className="text-[11px] text-red-300 max-w-md text-center">Key exchange alone proves nothing about WHO you shared a secret with. A man-in-the-middle could sit in between. Certificates fix this.</p>
            </div>
        );
    }
    return (
        <div className="flex flex-col items-center gap-1.5 py-2">
            {CHAIN.map((c, i) => {
                const verified = phase === 'chain';
                return (
                    <div key={i} className="flex flex-col items-center">
                        {i > 0 && (
                            <div className="flex items-center gap-1 py-0.5">
                                <span className="text-[9px] text-slate-600 font-mono">signed by ↑</span>
                                {verified && <CheckCircle className="h-3 w-3 text-green-500" />}
                            </div>
                        )}
                        <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border w-64 ${
                            c.root ? 'border-green-500/50 bg-green-500/10' : c.leaf ? 'border-blue-500/40 bg-blue-500/10' : 'border-slate-700/60 bg-slate-900/50'
                        }`}>
                            <BadgeCheck className={`h-4 w-4 shrink-0 ${c.root ? 'text-green-400' : c.leaf ? 'text-blue-400' : 'text-slate-400'}`} />
                            <div className="min-w-0">
                                <div className="text-xs font-mono text-slate-200">{c.name}</div>
                                <div className="text-[10px] text-slate-500">{c.sub}</div>
                            </div>
                            {c.root && verified && <span className="ml-auto text-[9px] text-green-400 font-mono">trusted ✓</span>}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

const HS_MSGS = [
    { dir: 'c2s', label: 'ClientHello', detail: 'TLS 1.3 · cipher suites · SNI · client key share' },
    { dir: 's2c', label: 'ServerHello + Certificate + Finished', detail: 'chosen cipher · server key share · cert · verify data' },
    { dir: 'c2s', label: 'Finished', detail: 'cert verified · session keys derived' },
];
function HandshakeDetail({ reveal, current }) {
    return (
        <div className="flex flex-col gap-2 py-2 w-full max-w-xl mx-auto">
            {HS_MSGS.slice(0, reveal).map((m, i) => {
                const c2s = m.dir === 'c2s';
                const active = i === current;
                return (
                    <div key={i} className={`flex ${c2s ? '' : 'flex-row-reverse'} items-center gap-2`}>
                        <div className={`px-3 py-2 rounded-lg border max-w-[78%] ${active ? 'border-zinc-300 bg-zinc-500/20' : 'border-slate-700/60 bg-slate-900/50'}`}>
                            <div className="flex items-center gap-1.5 text-xs font-mono text-slate-200">
                                {c2s ? <span className="text-blue-400">▶</span> : <span className="text-green-400">◀</span>}{m.label}
                            </div>
                            <div className="text-[10px] text-slate-500 mt-0.5">{m.detail}</div>
                        </div>
                    </div>
                );
            })}
            {reveal >= 3 && <div className="text-center text-[11px] text-green-400 font-mono mt-1">handshake complete — 1 round trip</div>}
        </div>
    );
}

function RttDetail() {
    const Row = ({ label, arrows, rtt, color }) => (
        <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-slate-300">{label}</span>
                <span className={`text-xs font-mono font-bold ${color}`}>{rtt}</span>
            </div>
            <div className="flex gap-1">
                {arrows.map((a, i) => (
                    <div key={i} className={`flex-1 h-6 rounded flex items-center justify-center text-[9px] font-mono ${a === 'c2s' ? 'bg-blue-500/20 text-blue-300' : 'bg-green-500/20 text-green-300'}`}>
                        {a === 'c2s' ? '→' : '←'}
                    </div>
                ))}
            </div>
        </div>
    );
    return (
        <div className="flex flex-col gap-4 py-3 w-full max-w-md mx-auto">
            <Row label="TLS 1.2" arrows={['c2s', 's2c', 'c2s', 's2c']} rtt="2 round trips" color="text-orange-400" />
            <Row label="TLS 1.3" arrows={['c2s', 's2c']} rtt="1 round trip" color="text-green-400" />
            <p className="text-[11px] text-slate-500 text-center">TLS 1.3 sends the client key share in the FIRST message, so keys are ready after one exchange. (Resumption can even do 0-RTT.)</p>
        </div>
    );
}

function KeysDetail({ phase }) {
    return (
        <div className="flex flex-col items-center gap-3 py-4">
            <div className="flex items-center gap-3">
                <div className="rounded-full border-2 border-amber-700" style={{ width: 34, height: 34, background: '#92400e' }} />
                <ChevronRight className="h-4 w-4 text-slate-600" />
                <div className="px-3 py-2 rounded-lg border border-purple-500/40 bg-purple-500/10 text-xs font-mono text-purple-300">
                    <KeyRound className="h-3.5 w-3.5 inline mr-1" />session keys (AES-256-GCM)
                </div>
            </div>
            <p className="text-[11px] text-slate-500 text-center max-w-md">
                {phase === 'data'
                    ? 'AES-GCM is an AEAD cipher: it encrypts (confidentiality) AND authenticates (integrity) — any tampering is detected and rejected.'
                    : 'The shared secret is run through a key-derivation function to produce fast symmetric session keys. Asymmetric crypto bootstrapped it; symmetric crypto now does the heavy lifting.'}
            </p>
        </div>
    );
}

const CRYPTO = [
    { name: 'Symmetric', icon: KeyRound, tone: 'blue', pts: ['One shared key encrypts & decrypts', 'Very fast — used for bulk data', 'Problem: how do both sides get the key over an open wire?'] },
    { name: 'Asymmetric', icon: Lock, tone: 'green', pts: ['Public key encrypts, private key decrypts', 'No pre-shared secret needed', 'Slow — only practical for small bootstrapping steps'] },
];
function CryptoDetail() {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2 w-full">
            {CRYPTO.map((c, i) => {
                const Icon = c.icon;
                return (
                    <div key={i} className={`rounded-xl border p-4 ${c.tone === 'blue' ? 'border-blue-500/40 bg-blue-500/5' : 'border-green-500/40 bg-green-500/5'}`}>
                        <div className={`flex items-center gap-2 mb-2 text-sm font-bold ${c.tone === 'blue' ? 'text-blue-300' : 'text-green-300'}`}>
                            <Icon className="h-4 w-4" />{c.name}
                        </div>
                        <div className="space-y-1.5">
                            {c.pts.map((p, j) => <div key={j} className="text-[11px] text-slate-400 leading-relaxed">• {p}</div>)}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

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

function DetailArea({ step }) {
    switch (step.detail) {
        case 'crypto':    return <CryptoDetail />;
        case 'paint':     return <PaintDetail phase={step.paint} />;
        case 'cert':      return <CertDetail phase={step.cert} />;
        case 'handshake': return <HandshakeDetail reveal={step.hs.reveal} current={step.hs.current} />;
        case 'rtt':       return <RttDetail />;
        case 'keys':      return <KeysDetail phase={step.keys} />;
        default:          return null;
    }
}

// ── Step generation ───────────────────────────────────────────────────────────
function generateSteps() {
    const steps = [];
    const s = (act, actName, data, explanation) => steps.push({ act, actName, ...data, explanation });

    // ═══ ACT 1: Why HTTPS ═══
    s(1, 'Why HTTPS', { packet: { at: 'server', label: 'GET /login', color: 'plain' }, eve: { text: 'GET /login  user=ada  pass=hunter2', safe: false } },
        'Plain HTTP sends everything as readable text. Between you and the server sit dozens of machines — routers, Wi-Fi access points, ISPs. Any of them (call the attacker "Eve") can read every byte. Watch: your login flies across the wire and Eve sees your password in the clear.');
    s(1, 'Why HTTPS', { eve: { text: 'GET /login  user=ada  pass=hunter2', safe: false } },
        'Worse, Eve can also modify the traffic in flight (inject ads, malware) or impersonate the server entirely. HTTPS is HTTP wrapped in TLS, and it delivers three guarantees: confidentiality (Eve can\'t read it), integrity (Eve can\'t alter it undetected), and authentication (you\'re really talking to example.com). The rest of this is how TLS pulls that off.');

    // ═══ ACT 2: Two kinds of crypto ═══
    s(2, 'Two Kinds of Crypto', { detail: 'crypto' },
        'Encryption comes in two flavours. Symmetric: one shared key both encrypts and decrypts — blazing fast, perfect for bulk data, but it has a chicken-and-egg problem: how do the two sides agree on that secret key over a wire Eve is watching? Asymmetric: a public/private key pair, no pre-shared secret needed, but far too slow for a whole conversation.');
    s(2, 'Two Kinds of Crypto', { detail: 'crypto' },
        'TLS uses the best of both. It uses clever asymmetric math ONCE, at the start, to let both sides agree on a shared symmetric key without ever transmitting it — then switches to fast symmetric encryption for the actual data. The trick that makes that agreement possible is a key exchange. Let\'s see the most intuitive one.');

    // ═══ ACT 3: Diffie-Hellman ═══
    s(3, 'Diffie-Hellman', { detail: 'paint', paint: 'common' },
        'The paint-mixing analogy for Diffie-Hellman key exchange. First, client and server publicly agree on a common paint — a shared starting colour that Eve is welcome to see. No secret yet.');
    s(3, 'Diffie-Hellman', { detail: 'paint', paint: 'secrets' },
        'Each side then picks a private secret colour and tells no one — not even each other. The client keeps blue; the server keeps red. These never leave their owners.');
    s(3, 'Diffie-Hellman', { detail: 'paint', paint: 'publics',
        packet: { at: 'mid', label: 'public mix', color: 'plain' }, eve: { text: 'common, client-mix, server-mix (public)', safe: false } },
        'Each side mixes common + its own secret and sends the result across the wire. The client sends its green mix; the server sends its orange mix. Eve intercepts both mixes and the common colour — that\'s fine, because un-mixing paint (separating a colour back into its ingredients) is practically impossible. That one-way difficulty is the whole point.');
    s(3, 'Diffie-Hellman', { detail: 'paint', paint: 'shared', eve: { text: 'common, green, orange — but NOT brown', safe: true } },
        'The magic finish: each side adds its own private colour to the mix it RECEIVED. Client does (server\'s orange + its blue); server does (client\'s green + its red). Both arrive at the exact same brown — a shared secret that was never sent. Eve has the common colour and both public mixes but cannot reach brown. A shared key now exists over a fully public channel.');

    // ═══ ACT 4: Certificates ═══
    s(4, 'Certificates', { detail: 'cert', cert: 'mitm' },
        'But Diffie-Hellman has a gap: it proves you share a secret with SOMEONE — not that the someone is really example.com. Eve could sit in the middle, doing a key exchange with you on one side and the real server on the other, relaying and reading everything. This is a man-in-the-middle attack. We need authentication.');
    s(4, 'Certificates', { detail: 'cert', cert: 'present' },
        'So the server presents an X.509 certificate: a document binding its identity (example.com) to its public key, cryptographically signed by a Certificate Authority (CA). Eve can\'t forge this — she doesn\'t have the CA\'s private signing key.');
    s(4, 'Certificates', { detail: 'cert', cert: 'chain' },
        'The browser verifies a chain of trust: the leaf cert is signed by an intermediate CA, which is signed by a root CA — and the root\'s public key is baked into your browser/OS trust store (~150 trusted roots). Each signature is checked. If every link holds, the identity is proven; if any link is broken or untrusted, you get the scary "your connection is not private" warning. Authentication solved.');

    // ═══ ACT 5: Handshake ═══
    s(5, 'The TLS 1.3 Handshake', { detail: 'handshake', hs: { reveal: 1, current: 0 },
        packet: { at: 'server', label: 'ClientHello', color: 'plain' } },
        'Now the real TLS 1.3 handshake, combining everything. The client opens with a ClientHello: the TLS version, the cipher suites it supports, SNI (which site it wants — so one IP can host many), and — crucially — its Diffie-Hellman key share, sent optimistically right away.');
    s(5, 'The TLS 1.3 Handshake', { detail: 'handshake', hs: { reveal: 2, current: 1 },
        packet: { at: 'client', label: 'ServerHello…', color: 'plain' } },
        'The server replies in a single flight: ServerHello with its chosen cipher and its own key share, its Certificate (for authentication), and a Finished message. After this one message, the server already has everything it needs to compute the shared secret.');
    s(5, 'The TLS 1.3 Handshake', { detail: 'handshake', hs: { reveal: 3, current: 2 },
        packet: { at: 'server', label: 'Finished', color: 'key' } },
        'The client verifies the certificate chain, combines the key shares into the shared secret, and sends its own Finished. Both sides now hold identical session keys, and the server\'s identity is proven. The secure channel is open — and it took just one round trip.');

    // ═══ ACT 6: 1-RTT ═══
    s(6, 'Why Only 1 Round Trip', { detail: 'rtt' },
        'That single round trip is a TLS 1.3 headline feature. TLS 1.2 needed two round trips: one to say hello and negotiate, a second to exchange keys — noticeable latency on every new connection. TLS 1.3 folds the key share into the very first message, so after one there-and-back the keys are ready. Session resumption can even achieve 0-RTT, sending encrypted data in the first packet.');

    // ═══ ACT 7: Encrypted data ═══
    s(7, 'Encrypted Application Data', { detail: 'keys', keys: 'derive', lockOn: true },
        'With the handshake done, both sides derive fast symmetric session keys from the shared secret. The expensive asymmetric work is over; from here everything uses AES — thousands of times faster. The padlock is now lit on both ends.');
    s(7, 'Encrypted Application Data', { detail: 'keys', keys: 'data', lockOn: true,
        packet: { at: 'server', label: 'ciphertext', color: 'enc' }, eve: { text: '9f3a c17b 88de 04a1 … (gibberish)', safe: true } },
        'Now the real HTTP request — the same GET /login from Act 1 — travels fully encrypted with AES-GCM. Eve, still sitting on the wire, now sees only meaningless ciphertext. And because GCM is an AEAD cipher, it authenticates too: if Eve flips even one bit, the tag check fails and the data is rejected. Confidentiality and integrity, together.');

    // ═══ ACT 8: Guarantees ═══
    s(8, 'The Guarantees', {
        recap: true, lockOn: true,
        wins: [
            { t: 'Confidentiality', d: 'AES-GCM session encryption — on-path attackers see only ciphertext.' },
            { t: 'Integrity', d: 'AEAD authentication tags detect any tampering; altered data is rejected.' },
            { t: 'Authentication', d: 'The certificate chain proves you\'re talking to the real server, not a MITM.' },
            { t: 'Forward secrecy', d: 'Ephemeral Diffie-Hellman keys mean a stolen key can\'t decrypt past traffic.' },
        ],
    }, 'That is HTTPS. Asymmetric key exchange (Diffie-Hellman) plus certificates establishes a shared secret and proves identity in one round trip; symmetric AES-GCM then protects every byte with both encryption and integrity. Confidentiality, integrity, authentication, and — because the DH keys are ephemeral — forward secrecy. The little padlock is all of that, running before your page even loads.');

    return steps;
}

// ── Router ──────────────────────────────────────────────────────────────────────
function VisualizationPanel({ step }) {
    if (!step) return null;
    if (step.recap) {
        return (
            <div className="w-full flex flex-col gap-4">
                <ChannelSvg step={step} />
                <RecapCards wins={step.wins} />
            </div>
        );
    }
    return (
        <div className="w-full flex flex-col gap-3">
            <ChannelSvg step={step} />
            <div className="min-h-[150px] flex items-center justify-center">
                <DetailArea step={step} />
            </div>
        </div>
    );
}

// ── Quiz ──────────────────────────────────────────────────────────────────────
const QUIZ = [
    {
        question: 'In Diffie-Hellman, why can an eavesdropper who sees the common value and both public mixes still not compute the shared secret?',
        options: [
            'The mixes are encrypted with a password',
            'Reversing the mix (recovering a private secret from a public mix) is computationally infeasible',
            'The eavesdropper is blocked by the firewall',
            'The shared secret is sent separately over the wire',
        ],
        correct: 1,
        explanation: 'DH relies on a one-way operation: mixing is easy, un-mixing is not. Eve sees the common value and both public mixes, but recovering either private secret from them is infeasible — so she cannot derive the shared secret, which itself is never transmitted.',
    },
    {
        question: 'What problem do TLS certificates solve that key exchange alone does not?',
        options: [
            'They make encryption faster',
            'They compress the data',
            'They authenticate identity — proving the public key belongs to the real server, stopping man-in-the-middle attacks',
            'They store the session keys on disk',
        ],
        correct: 2,
        explanation: 'Key exchange establishes a shared secret with *someone*, but not *who*. A certificate, signed by a CA and validated up a chain to a trusted root, binds the server\'s identity to its key — preventing an attacker from silently sitting in the middle.',
    },
    {
        question: 'How does TLS 1.3 complete its handshake in a single round trip?',
        options: [
            'It skips certificate verification',
            'It uses no encryption during the handshake',
            'The client sends its key share in the very first message, so keys are ready after one there-and-back',
            'It reuses the same key for every connection',
        ],
        correct: 2,
        explanation: 'TLS 1.3 puts the client\'s Diffie-Hellman key share in the ClientHello. The server replies with its share, certificate, and Finished in one flight, so both sides can derive keys after a single round trip — versus two in TLS 1.2.',
    },
];

function QuizPanel({ quizState, setQuizState }) {
    const q = QUIZ[quizState.current];
    if (quizState.complete) {
        return (
            <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-5 text-center">
                <div className="text-2xl font-bold text-white mb-1">{quizState.score}/{QUIZ.length}</div>
                <div className="text-zinc-400 text-sm mb-4">
                    {quizState.score === QUIZ.length ? 'Perfect — you understand what the padlock really means!' : 'Review the explanations to reinforce the concepts.'}
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

// ── Page ──────────────────────────────────────────────────────────────────────
const STEPS = generateSteps();

export default function HttpsAndTlsPage() {
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
                            <h1 className="text-2xl md:text-3xl font-bold text-white leading-tight">HTTPS &amp; TLS</h1>
                            <p className="text-zinc-300 text-sm mt-1">
                                What the padlock really means — Diffie-Hellman by paint mixing, the certificate chain of trust, and the 1-RTT TLS 1.3 handshake
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

            {/* Main 2-col layout */}
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
                            <div className="px-5 py-4 min-h-[400px] flex items-center">
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
                            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mb-3">TLS building blocks</p>
                            <div className="space-y-1.5 text-xs">
                                {[
                                    { acts: [2], label: 'Symmetric key', note: 'fast · bulk' },
                                    { acts: [3], label: 'Diffie-Hellman', note: 'shared secret' },
                                    { acts: [4], label: 'Certificate', note: 'authenticity' },
                                    { acts: [5, 6], label: 'Handshake', note: '1 RTT (1.3)' },
                                    { acts: [7], label: 'AES-GCM', note: 'AEAD data' },
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

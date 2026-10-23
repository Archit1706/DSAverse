import Link from 'next/link';
import {
    ArrowLeft, Network, Layers, Handshake, ArrowLeftRight, TrendingUp, Globe, Binary,
    Share2, Waypoints, Cable, Zap, Route, Lock, Workflow, Search, Monitor, Construction,
} from 'lucide-react';

export const metadata = {
    // Just the name: the root layout's "%s | DSAverse" template adds the
    // suffix. Spelling it out here would double it.
    title: 'Computer Networks',
    description: 'Interactive visualizations of the protocols that move data between machines — encapsulation, TCP, sliding windows, congestion control, DNS, subnetting, routing, ARP and HTTP.',
};

/* Cards come in three flavours:
     - built here          -> links to /computer-networks/<slug>
     - covered elsewhere   -> `href` + `coveredIn` link out to the existing page
     - not built yet       -> available: false, renders as a dead Coming Soon card
   Built pages run bottom-up through the stack, the order
   data/algorithmCategories.js should list them in; the Under the Hood
   explainers they build on follow. Where Big-O does not apply, time and space
   carry a short descriptor instead, as Under the Hood does. */
const algorithms = [
    {
        name: 'OSI and TCP/IP Layers',
        slug: 'osi-and-tcp-ip-layers',
        icon: Layers,
        description: 'A message travels down the stack gaining a header per layer, crosses the wire as bits, and is unwrapped layer by layer on the way up.',
        time: '1 header per layer',
        space: '58 B of framing',
        pattern: 'Encapsulation',
        difficulty: 'Beginner',
        available: true,
    },
    {
        name: 'TCP Handshake',
        slug: 'tcp-handshake',
        icon: Handshake,
        description: 'SYN, SYN-ACK, ACK with real sequence numbers, both endpoints walking their state machines, then the FIN teardown and TIME_WAIT.',
        time: '1.5 RTT to open',
        space: '11 TCP states',
        pattern: 'Three-Way Handshake',
        difficulty: 'Beginner',
        available: true,
    },
    {
        name: 'Sliding Window Protocols',
        slug: 'sliding-window-protocols',
        icon: ArrowLeftRight,
        description: 'Stop-and-Wait, Go-Back-N and Selective Repeat with packets and ACKs in flight, losses you inject, timeouts and a window that slides.',
        time: 'W packets per RTT',
        space: 'O(W) buffer',
        pattern: 'ARQ',
        difficulty: 'Intermediate',
        available: true,
    },
    {
        name: 'TCP Congestion Control',
        slug: 'tcp-congestion-control',
        icon: TrendingUp,
        description: 'cwnd plotted round by round: slow start, ssthresh, additive increase and multiplicative decrease, and why Reno treats three duplicate ACKs gentler than a timeout.',
        time: 'cwnd per RTT',
        space: 'O(1) state',
        pattern: 'AIMD',
        difficulty: 'Intermediate',
        available: true,
    },
    {
        name: 'DNS Resolution',
        slug: 'dns-resolution',
        icon: Globe,
        description: 'A stub resolver asks a recursive resolver, which walks root, TLD and authoritative servers — then answers the next lookup from cache until the TTL runs out.',
        time: '3 referrals cold, 0 warm',
        space: 'cache bounded by TTL',
        pattern: 'Iterative Referral',
        difficulty: 'Beginner',
        available: true,
    },
    {
        name: 'Subnetting and CIDR',
        slug: 'subnetting-and-cidr',
        icon: Binary,
        description: 'An IPv4 address as 32 bits under a mask: network and broadcast addresses, the usable host range, and whether two hosts share a subnet.',
        time: 'O(1) AND',
        space: '32 bits',
        pattern: 'Bitmasking',
        difficulty: 'Beginner',
        available: true,
    },
    {
        name: 'Distance Vector Routing',
        slug: 'distance-vector-routing',
        icon: Share2,
        description: 'Routers trade distance tables Bellman-Ford style until they converge — then a link fails, bad news counts to infinity, and poison reverse steps in.',
        time: 'O(diameter) rounds',
        space: 'O(V) per router',
        pattern: 'Bellman-Ford',
        difficulty: 'Advanced',
        available: true,
    },
    {
        name: 'Link State Routing',
        slug: 'link-state-routing',
        icon: Waypoints,
        description: 'Link-state advertisements flood the network until every router holds the same map, and each one runs Dijkstra for its own forwarding table.',
        time: 'O(E log V) per router',
        space: 'O(V + E) map',
        pattern: 'Flooding + Dijkstra',
        difficulty: 'Advanced',
        available: true,
    },
    {
        name: 'ARP and Switching',
        slug: 'arp-and-switching',
        icon: Cable,
        description: 'An ARP request is broadcast and answered, and a switch learns which MAC lives on which port: flood while the destination is unknown, forward once learned.',
        time: 'O(1) table lookup',
        space: 'O(hosts) table',
        pattern: 'Learn / Flood / Forward',
        difficulty: 'Beginner',
        available: true,
    },
    {
        name: 'HTTP/1.1 vs HTTP/2 vs HTTP/3',
        slug: 'http1-vs-http2-vs-http3',
        icon: Zap,
        description: 'Head-of-line blocking three ways: queued responses in HTTP/1.1, one lost TCP segment stalling every HTTP/2 stream, and QUIC isolating streams over UDP.',
        time: 'HOL per version',
        space: '1 connection',
        pattern: 'Multiplexing',
        difficulty: 'Intermediate',
        available: true,
    },
    {
        name: 'How the Internet Routes a Packet',
        slug: 'how-the-internet-routes-a-packet',
        href: '/under-the-hood/how-the-internet-routes-a-packet',
        coveredIn: 'Under the Hood',
        icon: Route,
        description: 'One packet hop by hop: the subnet test, the default gateway, NAT, longest prefix match, TTL and the BGP announcements behind every routing table.',
        time: 'hop by hop',
        space: '20-byte header',
        pattern: 'Longest Prefix Match',
        difficulty: 'Intermediate',
        available: true,
    },
    {
        name: 'HTTPS and TLS',
        slug: 'https-and-tls',
        href: '/under-the-hood/https-and-tls',
        coveredIn: 'Under the Hood',
        icon: Lock,
        description: 'Certificate chains, Diffie-Hellman key exchange and the one-round-trip TLS 1.3 handshake that sits between TCP and HTTP.',
        time: '1 RTT (TLS 1.3)',
        space: 'O(1)',
        pattern: 'Asymmetric → Symmetric',
        difficulty: 'Advanced',
        available: true,
    },
    {
        name: 'How a REST API Works',
        slug: 'how-a-rest-api-works',
        href: '/under-the-hood/how-a-rest-api-works',
        coveredIn: 'Under the Hood',
        icon: Workflow,
        description: 'HTTP verbs, status codes, headers and statelessness — the request/response contract that rides on top of everything in this section.',
        time: 'O(1) request',
        space: 'stateless',
        pattern: 'Request/Response',
        difficulty: 'Beginner',
        available: true,
    },
    {
        name: 'What Happens When You Search a URL',
        slug: 'what-happens-when-you-search-a-url',
        href: '/under-the-hood/what-happens-when-you-search-a-url',
        coveredIn: 'Under the Hood',
        icon: Search,
        description: 'The whole trip end to end — DNS, the TCP and TLS handshakes, the HTTP exchange and rendering — before this section takes each piece apart.',
        time: '~300ms cold',
        space: '8 stages',
        pattern: 'Full Stack',
        difficulty: 'Intermediate',
        available: true,
    },
    {
        name: 'How the Browser Renders a Page',
        slug: 'how-the-browser-renders-a-page',
        href: '/under-the-hood/how-the-browser-renders-a-page',
        coveredIn: 'Under the Hood',
        icon: Monitor,
        description: 'What happens to the bytes once HTTP has delivered them: DOM, CSSOM, layout, paint and compositing.',
        time: 'per frame',
        space: '8 acts',
        pattern: 'Critical Render Path',
        difficulty: 'Intermediate',
        available: true,
    },
];

const getDifficultyColor = (d) => {
    if (d === 'Beginner') return 'bg-green-500/15 text-green-400';
    if (d === 'Intermediate') return 'bg-yellow-500/15 text-yellow-400';
    return 'bg-red-500/15 text-red-400';
};

export default function ComputerNetworksPage() {
    return (
        <div className="min-h-screen bg-slate-950">
            {/* Header */}
            <div className="bg-gradient-to-r from-pink-500 to-rose-600 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                    <Link href="/" className="flex items-center text-white hover:text-pink-100 transition-colors mb-8 w-fit">
                        <ArrowLeft className="h-5 w-5 mr-2" />Back to Home
                    </Link>
                    <div className="text-center">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/20 mb-6">
                            <Network className="h-8 w-8 text-white" />
                        </div>
                        <h1 className="text-4xl md:text-5xl font-bold mb-4">Computer Networks</h1>
                        <p className="text-xl text-pink-100 max-w-3xl mx-auto">
                            Every connection is a stack of small agreements. Watch a message gain its headers, a TCP
                            window slide, cwnd saw up and down, and routing tables argue their way to the same answer.
                        </p>
                    </div>
                </div>
            </div>

            {/* Cards */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {algorithms.map(algo => {
                        const Icon = algo.available ? algo.icon : Construction;
                        const card = (
                            <div className="h-full flex flex-col bg-slate-900/70 rounded-2xl border border-slate-700/50 overflow-hidden hover:border-pink-500/50 transition-colors group">
                                <div className={`bg-gradient-to-br from-pink-500 to-rose-600 p-6 ${!algo.available ? 'opacity-60' : ''}`}>
                                    <div className="flex items-center justify-between">
                                        <Icon className="h-8 w-8 text-white" />
                                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${getDifficultyColor(algo.difficulty)}`}>
                                            {algo.difficulty}
                                        </span>
                                    </div>
                                    <h3 className="text-xl font-bold text-white mt-3">{algo.name}</h3>
                                    {algo.coveredIn && (
                                        <span className="text-xs text-pink-100/80">Covered in {algo.coveredIn}</span>
                                    )}
                                    {!algo.available && (
                                        <span className="text-xs text-pink-100/70">Coming Soon</span>
                                    )}
                                </div>
                                <div className="flex-1 flex flex-col p-6 gap-4">
                                    <p className="text-slate-400 text-sm leading-relaxed">{algo.description}</p>
                                    <div className="mt-auto space-y-2 text-sm">
                                        <div className="flex justify-between gap-3">
                                            <span className="text-slate-500">Time</span>
                                            <code className="bg-pink-500/15 text-pink-400 px-2 py-0.5 rounded text-xs text-right">{algo.time}</code>
                                        </div>
                                        <div className="flex justify-between gap-3">
                                            <span className="text-slate-500">Space</span>
                                            <code className="bg-pink-500/15 text-pink-400 px-2 py-0.5 rounded text-xs text-right">{algo.space}</code>
                                        </div>
                                        <div className="flex justify-between gap-3">
                                            <span className="text-slate-500">Pattern</span>
                                            <code className="bg-pink-500/15 text-pink-400 px-2 py-0.5 rounded text-xs text-right">{algo.pattern}</code>
                                        </div>
                                    </div>
                                    {!algo.available ? (
                                        <span className="text-slate-500 text-sm">Coming Soon</span>
                                    ) : (
                                        <div className="flex items-center gap-2 text-pink-400 text-sm font-medium group-hover:text-pink-300 transition-colors">
                                            {algo.coveredIn ? `Open in ${algo.coveredIn} →` : 'Start Visualization →'}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                        return algo.available ? (
                            <Link key={algo.slug} href={algo.href ?? `/computer-networks/${algo.slug}`} className="h-full flex flex-col">{card}</Link>
                        ) : (
                            <div key={algo.slug} className="h-full flex flex-col opacity-50 cursor-not-allowed">{card}</div>
                        );
                    })}
                </div>
            </div>

            {/* Why Learn */}
            <div className="border-t border-slate-700/50 bg-slate-900/70">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <h2 className="text-2xl font-bold text-white mb-8 text-center">Why Learn Computer Networks?</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                        {[
                            { title: 'Latency Is A Protocol Cost', body: 'A page load pays for a DNS lookup, a TCP handshake and a TLS handshake before the first byte of HTML. Counting round trips explains most of what makes a site feel slow.' },
                            { title: 'Reliability Is Built, Not Given', body: 'IP drops, duplicates and reorders packets. Sequence numbers, windows, timeouts and congestion control are how TCP manufactures a clean byte stream out of that.' },
                            { title: 'Debugging Needs The Layers', body: 'Is it DNS, the subnet mask, an ARP cache, a routing loop or head-of-line blocking? Knowing which layer owns a symptom is most of the work in fixing a network fault.' },
                        ].map(item => (
                            <div key={item.title} className="bg-slate-800/50 rounded-xl p-5 border border-slate-700/50">
                                <h3 className="text-pink-400 font-semibold mb-2">{item.title}</h3>
                                <p className="text-slate-400 leading-relaxed">{item.body}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

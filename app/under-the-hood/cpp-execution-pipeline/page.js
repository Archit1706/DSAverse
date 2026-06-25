"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Play, Pause, SkipBack, SkipForward, RotateCcw, Info,
    FileCode, Cog, Binary, Link2, MemoryStick, Cpu, Gauge,
    ChevronRight, CheckCircle, XCircle, Zap, Boxes,
} from 'lucide-react';

// ── Acts ──────────────────────────────────────────────────────────────────────
const ACTS = [
    { id: 1, label: 'Source',       icon: FileCode    },
    { id: 2, label: 'Preprocessor', icon: ChevronRight },
    { id: 3, label: 'Compiler',     icon: Cog         },
    { id: 4, label: 'Assembler',    icon: Binary      },
    { id: 5, label: 'Linker',       icon: Link2       },
    { id: 6, label: 'Loader',       icon: MemoryStick },
    { id: 7, label: 'CPU',          icon: Cpu         },
    { id: 8, label: 'Why Fast',     icon: Gauge       },
];

// ── Compiler sub-phases (Act 3) ─────────────────────────────────────────────────
const COMPILER_PHASES = [
    { id: 'lex',      label: 'Lexer',    sub: 'text → tokens' },
    { id: 'parse',    label: 'Parser',   sub: 'tokens → AST'  },
    { id: 'semantic', label: 'Semantic', sub: 'type checking' },
    { id: 'optimize', label: 'Optimizer',sub: 'IR transforms' },
    { id: 'codegen',  label: 'CodeGen',  sub: 'AST → assembly'},
];

// ── Code line helper ────────────────────────────────────────────────────────────
function CodeLines({ lines, title }) {
    const cls = {
        norm: 'text-slate-300',
        dim:  'text-slate-600',
        dir:  'text-orange-300',
        add:  'text-green-300 bg-green-500/10',
        rm:   'text-red-300/70 bg-red-500/10 line-through decoration-red-500/40',
        hot:  'text-yellow-200 bg-yellow-500/10',
        cmt:  'text-slate-500 italic',
    };
    return (
        <div className="rounded-xl border border-slate-700/60 bg-slate-950/60 overflow-hidden">
            {title && <div className="px-3 py-1.5 border-b border-slate-800/60 text-[10px] font-mono text-slate-500">{title}</div>}
            <pre className="p-3 text-[12px] font-mono leading-relaxed overflow-x-auto">
                {lines.map((l, i) => (
                    <div key={i} className={`px-1 rounded ${cls[l.t || 'norm']}`}>{l.x || ' '}</div>
                ))}
            </pre>
        </div>
    );
}

// ── Step generation ───────────────────────────────────────────────────────────
function generateSteps() {
    const steps = [];
    const s = (act, actName, phase, data, explanation) => steps.push({ act, actName, phase, ...data, explanation });

    // ═══ ACT 1: Source ═══
    s(1, 'The Source Files', 'files', {
        files: [
            { name: 'circle.h',   role: 'Header — declarations & macros', icon: 'h' },
            { name: 'main.cpp',   role: 'Uses area(); prints result',     icon: 'cpp' },
            { name: 'circle.cpp', role: 'Defines area()',                 icon: 'cpp' },
        ],
    }, 'A C++ program is plain text spread across source files (.cpp) and headers (.h). The CPU cannot run a single character of this — it is for humans. Our example has three files: a header declaring area(), a main.cpp that calls it, and circle.cpp that defines it. The toolchain will turn all of this into one native executable.');

    s(1, 'The Source Files', 'program', {
        code: [
            { x: '// circle.h', t: 'cmt' },
            { x: '#define PI 3.14159', t: 'dir' },
            { x: 'double area(double r);', t: 'norm' },
            { x: '', t: 'norm' },
            { x: '// main.cpp', t: 'cmt' },
            { x: '#include <iostream>', t: 'dir' },
            { x: '#include "circle.h"', t: 'dir' },
            { x: 'int main() {', t: 'norm' },
            { x: '    double a = area(2.0);', t: 'norm' },
            { x: '    std::cout << a;', t: 'norm' },
            { x: '    return 0;', t: 'norm' },
            { x: '}', t: 'norm' },
        ],
    }, 'Here is the whole program. Notice two kinds of lines: lines starting with # are preprocessor directives (handled first, before real compilation), and the rest is actual C++. main() calls area(2.0) — but the definition of area lives in another file. Keep that in mind: resolving that reference is the linker\'s job, several stages from now.');

    // ═══ ACT 2: Preprocessor ═══
    s(2, 'Preprocessing', 'directives', {
        code: [
            { x: '#define PI 3.14159', t: 'dir' },
            { x: '#include <iostream>', t: 'dir' },
            { x: '#include "circle.h"', t: 'dir' },
            { x: 'int main() { ... }', t: 'dim' },
        ],
    }, 'The preprocessor runs first. It is a pure text-substitution engine — it does not understand C++ at all. It only acts on # directives: #include (paste a file in), #define (text macros), and #if/#ifdef (conditional compilation). Everything else is passed through untouched.');

    s(2, 'Preprocessing', 'include_expand', {
        code: [
            { x: '#include <iostream>', t: 'rm' },
            { x: '// ↓ pasted verbatim:', t: 'cmt' },
            { x: '// ~28,000 lines of <iostream>', t: 'add' },
            { x: '// declarations (ostream, cout…)', t: 'add' },
            { x: '#include "circle.h"', t: 'rm' },
            { x: 'double area(double r);', t: 'add' },
        ],
    }, '#include is literally a copy-paste. #include <iostream> drops ~28,000 lines of standard-library declarations into your file. #include "circle.h" pastes in the area() declaration. This is why heavy headers slow compilation — every translation unit re-parses them. (Modules in C++20 fix this.)');

    s(2, 'Preprocessing', 'macro_expand', {
        before: 'return PI * r * r;',
        after:  'return 3.14159 * r * r;',
    }, '#define PI 3.14159 is a macro — a find-and-replace done by text, with no type checking. Every PI token is swapped for 3.14159 before the compiler ever sees it. Macros are powerful but blunt: because they are textual, SQUARE(a+b) expanding to a+b*a+b is the classic bug. Prefer constexpr in modern C++.');

    s(2, 'Preprocessing', 'translation_unit', {
        code: [
            { x: '// translation unit (pure C++)', t: 'cmt' },
            { x: 'double area(double r);', t: 'norm' },
            { x: '// …iostream declarations…', t: 'dim' },
            { x: 'int main() {', t: 'norm' },
            { x: '    double a = area(2.0);', t: 'norm' },
            { x: '    std::cout << a;', t: 'norm' },
            { x: '    return 0;', t: 'norm' },
            { x: '}', t: 'norm' },
        ],
    }, 'The output is a translation unit: one self-contained blob of pure C++ with all directives resolved — no more #. Each .cpp becomes its own translation unit and is compiled independently. This is the actual input to the compiler proper.');

    // ═══ ACT 3: Compiler ═══
    s(3, 'Compilation', 'lex', {
        compPhase: 'lex',
        tokens: ['double', 'area', '(', 'double', 'r', ')', '{', 'return', 'PI', '*', 'r', '*', 'r', ';', '}'],
    }, 'The compiler turns one translation unit into assembly through several phases. First, the lexer (tokenizer) scans the character stream and groups it into tokens: keywords (double, return), identifiers (area, r), and punctuation. Whitespace and comments are discarded here.');

    s(3, 'Compilation', 'parse', {
        compPhase: 'parse',
        ast: [
            { d: 0, x: 'FunctionDecl  area → double' },
            { d: 1, x: 'Param  r : double' },
            { d: 1, x: 'ReturnStmt' },
            { d: 2, x: 'BinaryExpr  *' },
            { d: 3, x: 'BinaryExpr  *' },
            { d: 4, x: 'Literal 3.14159' },
            { d: 4, x: 'DeclRef r' },
            { d: 3, x: 'DeclRef r' },
        ],
    }, 'The parser consumes tokens according to C++ grammar and builds an Abstract Syntax Tree (AST) — a structured tree representing the code\'s meaning. The expression PI * r * r becomes nested multiply nodes. A syntax error (a missing semicolon) is caught right here.');

    s(3, 'Compilation', 'semantic', {
        compPhase: 'semantic',
        checks: [
            { ok: true,  txt: 'area declared before use' },
            { ok: true,  txt: 'r is double — operands match' },
            { ok: true,  txt: 'return type double ✓' },
            { ok: false, txt: 'area(2.0) — definition external (deferred to linker)' },
        ],
    }, 'Semantic analysis walks the AST checking meaning: are types compatible? Is every name declared? Does the return type match? This is where "cannot convert int to std::string" comes from. Note the call to area is only declared here, not defined — the compiler trusts it exists and leaves a note for the linker.');

    s(3, 'Compilation', 'optimize', {
        compPhase: 'optimize',
        before: 'double t1 = r * r;  double t2 = 3.14159 * t1;  return t2;',
        after:  'return 3.14159 * r * r;   ; fused, regs reused',
    }, 'The optimizer rewrites an intermediate representation (IR) to run faster while preserving behavior. Constant folding, dead-code elimination, inlining, loop unrolling, and register allocation all happen here. -O2 vs -O0 is the difference between aggressive and minimal optimization. This is a huge reason compiled code is fast.');

    s(3, 'Compilation', 'codegen', {
        compPhase: 'codegen',
        asm: [
            'area(double):',
            '    mulsd   xmm0, xmm0        ; r * r',
            '    mulsd   xmm0, [PI]        ; * 3.14159',
            '    ret',
            'main:',
            '    movsd   xmm0, [two]       ; 2.0',
            '    call    area(double)      ; <- unresolved',
            '    ...',
        ],
    }, 'Code generation emits target-specific assembly — here x86-64. Floating-point math uses the xmm registers and SSE instructions (mulsd = multiply scalar double). The call to area is emitted as a placeholder: the compiler does not yet know area\'s address. The result is a .s assembly file, still human-readable text.');

    // ═══ ACT 4: Assembler ═══
    s(4, 'Assembling', 'encode', {
        mapping: [
            { asm: 'mulsd xmm0, xmm0', hex: 'F2 0F 59 C0' },
            { asm: 'ret',              hex: 'C3' },
            { asm: 'push rbp',         hex: '55' },
            { asm: 'call area',        hex: 'E8 00 00 00 00' },
        ],
    }, 'The assembler translates each assembly mnemonic into the exact bytes the CPU decodes — its opcode encoding. mulsd xmm0, xmm0 becomes F2 0F 59 C0. This is a near 1-to-1 mapping; assembly is just a readable spelling of machine code. The call\'s address bytes are left as 00 00 00 00 — a relocation placeholder.');

    s(4, 'Assembling', 'object_file', {
        sections: [
            { name: '.text',   desc: 'machine code (instructions)', color: 'blue' },
            { name: '.data',   desc: 'initialized globals',          color: 'green' },
            { name: '.bss',    desc: 'zero-initialized globals',     color: 'slate' },
            { name: '.symtab', desc: 'symbol table',                 color: 'purple' },
        ],
        symbols: [
            { name: 'main',          status: 'defined' },
            { name: 'area(double)',  status: 'undefined' },
            { name: 'std::cout',     status: 'undefined' },
        ],
    }, 'The output is an object file (main.o) — binary machine code, not yet runnable. It is organized into sections: .text (code), .data, .bss, and a symbol table. The symbol table records what this file defines (main) and what it needs from elsewhere (area, std::cout — marked undefined). Each .cpp compiles to its own .o independently.');

    // ═══ ACT 5: Linker ═══
    s(5, 'Linking', 'inputs', {
        objs: [
            { name: 'main.o',   provides: 'main',         needs: 'area, cout' },
            { name: 'circle.o', provides: 'area(double)', needs: '—' },
            { name: 'libstdc++', provides: 'std::cout',   needs: '—' },
        ],
    }, 'The linker takes all the object files plus libraries and stitches them into one executable. main.o needs area and std::cout; circle.o provides area; the C++ standard library provides std::cout. The linker\'s job is to make every "needs" find its "provides".');

    s(5, 'Linking', 'resolve', {
        resolutions: [
            { from: 'main.o → area',      to: 'circle.o',  ok: true },
            { from: 'main.o → std::cout', to: 'libstdc++', ok: true },
        ],
    }, 'Symbol resolution: the linker matches each undefined symbol to a definition and patches the placeholder addresses (relocation) — that call 00 00 00 00 becomes the real address of area. If a symbol has no definition, you get the infamous "undefined reference to area" linker error. If two files define it, "multiple definition".');

    s(5, 'Linking', 'executable', {
        result: 'a.out',
        layout: ['ELF header', '.text (all code)', '.data', 'symbol/reloc info'],
    }, 'Out comes a single executable (a.out on Linux, an ELF file). All code and data are merged, addresses are fixed, and an entry point is recorded. With static linking the library code is baked in; with dynamic linking (the default) only a reference is stored and the .so is loaded at runtime — which is the loader\'s job.');

    // ═══ ACT 6: Loader ═══
    s(6, 'Loading', 'exec', {
        loadSteps: [
            { txt: 'Shell calls execve("./a.out")', done: true },
            { txt: 'Kernel reads ELF header', done: true },
            { txt: 'Creates virtual address space', done: false },
        ],
    }, 'You type ./a.out. The shell calls execve(); the kernel reads the ELF header, verifies it, and sets up a fresh virtual address space for the new process. The executable is not copied into RAM all at once — pages are mapped lazily and faulted in on first access (demand paging).');

    s(6, 'Loading', 'segments', {
        memory: [
            { name: 'Stack',  dir: '↓ grows down', color: 'orange', desc: 'locals, return addrs' },
            { name: '(gap)',  dir: '',             color: 'slate',  desc: 'unmapped' },
            { name: 'Heap',   dir: '↑ grows up',   color: 'green',  desc: 'new / malloc' },
            { name: '.bss',   dir: '',             color: 'slate',  desc: 'zeroed globals' },
            { name: '.data',  dir: '',             color: 'blue',   desc: 'init globals' },
            { name: '.text',  dir: '',             color: 'purple', desc: 'machine code (read-only)' },
        ],
    }, 'The process memory is laid out in segments. .text holds the read-only machine code; .data and .bss hold globals; the heap grows upward (new/malloc); the stack grows downward (function locals and return addresses). They grow toward each other — a collision is a stack overflow. Each process gets its own private virtual view of this.');

    s(6, 'Loading', 'jump', {
        loadSteps: [
            { txt: 'Dynamic linker maps libstdc++.so', done: true },
            { txt: 'Relocations applied', done: true },
            { txt: 'Jump to _start → main()', done: true },
        ],
    }, 'For dynamic linking, ld.so maps the shared libraries into the address space and applies final relocations. Then control jumps to _start (C runtime setup), which eventually calls your main(). The program is now live. From here on, it is just the CPU.');

    // ═══ ACT 7: CPU ═══
    s(7, 'CPU Execution', 'fetch', {
        cpuStage: 'fetch',
        rip: '0x401136', ir: 'movsd xmm0, [two]',
        regs: { RIP: '0x401136', RSP: '0x7ffd…e80', xmm0: '—', RAX: '0' },
    }, 'The CPU runs a relentless fetch-decode-execute cycle, billions of times per second. FETCH: the instruction pointer RIP (0x401136) addresses the next instruction in .text; the CPU loads its bytes from memory (usually already in the L1 instruction cache) into the instruction register.');

    s(7, 'CPU Execution', 'decode', {
        cpuStage: 'decode',
        rip: '0x401136', ir: 'movsd xmm0, [two]',
        regs: { RIP: '0x401136', RSP: '0x7ffd…e80', xmm0: '—', RAX: '0' },
    }, 'DECODE: the control unit interprets the opcode bytes (F2 0F 10 …) and figures out what to do — this is a "load a double into xmm0" operation, with a memory operand. On modern x86 chips the instruction is split into smaller micro-ops here.');

    s(7, 'CPU Execution', 'execute', {
        cpuStage: 'execute',
        rip: '0x401136', ir: 'movsd xmm0, [two]',
        regs: { RIP: '0x40113e', RSP: '0x7ffd…e80', xmm0: '2.0', RAX: '0' },
    }, 'EXECUTE + WRITEBACK: the value 2.0 is loaded into xmm0, and RIP advances to the next instruction (0x40113e). Then the cycle repeats: the next fetch grabs call area, which pushes a return address onto the stack and jumps into area\'s code. No interpreter, no translation — the silicon runs these bytes directly.');

    s(7, 'CPU Execution', 'pipeline', {
        cpuStage: 'execute',
        rip: '0x40113e', ir: 'call area(double)',
        regs: { RIP: '0x401143', RSP: '0x7ffd…e78', xmm0: '2.0', RAX: '0' },
        note: 'Pipelining: 5+ instructions in flight at once',
    }, 'Real CPUs overlap these stages: while one instruction executes, the next is decoded and a third is fetched — instruction pipelining. They also predict branches and execute out of order. The takeaway: each line of your C++ became a handful of native instructions the CPU devours directly. That is the whole point of compiling ahead of time.');

    // ═══ ACT 8: Why fast ═══
    s(8, 'Compiled vs Interpreted', 'paths', {
        paths: [
            { lang: 'C++',    chain: ['source', 'compile ONCE', 'native machine code', 'CPU'], color: 'green' },
            { lang: 'Python', chain: ['source', 'bytecode', 'VM interprets EACH op', 'CPU'], color: 'orange' },
        ],
    }, 'Why is C++ often ~10–100× faster than Python? C++ is compiled ahead of time: all the analysis, optimization, and translation happen once, and the CPU then runs raw machine code. Python compiles to bytecode that a virtual machine interprets op-by-op at runtime — every operation pays a software dispatch and dynamic-type cost on every execution.');

    s(8, 'Compiled vs Interpreted', 'timing', {
        bars: [
            { lang: 'C / C++ (-O2)', rel: 1,   color: 'green',  w: 4 },
            { lang: 'Java / C# (JIT)', rel: 2, color: 'blue',   w: 8 },
            { lang: 'JavaScript (V8)', rel: 4, color: 'yellow', w: 16 },
            { lang: 'Python (CPython)', rel: 50, color: 'orange', w: 100 },
        ],
    }, 'Rough relative runtime on a CPU-bound benchmark (lower is faster). Native C++ is the baseline; a JIT (Java, V8) compiles hot code to native at runtime so it catches up; pure interpreters like CPython sit far behind. The trade-off: C++ pays this cost upfront (slow builds, manual memory) to win at runtime. The next visualizer — Garbage Collection — covers how managed languages reclaim memory automatically, a cost C++ avoids by making you do it.');

    return steps;
}

// ── Scenes ────────────────────────────────────────────────────────────────────
const fileIcon = { h: 'text-purple-400', cpp: 'text-blue-400' };

function SceneSource({ step }) {
    if (step.phase === 'files') {
        return (
            <div className="flex flex-col gap-3 py-8 max-w-md mx-auto">
                {step.files.map((f, i) => (
                    <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-700/60 bg-slate-900/50">
                        <FileCode className={`h-5 w-5 shrink-0 ${fileIcon[f.icon]}`} />
                        <div>
                            <div className="font-mono text-sm font-semibold text-slate-200">{f.name}</div>
                            <div className="text-xs text-slate-500">{f.role}</div>
                        </div>
                    </div>
                ))}
            </div>
        );
    }
    return <div className="py-4"><CodeLines lines={step.code} title="source" /></div>;
}

function ScenePreprocessor({ step }) {
    if (step.phase === 'macro_expand') {
        return (
            <div className="flex flex-col items-center justify-center h-full gap-4 py-8">
                <div className="text-[10px] uppercase tracking-widest text-orange-400 font-semibold">#define PI 3.14159</div>
                <code className="px-4 py-2 rounded-lg bg-slate-900/60 border border-slate-700/60 text-sm font-mono text-slate-300">{step.before}</code>
                <div className="text-slate-600 text-xl">↓ textual substitution</div>
                <code className="px-4 py-2 rounded-lg bg-green-500/10 border border-green-500/30 text-sm font-mono text-green-300">{step.after}</code>
                <p className="text-[11px] text-slate-600 text-center max-w-xs">PI is replaced by its text — no type, no scope, no math performed yet.</p>
            </div>
        );
    }
    return <div className="py-4"><CodeLines lines={step.code} title={step.phase === 'translation_unit' ? 'translation unit' : 'preprocessor input'} /></div>;
}

function CompilerStrip({ active }) {
    return (
        <div className="flex flex-wrap items-center justify-center gap-1 mb-4">
            {COMPILER_PHASES.map((p, i) => {
                const isActive = p.id === active;
                const idx = COMPILER_PHASES.findIndex(x => x.id === active);
                const isDone = i < idx;
                return (
                    <div key={p.id} className="flex items-center gap-1">
                        <div className={`flex flex-col items-center px-2.5 py-1.5 rounded-lg border text-center transition-all ${
                            isActive ? 'border-zinc-400/60 bg-zinc-500/20 scale-105'
                            : isDone ? 'border-green-700/40 bg-green-500/5 opacity-60'
                            : 'border-slate-800 bg-slate-900/20 opacity-35'
                        }`}>
                            <span className={`text-[11px] font-bold ${isActive ? 'text-zinc-200' : isDone ? 'text-slate-400' : 'text-slate-600'}`}>{p.label}</span>
                            <span className="text-[9px] text-slate-600">{p.sub}</span>
                        </div>
                        {i < COMPILER_PHASES.length - 1 && <ChevronRight className="h-3 w-3 text-slate-700 shrink-0" />}
                    </div>
                );
            })}
        </div>
    );
}

function SceneCompiler({ step }) {
    return (
        <div className="py-4">
            <CompilerStrip active={step.compPhase} />
            {step.tokens && (
                <div className="flex flex-wrap gap-1.5 justify-center">
                    {step.tokens.map((t, i) => (
                        <span key={i} className="px-2 py-1 rounded-md bg-blue-500/10 border border-blue-500/30 text-xs font-mono text-blue-300">{t}</span>
                    ))}
                </div>
            )}
            {step.ast && (
                <div className="rounded-xl border border-slate-700/60 bg-slate-950/60 p-3 font-mono text-xs max-w-md mx-auto">
                    {step.ast.map((n, i) => (
                        <div key={i} className="text-slate-300" style={{ paddingLeft: `${n.d * 16}px` }}>
                            <span className="text-slate-600">{n.d > 0 ? '└─ ' : ''}</span>{n.x}
                        </div>
                    ))}
                </div>
            )}
            {step.checks && (
                <div className="flex flex-col gap-2 max-w-md mx-auto">
                    {step.checks.map((c, i) => (
                        <div key={i} className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs ${c.ok ? 'border-green-500/30 bg-green-500/5 text-green-300' : 'border-yellow-500/30 bg-yellow-500/5 text-yellow-300'}`}>
                            {c.ok ? <CheckCircle className="h-3.5 w-3.5 shrink-0" /> : <Info className="h-3.5 w-3.5 shrink-0" />}
                            {c.txt}
                        </div>
                    ))}
                </div>
            )}
            {step.compPhase === 'optimize' && (
                <div className="flex flex-col items-center gap-3 max-w-lg mx-auto">
                    <code className="w-full px-3 py-2 rounded-lg bg-red-500/5 border border-red-500/20 text-red-300/80 text-[11px] font-mono">{step.before}</code>
                    <div className="text-slate-600 text-xs">↓ optimize (-O2)</div>
                    <code className="w-full px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/30 text-green-300 text-[11px] font-mono">{step.after}</code>
                </div>
            )}
            {step.asm && (
                <CodeLines lines={step.asm.map(x => ({ x, t: x.endsWith(':') ? 'hot' : 'norm' }))} title="x86-64 assembly (.s)" />
            )}
        </div>
    );
}

const sectionColor = {
    blue:   'border-blue-500/40 text-blue-300',
    green:  'border-green-500/40 text-green-300',
    slate:  'border-slate-600/50 text-slate-400',
    purple: 'border-purple-500/40 text-purple-300',
    orange: 'border-orange-500/40 text-orange-300',
};

function SceneAssembler({ step }) {
    if (step.phase === 'encode') {
        return (
            <div className="flex flex-col gap-2 py-6 max-w-lg mx-auto">
                <div className="grid grid-cols-2 gap-2 px-2 text-[10px] uppercase tracking-widest text-slate-600 font-semibold">
                    <span>Assembly mnemonic</span><span>Machine code (hex)</span>
                </div>
                {step.mapping.map((m, i) => (
                    <div key={i} className="grid grid-cols-2 gap-2 items-center">
                        <code className="px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-700/60 text-xs font-mono text-slate-300">{m.asm}</code>
                        <code className="px-3 py-2 rounded-lg bg-purple-500/10 border border-purple-500/30 text-xs font-mono text-purple-300">{m.hex}</code>
                    </div>
                ))}
            </div>
        );
    }
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-6">
            <div>
                <p className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold mb-2">main.o sections</p>
                <div className="flex flex-col gap-2">
                    {step.sections.map((sec, i) => (
                        <div key={i} className={`px-3 py-2 rounded-lg border bg-slate-900/40 ${sectionColor[sec.color]}`}>
                            <code className="text-xs font-mono font-bold">{sec.name}</code>
                            <span className="text-[11px] text-slate-500 ml-2">{sec.desc}</span>
                        </div>
                    ))}
                </div>
            </div>
            <div>
                <p className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold mb-2">symbol table</p>
                <div className="flex flex-col gap-2">
                    {step.symbols.map((sym, i) => (
                        <div key={i} className={`flex items-center justify-between px-3 py-2 rounded-lg border ${sym.status === 'defined' ? 'border-green-500/30 bg-green-500/5' : 'border-orange-500/30 bg-orange-500/5'}`}>
                            <code className="text-xs font-mono text-slate-300">{sym.name}</code>
                            <span className={`text-[10px] font-bold uppercase ${sym.status === 'defined' ? 'text-green-400' : 'text-orange-400'}`}>{sym.status}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function SceneLinker({ step }) {
    if (step.phase === 'inputs') {
        return (
            <div className="flex flex-col gap-3 py-6 max-w-lg mx-auto">
                {step.objs.map((o, i) => (
                    <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-700/60 bg-slate-900/50">
                        <Boxes className="h-5 w-5 text-cyan-400 shrink-0" />
                        <code className="font-mono text-sm text-slate-200 w-24 shrink-0">{o.name}</code>
                        <div className="text-xs text-slate-500 min-w-0">
                            <div><span className="text-green-400">provides:</span> {o.provides}</div>
                            <div><span className="text-orange-400">needs:</span> {o.needs}</div>
                        </div>
                    </div>
                ))}
            </div>
        );
    }
    if (step.phase === 'resolve') {
        return (
            <div className="flex flex-col gap-3 py-8 max-w-lg mx-auto">
                {step.resolutions.map((r, i) => (
                    <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-xl border border-green-500/30 bg-green-500/5">
                        <code className="text-xs font-mono text-slate-300 flex-1">{r.from}</code>
                        <ChevronRight className="h-4 w-4 text-green-400 shrink-0" />
                        <code className="text-xs font-mono text-green-300 shrink-0">{r.to}</code>
                        <CheckCircle className="h-4 w-4 text-green-400 shrink-0" />
                    </div>
                ))}
                <p className="text-[11px] text-slate-600 text-center mt-2">All placeholder addresses patched (relocation complete).</p>
            </div>
        );
    }
    return (
        <div className="flex flex-col items-center gap-4 py-8">
            <div className="flex items-center gap-2 px-5 py-3 rounded-xl bg-green-500/10 border border-green-500/30">
                <CheckCircle className="h-5 w-5 text-green-400" />
                <code className="font-mono font-bold text-green-300">{step.result}</code>
                <span className="text-xs text-slate-500">executable</span>
            </div>
            <div className="flex flex-col gap-1.5 w-full max-w-xs">
                {step.layout.map((l, i) => (
                    <div key={i} className="px-3 py-1.5 rounded-lg bg-slate-900/50 border border-slate-700/50 text-xs font-mono text-slate-400 text-center">{l}</div>
                ))}
            </div>
        </div>
    );
}

const memColor = {
    orange: 'border-orange-500/40 bg-orange-500/10 text-orange-300',
    green:  'border-green-500/40 bg-green-500/10 text-green-300',
    blue:   'border-blue-500/40 bg-blue-500/10 text-blue-300',
    purple: 'border-purple-500/40 bg-purple-500/10 text-purple-300',
    slate:  'border-slate-700/50 bg-slate-900/30 text-slate-500',
};

function SceneLoader({ step }) {
    if (step.phase === 'segments') {
        return (
            <div className="flex flex-col gap-1.5 py-4 max-w-sm mx-auto">
                <div className="text-[10px] text-slate-600 text-center font-mono">high address (0x7fff…)</div>
                {step.memory.map((m, i) => (
                    <div key={i} className={`flex items-center justify-between px-4 py-2.5 rounded-lg border ${memColor[m.color]}`}>
                        <code className="text-sm font-mono font-bold">{m.name}</code>
                        <span className="text-[10px] opacity-80">{m.desc}</span>
                        {m.dir && <span className="text-[10px] font-semibold ml-2">{m.dir}</span>}
                    </div>
                ))}
                <div className="text-[10px] text-slate-600 text-center font-mono">low address (0x0)</div>
            </div>
        );
    }
    return (
        <div className="flex flex-col gap-2.5 py-8 max-w-md mx-auto">
            {step.loadSteps.map((l, i) => (
                <div key={i} className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${l.done ? 'border-green-500/30 bg-green-500/5' : 'border-zinc-400/50 bg-zinc-500/15'}`}>
                    {l.done ? <CheckCircle className="h-4 w-4 text-green-400 shrink-0" /> : <ChevronRight className="h-4 w-4 text-zinc-300 shrink-0" />}
                    <span className={`text-sm ${l.done ? 'text-slate-400' : 'text-zinc-200'}`}>{l.txt}</span>
                </div>
            ))}
        </div>
    );
}

const CPU_STAGES = [
    { id: 'fetch',   label: 'Fetch' },
    { id: 'decode',  label: 'Decode' },
    { id: 'execute', label: 'Execute' },
];

function SceneCPU({ step }) {
    return (
        <div className="flex flex-col gap-4 py-4">
            <div className="flex items-center justify-center gap-2">
                {CPU_STAGES.map((st, i) => {
                    const isActive = st.id === step.cpuStage;
                    return (
                        <div key={st.id} className="flex items-center gap-2">
                            <div className={`px-4 py-2 rounded-xl border text-sm font-semibold transition-all ${
                                isActive ? 'border-zinc-400/60 bg-zinc-500/20 text-zinc-200 scale-110' : 'border-slate-800 bg-slate-900/20 text-slate-600 opacity-50'
                            }`}>{st.label}</div>
                            {i < CPU_STAGES.length - 1 && <RotateCcw className="h-3.5 w-3.5 text-slate-700 rotate-90" />}
                        </div>
                    );
                })}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg mx-auto w-full">
                <div className="rounded-xl border border-slate-700/60 bg-slate-950/60 p-3">
                    <p className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold mb-2">Current instruction</p>
                    <div className="text-[11px] font-mono text-slate-500 mb-1">@ {step.rip}</div>
                    <code className="text-sm font-mono text-yellow-200">{step.ir}</code>
                    {step.note && <div className="mt-3 text-[11px] text-zinc-400 flex items-center gap-1.5"><Zap className="h-3 w-3" />{step.note}</div>}
                </div>
                <div className="rounded-xl border border-slate-700/60 bg-slate-950/60 p-3">
                    <p className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold mb-2">Registers</p>
                    <div className="space-y-1">
                        {Object.entries(step.regs).map(([k, v]) => (
                            <div key={k} className="flex justify-between text-xs font-mono">
                                <span className="text-slate-500">{k}</span>
                                <span className="text-slate-200">{v}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

const pathColor = { green: 'border-green-500/40 bg-green-500/10 text-green-300', orange: 'border-orange-500/40 bg-orange-500/10 text-orange-300' };
const barColor = { green: 'bg-green-500', blue: 'bg-blue-500', yellow: 'bg-yellow-500', orange: 'bg-orange-500' };

function SceneComparison({ step }) {
    if (step.phase === 'paths') {
        return (
            <div className="flex flex-col gap-5 py-8">
                {step.paths.map((p, i) => (
                    <div key={i} className="flex flex-col gap-2">
                        <span className={`text-xs font-bold uppercase tracking-widest ${p.color === 'green' ? 'text-green-400' : 'text-orange-400'}`}>{p.lang}</span>
                        <div className="flex flex-wrap items-center gap-1.5">
                            {p.chain.map((c, j) => (
                                <div key={j} className="flex items-center gap-1.5">
                                    <span className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-mono ${pathColor[p.color]}`}>{c}</span>
                                    {j < p.chain.length - 1 && <ChevronRight className="h-3 w-3 text-slate-700" />}
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        );
    }
    return (
        <div className="flex flex-col gap-3 py-8">
            <p className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold text-center mb-1">Relative runtime — CPU-bound (lower = faster)</p>
            {step.bars.map((b, i) => (
                <div key={i} className="flex items-center gap-3">
                    <span className="text-xs text-slate-400 w-36 shrink-0 text-right">{b.lang}</span>
                    <div className="flex-1 bg-slate-900/60 rounded-lg overflow-hidden h-6 relative">
                        <div className={`h-full ${barColor[b.color]} rounded-lg transition-all duration-500 flex items-center justify-end pr-2`} style={{ width: `${b.w}%` }}>
                            <span className="text-[10px] font-mono font-bold text-slate-950">{b.rel}×</span>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

function VisualizationPanel({ step }) {
    if (!step) return null;
    if (step.act === 1) return <SceneSource step={step} />;
    if (step.act === 2) return <ScenePreprocessor step={step} />;
    if (step.act === 3) return <SceneCompiler step={step} />;
    if (step.act === 4) return <SceneAssembler step={step} />;
    if (step.act === 5) return <SceneLinker step={step} />;
    if (step.act === 6) return <SceneLoader step={step} />;
    if (step.act === 7) return <SceneCPU step={step} />;
    if (step.act === 8) return <SceneComparison step={step} />;
    return null;
}

// ── Quiz ──────────────────────────────────────────────────────────────────────
const QUIZ = [
    {
        question: 'You get "undefined reference to area(double)". Which stage failed?',
        options: ['Preprocessor', 'Compiler', 'Linker', 'Loader'],
        correct: 2,
        explanation: 'The compiler is happy as long as area is declared — it leaves the call as a placeholder. The error appears at link time, when the linker cannot find a definition for the symbol in any object file or library.',
    },
    {
        question: 'What does the C++ preprocessor actually do with #include and #define?',
        options: [
            'Type-checks the included code',
            'Pure text substitution — paste files in, replace macros',
            'Compiles headers to machine code',
            'Allocates memory for globals',
        ],
        correct: 1,
        explanation: 'The preprocessor is a blunt text engine. #include pastes a file in verbatim; #define is a textual find-and-replace. It does no type checking and does not understand C++ — that is the compiler\'s job on the resulting translation unit.',
    },
    {
        question: 'Why does compiled C++ typically run much faster than CPython?',
        options: [
            'C++ has shorter variable names',
            'Translation and optimization happen once ahead of time; the CPU runs native code directly, with no per-op interpreter',
            'Python cannot use the CPU cache',
            'C++ skips the operating system',
        ],
        correct: 1,
        explanation: 'C++ does all parsing, optimization, and codegen at build time, producing native machine code the CPU executes directly. CPython interprets bytecode op-by-op at runtime, paying dispatch and dynamic-typing overhead on every operation.',
    },
];

function QuizPanel({ quizState, setQuizState }) {
    const q = QUIZ[quizState.current];
    if (quizState.complete) {
        return (
            <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-5 text-center">
                <div className="text-2xl font-bold text-white mb-1">{quizState.score}/{QUIZ.length}</div>
                <div className="text-zinc-400 text-sm mb-4">
                    {quizState.score === QUIZ.length ? 'Perfect — you understand the full compile-to-CPU pipeline!' : 'Review the explanations to reinforce the concepts.'}
                </div>
                <button onClick={() => setQuizState({ current: 0, selected: null, answered: false, score: 0, complete: false })}
                    className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-sm text-white transition-colors">
                    Retake Quiz
                </button>
            </div>
        );
    }
    return (
        <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-4">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 mb-2">
                Question {quizState.current + 1} / {QUIZ.length}
            </div>
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
                            setQuizState(s => ({ ...s, selected: i, answered: true, score: correct ? s.score + 1 : s.score }));
                        }} className={`w-full text-left px-3 py-2 rounded-lg border text-xs transition-all ${cls}`}>
                            {opt}
                        </button>
                    );
                })}
            </div>
            {quizState.answered && (
                <div className="mt-3 text-xs text-slate-500 bg-slate-800/50 rounded-lg p-2 leading-relaxed">{q.explanation}</div>
            )}
            {quizState.answered && (
                <button onClick={() => {
                    if (quizState.current + 1 >= QUIZ.length) setQuizState(s => ({ ...s, complete: true }));
                    else setQuizState(s => ({ ...s, current: s.current + 1, selected: null, answered: false }));
                }} className="mt-3 w-full py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-xs text-white transition-colors">
                    {quizState.current + 1 >= QUIZ.length ? 'See Score' : 'Next Question'}
                </button>
            )}
        </div>
    );
}

// ── Page ──────────────────────────────────────────────────────────────────────
const STEPS = generateSteps();

export default function CppExecutionPipelinePage() {
    const [currentStep, setCurrentStep] = useState(0);
    const [isPlaying,   setIsPlaying]   = useState(false);
    const [speed,       setSpeed]       = useState(900);
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
                            <h1 className="text-2xl md:text-3xl font-bold text-white leading-tight">C++ Execution Pipeline</h1>
                            <p className="text-zinc-300 text-sm mt-1">
                                From human-readable source to machine code on the CPU — every stage of the compiled-language lifecycle
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
                                    <span className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">Stage {step?.act} of 8</span>
                                    <span className="text-slate-600 mx-2">·</span>
                                    <span className="text-sm font-semibold text-slate-200">{step?.actName}</span>
                                </div>
                                <span className="text-[10px] text-slate-600 font-mono">step {currentStep + 1}</span>
                            </div>
                            <div className="px-5 min-h-[340px]">
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

                        {/* Pipeline reference */}
                        <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-4">
                            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mb-3">Pipeline · artifact at each stage</p>
                            <div className="space-y-1.5 text-xs">
                                {[
                                    { st: 1, label: 'Source',       art: '.cpp / .h' },
                                    { st: 2, label: 'Preprocessor', art: 'translation unit' },
                                    { st: 3, label: 'Compiler',     art: '.s assembly' },
                                    { st: 4, label: 'Assembler',    art: '.o object' },
                                    { st: 5, label: 'Linker',       art: 'executable' },
                                    { st: 6, label: 'Loader',       art: 'process image' },
                                    { st: 7, label: 'CPU',          art: 'running' },
                                ].map(row => (
                                    <div key={row.st} className={`flex justify-between px-2 py-1 rounded-lg transition-colors ${step?.act === row.st ? 'bg-zinc-700/50 text-zinc-200' : 'text-slate-500'}`}>
                                        <span>{row.label}</span>
                                        <span className="font-mono text-[11px]">{row.art}</span>
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

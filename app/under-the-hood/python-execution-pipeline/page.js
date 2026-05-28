"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Play, Pause, SkipBack, SkipForward, RotateCcw, Info,
    Code2, GitBranch, Layers, Cpu, Database, Lock, ChevronRight, CheckCircle, ArrowDown,
} from 'lucide-react';

// ── Stages ────────────────────────────────────────────────────────────────────
const STAGES = [
    { id: 1, label: 'Lexer / Tokenizer', short: '1. Lexer',    icon: Code2     },
    { id: 2, label: 'Parser / AST',      short: '2. AST',      icon: GitBranch },
    { id: 3, label: 'Bytecode Compiler', short: '3. Bytecode', icon: Layers    },
    { id: 4, label: 'CPython VM',        short: '4. VM',       icon: Cpu       },
    { id: 5, label: 'Memory Model',      short: '5. Memory',   icon: Database  },
    { id: 6, label: 'GIL & CPU',         short: '6. GIL/CPU',  icon: Lock      },
];

// ── Source code ───────────────────────────────────────────────────────────────
const SOURCE_LINES = [
    'def add(x, y):',
    '    result = x + y',
    '    return result',
];

// ── Token color palette ───────────────────────────────────────────────────────
const TC = {
    KEYWORD: { bg: 'bg-blue-500/20',   border: 'border-blue-500/40',   text: 'text-blue-300'   },
    NAME:    { bg: 'bg-green-500/20',  border: 'border-green-500/40',  text: 'text-green-300'  },
    OP:      { bg: 'bg-orange-500/20', border: 'border-orange-500/40', text: 'text-orange-300' },
    NEWLINE: { bg: 'bg-slate-800',     border: 'border-slate-700',     text: 'text-slate-500'  },
    INDENT:  { bg: 'bg-yellow-500/20', border: 'border-yellow-500/40', text: 'text-yellow-300' },
    DEDENT:  { bg: 'bg-yellow-500/20', border: 'border-yellow-500/40', text: 'text-yellow-300' },
};

const LINE0_TOKENS = [
    { type: 'KEYWORD', value: 'def'    },
    { type: 'NAME',    value: 'add'    },
    { type: 'OP',      value: '('      },
    { type: 'NAME',    value: 'x'      },
    { type: 'OP',      value: ','      },
    { type: 'NAME',    value: 'y'      },
    { type: 'OP',      value: ')'      },
    { type: 'OP',      value: ':'      },
    { type: 'NEWLINE', value: 'NL'     },
];
const LINE1_TOKENS = [
    { type: 'INDENT',  value: 'INDENT' },
    { type: 'NAME',    value: 'result' },
    { type: 'OP',      value: '='      },
    { type: 'NAME',    value: 'x'      },
    { type: 'OP',      value: '+'      },
    { type: 'NAME',    value: 'y'      },
    { type: 'NEWLINE', value: 'NL'     },
];
const LINE2_TOKENS = [
    { type: 'KEYWORD', value: 'return' },
    { type: 'NAME',    value: 'result' },
    { type: 'NEWLINE', value: 'NL'     },
    { type: 'DEDENT',  value: 'DEDENT' },
];

// ── AST tree ──────────────────────────────────────────────────────────────────
// Each node: { type, badge, colorClass, children: [id, ...] }
const AST_NODES = {
    module:      { type: 'Module',      badge: null,              color: 'text-slate-300',  children: ['funcdef'] },
    funcdef:     { type: 'FunctionDef', badge: "name='add'",      color: 'text-blue-300',   children: ['args', 'assign', 'ret'] },
    args:        { type: 'arguments',   badge: null,              color: 'text-zinc-400',   children: ['arg_x', 'arg_y'] },
    arg_x:       { type: 'arg',         badge: "arg='x'",         color: 'text-green-300',  children: [] },
    arg_y:       { type: 'arg',         badge: "arg='y'",         color: 'text-green-300',  children: [] },
    assign:      { type: 'Assign',      badge: null,              color: 'text-orange-300', children: ['name_tgt', 'binop'] },
    name_tgt:    { type: 'Name',        badge: "id='result'",     color: 'text-green-300',  children: [] },
    binop:       { type: 'BinOp',       badge: 'op=Add',          color: 'text-purple-300', children: ['name_x', 'name_y'] },
    name_x:      { type: 'Name',        badge: "id='x'",          color: 'text-green-300',  children: [] },
    name_y:      { type: 'Name',        badge: "id='y'",          color: 'text-green-300',  children: [] },
    ret:         { type: 'Return',      badge: null,              color: 'text-red-300',    children: ['name_ret'] },
    name_ret:    { type: 'Name',        badge: "id='result'",     color: 'text-green-300',  children: [] },
};

// ── Bytecodes ─────────────────────────────────────────────────────────────────
const BYTECODES = [
    { offset: 0,  op: 'LOAD_FAST',    arg: '0 (x)',       line: 1, astNode: 'name_x'   },
    { offset: 2,  op: 'LOAD_FAST',    arg: '1 (y)',       line: 1, astNode: 'name_y'   },
    { offset: 4,  op: 'BINARY_ADD',   arg: '',            line: 1, astNode: 'binop'    },
    { offset: 6,  op: 'STORE_FAST',   arg: '2 (result)',  line: 1, astNode: 'name_tgt' },
    { offset: 8,  op: 'LOAD_FAST',    arg: '2 (result)',  line: 2, astNode: 'name_ret' },
    { offset: 10, op: 'RETURN_VALUE', arg: '',            line: 2, astNode: 'ret'      },
];

// ── VM execution trace ────────────────────────────────────────────────────────
const VM_TRACE = [
    {
        bcIdx: -1,
        stack: [],
        locals: { x: 3, y: 4, result: null },
        action: 'Frame created',
        actionDetail: 'add(3, 4) called — new PyFrameObject pushed onto call stack',
    },
    {
        bcIdx: 0,
        stack: [{ val: 3, color: 'blue', label: 'x → 3' }],
        locals: { x: 3, y: 4, result: null },
        action: 'LOAD_FAST 0 (x)',
        actionDetail: 'Look up local slot 0 → value is 3. Push PyObject* for int(3) onto TOS.',
    },
    {
        bcIdx: 1,
        stack: [{ val: 3, color: 'blue', label: 'x → 3' }, { val: 4, color: 'green', label: 'y → 4' }],
        locals: { x: 3, y: 4, result: null },
        action: 'LOAD_FAST 1 (y)',
        actionDetail: 'Look up local slot 1 → value is 4. Push PyObject* for int(4) onto TOS.',
    },
    {
        bcIdx: 2,
        stack: [{ val: 7, color: 'orange', label: 'x + y = 7' }],
        locals: { x: 3, y: 4, result: null },
        action: 'BINARY_ADD',
        actionDetail: 'POP y (4), POP x (3). Call int.__add__(3, 4). PUSH int(7) onto TOS. Two references freed.',
    },
    {
        bcIdx: 3,
        stack: [],
        locals: { x: 3, y: 4, result: 7 },
        action: 'STORE_FAST 2 (result)',
        actionDetail: 'POP 7 from TOS. Store pointer into local slot 2 named "result". Stack is now empty.',
    },
    {
        bcIdx: 4,
        stack: [{ val: 7, color: 'purple', label: 'result → 7' }],
        locals: { x: 3, y: 4, result: 7 },
        action: 'LOAD_FAST 2 (result)',
        actionDetail: 'Look up local slot 2 → value is 7. Push its PyObject* onto TOS.',
    },
    {
        bcIdx: 5,
        stack: [],
        locals: { x: 3, y: 4, result: 7 },
        returnValue: 7,
        action: 'RETURN_VALUE',
        actionDetail: 'POP return value (7) from TOS. PyFrameObject destroyed. Execution returns to caller with 7.',
    },
];

// ── Step generation ───────────────────────────────────────────────────────────
function generateSteps() {
    const s = [];

    // ═══ STAGE 1: Lexer ═══
    s.push({
        stage: 1, stageName: 'Lexer / Tokenizer', phase: 'intro',
        sourceLine: -1, tokens: [],
        explanation: 'The Python interpreter\'s first step is the lexer (tokenizer). It reads the raw .py file as a stream of characters and groups them into tokens — the vocabulary of the language. No structure is understood yet; the lexer only recognizes individual words and symbols.',
    });
    s.push({
        stage: 1, stageName: 'Lexer / Tokenizer', phase: 'line0',
        sourceLine: 0, tokens: LINE0_TOKENS,
        explanation: 'Line 1 produces 9 tokens. "def" is classified as KEYWORD (reserved word), "add" is NAME (identifier), and punctuation like "(", ")", ":" are OP tokens. The NEWLINE token marks the logical line end — critical for Python\'s indentation-based block structure.',
    });
    s.push({
        stage: 1, stageName: 'Lexer / Tokenizer', phase: 'line1',
        sourceLine: 1, tokens: [...LINE0_TOKENS, ...LINE1_TOKENS],
        explanation: 'Key insight: the 4 leading spaces on line 2 produce a single INDENT token — not 4 SPACE tokens. Python\'s lexer tracks indentation level changes and emits synthetic INDENT/DEDENT tokens. This is how Python encodes block structure without braces. The lexer, not the parser, handles indentation.',
    });
    s.push({
        stage: 1, stageName: 'Lexer / Tokenizer', phase: 'line2',
        sourceLine: 2, tokens: [...LINE0_TOKENS, ...LINE1_TOKENS, ...LINE2_TOKENS],
        explanation: 'When the indentation level decreases (back to 0 spaces), a DEDENT token is emitted. Notice: "return" is KEYWORD (not NAME) — it\'s a reserved word that cannot be used as a variable name. The complete token stream is 20 tokens from 3 lines of source code.',
    });
    s.push({
        stage: 1, stageName: 'Lexer / Tokenizer', phase: 'complete',
        sourceLine: -1, tokens: [...LINE0_TOKENS, ...LINE1_TOKENS, ...LINE2_TOKENS],
        highlightTypes: ['INDENT', 'DEDENT', 'NEWLINE'],
        explanation: 'Complete token stream. The INDENT/DEDENT tokens (yellow) are entirely synthetic — they don\'t appear in the source file at all. This approach means Python\'s grammar is context-free even though indentation is significant: the lexer transforms indentation into explicit tokens before the parser sees anything.',
    });

    // ═══ STAGE 2: AST ═══
    const astRevealGroups = [
        { nodes: new Set(['module']),                                                               highlight: 'module',   sourceLine: -1 },
        { nodes: new Set(['module','funcdef']),                                                     highlight: 'funcdef',  sourceLine: 0  },
        { nodes: new Set(['module','funcdef','args','arg_x','arg_y']),                             highlight: 'args',     sourceLine: 0  },
        { nodes: new Set(['module','funcdef','args','arg_x','arg_y','assign','name_tgt','binop','name_x','name_y']), highlight: 'binop', sourceLine: 1 },
        { nodes: new Set(Object.keys(AST_NODES)),                                                  highlight: 'ret',      sourceLine: 2  },
    ];
    const astExplns = [
        'The parser consumes the token stream and builds the Abstract Syntax Tree (AST) — a tree that captures the program\'s structure, not its exact text. The root is always a Module node containing all top-level statements. Import this with `import ast; ast.parse("...")` in Python.',
        'A FunctionDef node is created for "def add(...)". It stores the function\'s name ("add"), its arguments, its body statements, and its line number. The AST deliberately throws away whitespace, comments, and syntactic sugar like semicolons.',
        'The arguments node holds two arg child nodes — one per parameter. Each arg stores the parameter name and optional annotation. The AST preserves the parameter order, which is how CPython later assigns them to local variable slots 0 and 1.',
        'The body of the function is a list of statement nodes. The first is an Assign: a targets list (Name id="result") and a value (BinOp with op=Add). BinOp has left (Name "x") and right (Name "y"). Python compilers visit this subtree to generate LOAD_FAST/BINARY_ADD/STORE_FAST bytecode.',
        'The complete AST for this 3-line function has 12 nodes. The Return statement holds a Name value node pointing to "result". You can inspect any Python function\'s AST: `import ast; print(ast.dump(ast.parse("def add(x,y):\\n  result=x+y\\n  return result"), indent=2))`',
    ];
    astRevealGroups.forEach((g, i) => {
        s.push({
            stage: 2, stageName: 'Parser / AST', phase: `ast_${i}`,
            visibleNodes: g.nodes,
            highlightedNode: g.highlight,
            sourceLine: g.sourceLine,
            explanation: astExplns[i],
        });
    });

    // ═══ STAGE 3: Bytecode ═══
    const bcExplns = [
        'The compiler walks the AST and emits bytecode — CPython\'s low-level instruction set (like assembly for the Python VM). Bytecode is stored in the function\'s __code__.co_code attribute and saved to .pyc files in __pycache__. You can inspect it: `import dis; dis.dis(add)`',
        'For `result = x + y`, the compiler visits the BinOp node\'s left child (Name "x") first and emits LOAD_FAST 0. LOAD_FAST reads from local variable slot 0 (x) and pushes the PyObject* onto the evaluation stack. Stack-based VM: no registers.',
        'LOAD_FAST 1 reads from slot 1 (y) and pushes int(4) onto the stack. Now TOS=4, TOS1=3. The stack has two items. The next instruction will consume both.',
        'BINARY_ADD pops both TOS and TOS1 (y=4 and x=3), calls `int.__add__(3, 4)`, and pushes the result int(7) back onto TOS. This one opcode replaces the entire BinOp subtree. Python 3.11+ merges all arithmetic into a single BINARY_OP opcode with a flag.',
        'STORE_FAST 2 pops TOS (7) and stores it into local slot 2 named "result". The evaluation stack is now empty. Slots are pre-allocated when the frame is created — CPython knows at compile time exactly how many locals a function has.',
        'The Return statement\'s value is Name "result" — LOAD_FAST 2 pushes it back onto TOS. RETURN_VALUE pops TOS and passes it to the calling frame. The total bytecode for this function is just 12 bytes — 6 instructions × 2 bytes each (opcode + arg).',
    ];
    const bcReveal = [0, 1, 2, 3, 4, 5]; // reveals up to this index
    const bcSrcLines = [-1, 1, 1, 1, 1, 2];
    bcReveal.forEach((revealUpTo, i) => {
        s.push({
            stage: 3, stageName: 'Bytecode Compiler', phase: `bc_${i}`,
            visibleBytecodes: BYTECODES.slice(0, revealUpTo + 1),
            highlightedBcIdx: revealUpTo,
            sourceLine: bcSrcLines[i],
            explanation: bcExplns[i],
        });
    });

    // ═══ STAGE 4: CPython VM ═══
    VM_TRACE.forEach((vt, i) => {
        s.push({
            stage: 4, stageName: 'CPython VM', phase: `vm_${i}`,
            ...vt,
            explanation: vt.actionDetail,
        });
    });

    // ═══ STAGE 5: Memory Model ═══
    s.push({
        stage: 5, stageName: 'Memory Model', phase: 'frames',
        memPhase: 'frames',
        explanation: 'Python\'s call stack is a chain of PyFrameObject structs on the heap (not the C stack). Each frame holds f_code (pointer to the code object with bytecode), f_locals (dict of local variable names → PyObject*), f_back (pointer to the calling frame), and f_lasti (offset of last bytecode executed). Python\'s traceback walks this chain.',
    });
    s.push({
        stage: 5, stageName: 'Memory Model', phase: 'pyobjects',
        memPhase: 'pyobjects',
        explanation: 'Every Python value — even simple integers — is a PyObject struct on the heap. A PyLongObject for int(3) has: ob_refcnt (reference count, starts at 1), ob_type (pointer to the `int` type object), and ob_digit (the actual value). Python NEVER stores raw C integers inline — always heap pointers. This is why Python is slow for numerical work.',
    });
    s.push({
        stage: 5, stageName: 'Memory Model', phase: 'smallint',
        memPhase: 'smallint',
        explanation: 'CPython pre-allocates PyLongObjects for integers -5 through 256 at startup. These "small int" objects are singletons — no matter how many times you write x=3, all x variables point to the same PyObject at the same memory address. This is why `a = 3; b = 3; a is b` returns True, but `a = 300; b = 300; a is b` returns False (300 > 256, new allocation).',
    });
    s.push({
        stage: 5, stageName: 'Memory Model', phase: 'refcount',
        memPhase: 'refcount',
        explanation: 'When add(3, 4) returns, the frame is destroyed. The reference counts of x, y, and result all drop by 1. Since integers 3, 4, 7 are small ints (in the cache range), their refcnts never drop to 0 — they stay allocated. For large integers or user objects, refcnt hitting 0 triggers immediate deallocation via Py_DECREF — no GC pause needed. 80%+ of Python objects are freed this way.',
    });

    // ═══ STAGE 6: GIL & CPU ═══
    s.push({
        stage: 6, stageName: 'GIL & CPU', phase: 'eval_loop',
        gilPhase: 'eval_loop',
        explanation: 'CPython executes bytecode in a massive C `switch` statement called `_PyEval_EvalFrameDefault` in `ceval.c` (~7000 lines). This eval loop iterates: fetch opcode at f_lasti, dispatch via switch, execute handler, increment f_lasti, repeat. Crucially, the eval loop itself is small enough (~32KB) to fit entirely in L1 instruction cache — most of CPython\'s speed comes from this cache-friendliness.',
    });
    s.push({
        stage: 6, stageName: 'GIL & CPU', phase: 'gil',
        gilPhase: 'gil',
        explanation: 'The Global Interpreter Lock (GIL) is a mutex that only one thread can hold at a time. Before executing any bytecode, a thread must acquire the GIL. This means Python threads can never truly run in parallel on multiple CPU cores for CPU-bound work. Every 100 bytecode instructions (Python 3.1 and earlier) or every 5ms (Python 3.2+), the GIL is released so other threads can run.',
    });
    s.push({
        stage: 6, stageName: 'GIL & CPU', phase: 'io_release',
        gilPhase: 'io_release',
        explanation: 'The GIL IS released during I/O operations (file reads, network calls, sleep). This is why threading works well for I/O-bound programs — Thread A releases the GIL while waiting for network data, Thread B acquires it and does useful work. For CPU-bound work, use `multiprocessing` (separate processes, each with their own GIL) or NumPy (C extensions that release the GIL during computation).',
    });

    return s;
}

// ── Reusable source code display ─────────────────────────────────────────────
function SourceDisplay({ highlightLine }) {
    const kw = new Set(['def', 'return']);
    function tokenizeLine(line) {
        return line.split(/(\s+|[(),:=+])/).filter(Boolean).map((tok, i) => {
            if (kw.has(tok.trim())) return <span key={i} className="text-blue-400 font-semibold">{tok}</span>;
            if (/^[a-zA-Z_]\w*$/.test(tok.trim())) return <span key={i} className="text-green-300">{tok}</span>;
            if (/^[(),:=+]$/.test(tok.trim())) return <span key={i} className="text-orange-300">{tok}</span>;
            return <span key={i} className="text-slate-400">{tok}</span>;
        });
    }
    return (
        <div className="font-mono text-sm bg-slate-900/60 rounded-xl border border-slate-700/50 overflow-hidden">
            <div className="px-3 py-1.5 bg-slate-800/60 border-b border-slate-700/50 text-[10px] text-slate-500 font-semibold uppercase tracking-widest">
                add.py
            </div>
            {SOURCE_LINES.map((line, i) => (
                <div key={i} className={`flex items-start gap-3 px-3 py-1 transition-all ${
                    highlightLine === i ? 'bg-yellow-500/10 border-l-2 border-yellow-500' : 'border-l-2 border-transparent'
                }`}>
                    <span className="text-slate-600 select-none shrink-0 text-xs leading-5">{i + 1}</span>
                    <span className="text-slate-200 leading-5">{tokenizeLine(line)}</span>
                </div>
            ))}
        </div>
    );
}

// ── SCENE 1: Lexer ────────────────────────────────────────────────────────────
function SceneLexer({ step }) {
    const { tokens = [], sourceLine, highlightTypes } = step;
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            {/* Source */}
            <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mb-2">Source file</p>
                <SourceDisplay highlightLine={sourceLine} />
                <div className="mt-3 flex flex-wrap gap-1.5 text-[10px]">
                    {[['KEYWORD','bg-blue-500/20 text-blue-300 border-blue-500/40'],
                      ['NAME','bg-green-500/20 text-green-300 border-green-500/40'],
                      ['OP','bg-orange-500/20 text-orange-300 border-orange-500/40'],
                      ['INDENT/DEDENT','bg-yellow-500/20 text-yellow-300 border-yellow-500/40'],
                      ['NEWLINE','bg-slate-800 text-slate-500 border-slate-700']
                    ].map(([label, cls]) => (
                        <span key={label} className={`px-2 py-0.5 rounded border font-medium ${cls}`}>{label}</span>
                    ))}
                </div>
            </div>

            {/* Token stream */}
            <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mb-2">
                    Token stream — {tokens.length} tokens
                </p>
                {tokens.length === 0 ? (
                    <div className="text-slate-600 text-sm italic p-4 text-center">Scanning…</div>
                ) : (
                    <div className="flex flex-wrap gap-1.5 max-h-52 overflow-y-auto">
                        {tokens.map((tok, i) => {
                            const c = TC[tok.type] || TC.NEWLINE;
                            const isHighlighted = highlightTypes?.includes(tok.type);
                            return (
                                <div key={i} className={`flex flex-col items-center px-1.5 py-0.5 rounded border text-[10px] font-mono transition-all ${c.bg} ${c.border} ${
                                    isHighlighted ? 'ring-1 ring-yellow-400/60 scale-105' : ''
                                }`}>
                                    <span className={`font-bold leading-tight ${c.text}`}>{tok.value}</span>
                                    <span className="text-slate-600 leading-tight" style={{fontSize:'9px'}}>{tok.type}</span>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

// ── SCENE 2: AST ──────────────────────────────────────────────────────────────
function ASTNodeComponent({ id, depth = 0, visibleNodes, highlightedNode }) {
    const node = AST_NODES[id];
    if (!visibleNodes.has(id)) return null;
    const isHighlighted = highlightedNode === id;
    return (
        <div className={`relative ${depth > 0 ? 'ml-5' : ''}`}>
            {depth > 0 && (
                <div className="absolute left-[-12px] top-[10px] w-3 h-px bg-slate-700" />
            )}
            {depth > 0 && (
                <div className="absolute left-[-12px] top-0 w-px h-[10px] bg-slate-700" />
            )}
            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-mono transition-all ${
                isHighlighted
                    ? 'bg-yellow-500/20 border-yellow-500/50 scale-105 shadow-sm shadow-yellow-500/20'
                    : 'bg-slate-800/80 border-slate-700/60'
            }`}>
                <span className={`font-bold ${node.color}`}>{node.type}</span>
                {node.badge && <span className="text-slate-500 text-[10px]">{node.badge}</span>}
            </div>
            {node.children.length > 0 && (
                <div className="mt-0.5 space-y-0.5 relative ml-1 border-l border-slate-800 pl-0">
                    {node.children.map(childId => (
                        <div key={childId} className="relative pl-1 pt-0.5">
                            <ASTNodeComponent
                                id={childId}
                                depth={depth + 1}
                                visibleNodes={visibleNodes}
                                highlightedNode={highlightedNode}
                            />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function SceneAST({ step }) {
    const { visibleNodes, highlightedNode, sourceLine } = step;
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mb-2">Source</p>
                <SourceDisplay highlightLine={sourceLine} />
                <div className="mt-3 p-2 bg-slate-900/50 rounded-lg border border-slate-800 text-xs text-slate-500 font-mono">
                    {'import ast\nprint(ast.dump(ast.parse(src), indent=2))'}
                </div>
            </div>
            <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mb-2">
                    Abstract Syntax Tree — {visibleNodes.size} nodes
                </p>
                <div className="bg-slate-900/60 rounded-xl border border-slate-700/50 p-4 overflow-auto max-h-64">
                    <ASTNodeComponent id="module" visibleNodes={visibleNodes} highlightedNode={highlightedNode} />
                </div>
            </div>
        </div>
    );
}

// ── SCENE 3: Bytecode ─────────────────────────────────────────────────────────
const OP_COLORS = {
    LOAD_FAST:    'text-blue-300',
    STORE_FAST:   'text-orange-300',
    BINARY_ADD:   'text-purple-300',
    RETURN_VALUE: 'text-red-300',
};

function SceneBytecode({ step }) {
    const { visibleBytecodes = [], highlightedBcIdx, sourceLine } = step;
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            {/* Source */}
            <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mb-2">Source → Bytecode</p>
                <SourceDisplay highlightLine={sourceLine} />
                <div className="mt-3 p-2 bg-slate-900/50 rounded-lg border border-slate-800 text-xs text-slate-500 font-mono">
                    {'import dis\ndis.dis(add)'}
                </div>
            </div>

            {/* Bytecode */}
            <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mb-2">
                    Bytecode — {visibleBytecodes.length} / {BYTECODES.length} instructions
                </p>
                <div className="bg-slate-900/60 rounded-xl border border-slate-700/50 overflow-hidden font-mono text-xs">
                    <div className="flex gap-3 px-3 py-1.5 bg-slate-800/60 border-b border-slate-700/50 text-[10px] text-slate-500">
                        <span className="w-8">OFF</span>
                        <span className="flex-1">OPCODE</span>
                        <span className="w-24">ARG</span>
                    </div>
                    {BYTECODES.map((bc, i) => {
                        const isVisible    = i < visibleBytecodes.length;
                        const isHighlighted = i === highlightedBcIdx;
                        return (
                            <div key={i} className={`flex gap-3 px-3 py-1.5 transition-all ${
                                isHighlighted
                                    ? 'bg-yellow-500/15 border-l-2 border-yellow-500'
                                    : isVisible
                                    ? 'border-l-2 border-transparent'
                                    : 'border-l-2 border-transparent opacity-20'
                            }`}>
                                <span className="w-8 text-slate-600">{String(bc.offset).padStart(2, ' ')}</span>
                                <span className={`flex-1 font-semibold ${isVisible ? (OP_COLORS[bc.op] || 'text-slate-300') : 'text-slate-700'}`}>
                                    {bc.op}
                                </span>
                                <span className={`w-24 ${isVisible ? 'text-slate-400' : 'text-slate-700'}`}>{bc.arg}</span>
                            </div>
                        );
                    })}
                </div>
                <div className="mt-2 text-[10px] text-slate-600 text-center">
                    6 instructions × 2 bytes = 12 bytes total
                </div>
            </div>
        </div>
    );
}

// ── SCENE 4: CPython VM ───────────────────────────────────────────────────────
function SceneVM({ step }) {
    const { stack = [], locals = {}, bcIdx, action, returnValue } = step;

    return (
        <div className="py-4 space-y-4">
            {/* Current instruction */}
            <div className={`px-4 py-2 rounded-xl border font-mono text-sm transition-all ${
                bcIdx >= 0
                    ? 'bg-yellow-500/10 border-yellow-500/40 text-yellow-200'
                    : 'bg-slate-800/60 border-slate-700 text-slate-400'
            }`}>
                <span className="text-[10px] text-slate-500 uppercase tracking-widest mr-3">Executing</span>
                <span className="font-bold">{bcIdx >= 0 ? `${BYTECODES[bcIdx]?.op}  ${BYTECODES[bcIdx]?.arg}` : 'Frame setup…'}</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Bytecode tape */}
                <div>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mb-2">Bytecode</p>
                    <div className="bg-slate-900/60 rounded-xl border border-slate-700/50 font-mono text-xs overflow-hidden">
                        {BYTECODES.map((bc, i) => (
                            <div key={i} className={`flex gap-2 px-2.5 py-1 transition-all ${
                                i === bcIdx
                                    ? 'bg-yellow-500/15 text-yellow-200 font-semibold'
                                    : i < bcIdx
                                    ? 'text-slate-600'
                                    : 'text-slate-500'
                            }`}>
                                {i === bcIdx && <span className="text-yellow-400">►</span>}
                                {i !== bcIdx && <span className="w-3" />}
                                <span className={OP_COLORS[bc.op] || 'text-slate-400'}>{bc.op}</span>
                                <span className="text-slate-600">{bc.arg}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Evaluation stack */}
                <div>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mb-2">
                        Evaluation Stack — {stack.length} item{stack.length !== 1 ? 's' : ''}
                    </p>
                    <div className="bg-slate-900/60 rounded-xl border border-slate-700/50 min-h-[140px] flex flex-col-reverse justify-end p-3 gap-1.5">
                        {stack.length === 0 ? (
                            <div className="text-slate-700 text-xs text-center italic self-center">empty</div>
                        ) : (
                            [...stack].reverse().map((item, i) => {
                                const colorMap = {
                                    blue:   'bg-blue-500/25 border-blue-500/50 text-blue-200',
                                    green:  'bg-green-500/25 border-green-500/50 text-green-200',
                                    orange: 'bg-orange-500/25 border-orange-500/50 text-orange-200',
                                    purple: 'bg-purple-500/25 border-purple-500/50 text-purple-200',
                                };
                                const isTop = i === 0;
                                return (
                                    <div key={i} className={`flex items-center justify-between px-3 py-1.5 rounded-lg border text-sm font-mono transition-all ${colorMap[item.color]} ${isTop ? 'ring-1 ring-yellow-400/40 scale-105' : ''}`}>
                                        <span className="font-bold">{item.val}</span>
                                        <span className="text-[10px] opacity-60">{isTop ? 'TOS' : ''} {item.label}</span>
                                    </div>
                                );
                            })
                        )}
                    </div>
                    {returnValue !== undefined && (
                        <div className="mt-2 px-3 py-2 bg-green-500/10 border border-green-500/30 rounded-xl text-center">
                            <span className="text-xs text-green-400 font-semibold">Return value: </span>
                            <span className="text-green-300 font-mono font-bold">{returnValue}</span>
                        </div>
                    )}
                </div>

                {/* Locals dict */}
                <div>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mb-2">
                        f_locals (slot → value)
                    </p>
                    <div className="bg-slate-900/60 rounded-xl border border-slate-700/50 p-3 space-y-1.5 font-mono text-xs">
                        {Object.entries(locals).map(([k, v]) => (
                            <div key={k} className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-all ${
                                v !== null && v !== undefined ? 'bg-slate-800/60 border border-slate-700/50' : 'bg-slate-900 border border-slate-800/50 opacity-40'
                            }`}>
                                <span className="text-green-300">{k}</span>
                                <span className={v !== null && v !== undefined ? 'text-orange-300 font-semibold' : 'text-slate-600'}>
                                    {v !== null && v !== undefined ? String(v) : '???'}
                                </span>
                            </div>
                        ))}
                    </div>
                    <div className="mt-2 p-2 bg-slate-900/40 rounded-lg border border-slate-800 text-[10px] text-slate-600">
                        <span className="text-slate-500 font-semibold">Frame: </span>add(3, 4) · f_back → __main__
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── SCENE 5: Memory Model ─────────────────────────────────────────────────────
function SceneMemory({ step }) {
    const { memPhase } = step;

    if (memPhase === 'frames') return (
        <div className="py-4 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mb-3">Call Stack (frame chain)</p>
                <div className="space-y-2">
                    {[
                        { name: 'add', code: '<code add>', locals: '{x:3, y:4, result:7}', back: '→ __main__ frame', active: true },
                        { name: '__main__', code: '<module>', locals: '{}', back: '→ None', active: false },
                    ].map((fr, i) => (
                        <div key={fr.name} className="relative">
                            {i > 0 && <div className="flex justify-center py-1"><ArrowDown className="h-3 w-3 text-slate-600" /></div>}
                            <div className={`rounded-xl border p-4 font-mono text-xs ${fr.active ? 'border-blue-500/40 bg-blue-500/5' : 'border-slate-700/50 bg-slate-900/40'}`}>
                                <div className={`font-bold text-sm mb-2 ${fr.active ? 'text-blue-300' : 'text-slate-400'}`}>
                                    Frame: {fr.name}
                                </div>
                                <div className="space-y-1 text-slate-500">
                                    <div><span className="text-slate-600">f_code   </span><span className="text-slate-400">{fr.code}</span></div>
                                    <div><span className="text-slate-600">f_locals </span><span className="text-green-400/70">{fr.locals}</span></div>
                                    <div><span className="text-slate-600">f_back   </span><span className="text-orange-400/70">{fr.back}</span></div>
                                    <div><span className="text-slate-600">f_lasti  </span><span className="text-slate-400">{fr.active ? '10 (RETURN_VALUE)' : '0'}</span></div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mb-3">Python object model</p>
                <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-4 text-xs font-mono text-slate-400 space-y-1 leading-relaxed">
                    <div className="text-slate-500 text-[10px] mb-2">PyObject (every value is one)</div>
                    <div><span className="text-orange-300">ob_refcnt</span>  Py_ssize_t  (reference count)</div>
                    <div><span className="text-blue-300">ob_type</span>    PyTypeObject* (int, str, list…)</div>
                    <div className="text-slate-600">──── (type-specific fields below) ────</div>
                    <div className="text-slate-500 text-[10px] mt-2">PyLongObject (extends PyObject)</div>
                    <div><span className="text-green-300">ob_digit</span>   digit[]  (the number value)</div>
                </div>
                <div className="mt-3 p-3 bg-slate-900/40 border border-slate-700/40 rounded-xl text-[10px] text-slate-500">
                    <span className="text-slate-400 font-semibold">sizeof(PyObject) = </span>16 bytes (refcnt + type pointer)<br/>
                    <span className="text-slate-400 font-semibold">sizeof(PyLongObject) = </span>28 bytes for a single-digit int
                </div>
            </div>
        </div>
    );

    if (memPhase === 'pyobjects') return (
        <div className="py-4 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mb-3">Heap — PyObject layout</p>
                <div className="space-y-3">
                    {[
                        { val: 3,  refcnt: 'N+2', color: 'blue'   },
                        { val: 4,  refcnt: 'N+1', color: 'green'  },
                        { val: 7,  refcnt: 2,      color: 'orange' },
                    ].map((obj) => {
                        const clr = obj.color === 'blue' ? 'border-blue-500/40 bg-blue-500/5' :
                                    obj.color === 'green' ? 'border-green-500/40 bg-green-500/5' :
                                    'border-orange-500/40 bg-orange-500/5';
                        const tc = obj.color === 'blue' ? 'text-blue-300' :
                                   obj.color === 'green' ? 'text-green-300' :
                                   'text-orange-300';
                        return (
                            <div key={obj.val} className={`rounded-xl border p-3 font-mono text-xs ${clr}`}>
                                <div className={`font-bold mb-1.5 ${tc}`}>PyLongObject — int({obj.val})</div>
                                <div className="space-y-0.5 text-slate-400">
                                    <div className="flex justify-between"><span className="text-slate-500">ob_refcnt</span><span>{obj.refcnt}</span></div>
                                    <div className="flex justify-between"><span className="text-slate-500">ob_type  </span><span className="text-blue-400/70">→ &lt;class 'int'&gt;</span></div>
                                    <div className="flex justify-between"><span className="text-slate-500">ob_digit </span><span className={tc}>{obj.val}</span></div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
            <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mb-3">f_locals → heap pointers</p>
                <div className="space-y-2 font-mono text-xs">
                    {[
                        { name: 'x',      val: 3,  color: 'text-blue-300'   },
                        { name: 'y',      val: 4,  color: 'text-green-300'  },
                        { name: 'result', val: 7,  color: 'text-orange-300' },
                    ].map(({ name, val, color }) => (
                        <div key={name} className="flex items-center gap-3">
                            <div className="px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg w-20 text-center text-green-300">{name}</div>
                            <div className="flex-1 h-px bg-slate-700 relative">
                                <div className="absolute right-0 top-[-3px] text-slate-600">►</div>
                            </div>
                            <div className={`px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-center ${color}`}>int({val})</div>
                        </div>
                    ))}
                </div>
                <div className="mt-4 p-3 bg-slate-900/40 border border-slate-700/40 rounded-xl text-[10px] text-slate-500 leading-relaxed">
                    Local variables are NOT values — they are <span className="text-slate-300">named PyObject* pointers</span>.
                    Assignment rebinds the pointer, not the object. This is why Python variables are "names, not boxes".
                </div>
            </div>
        </div>
    );

    if (memPhase === 'smallint') return (
        <div className="py-4">
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mb-4 text-center">Small Integer Cache (-5 to 256)</p>
            <div className="relative bg-slate-900/60 border border-slate-700/50 rounded-2xl p-4 mb-4">
                <div className="flex flex-wrap gap-1 justify-center mb-3">
                    {[-5,-4,-3,-2,-1,0,1,2,3,4,5,6,7].map(n => (
                        <div key={n} className={`w-8 h-8 flex items-center justify-center rounded text-[10px] font-mono font-bold border transition-all ${
                            [3,4,7].includes(n) ? 'bg-yellow-500/30 border-yellow-500/60 text-yellow-200 scale-110 ring-1 ring-yellow-400/40' :
                            n < 0 ? 'bg-slate-800 border-slate-700 text-slate-500' :
                            'bg-slate-800/60 border-slate-700/50 text-slate-400'
                        }`}>{n}</div>
                    ))}
                    <div className="text-slate-600 text-xs self-center px-2">…</div>
                    {[250,251,252,253,254,255,256].map(n => (
                        <div key={n} className="w-10 h-8 flex items-center justify-center rounded text-[9px] font-mono font-bold border bg-slate-800/60 border-slate-700/50 text-slate-400">{n}</div>
                    ))}
                </div>
                <p className="text-center text-[10px] text-slate-500">3, 4, 7 highlighted — pre-allocated at interpreter startup, never freed</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-3 bg-green-500/5 border border-green-500/20 rounded-xl font-mono">
                    <div className="text-green-400 font-semibold mb-1">a = 3; b = 3</div>
                    <div className="text-green-300">a is b  <span className="text-slate-400"># True</span></div>
                    <div className="text-slate-500 mt-1 text-[10px]">Both point to the same cached PyObject</div>
                </div>
                <div className="p-3 bg-red-500/5 border border-red-500/20 rounded-xl font-mono">
                    <div className="text-red-400 font-semibold mb-1">a = 300; b = 300</div>
                    <div className="text-red-300">a is b  <span className="text-slate-400"># False</span></div>
                    <div className="text-slate-500 mt-1 text-[10px]">300 &gt; 256 → two new heap allocations</div>
                </div>
            </div>
        </div>
    );

    if (memPhase === 'refcount') return (
        <div className="py-4 space-y-4">
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold text-center">Reference Counting — add(3, 4) returns</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                    { val: 3, events: ['+1 (LOAD_FAST x)', '+1 (param assign)', '-1 (frame teardown)', '-1 (BINARY_ADD pop)'], finalNote: 'Still alive — small int cache' },
                    { val: 4, events: ['+1 (LOAD_FAST y)', '+1 (param assign)', '-1 (frame teardown)', '-1 (BINARY_ADD pop)'], finalNote: 'Still alive — small int cache' },
                    { val: 7, events: ['+1 (BINARY_ADD result)', '+1 (STORE_FAST result)', '-1 (LOAD_FAST result)', '-1 (RETURN_VALUE)'], finalNote: 'Still alive (small int), or freed if > 256' },
                ].map(({ val, events, finalNote }) => (
                    <div key={val} className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-3">
                        <div className="text-center font-mono font-bold text-slate-200 mb-2">int({val})</div>
                        <div className="space-y-1">
                            {events.map((e, i) => {
                                const isInc = e.startsWith('+');
                                return (
                                    <div key={i} className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                                        isInc ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                                    }`}>{e}</div>
                                );
                            })}
                        </div>
                        <div className="mt-2 text-[10px] text-slate-500 italic">{finalNote}</div>
                    </div>
                ))}
            </div>
            <div className="p-3 bg-slate-900/40 border border-slate-700/40 rounded-xl text-[10px] text-slate-500 text-center">
                Py_INCREF / Py_DECREF called ~20 times during this 3-line function.
                When ob_refcnt hits 0 → <span className="text-slate-300">tp_dealloc</span> called immediately — no GC pause.
            </div>
        </div>
    );
    return null;
}

// ── SCENE 6: GIL & CPU ────────────────────────────────────────────────────────
function SceneGIL({ step }) {
    const { gilPhase } = step;

    const cacheRings = [
        { label: 'L1$', size: '32 KB', latency: '~4 cycles',   color: 'border-yellow-500/60 bg-yellow-500/5',   tw: 40  },
        { label: 'L2$', size: '256 KB', latency: '~12 cycles',  color: 'border-orange-500/50 bg-orange-500/5',   tw: 72  },
        { label: 'L3$', size: '8 MB',   latency: '~40 cycles',  color: 'border-red-500/40   bg-red-500/5',       tw: 104 },
        { label: 'RAM', size: '16 GB',  latency: '~200 cycles', color: 'border-slate-500/40  bg-slate-800/30',   tw: 136 },
    ];

    return (
        <div className="py-4 space-y-5">
            {/* Cache hierarchy */}
            <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mb-4 text-center">CPU Cache Hierarchy</p>
                <div className="flex justify-center">
                    <div className="relative flex items-center justify-center" style={{ width: 300, height: 300 }}>
                        {cacheRings.slice().reverse().map((ring, i) => {
                            const size = (4 - i) * 70;
                            return (
                                <div key={ring.label} className={`absolute rounded-full border-2 flex items-center justify-center ${ring.color}`}
                                    style={{ width: size, height: size }}>
                                </div>
                            );
                        })}
                        {/* Labels on the right side */}
                        <div className="absolute left-full ml-4 space-y-2 text-[10px] font-mono">
                            {cacheRings.map((ring, i) => (
                                <div key={ring.label} className="flex gap-2 items-center">
                                    <div className={`w-2 h-2 rounded-full border ${ring.color}`} />
                                    <span className="text-slate-400 font-semibold">{ring.label}</span>
                                    <span className="text-slate-600">{ring.size} · {ring.latency}</span>
                                </div>
                            ))}
                        </div>
                        {/* Center: eval loop */}
                        <div className={`absolute w-16 h-16 rounded-full border-2 border-yellow-500/80 bg-yellow-500/15 flex flex-col items-center justify-center text-center z-10 transition-all ${gilPhase === 'eval_loop' ? 'scale-110 shadow-lg shadow-yellow-500/20' : ''}`}>
                            <span className="text-yellow-300 font-bold text-[9px]">eval</span>
                            <span className="text-yellow-300 font-bold text-[9px]">loop</span>
                            <span className="text-yellow-500/60 text-[8px]">~32KB</span>
                        </div>
                    </div>
                </div>
                <p className="text-center text-[10px] text-slate-500 mt-2">
                    CPython's eval loop fits in L1 cache — bytecode dispatch is always a cache hit
                </p>
            </div>

            {/* GIL visualization */}
            {(gilPhase === 'gil' || gilPhase === 'io_release') && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-900/60 border border-slate-700/50 rounded-xl">
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mb-3">CPU-bound threads (bad)</p>
                        <div className="space-y-2">
                            {['Thread 1', 'Thread 2', 'Thread 3'].map((t, i) => (
                                <div key={t} className="flex items-center gap-2">
                                    <span className="text-xs text-slate-400 w-16">{t}</span>
                                    <div className="flex-1 h-5 rounded bg-slate-800 overflow-hidden flex">
                                        <div className={`h-full bg-blue-500/60 flex items-center justify-center text-[9px] text-blue-200 ${i === 0 ? 'w-1/3' : i === 1 ? 'w-1/4' : 'w-1/5'}`}>GIL</div>
                                        <div className={`h-full bg-slate-700 flex items-center justify-center text-[9px] text-slate-500 flex-1`}>waiting</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <p className="mt-2 text-[10px] text-red-400">Only 1 thread runs at a time — no CPU parallelism</p>
                    </div>

                    <div className="p-4 bg-slate-900/60 border border-slate-700/50 rounded-xl">
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mb-3">I/O-bound threads (OK)</p>
                        <div className="space-y-2">
                            {[
                                { name: 'Thread 1', exec: 20, io: 60, wait: 20 },
                                { name: 'Thread 2', exec: 15, io: 55, wait: 30 },
                                { name: 'Thread 3', exec: 25, io: 50, wait: 25 },
                            ].map((t) => (
                                <div key={t.name} className="flex items-center gap-2">
                                    <span className="text-xs text-slate-400 w-16">{t.name}</span>
                                    <div className="flex-1 h-5 rounded bg-slate-800 overflow-hidden flex">
                                        <div className="h-full bg-blue-500/60 flex items-center justify-center text-[9px] text-blue-200" style={{width:`${t.exec}%`}}>GIL</div>
                                        <div className="h-full bg-green-500/30 flex items-center justify-center text-[9px] text-green-400" style={{width:`${t.io}%`}}>I/O</div>
                                        <div className="h-full bg-slate-700" style={{width:`${t.wait}%`}} />
                                    </div>
                                </div>
                            ))}
                        </div>
                        <p className="mt-2 text-[10px] text-green-400">GIL released during I/O — threads overlap effectively</p>
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Visualization dispatcher ──────────────────────────────────────────────────
function VisualizationPanel({ step }) {
    if (!step) return null;
    if (step.stage === 1) return <SceneLexer    step={step} />;
    if (step.stage === 2) return <SceneAST      step={step} />;
    if (step.stage === 3) return <SceneBytecode step={step} />;
    if (step.stage === 4) return <SceneVM       step={step} />;
    if (step.stage === 5) return <SceneMemory   step={step} />;
    if (step.stage === 6) return <SceneGIL      step={step} />;
    return null;
}

// ── Quiz ──────────────────────────────────────────────────────────────────────
const QUIZ = [
    {
        question: 'What is Python\'s intermediate representation between source code and the interpreter?',
        options: [
            'Machine code (x86-64 assembly)',
            'LLVM IR (like Clang/Swift use)',
            'Bytecode — stored in .pyc files in __pycache__',
            'An interpreted S-expression tree',
        ],
        correct: 2,
        explanation: 'Python compiles source to bytecode (.pyc), which the CPython virtual machine then interprets. This is why Python starts faster than a fully compiled language (no linker) but runs slower (still interpreted). Use `import dis; dis.dis(fn)` to see the bytecode.',
    },
    {
        question: 'Why does `a = 3; b = 3; a is b` return True in CPython, but `a = 300; b = 300; a is b` returns False?',
        options: [
            'Python optimizes repeated literals at compile time',
            'CPython pre-allocates ("interns") integers from -5 to 256 as singletons',
            'The `is` operator compares values, not identity, for small numbers',
            '3 is a one-digit number; 300 requires two digits internally',
        ],
        correct: 1,
        explanation: 'CPython keeps a global array of 262 pre-allocated PyLongObject singletons for integers -5 to 256. Every `x = 3` just returns a pointer to the same cached object — no allocation. 300 > 256, so each assignment creates a new PyLongObject on the heap. Never use `is` to compare numbers; always use `==`.',
    },
    {
        question: 'What does the GIL prevent, and what does it NOT prevent?',
        options: [
            'Prevents all concurrency; Python has no threading whatsoever',
            'Prevents true CPU parallelism in threads; does NOT prevent I/O concurrency',
            'Prevents race conditions; does NOT prevent deadlocks',
            'Prevents circular reference memory leaks; does NOT affect thread speed',
        ],
        correct: 1,
        explanation: 'The GIL ensures only one thread executes bytecode at a time, preventing true CPU parallelism for CPU-bound tasks. However, threads DO release the GIL during I/O operations (network, disk, sleep), so I/O-bound programs benefit from threading. For CPU-bound parallel work, use `multiprocessing` or C extensions that release the GIL (like NumPy).',
    },
];

function QuizPanel({ quizState, setQuizState }) {
    const q = QUIZ[quizState.current];
    if (quizState.complete) return (
        <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-5 text-center">
            <div className="text-2xl font-bold text-white mb-1">{quizState.score}/{QUIZ.length}</div>
            <div className="text-zinc-400 text-sm mb-4">
                {quizState.score === QUIZ.length ? 'You know Python internals deeply!' : 'Review the bytecode and memory model stages.'}
            </div>
            <button onClick={() => setQuizState({ current: 0, selected: null, answered: false, score: 0, complete: false })}
                className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-sm text-white transition-colors">
                Retake
            </button>
        </div>
    );
    return (
        <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-4">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 mb-2">
                Active Recall {quizState.current + 1}/{QUIZ.length}
            </div>
            <p className="text-slate-200 text-sm font-medium mb-3 leading-relaxed">{q.question}</p>
            <div className="space-y-2">
                {q.options.map((opt, i) => {
                    let cls = 'border-slate-700 text-slate-400 hover:border-zinc-500 hover:text-slate-200';
                    if (quizState.answered) {
                        if (i === q.correct)          cls = 'border-green-500 bg-green-500/10 text-green-300';
                        else if (i === quizState.selected) cls = 'border-red-500 bg-red-500/10 text-red-300';
                        else                          cls = 'border-slate-800 text-slate-600';
                    }
                    return (
                        <button key={i} onClick={() => {
                            if (quizState.answered) return;
                            setQuizState(s => ({ ...s, selected: i, answered: true, score: i === q.correct ? s.score + 1 : s.score }));
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
                }} className="mt-2 w-full py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-xs text-white transition-colors">
                    {quizState.current + 1 >= QUIZ.length ? 'See Score' : 'Next →'}
                </button>
            )}
        </div>
    );
}

// ── Page ──────────────────────────────────────────────────────────────────────
const STEPS = generateSteps();

export default function PythonExecutionPipelinePage() {
    const [currentStep, setCurrentStep] = useState(0);
    const [isPlaying,   setIsPlaying]   = useState(false);
    const [speed,       setSpeed]       = useState(1100);
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
                            <h1 className="text-2xl md:text-3xl font-bold text-white leading-tight">
                                Python Execution Pipeline
                            </h1>
                            <p className="text-zinc-300 text-sm mt-1">
                                Source → Tokens → AST → Bytecode → CPython VM → Memory Model → GIL
                            </p>
                        </div>
                        <div className="text-right shrink-0">
                            <div className="text-xs text-zinc-400 font-mono">{currentStep + 1} / {STEPS.length}</div>
                            <div className="text-[10px] text-zinc-600 mt-0.5">steps</div>
                        </div>
                    </div>

                    {/* Stage timeline */}
                    <div className="flex flex-wrap gap-1.5 mt-4">
                        {STAGES.map(st => {
                            const StIcon = st.icon;
                            const isCurrent = step?.stage === st.id;
                            const isDone    = step?.stage > st.id;
                            return (
                                <button key={st.id} onClick={() => {
                                    const first = STEPS.findIndex(s => s.stage === st.id);
                                    if (first >= 0) { setCurrentStep(first); setIsPlaying(false); }
                                }}
                                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                        isCurrent
                                            ? 'bg-white/20 text-white border border-white/30'
                                            : isDone
                                            ? 'bg-white/5 text-zinc-400 border border-white/10'
                                            : 'bg-transparent text-zinc-600 border border-transparent hover:border-white/10 hover:text-zinc-400'
                                    }`}>
                                    <StIcon className="h-3 w-3" />
                                    {st.short}
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
                                    <span className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">
                                        Stage {step?.stage} of 6
                                    </span>
                                    <span className="text-slate-600 mx-2">·</span>
                                    <span className="text-sm font-semibold text-slate-200">{step?.stageName}</span>
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
                                    className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">
                                    <RotateCcw className="h-4 w-4" />
                                </button>
                                <button onClick={() => setCurrentStep(s => Math.max(0, s - 1))}
                                    className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">
                                    <SkipBack className="h-4 w-4" />
                                </button>
                                <button onClick={() => setIsPlaying(p => !p)}
                                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-white transition-colors text-sm font-medium">
                                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                                    {isPlaying ? 'Pause' : 'Play'}
                                </button>
                                <button onClick={() => setCurrentStep(s => Math.min(STEPS.length - 1, s + 1))}
                                    className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">
                                    <SkipForward className="h-4 w-4" />
                                </button>
                            </div>
                            <div className="flex items-center gap-2 sm:ml-auto">
                                <span className="text-xs text-slate-500">Speed</span>
                                <input type="range" min="300" max="2500" value={speed}
                                    onChange={e => setSpeed(Number(e.target.value))}
                                    className="w-24 accent-zinc-400" />
                                <span className="text-xs text-slate-600 font-mono w-14">{speed > 1800 ? 'slow' : speed < 600 ? 'fast' : 'normal'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-4">
                        {/* Explanation */}
                        <div className="bg-zinc-500/10 border border-zinc-500/20 rounded-xl p-4">
                            <div className="flex items-start gap-2">
                                <Info className="h-4 w-4 text-zinc-400 mt-0.5 shrink-0" />
                                <p className="text-zinc-300 text-sm leading-relaxed">{step?.explanation}</p>
                            </div>
                        </div>

                        {/* Pipeline overview */}
                        <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-4">
                            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mb-3">Pipeline</p>
                            <div className="space-y-1">
                                {[
                                    { stage: 1, label: 'Lexer',       detail: 'chars → tokens'       },
                                    { stage: 2, label: 'Parser',       detail: 'tokens → AST'         },
                                    { stage: 3, label: 'Compiler',     detail: 'AST → bytecode'       },
                                    { stage: 4, label: 'CPython VM',   detail: 'bytecode → execution' },
                                    { stage: 5, label: 'Memory',       detail: 'PyObject + refcount'  },
                                    { stage: 6, label: 'GIL / CPU',    detail: 'eval loop + cache'    },
                                ].map(row => (
                                    <div key={row.stage} className={`flex justify-between items-center px-2 py-1.5 rounded-lg text-xs transition-colors ${
                                        step?.stage === row.stage ? 'bg-zinc-700/50 text-zinc-200' : 'text-slate-500'
                                    }`}>
                                        <span className="font-medium">{row.label}</span>
                                        <span className="font-mono text-slate-600">{row.detail}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Fun fact */}
                        <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-4">
                            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mb-2">Example</p>
                            <div className="font-mono text-xs bg-slate-900 rounded-lg p-3 border border-slate-800 text-slate-400 leading-relaxed">
                                <div className="text-green-400/70"># The function we're tracing</div>
                                <div><span className="text-blue-400">def</span> <span className="text-green-300">add</span>(x, y):</div>
                                <div className="ml-4">result = x + y</div>
                                <div className="ml-4"><span className="text-blue-400">return</span> result</div>
                                <div className="mt-2 text-green-400/70"># Calling it</div>
                                <div>add(<span className="text-purple-300">3</span>, <span className="text-purple-300">4</span>)  <span className="text-slate-600"># → 7</span></div>
                            </div>
                        </div>

                        {/* Quiz */}
                        <QuizPanel quizState={quizState} setQuizState={setQuizState} />
                    </div>
                </div>
            </div>
        </div>
    );
}

"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Play, Pause, SkipBack, SkipForward, RotateCcw,
    Info, CheckCircle, XCircle,
} from 'lucide-react';

// ─── Stages ───────────────────────────────────────────────────────────────────
const STAGES = [
    { id: 1, label: 'Names, Not Boxes',  short: 'Names' },
    { id: 2, label: 'PyObject & Refcount', short: 'Refcount' },
    { id: 3, label: 'Small Int Cache',   short: 'Cache' },
    { id: 4, label: 'Frames & Closures', short: 'Frames' },
];

// ─── Heap object pool (stable ids across steps) ───────────────────────────────
// Used by stage 1 & 2 scenes to show persistent objects.
// id → { type, val, refcnt, addr, color, fields }

// ─── Step generation ──────────────────────────────────────────────────────────
function generateSteps() {
    const S = [];
    const s = (stage, phase, data, explanation) =>
        S.push({ stage, phase, ...data, explanation });

    // ── Stage 1: Names Are Bindings ───────────────────────────────────────────
    s(1, 'c_vs_py', {
        code: null,
        activeLine: -1,
        namespace: {},
        heap: [],
        highlight: null,
        mutation: null,
    }, 'In C, a variable IS a memory box — int x = 5 writes the value 5 directly into a stack slot. In Python, a variable is a NAME — a label in a dictionary that points to an object living on the heap. This single distinction explains most Python "surprises".');

    s(1, 'assign_x', {
        code: ['x = 42'],
        activeLine: 0,
        namespace: { x: 'obj_42' },
        heap: [
            { id: 'obj_42', type: 'int', val: '42', refcnt: 1, addr: '0x7f1a', color: 'blue', alive: true },
        ],
        highlight: 'x',
        mutation: null,
    }, "x = 42 does two things: (1) allocates a PyLong object on the heap containing the value 42, (2) adds the entry 'x': <object> into the current namespace dict. x is not a box holding 42 — it's a name pointing to a box.");

    s(1, 'assign_y_eq_x', {
        code: ['x = 42', 'y = x'],
        activeLine: 1,
        namespace: { x: 'obj_42', y: 'obj_42' },
        heap: [
            { id: 'obj_42', type: 'int', val: '42', refcnt: 2, addr: '0x7f1a', color: 'blue', alive: true },
        ],
        highlight: 'y',
        mutation: null,
    }, "y = x does NOT copy the value 42. It copies the reference — both 'x' and 'y' now point to the same PyLong object. You can verify: id(x) == id(y) is True. The object's reference count rises from 1 to 2.");

    s(1, 'rebind_x', {
        code: ['x = 42', 'y = x', 'x = 100'],
        activeLine: 2,
        namespace: { x: 'obj_100', y: 'obj_42' },
        heap: [
            { id: 'obj_42',  type: 'int', val: '42',  refcnt: 1, addr: '0x7f1a', color: 'blue',  alive: true },
            { id: 'obj_100', type: 'int', val: '100', refcnt: 1, addr: '0x7f3c', color: 'orange', alive: true },
        ],
        highlight: 'x',
        mutation: null,
    }, "x = 100 rebinds the name 'x' to a new object. y is unaffected — it still points to 42. The 42 object's refcount drops from 2 to 1. id(x) != id(y) now. Integers are immutable, so Python must create a fresh object for 100.");

    s(1, 'mutation_intro', {
        code: ['a = [1, 2, 3]', 'b = a', 'b.append(4)', '# a is also [1,2,3,4]!'],
        activeLine: 0,
        namespace: { a: 'obj_list' },
        heap: [
            { id: 'obj_list', type: 'list', val: '[1, 2, 3]', refcnt: 1, addr: '0x7f5e', color: 'purple', alive: true },
        ],
        highlight: 'a',
        mutation: null,
    }, "Lists are mutable objects. a = [1,2,3] creates one list on the heap. b = a again copies the reference — both names point to the SAME list.");

    s(1, 'mutation_trap', {
        code: ['a = [1, 2, 3]', 'b = a', 'b.append(4)', '# a is also [1,2,3,4]!'],
        activeLine: 2,
        namespace: { a: 'obj_list', b: 'obj_list' },
        heap: [
            { id: 'obj_list', type: 'list', val: '[1, 2, 3, 4]', refcnt: 2, addr: '0x7f5e', color: 'purple', alive: true },
        ],
        highlight: 'mutation',
        mutation: { msg: 'b.append(4) mutates the shared object — a now sees [1,2,3,4] too!' },
    }, "b.append(4) modifies the list object in-place. Since a and b both point to that same object, printing a now shows [1,2,3,4]. To get an independent copy, use a[:] or list(a) or copy.copy(a).");

    // ── Stage 2: PyObject & Reference Counting ────────────────────────────────
    s(2, 'pyobject_struct', {
        code: ['x = 42'],
        activeLine: 0,
        obj: { val: 42, refcnt: 1, type: 'PyLong_Type', addr: '0x7f1a2b3c' },
        event: null,
        names: ['x'],
        freed: false,
    }, 'Every Python object is a C struct. The first two fields are universal: ob_refcnt (reference count — how many names/containers point here) and ob_type (pointer to the type object like PyLong_Type). Then come type-specific fields: for ints, ob_digit holds the actual value.');

    s(2, 'refcnt_y', {
        code: ['x = 42', 'y = x'],
        activeLine: 1,
        obj: { val: 42, refcnt: 2, type: 'PyLong_Type', addr: '0x7f1a2b3c' },
        event: 'inc',
        names: ['x', 'y'],
        freed: false,
    }, "y = x: Python calls Py_INCREF on the object — ob_refcnt goes from 1 to 2. No copy of the value was made. The C-level operation is a single increment of an integer field. This is why Python assignment is O(1) regardless of object size.");

    s(2, 'refcnt_del_x', {
        code: ['x = 42', 'y = x', 'del x'],
        activeLine: 2,
        obj: { val: 42, refcnt: 1, type: 'PyLong_Type', addr: '0x7f1a2b3c' },
        event: 'dec',
        names: ['y'],
        freed: false,
    }, "del x removes the name 'x' from the namespace and calls Py_DECREF — ob_refcnt drops from 2 to 1. The object is still alive because y holds a reference. del does not destroy an object; it only removes one reference.");

    s(2, 'refcnt_del_y', {
        code: ['x = 42', 'y = x', 'del x', 'del y  # refcnt → 0'],
        activeLine: 3,
        obj: { val: 42, refcnt: 0, type: 'PyLong_Type', addr: '0x7f1a2b3c' },
        event: 'free',
        names: [],
        freed: true,
    }, "del y drops refcnt to 0. CPython immediately calls the object's tp_dealloc — the memory is returned to the allocator. This is deterministic memory management: no GC pause, freed right when the last reference disappears. The caveat: cyclic references fool refcounting (that's what Python's cyclic GC handles separately).");

    s(2, 'cycle_problem', {
        code: ['a = []', 'b = []', 'a.append(b)  # a refs b', 'b.append(a)  # b refs a', 'del a', 'del b', '# leak! both refcnt = 1'],
        activeLine: 6,
        obj: null,
        event: 'cycle',
        names: [],
        freed: false,
        cycleObjs: [
            { id: 'a', val: '[→b]', refcnt: 1, color: 'blue' },
            { id: 'b', val: '[→a]', refcnt: 1, color: 'green' },
        ],
    }, "The weakness of refcounting: cycles. After del a and del b the names are gone, but each list still has refcnt=1 because they reference each other. Neither reaches 0. Python's optional cyclic garbage collector runs periodically (gc.collect()) to detect and free these island objects.");

    // ── Stage 3: Small Int Cache ──────────────────────────────────────────────
    s(3, 'cache_intro', {
        code: null,
        a: null, b: null, aObj: null, bObj: null,
        cacheRange: { min: -5, max: 256 },
        highlight: [],
        isResult: null,
        phase: 'intro',
    }, "CPython pre-allocates all integers from -5 to 256 at startup and keeps them alive permanently. Assigning any of these values never allocates a new object — Python just returns a pointer to the pre-existing cached object. This saves millions of tiny allocations in typical code.");

    s(3, 'small_int_is', {
        code: ['a = 100', 'b = 100', 'a is b   # True'],
        a: 100, b: 100,
        aObj: { addr: '0x10a2f480', cached: true },
        bObj: { addr: '0x10a2f480', cached: true },
        highlight: [100],
        isResult: { result: true, eq: true, label: 'Same object! (cached)' },
        phase: 'small',
    }, "a = 100 and b = 100 both return the same cached PyLong object. a is b is True — the identity check (same memory address) passes. a == b is also True. Inside the cache, 100 has a very high refcnt because every script that uses 100 bumps it.");

    s(3, 'large_int_is', {
        code: ['a = 1000', 'b = 1000', 'a is b   # False!'],
        a: 1000, b: 1000,
        aObj: { addr: '0x7f1a2b00', cached: false },
        bObj: { addr: '0x7f1a3c40', cached: false },
        highlight: [],
        isResult: { result: false, eq: true, label: 'Different objects (not cached)' },
        phase: 'large',
    }, "1000 is outside the cache range. Each assignment allocates a fresh PyLong. a is b is False — different addresses — even though a == b is True. This is why you should NEVER use 'is' to compare values; always use '=='. 'is' checks identity (same object), '==' checks equality (same value).");

    s(3, 'interning', {
        code: ['s1 = "hello"', 's2 = "hello"', 's1 is s2   # True (interned)'],
        a: '"hello"', b: '"hello"',
        aObj: { addr: '0x7f1a4000', cached: true, note: 'interned' },
        bObj: { addr: '0x7f1a4000', cached: true, note: 'interned' },
        highlight: [],
        isResult: { result: true, eq: true, label: 'Interned string — same object' },
        phase: 'intern',
    }, 'Strings that look like identifiers (alphanumeric, no spaces) are automatically interned — stored in a global dictionary and reused. "hello" is always interned. "hello world" is NOT (has a space). String interning is analogous to the int cache: an optimization that makes "is" comparisons accidentally pass for common strings.');

    // ── Stage 4: Frames, LEGB & Closures ─────────────────────────────────────
    s(4, 'frame_intro', {
        code: [
            'x = "global"',
            '',
            'def outer():',
            '    x = "enclosing"',
            '    def inner():',
            '        print(x)   # which x?',
            '    inner()',
            '',
            'outer()',
        ],
        activeLine: -1,
        frames: [],
        legbSearch: null,
        closureCell: null,
        phase: 'intro',
    }, "Every function call creates a frame object: a C struct containing f_locals (local variables dict), f_globals (reference to the module globals dict), f_code (the compiled bytecode object), and f_back (link to the caller's frame — forming the call stack). Frames are allocated on the heap, not the C stack.");

    s(4, 'frame_global', {
        code: [
            'x = "global"',
            '',
            'def outer():',
            '    x = "enclosing"',
            '    def inner():',
            '        print(x)',
            '    inner()',
            '',
            'outer()',
        ],
        activeLine: 0,
        frames: [
            { name: '<module>', locals: { x: '"global"', outer: '<function>' }, color: 'slate', active: true },
        ],
        legbSearch: null,
        closureCell: null,
        phase: 'global_frame',
    }, "The module-level frame is always at the bottom of the stack. x = \"global\" is assigned in this frame's f_locals (which doubles as f_globals for modules). The def statement creates a function object and binds the name 'outer'.");

    s(4, 'frame_outer', {
        code: [
            'x = "global"',
            '',
            'def outer():',
            '    x = "enclosing"',
            '    def inner():',
            '        print(x)',
            '    inner()',
            '',
            'outer()',
        ],
        activeLine: 3,
        frames: [
            { name: '<module>', locals: { x: '"global"', outer: '<function>' }, color: 'slate',  active: false },
            { name: 'outer()',  locals: { x: '"enclosing"', inner: '<function>' }, color: 'blue', active: true },
        ],
        legbSearch: null,
        closureCell: null,
        phase: 'outer_frame',
    }, "outer() is called. A new frame is pushed onto the stack. outer's f_locals gets its own 'x' = \"enclosing\" — completely independent from the global 'x'. The def creates an inner function object that captures a reference to outer's frame (this is the closure).");

    s(4, 'frame_inner', {
        code: [
            'x = "global"',
            '',
            'def outer():',
            '    x = "enclosing"',
            '    def inner():',
            '        print(x)',
            '    inner()',
            '',
            'outer()',
        ],
        activeLine: 5,
        frames: [
            { name: '<module>', locals: { x: '"global"', outer: '<function>' }, color: 'slate',  active: false },
            { name: 'outer()',  locals: { x: '"enclosing"', inner: '<function>' }, color: 'blue', active: false },
            { name: 'inner()',  locals: {}, color: 'green', active: true },
        ],
        legbSearch: { searching: 'x', steps: ['L: inner locals — not found', 'E: outer locals — FOUND: "enclosing"'] },
        closureCell: null,
        phase: 'legb',
    }, 'inner() calls print(x). Python looks up "x" via LEGB: Local (inner\'s own f_locals — empty, not found), then Enclosing (outer\'s f_locals — found: "enclosing"). The search stops here. The global "global" value is never reached. This is why inner() prints "enclosing" not "global".');

    s(4, 'closure_intro', {
        code: [
            'def make_counter():',
            '    count = 0',
            '    def increment():',
            '        nonlocal count',
            '        count += 1',
            '        return count',
            '    return increment',
            '',
            'f = make_counter()',
            'f()   # → 1',
            'f()   # → 2',
        ],
        activeLine: 8,
        frames: [
            { name: '<module>', locals: { make_counter: '<function>', f: '<closure>' }, color: 'slate', active: true },
        ],
        legbSearch: null,
        closureCell: { name: 'count', value: 0, addr: '0x7f2a', callCount: 0 },
        phase: 'closure',
    }, "make_counter() returns increment before it finishes — but increment still needs access to count. Python wraps count in a cell object: a small heap-allocated box that both outer and inner share. f = make_counter() — the frame for make_counter is gone, but the cell object lives on because the closure holds a reference to it.");

    s(4, 'closure_call1', {
        code: [
            'def make_counter():',
            '    count = 0',
            '    def increment():',
            '        nonlocal count',
            '        count += 1',
            '        return count',
            '    return increment',
            '',
            'f = make_counter()',
            'f()   # → 1',
            'f()   # → 2',
        ],
        activeLine: 9,
        frames: [
            { name: '<module>', locals: { f: '<closure>' }, color: 'slate', active: false },
            { name: 'f / increment()', locals: { count: '(cell)' }, color: 'green', active: true },
        ],
        legbSearch: null,
        closureCell: { name: 'count', value: 1, addr: '0x7f2a', callCount: 1 },
        phase: 'closure_run',
    }, "f() runs increment(). 'nonlocal count' tells Python: don't look in my own locals — go to the enclosing cell object. count += 1 modifies the cell's value from 0 to 1. The frame for increment() is destroyed after return, but the cell object survives.");

    s(4, 'closure_call2', {
        code: [
            'def make_counter():',
            '    count = 0',
            '    def increment():',
            '        nonlocal count',
            '        count += 1',
            '        return count',
            '    return increment',
            '',
            'f = make_counter()',
            'f()   # → 1',
            'f()   # → 2',
        ],
        activeLine: 10,
        frames: [
            { name: '<module>', locals: { f: '<closure>' }, color: 'slate', active: false },
            { name: 'f / increment()', locals: { count: '(cell)' }, color: 'green', active: true },
        ],
        legbSearch: null,
        closureCell: { name: 'count', value: 2, addr: '0x7f2a', callCount: 2 },
        phase: 'closure_run',
    }, "f() again — the same cell object. count goes from 1 to 2. The cell acts like a mutable shared variable between the closure and its creator, persisting across calls. This pattern is the basis of all Python factories, decorators, and the class-free way to keep private state.");

    return S;
}

const STEPS = generateSteps();

// ─── Quiz ─────────────────────────────────────────────────────────────────────
const QUIZ = [
    {
        question: 'a = [1,2,3]; b = a; b.append(4). What does print(a) output?',
        options: ['[1, 2, 3, 4]', '[1, 2, 3]', 'Error — b is immutable', 'Depends on Python version'],
        correct: 0,
        explanation: 'b = a copies the reference, not the list. Both a and b point to the same list object. b.append(4) mutates that shared object, so a also sees the change. Use a[:] or list(a) for a shallow copy.',
    },
    {
        question: 'Why is `x = 256; y = 256; x is y` True, but `x = 1000; y = 1000; x is y` False?',
        options: [
            'CPython caches integers -5 to 256; 1000 is outside this range so two objects are created',
            'Python uses "is" for integers up to 256 and "==" for larger values',
            'Integers over 256 are stored as floats',
            'This only happens in CPython, not in PyPy',
        ],
        correct: 0,
        explanation: 'The small int cache pre-allocates -5..256 at interpreter startup. Any assignment within that range returns the same cached object. 1000 is outside the cache so each assignment allocates a new PyLong — different addresses, different identity.',
    },
    {
        question: 'A closure captures the variable count via nonlocal. What happens to the cell object after make_counter() returns?',
        options: [
            'It stays alive on the heap because the inner function holds a reference to it',
            'It is garbage collected immediately when make_counter\'s frame is destroyed',
            'It is copied into the inner function\'s locals',
            'It raises a NameError if accessed after make_counter returns',
        ],
        correct: 0,
        explanation: 'The cell object is heap-allocated and its refcount is held by the closure (the returned inner function). When make_counter\'s frame is freed, the cell\'s refcount stays above zero because the closure still references it — so it lives as long as the closure lives.',
    },
];

// ─── Arrow SVG between a namespace entry and a heap object ───────────────────
// We use CSS flexbox + absolute-positioned connector lines via a canvas-free trick.
// Instead of real SVG arrows, we use coloured dotted borders.

// ─── Scene: Names vs Boxes ────────────────────────────────────────────────────
function SceneNames({ step }) {
    const { code, activeLine, namespace, heap, highlight, mutation } = step;

    const nsEntries = Object.entries(namespace);

    // Map object ids → heap objects
    const heapById = {};
    heap.forEach(o => { heapById[o.id] = o; });

    // For each namespace entry, find the target object
    // Count how many names point to each object
    const refsByObj = {};
    nsEntries.forEach(([, oid]) => { refsByObj[oid] = (refsByObj[oid] || 0) + 1; });

    // Which obj ids are newly highlighted
    const highlightedObjs = new Set(
        highlight === 'x'        ? [namespace.x].filter(Boolean) :
        highlight === 'y'        ? [namespace.y].filter(Boolean) :
        highlight === 'mutation' ? Object.values(namespace)      : []
    );

    return (
        <div className="flex flex-col gap-5 h-full">
            {/* Code */}
            {code && (
                <div className="bg-slate-900 rounded-xl border border-slate-700 p-3 font-mono text-sm">
                    {code.map((line, i) => (
                        <div key={i} className={`px-2 py-0.5 rounded ${
                            i === activeLine ? 'bg-yellow-500/20 text-yellow-200' :
                            line.startsWith('#') ? 'text-slate-500' : 'text-slate-300'
                        }`}>
                            <span className="text-slate-600 mr-3 select-none">{i + 1}</span>
                            {line}
                        </div>
                    ))}
                </div>
            )}

            {/* Two-panel: namespace | heap */}
            <div className="flex gap-4 flex-1 min-h-0">
                {/* Namespace panel */}
                <div className="flex-1 bg-slate-800/60 rounded-xl border border-slate-700 p-4 flex flex-col">
                    <div className="text-slate-400 text-xs font-semibold uppercase tracking-wide mb-3">
                        Namespace dict
                    </div>
                    {nsEntries.length === 0 ? (
                        <div className="text-slate-600 text-sm text-center my-auto">empty</div>
                    ) : (
                        <div className="space-y-2">
                            {nsEntries.map(([name, oid]) => {
                                const obj = heapById[oid];
                                const isNew = (highlight === 'x' && name === 'x') || (highlight === 'y' && name === 'y');
                                return (
                                    <div key={name} className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
                                        isNew ? 'border-yellow-500/50 bg-yellow-500/10' : 'border-slate-700/60 bg-slate-900/40'
                                    }`}>
                                        <code className="text-green-300 font-bold text-sm">{name}</code>
                                        <span className="text-slate-500 text-xs">→</span>
                                        <code className={`text-xs px-1.5 py-0.5 rounded font-mono ${
                                            obj?.color === 'blue'   ? 'bg-blue-500/20 text-blue-300' :
                                            obj?.color === 'orange' ? 'bg-orange-500/20 text-orange-300' :
                                            obj?.color === 'purple' ? 'bg-purple-500/20 text-purple-300' :
                                                                      'bg-slate-700 text-slate-400'
                                        }`}>{obj?.addr || oid}</code>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* C contrast note */}
                    {code === null && (
                        <div className="mt-auto space-y-2 text-xs">
                            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                                <div className="text-red-400 font-semibold mb-1">C / C++ model</div>
                                <div className="font-mono text-slate-300">int x = 5;</div>
                                <div className="text-slate-500 mt-1">x IS a memory slot. Assignment copies the value.</div>
                            </div>
                            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                                <div className="text-blue-400 font-semibold mb-1">Python model</div>
                                <div className="font-mono text-slate-300">x = 5</div>
                                <div className="text-slate-500 mt-1">x is a name in a dict. Assignment binds the name.</div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Arrow divider */}
                <div className="flex flex-col items-center justify-center gap-1 w-6 flex-shrink-0">
                    <div className="text-slate-600 text-xs" style={{ writingMode: 'vertical-rl' }}>points to</div>
                    <div className="w-0.5 flex-1 bg-slate-700 rounded" />
                </div>

                {/* Heap panel */}
                <div className="flex-1 bg-slate-800/60 rounded-xl border border-slate-700 p-4 flex flex-col">
                    <div className="text-slate-400 text-xs font-semibold uppercase tracking-wide mb-3">
                        Heap (PyObjects)
                    </div>
                    {heap.length === 0 ? (
                        <div className="text-slate-600 text-sm text-center my-auto">empty</div>
                    ) : (
                        <div className="space-y-3">
                            {heap.map(obj => {
                                const isHighlighted = highlightedObjs.has(obj.id);
                                const namesPointingHere = nsEntries.filter(([, oid]) => oid === obj.id).map(([n]) => n);
                                return (
                                    <div key={obj.id} className={`rounded-xl border-2 p-3 transition-all ${
                                        isHighlighted
                                            ? (obj.color === 'blue'   ? 'border-blue-400   bg-blue-500/10' :
                                               obj.color === 'orange' ? 'border-orange-400 bg-orange-500/10' :
                                               obj.color === 'purple' ? 'border-purple-400 bg-purple-500/10' :
                                                                        'border-zinc-400   bg-zinc-500/10')
                                            : 'border-slate-600 bg-slate-900/50'
                                    }`}>
                                        {/* Names pointing here */}
                                        {namesPointingHere.length > 0 && (
                                            <div className="flex gap-1 mb-2">
                                                {namesPointingHere.map(n => (
                                                    <span key={n} className="text-[10px] bg-green-500/20 text-green-300 px-1.5 py-0.5 rounded font-mono">{n}</span>
                                                ))}
                                                <span className="text-slate-500 text-[10px]">→ this</span>
                                            </div>
                                        )}
                                        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs font-mono">
                                            <span className="text-slate-500">ob_type</span>
                                            <span className={`${
                                                obj.color === 'blue'   ? 'text-blue-300' :
                                                obj.color === 'orange' ? 'text-orange-300' :
                                                obj.color === 'purple' ? 'text-purple-300' : 'text-slate-300'
                                            }`}>{obj.type}</span>
                                            <span className="text-slate-500">ob_refcnt</span>
                                            <span className={`font-bold ${obj.refcnt > 1 ? 'text-yellow-300' : 'text-slate-300'}`}>{obj.refcnt}</span>
                                            <span className="text-slate-500">value</span>
                                            <span className="text-white font-bold">{obj.val}</span>
                                            <span className="text-slate-500">address</span>
                                            <span className="text-slate-400 text-[10px]">{obj.addr}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Mutation warning */}
            {mutation && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 flex items-start gap-2">
                    <span className="text-red-400 text-lg flex-shrink-0">⚠</span>
                    <p className="text-red-300 text-sm">{mutation.msg}</p>
                </div>
            )}
        </div>
    );
}

// ─── Scene: PyObject & Refcount ───────────────────────────────────────────────
function ScenePyObject({ step }) {
    const { code, activeLine, obj, event, names, freed, cycleObjs } = step;

    const eventColor = event === 'inc' ? 'text-green-400' : event === 'dec' ? 'text-yellow-400' : event === 'free' ? 'text-red-400' : 'text-slate-400';
    const eventLabel = event === 'inc' ? 'Py_INCREF ↑' : event === 'dec' ? 'Py_DECREF ↓' : event === 'free' ? 'tp_dealloc — freed!' : null;

    return (
        <div className="flex flex-col gap-5 h-full">
            {code && (
                <div className="bg-slate-900 rounded-xl border border-slate-700 p-3 font-mono text-sm">
                    {code.map((line, i) => (
                        <div key={i} className={`px-2 py-0.5 rounded ${i === activeLine ? 'bg-yellow-500/20 text-yellow-200' : 'text-slate-400'}`}>
                            <span className="text-slate-600 mr-3 select-none">{i + 1}</span>
                            {line}
                        </div>
                    ))}
                </div>
            )}

            {/* Cycle diagram */}
            {cycleObjs ? (
                <div className="flex-1 flex flex-col gap-4 justify-center">
                    <div className="text-center text-slate-400 text-sm mb-2">After <code className="text-slate-300">del a</code> and <code className="text-slate-300">del b</code> — both refcnts = 1, neither freed</div>
                    <div className="flex items-center justify-center gap-8">
                        {cycleObjs.map(co => (
                            <div key={co.id} className={`rounded-xl border-2 p-4 w-36 text-center ${
                                co.color === 'blue' ? 'border-blue-500/50 bg-blue-500/8' : 'border-green-500/50 bg-green-500/8'
                            }`}>
                                <div className={`text-sm font-bold mb-2 ${co.color === 'blue' ? 'text-blue-300' : 'text-green-300'}`}>
                                    {co.id} (gone)
                                </div>
                                <div className="text-xs text-slate-500 font-mono mb-1">val: {co.val}</div>
                                <div className="text-xs font-bold text-yellow-300">refcnt: {co.refcnt}</div>
                            </div>
                        ))}
                    </div>
                    {/* Cycle arrows */}
                    <div className="flex items-center justify-center">
                        <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-6 py-3 text-center">
                            <div className="text-red-400 font-bold text-sm mb-1">⟲ Circular Reference Leak</div>
                            <div className="text-slate-400 text-xs">a → b → a. No name points here, but refcnt ≠ 0.</div>
                            <div className="text-slate-400 text-xs mt-1">Python's cyclic GC (gc module) detects and frees these.</div>
                        </div>
                    </div>
                </div>
            ) : obj && (
                <div className="flex gap-6 flex-1">
                    {/* Struct layout */}
                    <div className={`flex-1 rounded-xl border-2 p-5 transition-all ${
                        freed ? 'border-red-500/40 bg-red-500/5 opacity-60' :
                        event === 'inc' ? 'border-green-500/40 bg-green-500/5' :
                        event === 'dec' ? 'border-yellow-500/40 bg-yellow-500/5' :
                                          'border-blue-500/30 bg-blue-500/5'
                    }`}>
                        <div className="text-slate-400 text-xs font-semibold uppercase tracking-wide mb-4">
                            PyLong_Object @ {obj.addr}
                        </div>
                        <div className="space-y-3 font-mono text-sm">
                            {[
                                { field: 'ob_refcnt',  val: freed ? '0 → freed' : obj.refcnt, note: 'references to this object',   highlight: event === 'inc' || event === 'dec' || event === 'free' },
                                { field: 'ob_type',    val: obj.type,  note: 'pointer to type object',        highlight: false },
                                { field: 'ob_digit[0]',val: obj.val,   note: 'the actual integer value',      highlight: false },
                            ].map(row => (
                                <div key={row.field} className={`flex items-start gap-3 px-3 py-2 rounded-lg transition-all ${
                                    row.highlight ? (freed ? 'bg-red-500/20' : event === 'inc' ? 'bg-green-500/20' : 'bg-yellow-500/20') : 'bg-slate-800/40'
                                }`}>
                                    <span className="text-zinc-400 w-28 flex-shrink-0">{row.field}</span>
                                    <span className={`font-bold flex-shrink-0 ${
                                        row.highlight && freed ? 'text-red-400' :
                                        row.highlight && event === 'inc' ? 'text-green-300' :
                                        row.highlight ? 'text-yellow-300' : 'text-white'
                                    }`}>{String(row.val)}</span>
                                    <span className="text-slate-500 text-xs flex-1">{row.note}</span>
                                </div>
                            ))}
                        </div>

                        {freed && (
                            <div className="mt-4 text-center text-red-400 font-bold text-sm border border-red-500/30 rounded-lg py-2 bg-red-500/10">
                                💀 tp_dealloc called — memory returned to allocator
                            </div>
                        )}
                    </div>

                    {/* Right panel: names + event */}
                    <div className="w-48 flex flex-col gap-4">
                        {/* Names pointing here */}
                        <div className="bg-slate-800/60 rounded-xl border border-slate-700 p-3">
                            <div className="text-slate-400 text-xs mb-2">Names → this object</div>
                            <div className="space-y-1.5">
                                {names.length === 0
                                    ? <div className="text-slate-600 text-xs">none</div>
                                    : names.map(n => (
                                        <div key={n} className="bg-green-500/15 text-green-300 text-sm font-mono px-2 py-1 rounded border border-green-500/20">
                                            {n}
                                        </div>
                                    ))
                                }
                            </div>
                        </div>

                        {/* Event label */}
                        {eventLabel && (
                            <div className={`rounded-xl border p-3 text-center font-mono text-sm font-bold ${
                                event === 'inc'  ? 'border-green-500/40 bg-green-500/10 text-green-300' :
                                event === 'dec'  ? 'border-yellow-500/40 bg-yellow-500/10 text-yellow-300' :
                                                   'border-red-500/40 bg-red-500/10 text-red-300'
                            }`}>
                                {eventLabel}
                            </div>
                        )}

                        {/* Refcount visualizer */}
                        <div className="bg-slate-800/60 rounded-xl border border-slate-700 p-3 text-center">
                            <div className="text-slate-400 text-xs mb-2">ob_refcnt</div>
                            <div className={`text-4xl font-bold transition-all ${
                                freed    ? 'text-red-400' :
                                obj.refcnt >= 2 ? 'text-yellow-300' : 'text-white'
                            }`}>{freed ? 0 : obj.refcnt}</div>
                            <div className={`text-xs mt-1 ${freed ? 'text-red-400' : obj.refcnt === 0 ? 'text-red-400' : 'text-slate-500'}`}>
                                {freed ? 'freed' : obj.refcnt === 0 ? '→ will be freed' : `reference${obj.refcnt > 1 ? 's' : ''}`}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Scene: Small Int Cache ───────────────────────────────────────────────────
function SceneSmallInt({ step }) {
    const { code, a, b, aObj, bObj, isResult, phase } = step;

    // Render a grid of integers -5..30 to represent the cache
    const cacheNums = Array.from({ length: 36 }, (_, i) => i - 5); // -5..30

    return (
        <div className="flex flex-col gap-5 h-full">
            {/* Cache grid */}
            <div className="bg-slate-800/60 rounded-xl border border-slate-700 p-4">
                <div className="flex items-center justify-between mb-3">
                    <span className="text-slate-400 text-xs font-semibold uppercase tracking-wide">Small int cache (−5 … 256)</span>
                    <span className="text-slate-500 text-xs">262 pre-allocated PyLong objects</span>
                </div>
                <div className="flex flex-wrap gap-1 mb-2">
                    {cacheNums.map(n => {
                        const isA = phase !== 'intro' && phase !== 'intern' && a === n;
                        const isB = phase !== 'intro' && phase !== 'intern' && b === n;
                        const isAB = isA && isB;
                        return (
                            <div key={n} className={`w-7 h-7 rounded flex items-center justify-center text-[11px] font-mono font-bold transition-all ${
                                isAB  ? 'bg-yellow-400 text-slate-900 scale-110 ring-2 ring-yellow-300' :
                                isA   ? 'bg-blue-500 text-white scale-105' :
                                isB   ? 'bg-green-500 text-white scale-105' :
                                        'bg-slate-700 text-slate-400 hover:bg-slate-600'
                            }`}>{n}</div>
                        );
                    })}
                    <div className="flex items-center text-slate-600 text-xs px-2">… 31 … 100 … 200 … 256 →</div>
                </div>
                <div className="flex items-center gap-3 text-xs">
                    <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-yellow-400" /><span className="text-slate-400">a and b → same object</span></div>
                    <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-slate-700" /><span className="text-slate-400">cached (always reused)</span></div>
                </div>
            </div>

            {/* Code + identity check */}
            {code && (
                <div className="grid grid-cols-2 gap-4 flex-1">
                    <div className="bg-slate-900 rounded-xl border border-slate-700 p-3 font-mono text-sm self-start">
                        {code.map((line, i) => (
                            <div key={i} className={`px-2 py-0.5 rounded ${
                                line.includes('is') ? 'bg-yellow-500/15 text-yellow-200' :
                                line.startsWith('#') ? 'text-slate-500' : 'text-slate-300'
                            }`}>
                                <span className="text-slate-600 mr-3 select-none">{i + 1}</span>
                                {line}
                            </div>
                        ))}
                    </div>

                    <div className="flex flex-col gap-3">
                        {/* Object cards */}
                        {aObj && (
                            <div className="space-y-2">
                                {[
                                    { label: 'a', obj: aObj, val: a },
                                    { label: 'b', obj: bObj, val: b },
                                ].map(({ label, obj, val }) => obj && (
                                    <div key={label} className={`rounded-lg border px-3 py-2 font-mono text-xs ${
                                        obj.cached ? 'border-yellow-500/30 bg-yellow-500/8' : 'border-slate-600 bg-slate-800/60'
                                    }`}>
                                        <div className="flex items-center justify-between">
                                            <span className="text-green-300 font-bold">{label} = {String(val)}</span>
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded ${obj.cached ? 'bg-yellow-500/20 text-yellow-300' : 'bg-slate-700 text-slate-400'}`}>
                                                {obj.cached ? (phase === 'intern' ? 'interned' : 'cached') : 'new alloc'}
                                            </span>
                                        </div>
                                        <div className="text-slate-500 mt-1">id → {obj.addr}</div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* is result */}
                        {isResult && (
                            <div className={`rounded-xl border-2 p-3 text-center transition-all ${
                                isResult.result
                                    ? 'border-green-500/50 bg-green-500/10'
                                    : 'border-red-500/40 bg-red-500/8'
                            }`}>
                                <div className="text-slate-400 text-xs mb-1 font-mono">a is b</div>
                                <div className={`text-2xl font-bold ${isResult.result ? 'text-green-400' : 'text-red-400'}`}>
                                    {String(isResult.result)}
                                </div>
                                <div className={`text-xs mt-1 ${isResult.result ? 'text-green-300/70' : 'text-red-300/70'}`}>
                                    {isResult.label}
                                </div>
                                <div className="border-t border-slate-700 mt-2 pt-2">
                                    <div className="text-slate-400 text-xs font-mono">a == b</div>
                                    <div className="text-green-400 font-bold">True</div>
                                    <div className="text-slate-500 text-[10px]">(values always equal)</div>
                                </div>
                            </div>
                        )}

                        {phase === 'intro' && (
                            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 text-xs">
                                <div className="text-blue-300 font-semibold mb-1">Why?</div>
                                <p className="text-slate-400 leading-relaxed">Small integers are used constantly (loop counters, list indices). Pre-allocating them avoids millions of malloc/free calls per second — a major performance win with zero user-visible cost.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Intro state */}
            {!code && (
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-center max-w-sm">
                        <div className="text-slate-300 text-sm leading-relaxed">
                            Hover the grid to explore cached integers. The visualizer will show how two names bound to the same small integer share one object — and why <code className="text-yellow-300">is</code> vs <code className="text-yellow-300">==</code> gives different answers outside the cache.
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Scene: Frames & Closures ─────────────────────────────────────────────────
function SceneFrames({ step }) {
    const { code, activeLine, frames, legbSearch, closureCell, phase } = step;

    const LEGB_LABELS = ['L — Local', 'E — Enclosing', 'G — Global', 'B — Built-in'];

    return (
        <div className="flex flex-col gap-4 h-full">
            {/* Code */}
            <div className="bg-slate-900 rounded-xl border border-slate-700 p-3 font-mono text-xs flex-shrink-0">
                {code.map((line, i) => (
                    <div key={i} className={`px-2 py-px rounded ${
                        i === activeLine ? 'bg-yellow-500/20 text-yellow-200' :
                        line.startsWith('#') ? 'text-slate-500' :
                        line.includes('nonlocal') ? 'text-purple-300' :
                        line.includes('def ')     ? 'text-blue-300' :
                        line.includes('return')   ? 'text-orange-300' : 'text-slate-300'
                    }`}>
                        <span className="text-slate-600 mr-3 select-none w-3 inline-block text-right">{line ? i + 1 : ''}</span>
                        {line}
                    </div>
                ))}
            </div>

            <div className="flex gap-4 flex-1 min-h-0">
                {/* Frame stack */}
                <div className="flex-1 flex flex-col gap-2">
                    <div className="text-slate-400 text-xs font-semibold uppercase tracking-wide">
                        Call Stack (newest on top)
                    </div>
                    {frames.length === 0 ? (
                        <div className="text-slate-600 text-sm text-center my-auto">no frames yet</div>
                    ) : (
                        <div className="flex flex-col-reverse gap-2 flex-1">
                            {frames.map((frame, i) => (
                                <div key={frame.name} className={`rounded-xl border p-3 transition-all ${
                                    frame.active
                                        ? (frame.color === 'blue'  ? 'border-blue-500/50  bg-blue-500/8' :
                                           frame.color === 'green' ? 'border-green-500/50 bg-green-500/8' :
                                                                     'border-zinc-500/50  bg-zinc-500/8')
                                        : 'border-slate-700/50 bg-slate-800/30 opacity-60'
                                }`}>
                                    <div className="flex items-center justify-between mb-2">
                                        <span className={`text-xs font-bold font-mono ${
                                            frame.color === 'blue'  ? 'text-blue-300' :
                                            frame.color === 'green' ? 'text-green-300' : 'text-zinc-300'
                                        }`}>{frame.name}</span>
                                        {frame.active && (
                                            <span className="text-[10px] bg-yellow-500/20 text-yellow-300 px-1.5 py-0.5 rounded">executing</span>
                                        )}
                                    </div>
                                    <div className="space-y-1">
                                        {Object.entries(frame.locals).map(([k, v]) => (
                                            <div key={k} className="flex items-center gap-2 font-mono text-xs">
                                                <span className="text-green-300 w-20 flex-shrink-0">{k}</span>
                                                <span className="text-slate-500">=</span>
                                                <span className="text-slate-300">{v}</span>
                                            </div>
                                        ))}
                                        {Object.keys(frame.locals).length === 0 && (
                                            <div className="text-slate-600 text-xs italic">no locals</div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Right panel: LEGB search or closure cell */}
                <div className="w-52 flex flex-col gap-3 flex-shrink-0">
                    {/* LEGB lookup */}
                    {legbSearch && (
                        <div className="bg-slate-800/60 rounded-xl border border-slate-700 p-3">
                            <div className="text-slate-300 text-xs font-semibold mb-3">
                                Looking up: <code className="text-yellow-300">{legbSearch.searching}</code>
                            </div>
                            <div className="space-y-1.5">
                                {LEGB_LABELS.map((label, i) => {
                                    const step = legbSearch.steps[i];
                                    const found = step && step.includes('FOUND');
                                    const searched = !!step;
                                    return (
                                        <div key={label} className={`flex items-start gap-2 px-2 py-1.5 rounded-lg text-xs transition-all ${
                                            found    ? 'bg-green-500/20 border border-green-500/30' :
                                            searched ? 'bg-slate-700/60 border border-slate-600' :
                                                       'bg-slate-800/40 border border-slate-700/30'
                                        }`}>
                                            <span className={`font-bold flex-shrink-0 ${
                                                found ? 'text-green-400' : searched ? 'text-slate-400' : 'text-slate-600'
                                            }`}>{found ? '✓' : searched ? '✗' : '○'}</span>
                                            <div>
                                                <div className={`font-semibold ${found ? 'text-green-300' : searched ? 'text-slate-400' : 'text-slate-600'}`}>
                                                    {label}
                                                </div>
                                                {step && <div className={`text-[10px] mt-0.5 ${found ? 'text-green-300/70' : 'text-slate-500'}`}>{step}</div>}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Closure cell */}
                    {closureCell && (
                        <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-3">
                            <div className="text-purple-300 text-xs font-semibold mb-3">Cell Object</div>
                            <div className="text-center mb-3">
                                <div className="text-slate-400 text-[10px] mb-1">cell_contents</div>
                                <div className="text-3xl font-bold text-white">{closureCell.value}</div>
                                <div className="text-slate-500 text-[10px] mt-1">@ {closureCell.addr}</div>
                            </div>
                            <div className="text-[10px] text-slate-400 space-y-1">
                                <div className="flex justify-between">
                                    <span>name:</span>
                                    <code className="text-green-300">{closureCell.name}</code>
                                </div>
                                <div className="flex justify-between">
                                    <span>f() calls:</span>
                                    <span className="text-yellow-300">{closureCell.callCount}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>outer frame:</span>
                                    <span className="text-red-400">gone</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>cell alive:</span>
                                    <span className="text-green-400">yes ✓</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Intro: frame struct */}
                    {phase === 'intro' && (
                        <div className="bg-slate-800/60 rounded-xl border border-slate-700 p-3">
                            <div className="text-slate-300 text-xs font-semibold mb-2">PyFrameObject</div>
                            <div className="space-y-1.5 font-mono text-[11px]">
                                {[
                                    { f: 'f_back',    v: '→ caller frame' },
                                    { f: 'f_code',    v: '→ PyCodeObject' },
                                    { f: 'f_locals',  v: '→ dict{}' },
                                    { f: 'f_globals', v: '→ module dict' },
                                    { f: 'f_lasti',   v: 'bytecode offset' },
                                ].map(row => (
                                    <div key={row.f} className="flex items-center gap-2">
                                        <span className="text-zinc-400 w-20 flex-shrink-0">{row.f}</span>
                                        <span className="text-slate-400">{row.v}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function PythonMemoryModelPage() {
    const [currentStep, setCurrentStep] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(1500);
    const [quizState, setQuizState] = useState({ current: 0, selected: null, answered: false, score: 0, complete: false });

    const step = STEPS[currentStep];

    useEffect(() => {
        if (!isPlaying) return;
        if (currentStep >= STEPS.length - 1) { setIsPlaying(false); return; }
        const t = setTimeout(() => setCurrentStep(s => s + 1), speed);
        return () => clearTimeout(t);
    }, [isPlaying, currentStep, speed]);

    const reset    = () => { setCurrentStep(0); setIsPlaying(false); };
    const stepBack = () => { setCurrentStep(s => Math.max(0, s - 1)); setIsPlaying(false); };
    const stepFwd  = () => { setCurrentStep(s => Math.min(STEPS.length - 1, s + 1)); setIsPlaying(false); };

    const handleQuizAnswer = (idx) => {
        if (quizState.answered) return;
        const correct = idx === QUIZ[quizState.current].correct;
        setQuizState(s => ({ ...s, selected: idx, answered: true, score: correct ? s.score + 1 : s.score }));
    };
    const nextQuestion = () => {
        if (quizState.current + 1 >= QUIZ.length)
            setQuizState(s => ({ ...s, complete: true }));
        else
            setQuizState(s => ({ ...s, current: s.current + 1, selected: null, answered: false }));
    };

    const firstStepOfStage = (id) => STEPS.findIndex(s => s.stage === id);
    const stepsInStage     = (id) => STEPS.filter(s => s.stage === id);

    return (
        <div className="min-h-screen bg-slate-950">
            {/* Header */}
            <div className="bg-gradient-to-r from-zinc-600 to-slate-700 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                    <Link href="/under-the-hood" className="flex items-center text-white hover:text-zinc-300 transition-colors mb-6 w-fit text-sm">
                        <ArrowLeft className="h-4 w-4 mr-2" />Back to Under the Hood
                    </Link>
                    <h1 className="text-3xl md:text-4xl font-bold mb-2">Python Memory Model</h1>
                    <p className="text-zinc-200 max-w-2xl text-sm">
                        Why variables are name bindings not boxes, how PyObject refcounting works,
                        the small int cache that makes <code className="bg-white/10 px-1 rounded">is</code> lie,
                        and how closures keep state alive after their creator returns.
                    </p>
                </div>
            </div>

            {/* Stage tabs */}
            <div className="bg-slate-900/80 border-b border-slate-700/50 sticky top-16 z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex gap-1 py-2 overflow-x-auto">
                        {STAGES.map(st => {
                            const active = step.stage === st.id;
                            const done   = step.stage > st.id;
                            return (
                                <button
                                    key={st.id}
                                    onClick={() => { setCurrentStep(firstStepOfStage(st.id)); setIsPlaying(false); }}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all flex-shrink-0 ${
                                        active ? 'bg-zinc-600 text-white' :
                                        done   ? 'text-zinc-400 hover:text-zinc-200' :
                                                 'text-slate-500 hover:text-slate-300'
                                    }`}
                                >
                                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                                        active ? 'bg-white text-zinc-700' :
                                        done   ? 'bg-zinc-500/40 text-zinc-300' :
                                                 'bg-slate-700 text-slate-500'
                                    }`}>{st.id}</span>
                                    <span className="hidden sm:inline">{st.label}</span>
                                    <span className="sm:hidden">{st.short}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Main content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* Visualization panel */}
                    <div className="lg:col-span-2 bg-slate-900/70 rounded-2xl border border-slate-700/50 p-6 min-h-[560px] flex flex-col">
                        <div className="flex items-center justify-between mb-5">
                            <span className="text-xs bg-zinc-600/40 text-zinc-300 px-2.5 py-1 rounded-md font-medium">
                                Stage {step.stage} — {STAGES[step.stage - 1].label}
                            </span>
                            <span className="text-slate-500 text-xs">{currentStep + 1} / {STEPS.length}</span>
                        </div>

                        <div className="flex-1 min-h-0">
                            {step.stage === 1 && <SceneNames     step={step} />}
                            {step.stage === 2 && <ScenePyObject  step={step} />}
                            {step.stage === 3 && <SceneSmallInt  step={step} />}
                            {step.stage === 4 && <SceneFrames    step={step} />}
                        </div>

                        {/* Controls */}
                        <div className="mt-6 pt-4 border-t border-slate-700/50 flex items-center gap-3 flex-wrap">
                            <div className="flex items-center gap-2">
                                <button onClick={reset} className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors">
                                    <RotateCcw className="h-4 w-4" />
                                </button>
                                <button onClick={stepBack} disabled={currentStep === 0} className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors disabled:opacity-40">
                                    <SkipBack className="h-4 w-4" />
                                </button>
                                <button onClick={() => setIsPlaying(p => !p)} className="px-5 py-2 rounded-lg bg-zinc-600 hover:bg-zinc-500 text-white flex items-center gap-2 font-medium text-sm transition-colors">
                                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                                    {isPlaying ? 'Pause' : 'Play'}
                                </button>
                                <button onClick={stepFwd} disabled={currentStep === STEPS.length - 1} className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors disabled:opacity-40">
                                    <SkipForward className="h-4 w-4" />
                                </button>
                            </div>

                            <div className="flex-1 max-w-[180px]">
                                <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-zinc-500 rounded-full transition-all duration-300"
                                        style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-2 text-xs text-slate-400 ml-auto">
                                <span>Fast</span>
                                <input type="range" min="300" max="2500" value={speed} onChange={e => setSpeed(+e.target.value)}
                                    className="w-20 accent-zinc-500" />
                                <span>Slow</span>
                            </div>
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="flex flex-col gap-4">
                        {/* Explanation */}
                        <div className="bg-zinc-500/10 border border-zinc-500/20 rounded-xl p-4">
                            <div className="flex items-start gap-2">
                                <Info className="h-4 w-4 text-zinc-400 mt-0.5 flex-shrink-0" />
                                <p className="text-zinc-300 text-sm leading-relaxed">{step.explanation}</p>
                            </div>
                        </div>

                        {/* Quick-reference card for current stage */}
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-4">
                            <div className="text-slate-400 text-xs font-medium mb-3">Key facts</div>
                            <div className="space-y-1.5 text-xs">
                                {step.stage === 1 && [
                                    ['x = 5',    'binds name, doesn\'t copy'],
                                    ['y = x',    'two names, one object'],
                                    ['x = 10',   'rebinds x, y unchanged'],
                                    ['b = a',    'dangerous for mutables!'],
                                    ['a[:]',     'shallow copy of a list'],
                                ].map(([k, v]) => (
                                    <div key={k} className="flex items-center gap-2">
                                        <code className="text-zinc-300 w-20 flex-shrink-0">{k}</code>
                                        <span className="text-slate-500">{v}</span>
                                    </div>
                                ))}
                                {step.stage === 2 && [
                                    ['ob_refcnt',  'alive when > 0'],
                                    ['Py_INCREF',  'called on assignment'],
                                    ['Py_DECREF',  'called on del / rebind'],
                                    ['tp_dealloc', 'called when refcnt = 0'],
                                    ['cyclic GC',  'handles circular refs'],
                                ].map(([k, v]) => (
                                    <div key={k} className="flex items-center gap-2">
                                        <code className="text-zinc-300 w-24 flex-shrink-0">{k}</code>
                                        <span className="text-slate-500">{v}</span>
                                    </div>
                                ))}
                                {step.stage === 3 && [
                                    ['−5 … 256', 'cached at interpreter start'],
                                    ['is',       'identity — same object?'],
                                    ['==',       'equality — same value?'],
                                    ['intern()',  'explicit string interning'],
                                    ['sys.intern','force-intern a string'],
                                ].map(([k, v]) => (
                                    <div key={k} className="flex items-center gap-2">
                                        <code className="text-zinc-300 w-20 flex-shrink-0">{k}</code>
                                        <span className="text-slate-500">{v}</span>
                                    </div>
                                ))}
                                {step.stage === 4 && [
                                    ['L  Local',     'current function scope'],
                                    ['E  Enclosing', 'outer function scopes'],
                                    ['G  Global',    'module-level names'],
                                    ['B  Built-in',  'builtins module'],
                                    ['cell object',  'shared mutable slot'],
                                    ['nonlocal',     'write to enclosing cell'],
                                ].map(([k, v]) => (
                                    <div key={k} className="flex items-center gap-2">
                                        <code className="text-zinc-300 w-24 flex-shrink-0 text-[10px]">{k}</code>
                                        <span className="text-slate-500">{v}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Stage progress */}
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-4">
                            <div className="text-slate-400 text-xs font-medium mb-3">Progress</div>
                            <div className="space-y-2.5">
                                {STAGES.map(st => {
                                    const stSteps  = stepsInStage(st.id);
                                    const firstIdx = firstStepOfStage(st.id);
                                    const stepIdx  = currentStep - firstIdx;
                                    const isDone   = step.stage > st.id;
                                    const isActive = step.stage === st.id;
                                    return (
                                        <div key={st.id} className="flex items-center gap-2">
                                            <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                                                isDone   ? 'bg-green-500 text-white' :
                                                isActive ? 'bg-zinc-500 text-white' :
                                                           'bg-slate-700 text-slate-500'
                                            }`}>{isDone ? '✓' : st.id}</div>
                                            <div className="flex-1 min-w-0">
                                                <div className={`text-xs font-medium truncate ${
                                                    isActive ? 'text-white' : isDone ? 'text-slate-400' : 'text-slate-600'
                                                }`}>{st.label}</div>
                                                {isActive && (
                                                    <div className="mt-1 h-1 bg-slate-700 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-zinc-500 rounded-full transition-all"
                                                            style={{ width: `${((stepIdx + 1) / stSteps.length) * 100}%` }}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Quiz */}
                        <div className="bg-slate-900/70 rounded-xl border border-slate-700/50 p-4">
                            <div className="text-slate-300 text-sm font-semibold mb-4">Active Recall Quiz</div>

                            {quizState.complete ? (
                                <div className="text-center py-4">
                                    <div className={`text-3xl font-bold mb-2 ${
                                        quizState.score === QUIZ.length ? 'text-green-400' :
                                        quizState.score >= 2           ? 'text-yellow-400' : 'text-red-400'
                                    }`}>{quizState.score}/{QUIZ.length}</div>
                                    <p className="text-slate-400 text-sm mb-5 leading-relaxed">
                                        {quizState.score === QUIZ.length
                                            ? 'You\'ve got Python\'s memory model cold.'
                                            : quizState.score >= 2
                                            ? 'Solid. Review the is vs == distinction once more.'
                                            : 'Go through the name-binding and refcount stages again.'}
                                    </p>
                                    <button
                                        onClick={() => setQuizState({ current: 0, selected: null, answered: false, score: 0, complete: false })}
                                        className="px-4 py-2 bg-zinc-600 hover:bg-zinc-500 text-white rounded-lg text-sm transition-colors"
                                    >Retake</button>
                                </div>
                            ) : (
                                <>
                                    <div className="text-slate-500 text-xs mb-2">Q{quizState.current + 1} of {QUIZ.length}</div>
                                    <p className="text-slate-200 text-sm mb-3 leading-relaxed">{QUIZ[quizState.current].question}</p>
                                    <div className="space-y-2">
                                        {QUIZ[quizState.current].options.map((opt, i) => {
                                            const answered = quizState.answered;
                                            const correct  = i === QUIZ[quizState.current].correct;
                                            const selected = i === quizState.selected;
                                            return (
                                                <button
                                                    key={i}
                                                    onClick={() => handleQuizAnswer(i)}
                                                    disabled={answered}
                                                    className={`w-full text-left px-3 py-2 rounded-lg border text-sm transition-colors ${
                                                        !answered             ? 'border-slate-600 text-slate-300 hover:border-zinc-500 hover:text-white' :
                                                        correct               ? 'border-green-500 bg-green-500/10 text-green-300' :
                                                        selected && !correct  ? 'border-red-500 bg-red-500/10 text-red-300' :
                                                                                'border-slate-700 text-slate-500'
                                                    }`}
                                                >
                                                    <span className="flex items-center gap-2">
                                                        {answered && correct            && <CheckCircle className="h-3.5 w-3.5 flex-shrink-0" />}
                                                        {answered && selected && !correct && <XCircle   className="h-3.5 w-3.5 flex-shrink-0" />}
                                                        {opt}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                    {quizState.answered && (
                                        <div className="mt-3">
                                            <p className="text-slate-400 text-xs mb-3 leading-relaxed">
                                                {QUIZ[quizState.current].explanation}
                                            </p>
                                            <button onClick={nextQuestion}
                                                className="w-full py-2 bg-zinc-600 hover:bg-zinc-500 text-white rounded-lg text-sm transition-colors">
                                                {quizState.current + 1 < QUIZ.length ? 'Next Question →' : 'See Results'}
                                            </button>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

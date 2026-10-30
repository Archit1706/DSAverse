/* A scalar autograd engine, small enough to read in one sitting.

   Each Value remembers the values it was computed from and how to pass a
   gradient back to them. backward() walks the graph in reverse topological
   order and applies the chain rule: a node's gradient times its local
   derivative, added into each input (added, because an input used twice
   collects a gradient from both uses).

   The Computational Graphs and Backpropagation pages draw the graph this
   engine actually built and replay the records backward() returns, so what
   the learner steps through is the real computation, not a drawing of one.
   It is the same idea as PyTorch's autograd, one number at a time. */

let nextId = 0;

export class Value {
    constructor(data, children = [], op = '', label = '') {
        this.id = nextId++;
        this.data = data;
        this.grad = 0;
        this.children = children;
        this.op = op;
        this.label = label;
        // [child, localDerivative] pairs, filled in by each operation.
        this.locals = [];
    }

    static of(x, label = '') { return x instanceof Value ? x : new Value(x, [], '', label); }

    add(other) {
        const o = Value.of(other);
        const out = new Value(this.data + o.data, [this, o], '+');
        out.locals = [[this, 1], [o, 1]];
        return out;
    }

    mul(other) {
        const o = Value.of(other);
        const out = new Value(this.data * o.data, [this, o], '×');
        out.locals = [[this, o.data], [o, this.data]];
        return out;
    }

    sub(other) { return this.add(Value.of(other).neg()); }

    neg() {
        const out = new Value(-this.data, [this], 'neg');
        out.locals = [[this, -1]];
        return out;
    }

    div(other) { return this.mul(Value.of(other).pow(-1)); }

    pow(n) {
        const out = new Value(this.data ** n, [this], `^${n}`);
        out.locals = [[this, n * this.data ** (n - 1)]];
        return out;
    }

    exp() {
        const e = Math.exp(this.data);
        const out = new Value(e, [this], 'exp');
        out.locals = [[this, e]];
        return out;
    }

    log() {
        const out = new Value(Math.log(this.data), [this], 'log');
        out.locals = [[this, 1 / this.data]];
        return out;
    }

    tanh() {
        const t = Math.tanh(this.data);
        const out = new Value(t, [this], 'tanh');
        out.locals = [[this, 1 - t * t]];
        return out;
    }

    sigmoid() {
        const s = this.data >= 0 ? 1 / (1 + Math.exp(-this.data)) : Math.exp(this.data) / (1 + Math.exp(this.data));
        const out = new Value(s, [this], 'σ');
        out.locals = [[this, s * (1 - s)]];
        return out;
    }

    relu() {
        const out = new Value(this.data > 0 ? this.data : 0, [this], 'ReLU');
        out.locals = [[this, this.data > 0 ? 1 : 0]];
        return out;
    }

    named(label) { this.label = label; return this; }

    /** Every node this one depends on, inputs first. */
    topo() {
        const order = [];
        const seen = new Set();
        const visit = (v) => {
            if (seen.has(v)) return;
            seen.add(v);
            for (const c of v.children) visit(c);
            order.push(v);
        };
        visit(this);
        return order;
    }

    /** Backpropagate from this node. Returns one record per chain-rule
        application, in the order they happen, for step-by-step playback. */
    backward() {
        const order = this.topo();
        for (const v of order) v.grad = 0;
        this.grad = 1;
        const records = [];
        for (let i = order.length - 1; i >= 0; i--) {
            const v = order[i];
            for (const [child, local] of v.locals) {
                const contribution = v.grad * local;
                child.grad += contribution;
                records.push({ from: v.id, to: child.id, upstream: v.grad, local, contribution, total: child.grad });
            }
        }
        return records;
    }
}

export const val = (x, label = '') => new Value(x, [], '', label);

/** Nodes and edges of the graph under `root`, in topological order, for drawing. */
export function graphOf(root) {
    const order = root.topo();
    const nodes = order.map(v => ({ id: v.id, label: v.label, op: v.op, data: v.data, grad: v.grad, leaf: v.children.length === 0 }));
    const edges = [];
    for (const v of order) for (const c of v.children) edges.push({ from: c.id, to: v.id });
    return { nodes, edges };
}

/** Central-difference gradient of f at x[i] — the independent check the
    Backpropagation page shows next to every gradient autograd reports. */
export function numericGrad(f, xs, i, h = 1e-5) {
    const up = xs.slice(); up[i] += h;
    const dn = xs.slice(); dn[i] -= h;
    return (f(up) - f(dn)) / (2 * h);
}

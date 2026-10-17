"use client";

/* Shared inorder-index layout for binary trees.
 *
 * x is the node's position in an inorder walk, y is its depth. That guarantees
 * no two nodes overlap whatever shape the tree takes — including the degenerate
 * all-right-children case a naive "parent ± offset" layout collapses on.
 *
 * Pages supply their own node styling through `styleFor`, so this covers the
 * BST's visited path, AVL balance factors, red-black colouring and splay
 * rotations without any of them re-deriving the geometry.
 */

export function nodeCount(node) {
    return node ? 1 + nodeCount(node.left) + nodeCount(node.right) : 0;
}

export function treeHeight(node) {
    return node ? 1 + Math.max(treeHeight(node.left), treeHeight(node.right)) : 0;
}

export function computeLayout(root, { xGap = 64, yGap = 80, yOffset = 50 } = {}) {
    const nodes = [];
    const edges = [];
    let index = 0;

    (function walk(node, depth) {
        if (!node) return null;
        const leftPoint = walk(node.left, depth + 1);
        const point = { x: index * xGap + xGap / 2, y: depth * yGap + yOffset };
        index++;
        nodes.push({ node, ...point });
        const rightPoint = walk(node.right, depth + 1);
        if (leftPoint) edges.push({ from: point, to: leftPoint, parent: node, child: node.left });
        if (rightPoint) edges.push({ from: point, to: rightPoint, parent: node, child: node.right });
        return point;
    })(root, 0);

    return { nodes, edges };
}

/**
 * @param {object}   tree           root node with `.left` / `.right`
 * @param {function} styleFor       (node) => { fill, stroke, text, radius?, strokeWidth? }
 * @param {function} [subLabelFor]  (node) => { text, fill } — small second line inside the node
 * @param {function} [edgeStrokeFor] (parent, child) => colour
 * @param {string}   [emptyLabel]   shown when the tree is null
 */
export default function BinaryTreeCanvas({
    tree,
    styleFor,
    subLabelFor,
    edgeStrokeFor,
    emptyLabel = 'Empty tree',
    yGap = 80,
    yOffset = 50,
    minXGap = 48,
    maxXGap = 80,
    widthBudget = 560,
}) {
    if (!tree) {
        return (
            <div className="flex items-center justify-center h-48 text-slate-500 text-sm">
                {emptyLabel}
            </div>
        );
    }

    const n = nodeCount(tree);
    const h = treeHeight(tree);
    const xGap = Math.max(minXGap, Math.min(maxXGap, widthBudget / n));
    const { nodes, edges } = computeLayout(tree, { xGap, yGap, yOffset });

    const svgW = n * xGap;
    const svgH = h * yGap + yOffset / 2 + 24;

    return (
        <svg viewBox={`0 0 ${svgW} ${svgH}`} width="100%" className="overflow-visible">
            {edges.map((e, i) => (
                <line key={i}
                    x1={e.from.x} y1={e.from.y} x2={e.to.x} y2={e.to.y}
                    stroke={edgeStrokeFor ? edgeStrokeFor(e.parent, e.child) : '#334155'}
                    strokeWidth="2"
                    style={{ transition: 'stroke 0.35s ease' }} />
            ))}
            {nodes.map(({ node, x, y }, i) => {
                const s = styleFor(node);
                const sub = subLabelFor ? subLabelFor(node) : null;
                const r = s.radius ?? 20;
                return (
                    <g key={i} transform={`translate(${x},${y})`} style={{ transition: 'transform 0.4s ease' }}>
                        <circle r={r} fill={s.fill} stroke={s.stroke} strokeWidth={s.strokeWidth ?? 1.5}
                            style={{ transition: 'fill 0.35s ease, stroke 0.35s ease, r 0.2s ease' }} />
                        <text textAnchor="middle" dominantBaseline="middle"
                            fontSize={sub ? 12 : 13} fontWeight="700" fill={s.text}
                            dy={sub ? -3 : 0}>
                            {node.val}
                        </text>
                        {sub && (
                            <text textAnchor="middle" dominantBaseline="middle"
                                fontSize="9" fill={sub.fill} dy="10">
                                {sub.text}
                            </text>
                        )}
                    </g>
                );
            })}
        </svg>
    );
}

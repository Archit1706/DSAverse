"use client";

/* Width-aware n-ary layout for B-trees and B+ trees.
 *
 * The binary helper used by the BST and AVL pages places nodes by inorder
 * index, which only works when every node is one cell wide. A B-tree node is
 * as wide as the number of keys it holds, so positions are measured instead:
 * each subtree reports its own width, and a parent is centred over the span
 * of its children.
 */

const CELL_W = 34;
const CELL_H = 32;
const PAD = 5;
const H_GAP = 20;
const V_GAP = 78;

const nodeWidth = (node) => Math.max(node.keys.length, 1) * CELL_W + PAD * 2;

/** Walks the tree left to right, recording an absolute box for every node. */
function measure(node, depth, xStart, boxes) {
    const w = nodeWidth(node);
    const children = node.children ?? [];

    if (children.length === 0) {
        boxes.push({ node, x: xStart, y: depth * V_GAP + 16, w, depth });
        return { width: w, center: xStart + w / 2 };
    }

    let cursor = xStart;
    const centers = [];
    for (const child of children) {
        const r = measure(child, depth + 1, cursor, boxes);
        centers.push(r.center);
        cursor += r.width + H_GAP;
    }

    const spanWidth = cursor - H_GAP - xStart;
    const center = (centers[0] + centers[centers.length - 1]) / 2;
    boxes.push({ node, x: center - w / 2, y: depth * V_GAP + 16, w, depth });

    return { width: Math.max(spanWidth, w), center };
}

export function layoutBTree(root) {
    if (!root) return { boxes: [], width: 0, height: 0 };
    const boxes = [];
    const { width } = measure(root, 0, 0, boxes);
    const height = Math.max(...boxes.map(b => b.y)) + CELL_H + 24;
    return { boxes, width: width + 32, height };
}

/**
 * @param {object}   tree            root node: { id, keys, children?, leaf? }
 * @param {string}   activeId        node currently being visited
 * @param {string}   splitId         node currently splitting
 * @param {number}   activeKey       key being inserted or searched
 * @param {number[]} foundKeys       keys to mark as matched
 * @param {boolean}  showLeafLinks   draw the B+ linked-leaf chain
 * @param {number[]} scanRange       leaves highlighted by a range scan
 */
export default function BTreeCanvas({
    tree,
    activeId = null,
    splitId = null,
    activeKey = null,
    foundKeys = [],
    showLeafLinks = false,
    scanRange = [],
}) {
    const { boxes, width, height } = layoutBTree(tree);
    if (!boxes.length) return null;

    const byId = new Map(boxes.map(b => [b.node.id, b]));
    const leaves = boxes
        .filter(b => !b.node.children || b.node.children.length === 0)
        .sort((a, b) => a.x - b.x);

    const edges = [];
    for (const box of boxes) {
        const children = box.node.children ?? [];
        children.forEach((child, i) => {
            const cb = byId.get(child.id);
            if (!cb) return;
            // Hang each child off the gap between keys it sits under.
            const fromX = box.x + PAD + i * CELL_W;
            edges.push({
                key: `${box.node.id}-${child.id}`,
                x1: fromX, y1: box.y + CELL_H,
                x2: cb.x + cb.w / 2, y2: cb.y,
            });
        });
    }

    return (
        <svg viewBox={`-16 0 ${width} ${height}`} width="100%" style={{ maxHeight: 420 }} className="overflow-visible">
            {edges.map(e => (
                <line key={e.key} x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2}
                    stroke="#334155" strokeWidth="1.5" />
            ))}

            {showLeafLinks && leaves.slice(0, -1).map((leaf, i) => {
                const next = leaves[i + 1];
                const y = leaf.y + CELL_H / 2;
                return (
                    <g key={`link-${leaf.node.id}`}>
                        <line x1={leaf.x + leaf.w} y1={y} x2={next.x} y2={y}
                            stroke="#14b8a6" strokeWidth="2" strokeDasharray="4 3" opacity="0.8" />
                        <polygon
                            points={`${next.x},${y} ${next.x - 6},${y - 3.5} ${next.x - 6},${y + 3.5}`}
                            fill="#14b8a6" opacity="0.9" />
                    </g>
                );
            })}

            {boxes.map(box => {
                const isActive = box.node.id === activeId;
                const isSplit = box.node.id === splitId;
                const inScan = scanRange.includes(box.node.id);

                let stroke = '#475569';
                let fill = '#1e293b';
                if (inScan) { stroke = '#14b8a6'; fill = '#134e4a'; }
                if (isActive) { stroke = '#fbbf24'; fill = '#78350f'; }
                if (isSplit) { stroke = '#f87171'; fill = '#7f1d1d'; }

                return (
                    <g key={box.node.id} style={{ transition: 'all 0.35s ease' }}>
                        <rect x={box.x} y={box.y} width={box.w} height={CELL_H} rx="6"
                            fill={fill} stroke={stroke} strokeWidth="2"
                            style={{ transition: 'fill .35s ease, stroke .35s ease' }} />
                        {box.node.keys.map((k, i) => {
                            const cx = box.x + PAD + i * CELL_W + CELL_W / 2;
                            const matched = foundKeys.includes(k);
                            const isTarget = k === activeKey && isActive;
                            return (
                                <g key={`${box.node.id}-k-${i}`}>
                                    {i > 0 && (
                                        <line x1={box.x + PAD + i * CELL_W} y1={box.y + 4}
                                            x2={box.x + PAD + i * CELL_W} y2={box.y + CELL_H - 4}
                                            stroke="#475569" strokeWidth="1" />
                                    )}
                                    {(matched || isTarget) && (
                                        <rect x={box.x + PAD + i * CELL_W + 2} y={box.y + 3}
                                            width={CELL_W - 4} height={CELL_H - 6} rx="4"
                                            fill={matched ? '#16a34a' : '#f59e0b'} />
                                    )}
                                    <text x={cx} y={box.y + CELL_H / 2 + 1}
                                        textAnchor="middle" dominantBaseline="middle"
                                        fontSize="12.5" fontWeight="700"
                                        fill={matched || isTarget ? '#ffffff' : '#e2e8f0'}>
                                        {k}
                                    </text>
                                </g>
                            );
                        })}
                    </g>
                );
            })}
        </svg>
    );
}

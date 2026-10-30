"use client";

import React from 'react';
import { sequential, inkOn } from './colors';

/**
 * Tokens as chips, the way a model sees text: one chip per token, its id
 * underneath, and a token's leading space shown as a faint dot so it is
 * clear that " ball" and "ball" are different tokens.
 *
 *   <TokenStrip tokens={[{ id: 312, text: ' ball' }, …]} selected={2} onSelect={setSel}
 *               weights={attentionRow} />
 *
 * With `weights` (0–1 per token) each chip is tinted on the sequential
 * scale — attention from the selected token, say. Masked positions (weight
 * null) are drawn faded.
 */
export default function TokenStrip({ tokens, selected = null, onSelect, weights, showIds = true, size = 'md', ariaLabel = 'Tokens' }) {
    const pad = size === 'sm' ? 'px-1.5 py-0.5 text-xs' : 'px-2 py-1 text-sm';
    return (
        <div role="list" aria-label={ariaLabel} className="flex flex-wrap gap-1.5">
            {tokens.map((t, i) => {
                const w = weights ? weights[i] : undefined;
                const masked = weights && (w === null || w === undefined);
                const tinted = weights && !masked;
                const isSel = selected === i;
                const label = t.text ?? '';
                const lead = label.startsWith(' ');
                const body = (lead ? label.slice(1) : label).replace(/\n/g, '↵') || '␣';
                const style = tinted ? { background: sequential(w), color: inkOn(w) } : undefined;
                const Tag = onSelect ? 'button' : 'span';
                return (
                    <Tag key={i} role="listitem" style={style}
                        onClick={onSelect ? () => onSelect(i) : undefined}
                        aria-pressed={onSelect ? isSel : undefined}
                        title={`token ${i}: id ${t.id}${tinted ? `, weight ${w.toFixed(3)}` : ''}`}
                        className={`inline-flex flex-col items-center rounded-md border font-mono leading-tight transition-colors ${pad}
                            ${tinted ? 'border-transparent' : 'bg-slate-800 border-slate-700 text-slate-100'}
                            ${masked ? 'opacity-30' : ''}
                            ${isSel ? 'ring-2 ring-white ring-offset-1 ring-offset-slate-900' : ''}
                            ${onSelect ? 'hover:border-slate-400 cursor-pointer' : ''}`}>
                        <span className="whitespace-pre">
                            {lead && <span className="opacity-40">·</span>}{body}
                        </span>
                        {showIds && <span className="text-[10px] opacity-60 tabular-nums">{t.id}</span>}
                    </Tag>
                );
            })}
        </div>
    );
}

import katex from 'katex';
import 'katex/dist/katex.min.css';

/**
 * Typeset maths with KaTeX.
 *
 *   <Tex>{String.raw`\det A = ad - bc`}</Tex>          inline
 *   <Tex block>{String.raw`\sum_{k=0}^{n} \binom{n}{k}`}</Tex>   display
 *
 * Use String.raw for anything with backslashes, or JavaScript eats them.
 * Rendering is a pure function of the source, so the server and the client
 * produce the same markup and there is no hydration mismatch. A typo renders
 * KaTeX's red error text in place rather than throwing and blanking the page.
 *
 * Only for what is drawn on the page. Quiz text, step explanations and index
 * cards stay plain Unicode (n!, √, ∑, x²): Review and the search palette show
 * those strings as plain text, where LaTeX would appear raw.
 */
export default function Tex({ children, math, block = false, className = '' }) {
    const source = math ?? (Array.isArray(children) ? children.join('') : String(children ?? ''));
    const html = katex.renderToString(source, {
        displayMode: block,
        throwOnError: false,
        strict: 'ignore',
    });
    const Tag = block ? 'div' : 'span';
    return (
        <Tag
            className={`${block ? 'overflow-x-auto overflow-y-hidden py-1' : ''} ${className}`}
            dangerouslySetInnerHTML={{ __html: html }}
        />
    );
}

/** Format a number for a formula: trims float noise, keeps negatives tidy. */
export function texNum(x, digits = 2) {
    if (!Number.isFinite(x)) return x > 0 ? '\\infty' : x < 0 ? '-\\infty' : '\\text{undefined}';
    const r = Math.round(x * 10 ** digits) / 10 ** digits;
    return Object.is(r, -0) ? '0' : String(r);
}

/** A matrix as LaTeX. `rows` is an array of rows; numbers are formatted with texNum. */
export function texMatrix(rows, digits = 2) {
    const body = rows.map(r => r.map(v => (typeof v === 'number' ? texNum(v, digits) : v)).join(' & ')).join(' \\\\ ');
    return `\\begin{bmatrix} ${body} \\end{bmatrix}`;
}

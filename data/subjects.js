/* The top level of the site: subjects contain sections, sections contain pages.

   Sections are listed by their app/ directory name, so this file alone decides
   which subject a section belongs to. The Navbar, the homepage grid, Review and
   scripts/build-learning-data.mjs all read it.

   Keep it plain data — no icons, no JSX, no imports — because the Node
   generator reads it too. Order matters: subjects appear in this order, and
   sections appear in this order within their subject.

   Only list a section once its index page exists. Every reader skips sections
   with no pages, but listing a planned one here is how a dead nav link starts. */
export const SUBJECTS = [
    {
        id: 'dsa',
        name: 'Data Structures & Algorithms',
        shortName: 'DSA',
        tagline: 'From stacks and sorting to graphs, dynamic programming and indexing.',
        sections: [
            'basics',
            'recursion',
            'sorting',
            'searching',
            'two-pointers-and-sliding-window',
            'bit-manipulation',
            'string-algorithms',
            'backtracking',
            'heap-like-data-structures',
            'dynamic-programming',
            'graph-algorithms',
            'trees',
            'divide-and-conquer',
            'union-find',
            'indexing',
        ],
    },
    {
        id: 'cs-core',
        name: 'CS Core',
        shortName: 'CS Core',
        tagline: 'How operating systems, networks, databases and language runtimes actually work.',
        sections: [
            'under-the-hood',
        ],
    },
];

/** The subject id a section directory belongs to, or null if it is unlisted. */
export function subjectOfSection(sectionSlug) {
    const subject = SUBJECTS.find(s => s.sections.includes(sectionSlug));
    return subject ? subject.id : null;
}

/** The subject a route such as "/sorting/bubble-sort" lives in, or null. */
export function subjectOfPath(pathname) {
    const first = (pathname || '').split('/').filter(Boolean)[0];
    return first ? subjectOfSection(first) : null;
}

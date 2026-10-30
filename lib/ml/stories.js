/* The tiny GPT's training corpus: short stories from a seeded grammar.

   Real text is far too varied for a model of a few hundred thousand
   parameters, which would only learn to babble. These stories are simple on
   purpose and full of the patterns attention is good at — a pronoun that
   refers back to a name, an object mentioned with its colour and later
   without it, a friend's name copied from earlier in the story — so the
   trained model's attention heads show readable patterns instead of noise.

   One story per line. The same seed always produces the same corpus, so the
   training script (scripts/ml) and the Tokenization page see identical text. */

import { createRng } from '../random.js';

const PEOPLE = [
    ['Mia', 'she'], ['Sam', 'he'], ['Leo', 'he'], ['Ava', 'she'], ['Noah', 'he'], ['Zoe', 'she'],
    ['Max', 'he'], ['Lily', 'she'], ['Ben', 'he'], ['Ella', 'she'], ['Omar', 'he'], ['Nina', 'she'],
    ['Theo', 'he'], ['Ruby', 'she'], ['Kai', 'he'], ['Iris', 'she'],
];
const PRONOUNS = {
    she: { subj: 'she', obj: 'her', pos: 'her' },
    he: { subj: 'he', obj: 'him', pos: 'his' },
};
const ANIMALS = ['dog', 'cat', 'bird', 'rabbit', 'fox', 'owl', 'turtle', 'frog', 'duck', 'puppy'];
const OBJECTS = ['ball', 'kite', 'hat', 'book', 'box', 'cup', 'key', 'map', 'lamp', 'boat', 'shell', 'stone', 'coin', 'drum', 'sock', 'bell'];
const ADJECTIVES = ['red', 'blue', 'green', 'yellow', 'little', 'big', 'old', 'shiny', 'soft', 'tiny'];
const PLACES = ['park', 'garden', 'forest', 'beach', 'kitchen', 'school', 'library', 'river', 'market', 'hill', 'farm', 'yard'];
const SPOTS = ['under a tree', 'near the door', 'behind a rock', 'next to a bench', 'in the grass', 'by the water', 'under the table', 'on a shelf'];
const TIMES = ['One day', 'One morning', 'After lunch', 'That evening', 'On a sunny day', 'On a rainy day', 'Last week', 'Early one day'];
const FEELINGS = ['happy', 'sad', 'tired', 'hungry', 'excited', 'scared', 'proud', 'sleepy'];
const FOODS = ['bread', 'seeds', 'apples', 'carrots', 'berries', 'water'];
const ENDINGS = ['It was a good day.', 'The end.', 'They were very happy.', 'Then they went home.'];

const cap = (s) => s[0].toUpperCase() + s.slice(1);

function cast(rng) {
    const [p, f] = rng.shuffle(PEOPLE).slice(0, 2);
    return {
        P: p[0], p: PRONOUNS[p[1]],
        F: f[0], f: PRONOUNS[f[1]],
        A: rng.pick(ADJECTIVES), O: rng.pick(OBJECTS),
        L: rng.pick(PLACES), N: rng.pick(ANIMALS),
        T: rng.pick(TIMES), S: rng.pick(SPOTS),
    };
}

/* Each plot is a list of sentences; a function receives the cast and the
   RNG, so optional sentences and small variations stay seeded. */
const PLOTS = [
    // Finding something and giving it away.
    (c, rng) => [
        `${c.T}, ${c.P} went to the ${c.L}.`,
        `${cap(c.p.subj)} found a ${c.A} ${c.O} ${c.S}.`,
        rng.chance(0.5) ? `${cap(c.p.subj)} picked up the ${c.O}.` : null,
        `${c.P} showed the ${c.A} ${c.O} to ${c.F}.`,
        `${c.F} said, "That is a nice ${c.O}!"`,
        `${c.P} gave the ${c.O} to ${c.F}.`,
        `${c.F} was ${rng.pick(['happy', 'excited', 'proud'])}.`,
        `${c.F} said thank you to ${c.P}.`,
    ],
    // Losing something.
    (c, rng) => [
        `${c.T}, ${c.P} lost ${c.p.pos} ${c.A} ${c.O}.`,
        `${cap(c.p.subj)} was ${rng.pick(['sad', 'scared'])}.`,
        `${cap(c.p.subj)} looked in the ${c.L}, but the ${c.O} was not there.`,
        `${c.P} asked ${c.F} for help.`,
        `${c.F} and ${c.P} looked everywhere.`,
        `At last, ${c.F} found the ${c.O} ${c.S}.`,
        `${c.P} hugged ${c.F}.`,
        `${cap(c.p.subj)} was happy again.`,
    ],
    // Meeting an animal.
    (c, rng) => {
        const food = rng.pick(FOODS);
        return [
            `${c.T}, ${c.P} saw a ${c.N} in the ${c.L}.`,
            `The ${c.N} was ${rng.pick(['hungry', 'tired', 'scared'])}.`,
            `${c.P} gave the ${c.N} some ${food}.`,
            `The ${c.N} ate the ${food}.`,
            rng.chance(0.6) ? `${c.P} called ${c.F} to see the ${c.N}.` : null,
            rng.chance(0.6) ? `${c.F} liked the ${c.N} too.` : null,
            `The ${c.N} followed ${c.P} home.`,
            `${c.P} named the ${c.N} ${rng.pick(['Pip', 'Bo', 'Dot', 'Sunny', 'Moss'])}.`,
        ];
    },
    // Making something together.
    (c, rng) => [
        `${c.T}, ${c.P} wanted to make a ${c.O}.`,
        `${cap(c.p.subj)} asked ${c.F} to help.`,
        `${c.F} brought some paint.`,
        `They painted the ${c.O} ${rng.pick(['red', 'blue', 'green', 'yellow'])}.`,
        `${c.P} was ${rng.pick(['proud', 'happy'])} of the ${c.O}.`,
        rng.chance(0.5) ? `${c.F} said, "We made a great ${c.O}!"` : null,
        `They took the ${c.O} to the ${c.L}.`,
    ],
    // A trip with a feeling.
    (c, rng) => {
        const feel = rng.pick(FEELINGS);
        return [
            `${c.T}, ${c.P} and ${c.F} went to the ${c.L}.`,
            `${c.P} was ${feel}.`,
            `${c.F} asked ${c.P}, "Why are you ${feel}?"`,
            `${c.P} said, "I do not know."`,
            `${c.F} gave ${c.p.obj} a ${c.A} ${c.O}.`,
            `${c.P} smiled at ${c.F}.`,
            `They played in the ${c.L} until it was dark.`,
        ];
    },
];

export function generateStory(rng) {
    const c = cast(rng);
    const plot = rng.pick(PLOTS);
    const lines = plot(c, rng).filter(Boolean);
    if (rng.chance(0.7)) lines.push(rng.pick(ENDINGS));
    return lines.join(' ');
}

export function generateStories(count, seed = 2026) {
    const rng = createRng(seed);
    const out = [];
    for (let i = 0; i < count; i++) out.push(generateStory(rng));
    return out;
}

/** The whole corpus as one string, one story per line. */
export function storyCorpus(count = 12000, seed = 2026) {
    return generateStories(count, seed).join('\n') + '\n';
}

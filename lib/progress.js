"use client";

/**
 * Local-only learning progress: which pages you have opened, and a lightweight
 * spaced-repetition schedule over the quiz bank.
 *
 * Everything lives in localStorage. There is no account and no backend, which
 * keeps the site instant and free — the trade-off is that progress is per
 * browser and is lost if site data is cleared.
 *
 * Every accessor is guarded: localStorage is unavailable during SSR and can
 * throw outright in private windows or with site data blocked, so a failure
 * degrades to "no progress recorded" rather than breaking the page.
 */

const VISITED_KEY = 'dsaverse.visited.v1';
const SCHEDULE_KEY = 'dsaverse.schedule.v1';

function read(key, fallback) {
    if (typeof window === 'undefined') return fallback;
    try {
        const raw = window.localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
    } catch {
        return fallback;
    }
}

function write(key, value) {
    if (typeof window === 'undefined') return false;
    try {
        window.localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch {
        return false;   // quota exceeded, or storage blocked
    }
}

/* ── visited pages ──────────────────────────────────────── */

export function getVisited() {
    const v = read(VISITED_KEY, {});
    return v && typeof v === 'object' ? v : {};
}

export function markVisited(route) {
    if (!route) return;
    const visited = getVisited();
    visited[route] = Date.now();
    write(VISITED_KEY, visited);
}

export function visitedCount() {
    return Object.keys(getVisited()).length;
}

/* ── spaced repetition ──────────────────────────────────── */

/* A deliberately small SM-2 variant. Intervals are in days and the ease factor
   moves within [1.3, 2.8]; getting a card wrong sends it back to the start of
   the ladder rather than merely shortening the interval, because for recall
   practice a miss means the item is not known yet. */
const INTERVALS = [0, 1, 3, 7, 16, 35];
const MIN_EASE = 1.3;
const MAX_EASE = 2.8;
const DAY = 24 * 60 * 60 * 1000;

export function getSchedule() {
    const s = read(SCHEDULE_KEY, {});
    return s && typeof s === 'object' ? s : {};
}

export function getCard(id) {
    return getSchedule()[id] ?? null;
}

/** Records an answer and returns the updated card. */
export function recordAnswer(id, correct) {
    const schedule = getSchedule();
    const prev = schedule[id] ?? { step: 0, ease: 2.5, due: 0, seen: 0, lapses: 0 };

    let { step, ease, seen, lapses } = prev;
    seen += 1;

    if (correct) {
        step = Math.min(step + 1, INTERVALS.length - 1);
        ease = Math.min(MAX_EASE, ease + 0.1);
    } else {
        step = 0;
        ease = Math.max(MIN_EASE, ease - 0.25);
        lapses += 1;
    }

    const intervalDays = INTERVALS[step] * (step > 1 ? ease / 2.5 : 1);
    const due = Date.now() + Math.round(intervalDays * DAY);

    const card = { step, ease: Math.round(ease * 100) / 100, due, seen, lapses, last: Date.now() };
    schedule[id] = card;
    write(SCHEDULE_KEY, schedule);
    return card;
}

/** Cards are due when they have never been seen, or their due date has passed. */
export function isDue(id, now = Date.now()) {
    const card = getCard(id);
    return !card || card.due <= now;
}

/**
 * Builds a study queue: due cards first (longest overdue first), then unseen
 * ones, so a session always revisits what is about to be forgotten before it
 * introduces anything new.
 */
export function buildQueue(bank, { limit = 20, section = null } = {}) {
    const now = Date.now();
    const schedule = getSchedule();
    const pool = section ? bank.filter(q => q.section === section) : bank;

    const due = [];
    const fresh = [];
    for (const q of pool) {
        const card = schedule[q.id];
        if (!card) fresh.push(q);
        else if (card.due <= now) due.push(q);
    }

    due.sort((a, b) => (schedule[a.id].due) - (schedule[b.id].due));
    shuffle(fresh);

    return [...due, ...fresh].slice(0, limit);
}

export function queueStats(bank) {
    const now = Date.now();
    const schedule = getSchedule();
    let due = 0, learning = 0, known = 0, unseen = 0;
    for (const q of bank) {
        const card = schedule[q.id];
        if (!card) { unseen++; continue; }
        if (card.due <= now) due++;
        else if (card.step >= 3) known++;
        else learning++;
    }
    return { due, learning, known, unseen, total: bank.length };
}

export function resetProgress() {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.removeItem(SCHEDULE_KEY);
        window.localStorage.removeItem(VISITED_KEY);
    } catch { /* nothing to clear */ }
}

function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

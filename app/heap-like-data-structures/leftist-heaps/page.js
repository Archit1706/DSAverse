'use client';

import React, { useMemo, useState } from 'react';
import { ArrowLeft, Plus, Minus, RotateCcw, GitMerge, Play } from 'lucide-react';

const cloneNode = (node) => (node ? JSON.parse(JSON.stringify(node)) : null);

const createNode = (value) => ({ value, left: null, right: null, npl: 0 });

const getNpl = (node) => (node ? node.npl : -1);

const mergeHeaps = (a, b, steps) => {
  if (!a) return b;
  if (!b) return a;

  if (a.value > b.value) {
    [a, b] = [b, a];
  }

  steps.push(`Compare roots ${a.value} and ${b.value}. Keep ${a.value} as root.`);
  a.right = mergeHeaps(a.right, b, steps);

  if (getNpl(a.left) < getNpl(a.right)) {
    [a.left, a.right] = [a.right, a.left];
    steps.push(`Swap children of ${a.value} to maintain leftist property.`);
  }

  a.npl = getNpl(a.right) + 1;
  return a;
};

const toLevels = (root) => {
  if (!root) return [];
  const queue = [{ node: root, level: 0, pos: 0 }];
  const levels = [];

  while (queue.length) {
    const { node, level, pos } = queue.shift();
    if (!levels[level]) levels[level] = [];
    levels[level].push({ node, pos });
    if (node.left) queue.push({ node: node.left, level: level + 1, pos: pos * 2 });
    if (node.right) queue.push({ node: node.right, level: level + 1, pos: pos * 2 + 1 });
  }

  return levels;
};

export default function LeftistHeapsPage() {
  const [heap, setHeap] = useState(null);
  const [secondHeap, setSecondHeap] = useState(null);
  const [inputValue, setInputValue] = useState('');
  const [secondInputValue, setSecondInputValue] = useState('');
  const [messages, setMessages] = useState(['Ready to perform leftist heap operations.']);

  const insert = (target, value) => {
    const steps = [];
    const base = cloneNode(target);
    const merged = mergeHeaps(base, createNode(value), steps);
    return { merged, steps };
  };

  const handleInsertMain = () => {
    if (inputValue === '' || Number.isNaN(Number(inputValue))) return;
    const value = Number(inputValue);
    const { merged, steps } = insert(heap, value);
    setHeap(merged);
    setMessages([`Inserted ${value} into main heap.`, ...steps]);
    setInputValue('');
  };

  const handleInsertSecond = () => {
    if (secondInputValue === '' || Number.isNaN(Number(secondInputValue))) return;
    const value = Number(secondInputValue);
    const { merged, steps } = insert(secondHeap, value);
    setSecondHeap(merged);
    setMessages([`Inserted ${value} into second heap.`, ...steps]);
    setSecondInputValue('');
  };

  const handleExtractMin = () => {
    if (!heap) {
      setMessages(['Main heap is empty.']);
      return;
    }

    const steps = [`Extract min root ${heap.value}.`, 'Merge left and right subtrees.'];
    const merged = mergeHeaps(cloneNode(heap.left), cloneNode(heap.right), steps);
    setHeap(merged);
    setMessages(steps);
  };

  const handleMergeAll = () => {
    if (!heap && !secondHeap) {
      setMessages(['Both heaps are empty.']);
      return;
    }
    const steps = ['Merge heap A and heap B.'];
    const merged = mergeHeaps(cloneNode(heap), cloneNode(secondHeap), steps);
    setHeap(merged);
    setSecondHeap(null);
    setMessages(steps);
  };

  const reset = () => {
    setHeap(null);
    setSecondHeap(null);
    setMessages(['Reset complete.']);
  };

  const renderTree = (root, title) => {
    const levels = toLevels(root);
    return (
      <div className="bg-amber-50 rounded-lg p-4">
        <h3 className="font-semibold text-gray-800 mb-3">{title}</h3>
        {!root && <p className="text-sm text-gray-500">Empty heap</p>}
        {levels.map((level, levelIndex) => (
          <div key={levelIndex} className="flex justify-center gap-6 mb-3">
            {level.map(({ node }, idx) => (
              <div key={idx} className="bg-white border-2 border-amber-300 rounded-lg px-3 py-2 min-w-24 text-center">
                <div className="font-bold text-gray-800">{node.value}</div>
                <div className="text-xs text-gray-500">npl={node.npl}</div>
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  };

  const complexity = useMemo(() => [
    { op: 'Merge', val: 'O(log n)' },
    { op: 'Insert', val: 'O(log n)' },
    { op: 'Extract Min', val: 'O(log n)' },
  ], []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50">
      <div className="bg-gradient-to-r from-amber-500 to-orange-600 text-white py-12 px-6 text-center">
        <a href="/heap-like-data-structures" className="inline-flex items-center text-amber-100 hover:text-white mb-5">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Heap Data Structures
        </a>
        <h1 className="text-4xl font-bold">Leftist Heap Visualization</h1>
        <p className="mt-3 text-amber-100">Observe null-path-length balancing and efficient merge operations.</p>
      </div>

      <div className="max-w-7xl mx-auto p-6 grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-lg p-6 space-y-4">
          <h2 className="text-2xl font-bold text-gray-800">Interactive Controls</h2>
          <div className="flex flex-wrap gap-2">
            <input type="number" value={inputValue} onChange={(e) => setInputValue(e.target.value)} placeholder="Main heap value" className="border rounded px-3 py-2" />
            <button onClick={handleInsertMain} className="bg-amber-500 text-white px-4 py-2 rounded flex items-center gap-2"><Plus className="h-4 w-4" />Insert A</button>
          </div>
          <div className="flex flex-wrap gap-2">
            <input type="number" value={secondInputValue} onChange={(e) => setSecondInputValue(e.target.value)} placeholder="Second heap value" className="border rounded px-3 py-2" />
            <button onClick={handleInsertSecond} className="bg-orange-500 text-white px-4 py-2 rounded flex items-center gap-2"><Plus className="h-4 w-4" />Insert B</button>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={handleExtractMin} className="bg-red-500 text-white px-4 py-2 rounded flex items-center gap-2"><Minus className="h-4 w-4" />Extract Min</button>
            <button onClick={handleMergeAll} className="bg-indigo-500 text-white px-4 py-2 rounded flex items-center gap-2"><GitMerge className="h-4 w-4" />Merge A+B</button>
            <button onClick={reset} className="bg-gray-500 text-white px-4 py-2 rounded flex items-center gap-2"><RotateCcw className="h-4 w-4" />Reset</button>
          </div>
          {renderTree(heap, 'Heap A (Main)')}
          {renderTree(secondHeap, 'Heap B')}
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Step Log</h2>
            <div className="space-y-2">
              {messages.map((msg, i) => <div key={i} className="text-sm text-gray-700 bg-amber-50 rounded p-2">{i + 1}. {msg}</div>)}
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Complexities</h2>
            <div className="grid grid-cols-3 gap-3">
              {complexity.map((c) => (
                <div key={c.op} className="text-center bg-amber-50 rounded p-3">
                  <div className="font-bold text-green-600">{c.val}</div>
                  <div className="text-xs text-gray-600">{c.op}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6 text-sm text-gray-700 space-y-2">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Key Properties</h2>
            <p><Play className="inline h-4 w-4 mr-1" /> Heap-order: smallest key remains at root.</p>
            <p><Play className="inline h-4 w-4 mr-1" /> Leftist rule: npl(left) ≥ npl(right).</p>
            <p><Play className="inline h-4 w-4 mr-1" /> Merge is the core primitive for all operations.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

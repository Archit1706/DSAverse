'use client';

import React, { useMemo, useState } from 'react';
import { ArrowLeft, Plus, Minus, RotateCcw, Eye, Link2 } from 'lucide-react';

const consolidate = (roots, log) => {
  const degreeTable = new Map();
  const nodes = [...roots].map((r) => ({ ...r, children: [...r.children] }));

  for (let i = 0; i < nodes.length; i += 1) {
    let x = nodes[i];
    while (degreeTable.has(x.degree)) {
      let y = degreeTable.get(x.degree);
      degreeTable.delete(x.degree);

      if (y.key < x.key) [x, y] = [y, x];
      x.children.push(y);
      x.degree += 1;
      log.push(`Link trees of degree ${x.degree - 1}: ${y.key} becomes child of ${x.key}.`);
    }
    degreeTable.set(x.degree, x);
  }

  return [...degreeTable.values()];
};

export default function FibonacciHeapsPage() {
  const [roots, setRoots] = useState([]);
  const [value, setValue] = useState('');
  const [messages, setMessages] = useState(['Ready for Fibonacci heap operations.']);

  const minNode = useMemo(() => {
    if (!roots.length) return null;
    return roots.reduce((min, node) => (node.key < min.key ? node : min), roots[0]);
  }, [roots]);

  const handleInsert = () => {
    if (value === '' || Number.isNaN(Number(value))) return;
    const key = Number(value);
    setRoots((prev) => [...prev, { key, degree: 0, children: [] }]);
    setMessages([`Inserted node ${key} into root list (O(1)).`]);
    setValue('');
  };

  const handlePeekMin = () => {
    if (!minNode) {
      setMessages(['Heap is empty.']);
      return;
    }
    setMessages([`Minimum key is ${minNode.key}.`]);
  };

  const handleExtractMin = () => {
    if (!minNode) {
      setMessages(['Heap is empty.']);
      return;
    }

    const log = [`Extract minimum root ${minNode.key}.`];
    const rest = roots.filter((node) => node !== minNode);
    const promotedChildren = minNode.children.map((child) => ({ ...child, children: [...child.children] }));
    if (promotedChildren.length) {
      log.push(`Promote ${promotedChildren.length} child trees to root list.`);
    }

    const nextRoots = consolidate([...rest, ...promotedChildren], log);
    setRoots(nextRoots);
    setMessages(log);
  };

  const reset = () => {
    setRoots([]);
    setMessages(['Reset complete.']);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50">
      <div className="bg-gradient-to-r from-amber-500 to-orange-600 text-white py-12 px-6 text-center">
        <a href="/heap-like-data-structures" className="inline-flex items-center text-amber-100 hover:text-white mb-5">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Heap Data Structures
        </a>
        <h1 className="text-4xl font-bold">Fibonacci Heap Visualization</h1>
        <p className="mt-3 text-amber-100">Visualize root-list based lazy merges and consolidation after extract-min.</p>
      </div>

      <div className="max-w-7xl mx-auto p-6 grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-lg p-6 space-y-4">
          <h2 className="text-2xl font-bold text-gray-800">Interactive Controls</h2>
          <div className="flex flex-wrap gap-2">
            <input
              type="number"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Enter key"
              className="border rounded px-3 py-2"
            />
            <button onClick={handleInsert} className="bg-amber-500 text-white px-4 py-2 rounded flex items-center gap-2"><Plus className="h-4 w-4" />Insert</button>
            <button onClick={handlePeekMin} className="bg-green-500 text-white px-4 py-2 rounded flex items-center gap-2"><Eye className="h-4 w-4" />Peek Min</button>
            <button onClick={handleExtractMin} className="bg-red-500 text-white px-4 py-2 rounded flex items-center gap-2"><Minus className="h-4 w-4" />Extract Min</button>
            <button onClick={reset} className="bg-gray-500 text-white px-4 py-2 rounded flex items-center gap-2"><RotateCcw className="h-4 w-4" />Reset</button>
          </div>

          <div className="bg-amber-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-800 mb-2">Root List</h3>
            {!roots.length && <p className="text-sm text-gray-500">Heap is empty</p>}
            <div className="flex flex-wrap gap-3">
              {roots.map((node, idx) => (
                <div key={`${node.key}-${idx}`} className={`rounded-lg border-2 px-4 py-3 ${minNode?.key === node.key ? 'border-green-500 bg-green-50' : 'border-amber-300 bg-white'}`}>
                  <div className="font-bold text-gray-800">{node.key}</div>
                  <div className="text-xs text-gray-500">degree {node.degree}</div>
                  <div className="text-xs text-gray-500">children {node.children.length}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Step Log</h2>
            <div className="space-y-2">
              {messages.map((msg, i) => <div key={i} className="text-sm text-gray-700 bg-amber-50 rounded p-2">{i + 1}. {msg}</div>)}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Complexity (Amortized)</h2>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-amber-50 rounded p-3"><div className="font-bold text-green-600">O(1)</div><div className="text-xs text-gray-600">Insert</div></div>
              <div className="bg-amber-50 rounded p-3"><div className="font-bold text-green-600">O(1)</div><div className="text-xs text-gray-600">Peek Min</div></div>
              <div className="bg-amber-50 rounded p-3"><div className="font-bold text-green-600">O(log n)</div><div className="text-xs text-gray-600">Extract Min</div></div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 text-sm text-gray-700 space-y-2">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">How this visualizer maps to real Fibonacci heaps</h2>
            <p><Link2 className="inline h-4 w-4 mr-1" /> Root list holds tree roots lazily after insert/merge.</p>
            <p><Link2 className="inline h-4 w-4 mr-1" /> Extract-min triggers consolidation by degree.</p>
            <p><Link2 className="inline h-4 w-4 mr-1" /> Tree linking keeps smaller key as parent.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

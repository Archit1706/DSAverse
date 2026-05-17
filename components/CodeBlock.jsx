"use client";

import React, { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Check } from 'lucide-react';

const LANGUAGE_LABELS = {
    python: 'Python',
    javascript: 'JavaScript',
    typescript: 'TypeScript',
    java: 'Java',
    cpp: 'C++',
    c: 'C',
    go: 'Go',
    rust: 'Rust',
};

export default function CodeBlock({ code, language = 'python', className = '' }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // fallback for environments without clipboard API
        }
    };

    return (
        <div className={`relative rounded-lg overflow-hidden border border-gray-700 ${className}`}>
            {/* Header bar */}
            <div className="flex items-center justify-between bg-gray-800 px-4 py-2">
                <span className="text-xs font-medium text-gray-300 tracking-wide">
                    {LANGUAGE_LABELS[language] ?? language}
                </span>
                <button
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors px-2 py-1 rounded hover:bg-gray-700"
                    aria-label="Copy code"
                >
                    {copied
                        ? <><Check className="h-3.5 w-3.5 text-green-400" /><span className="text-green-400">Copied!</span></>
                        : <><Copy className="h-3.5 w-3.5" /><span>Copy</span></>
                    }
                </button>
            </div>

            <SyntaxHighlighter
                language={language}
                style={vscDarkPlus}
                customStyle={{
                    margin: 0,
                    borderRadius: 0,
                    fontSize: '0.75rem',
                    lineHeight: '1.5',
                    padding: '1rem',
                }}
                showLineNumbers={false}
                wrapLongLines={false}
            >
                {code}
            </SyntaxHighlighter>
        </div>
    );
}

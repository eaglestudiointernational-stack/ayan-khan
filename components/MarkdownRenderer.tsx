
import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface MarkdownRendererProps {
  content: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  const isUrdu = (text: string) => {
    const urduPattern = /[\u0600-\u06FF]/;
    return urduPattern.test(text);
  };

  return (
    <div className={`prose prose-slate max-w-none ${isUrdu(content) ? 'urdu-text text-xl leading-relaxed' : 'text-sm md:text-base'}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          code({ node, inline, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || '');
            return !inline && match ? (
              <div className="my-4 rounded-lg overflow-hidden shadow-sm">
                 <div className="bg-slate-800 text-slate-400 text-xs px-4 py-1 flex justify-between items-center">
                    <span>{match[1]}</span>
                 </div>
                 <SyntaxHighlighter
                   style={vscDarkPlus}
                   language={match[1]}
                   PreTag="div"
                   {...props}
                 >
                   {String(children).replace(/\n$/, '')}
                 </SyntaxHighlighter>
              </div>
            ) : (
              <code className="bg-slate-100 text-pink-600 px-1.5 py-0.5 rounded text-sm" {...props}>
                {children}
              </code>
            );
          },
          table: ({ children }) => (
            <div className="overflow-x-auto my-4 border rounded-lg">
              <table className="min-w-full divide-y divide-slate-200">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-slate-50">{children}</thead>,
          th: ({ children }) => (
            <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
              {children}
            </th>
          ),
          td: ({ children }) => <td className="px-4 py-2 text-sm text-slate-700 border-t">{children}</td>,
          p: ({ children }) => <p className="mb-4 last:mb-0">{children}</p>,
          ul: ({ children }) => <ul className="list-disc ml-6 mb-4">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal ml-6 mb-4">{children}</ol>,
          h1: ({ children }) => <h1 className="text-2xl font-bold mb-4 mt-6">{children}</h1>,
          h2: ({ children }) => <h2 className="text-xl font-bold mb-3 mt-5">{children}</h2>,
          h3: ({ children }) => <h3 className="text-lg font-bold mb-2 mt-4">{children}</h3>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-slate-300 pl-4 italic text-slate-600 my-4">
              {children}
            </blockquote>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownRenderer;

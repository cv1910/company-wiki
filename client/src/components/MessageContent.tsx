import React, { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MessageContentProps {
  content: string;
  currentUserId: number;
}

export function MessageContent({ content, currentUserId }: MessageContentProps) {
  // Process mentions and convert to a format that won't interfere with markdown
  const processedContent = useMemo(() => {
    // Replace @[Name](id) with a placeholder that we'll render specially
    return content.replace(/@\[(.*?)\]\((\d+)\)/g, (_, name, id) => {
      return `<mention data-name="${name}" data-id="${id}"></mention>`;
    });
  }, [content]);

  // Custom components for markdown rendering
  const components = useMemo(() => ({
    // Handle paragraphs - don't add extra margins in chat
    p: ({ children }: { children?: React.ReactNode }) => (
      <span className="block">{children}</span>
    ),
    // Bold text
    strong: ({ children }: { children?: React.ReactNode }) => (
      <strong className="font-semibold">{children}</strong>
    ),
    // Italic text
    em: ({ children }: { children?: React.ReactNode }) => (
      <em className="italic">{children}</em>
    ),
    // Strikethrough
    del: ({ children }: { children?: React.ReactNode }) => (
      <del className="line-through">{children}</del>
    ),
    // Code inline
    code: ({ children, className }: { children?: React.ReactNode; className?: string }) => {
      const isBlock = className?.includes("language-");
      if (isBlock) {
        return (
          <code className="block bg-muted/50 rounded-md p-3 text-sm font-mono overflow-x-auto my-2">
            {children}
          </code>
        );
      }
      return (
        <code className="bg-muted/50 rounded px-1.5 py-0.5 text-sm font-mono">
          {children}
        </code>
      );
    },
    // Code blocks
    pre: ({ children }: { children?: React.ReactNode }) => (
      <pre className="bg-muted/50 rounded-md overflow-x-auto my-2">{children}</pre>
    ),
    // Lists
    ul: ({ children }: { children?: React.ReactNode }) => (
      <ul className="list-disc list-inside my-1 space-y-0.5">{children}</ul>
    ),
    ol: ({ children }: { children?: React.ReactNode }) => (
      <ol className="list-decimal list-inside my-1 space-y-0.5">{children}</ol>
    ),
    li: ({ children }: { children?: React.ReactNode }) => (
      <li className="text-sm">{children}</li>
    ),
    // Task lists (GFM)
    input: ({ checked }: { checked?: boolean }) => (
      <input
        type="checkbox"
        checked={checked}
        readOnly
        className="mr-1.5 rounded border-muted-foreground/50"
      />
    ),
    // Links
    a: ({ href, children }: { href?: string; children?: React.ReactNode }) => (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary hover:underline"
      >
        {children}
      </a>
    ),
    // Blockquotes
    blockquote: ({ children }: { children?: React.ReactNode }) => (
      <blockquote className="border-l-2 border-muted-foreground/30 pl-3 my-2 text-muted-foreground italic">
        {children}
      </blockquote>
    ),
    // Horizontal rule
    hr: () => <hr className="my-2 border-muted-foreground/20" />,
  }), []);

  // Render the content with mentions handled separately
  const renderContent = () => {
    // Split by mention placeholders
    const parts = processedContent.split(/(<mention[^>]*><\/mention>)/g);
    
    return parts.map((part, index) => {
      // Check if this is a mention placeholder
      const mentionMatch = part.match(/<mention data-name="([^"]*)" data-id="(\d+)"><\/mention>/);
      
      if (mentionMatch) {
        const [, name, id] = mentionMatch;
        const userId = parseInt(id, 10);
        const isSelfMention = userId === currentUserId;
        
        return (
          <span
            key={`mention-${index}`}
            className={`inline-flex items-center px-1.5 py-0.5 rounded font-medium ${
              isSelfMention
                ? "bg-primary/20 text-primary"
                : "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
            }`}
          >
            @{name}
          </span>
        );
      }
      
      // Regular text - render with markdown
      if (part.trim()) {
        return (
          <ReactMarkdown
            key={`md-${index}`}
            remarkPlugins={[remarkGfm]}
            components={components}
          >
            {part}
          </ReactMarkdown>
        );
      }
      
      return null;
    });
  };

  return (
    <div className="whitespace-pre-wrap break-words prose prose-sm dark:prose-invert max-w-none">
      {renderContent()}
    </div>
  );
}

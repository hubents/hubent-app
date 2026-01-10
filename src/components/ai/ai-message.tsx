"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { ThumbsUp, ThumbsDown, Copy, Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AIMessageProps {
  role: "user" | "assistant";
  content: string;
  isLoading?: boolean;
  onFeedback?: (rating: number) => void;
}

export function AIMessage({ role, content, isLoading, onFeedback }: AIMessageProps) {
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<number | null>(null);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFeedback = (rating: number) => {
    setFeedback(rating);
    onFeedback?.(rating);
  };

  const isUser = role === "user";

  return (
    <div className={cn("flex gap-3 py-4", isUser ? "flex-row-reverse" : "flex-row")}>
      {/* Avatar */}
      <div
        className={cn(
          "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
          isUser
            ? "bg-[var(--primary)] text-white"
            : "bg-gradient-to-br from-violet-500 to-purple-600 text-white"
        )}
      >
        {isUser ? "Tú" : <Sparkles className="w-4 h-4" />}
      </div>

      {/* Content */}
      <div className={cn("flex-1 max-w-[85%]", isUser && "text-right")}>
        <div
          className={cn(
            "inline-block px-4 py-3 rounded-2xl text-sm",
            isUser
              ? "bg-[var(--primary)] text-white rounded-br-md"
              : "bg-[var(--muted)] text-[var(--foreground)] rounded-bl-md"
          )}
        >
          {isLoading && !content ? (
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          ) : (
            <div className="whitespace-pre-wrap break-words">
              {content}
            </div>
          )}
        </div>

        {/* Actions for assistant messages */}
        {!isUser && content && !isLoading && (
          <div className="flex items-center gap-1 mt-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              onClick={handleCopy}
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-7 w-7",
                feedback === 5
                  ? "text-green-500"
                  : "text-[var(--muted-foreground)] hover:text-green-500"
              )}
              onClick={() => handleFeedback(5)}
            >
              <ThumbsUp className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-7 w-7",
                feedback === 1
                  ? "text-red-500"
                  : "text-[var(--muted-foreground)] hover:text-red-500"
              )}
              onClick={() => handleFeedback(1)}
            >
              <ThumbsDown className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

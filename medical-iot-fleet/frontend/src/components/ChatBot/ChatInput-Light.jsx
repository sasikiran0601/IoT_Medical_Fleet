import { useState, useRef, useEffect } from "react";
import { Send, Loader } from "lucide-react";

/**
 * ChatInput — textarea with send button (light theme)
 * 
 * Props:
 *   onSend     — fn(message) to call when user sends
 *   isLoading  — bool to disable/show loading state
 *   error      — error message to display (optional)
 *   onDismissError — fn() to clear error (optional)
 */
export default function ChatInput({ onSend, isLoading, error, onDismissError }) {
    const [input, setInput] = useState("");
    const textareaRef = useRef(null);

    // Auto-grow textarea as user types
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
            textareaRef.current.style.height = Math.min(
                textareaRef.current.scrollHeight,
                120
            ) + "px";
        }
    }, [input]);

    const handleSend = () => {
        const trimmed = input.trim();
        if (trimmed && !isLoading) {
            onSend(trimmed);
            setInput("");
            // Reset textarea height
            if (textareaRef.current) {
                textareaRef.current.style.height = "auto";
            }
        }
    };

    const handleKeyDown = (e) => {
        // Send on Ctrl+Enter or Cmd+Enter, or just Enter if not in a multi-line context
        if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
            e.preventDefault();
            handleSend();
        } else if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="px-4 pb-4 pt-2">
            {/* Input area */}
            <div className="bg-gradient-to-r from-teal-400 via-cyan-300 to-teal-500 p-[2px] rounded-xl shadow-sm transition-all hover:shadow-md group">
                <div className="flex items-center gap-2 bg-white rounded-[10px] px-3 py-2 w-full">
                    <textarea
                        ref={textareaRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Ask about devices, alerts, or fleet status..."
                        disabled={isLoading}
                        className="flex-1 bg-transparent text-gray-800 placeholder-gray-400 resize-none
                         focus:outline-none text-sm leading-relaxed max-h-28 disabled:opacity-50 py-1.5"
                        rows="1"
                        style={{ minHeight: "36px" }}
                    />
                    <button
                        onClick={handleSend}
                        disabled={isLoading || !input.trim()}
                        className="shrink-0 flex items-center justify-center w-9 h-9 rounded-lg
                         bg-gradient-to-r from-teal-600 to-cyan-500 hover:from-teal-500 hover:to-cyan-400
                         text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md
                         self-end mb-0.5"
                        title={isLoading ? "Waiting for response..." : "Send (Enter or Ctrl+Enter)"}
                    >
                        {isLoading ? (
                            <Loader size={16} className="animate-spin" />
                        ) : (
                            <Send size={16} />
                        )}
                    </button>
                </div>
            </div>

            {/* Typing indicator */}
            {isLoading && (
                <div className="mt-2 flex items-center gap-1">
                    <div className="flex gap-1">
                        <div className="w-2 h-2 rounded-full bg-teal-500 animate-bounce" style={{ animationDelay: "0s" }} />
                        <div className="w-2 h-2 rounded-full bg-teal-500 animate-bounce" style={{ animationDelay: "0.2s" }} />
                        <div className="w-2 h-2 rounded-full bg-teal-500 animate-bounce" style={{ animationDelay: "0.4s" }} />
                    </div>
                    <span className="text-xs text-gray-500 ml-2">Assistant is typing...</span>
                </div>
            )}
        </div>
    );
}
import { memo } from "react";

/**
 * MessageBubble — renders a single message (user or bot) - light theme
 * 
 * Props:
 *   role       — 'user' or 'bot'
 *   text       — message content
 *   timestamp  — Date object (optional)
 */
const MessageBubble = memo(function MessageBubble({ role, text, timestamp, isError }) {
    const isBot = role === "bot";
    const timeStr = timestamp
        ? timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        : "";

    // Determine bubble style
    let bubbleClass;
    if (isError) {
        bubbleClass = "bg-red-50 text-red-700 border border-red-200";
    } else if (isBot) {
        bubbleClass = "bg-gray-100 text-gray-800 border border-gray-200";
    } else {
        bubbleClass = "bg-gradient-to-r from-teal-600 to-cyan-500 text-white";
    }

    return (
        <div
            className={`flex mb-3 ${isBot ? "justify-start" : "justify-end"}`}
        >
            <div
                className={`max-w-xs px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm ${bubbleClass}`}
            >
                <p className="whitespace-pre-wrap break-words">{text}</p>
                {timeStr && (
                    <p
                        className={`text-xs mt-1 ${isError ? "text-red-400" : isBot ? "text-gray-500" : "text-white opacity-70"
                            }`}
                    >
                        {timeStr}
                    </p>
                )}
            </div>
        </div>
    );
});

export default MessageBubble;
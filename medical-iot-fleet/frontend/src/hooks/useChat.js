import { useState, useCallback, useRef, useEffect } from "react";

/**
 * useChat — manages messages, session state, and webhook communication
 * 
 * Returns:
 *   messages      — array of { id, role, text, timestamp }
 *   isLoading     — bool indicating API call in progress
 *   error         — error message or null
 *   sessionId     — unique session ID (persisted to localStorage)
 *   sendMessage   — async fn(userMessage) → sends to n8n webhook
 *   clearError    — fn() → clears error state
 */
export function useChat() {
    const [messages, setMessages] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [sessionId, setSessionId] = useState(null);

    // Initialize session ID from localStorage on mount
    useEffect(() => {
        let id = localStorage.getItem("mediot_chat_session_id");
        if (!id) {
            // Use crypto.randomUUID if available, else fallback
            id = typeof crypto !== "undefined" && crypto.randomUUID
                ? crypto.randomUUID()
                : `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            localStorage.setItem("mediot_chat_session_id", id);
        }
        setSessionId(id);
    }, []);

    const sendMessage = useCallback(
        async (userMessage) => {
            if (!userMessage.trim() || !sessionId) return;

            // Add user message to UI immediately
            const userMsgObj = {
                id: `msg_${Date.now()}`,
                role: "user",
                text: userMessage,
                timestamp: new Date(),
            };
            setMessages((prev) => [...prev, userMsgObj]);
            setError(null);
            setIsLoading(true);

            try {
                // Call our secure backend proxy instead of n8n directly
                const token = localStorage.getItem("token");
                const baseUrl = (await import("../utils/runtimeApi.js")).getApiBaseUrl();
                
                const response = await fetch(
                    `${baseUrl}/api/chatbot`,
                    {
                        method: "POST",
                        headers: { 
                            "Content-Type": "application/json",
                            ...(token ? { Authorization: `Bearer ${token}` } : {})
                        },
                        body: JSON.stringify({
                            session_id: sessionId,
                            message: userMessage,
                            timestamp: new Date().toISOString(),
                        }),
                    }
                );

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const data = await response.json();
                const botReply = data.response || data.reply || "No response received";

                // Add bot message to UI
                const botMsgObj = {
                    id: `msg_${Date.now()}_bot`,
                    role: "bot",
                    text: botReply,
                    timestamp: new Date(),
                };
                setMessages((prev) => [...prev, botMsgObj]);
            } catch (err) {
                const errorText = err.message || "Failed to send message";
                console.error("[Chat Error]", err);
                // Show error as a bot message so it cannot be deleted
                const errorMsgObj = {
                    id: `msg_${Date.now()}_error`,
                    role: "bot",
                    text: `⚠️ ${errorText}`,
                    timestamp: new Date(),
                    isError: true,
                };
                setMessages((prev) => [...prev, errorMsgObj]);
            } finally {
                setIsLoading(false);
            }
        },
        [sessionId]
    );

    const clearError = useCallback(() => setError(null), []);

    return { messages, isLoading, error, sessionId, sendMessage, clearError };
}
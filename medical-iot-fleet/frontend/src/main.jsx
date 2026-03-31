import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import { WebSocketProvider } from "./context/WebSocketContext";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
    <React.StrictMode>
        <BrowserRouter>
            <AuthProvider>
                <WebSocketProvider>
                    <App />
                    <Toaster
                        position="bottom-left"
                        containerStyle={{
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                        }}
                        toastOptions={{
                            duration: 3000,
                            style: {
                                background: "rgba(255, 255, 255, 0.72)",
                                color: "#111827",
                                borderRadius: "6px",
                                borderTop: "3px solid #14b8a6",
                                border: "1px solid rgba(148, 163, 184, 0.45)",
                                boxShadow: "0 10px 25px rgba(15, 23, 42, 0.18)",
                                padding: "10px 16px",
                                fontSize: "14px",
                                backdropFilter: "none",
                                margin: "0 0 14px 14px",
                            },
                            success: {
                                iconTheme: {
                                    primary: "#14b8a6",
                                    secondary: "#ecfeff",
                                },
                            },
                            error: {
                                iconTheme: {
                                    primary: "#ef4444",
                                    secondary: "#fef2f2",
                                },
                            },
                        }}
                    />
                </WebSocketProvider>
            </AuthProvider>
        </BrowserRouter>
    </React.StrictMode>
);
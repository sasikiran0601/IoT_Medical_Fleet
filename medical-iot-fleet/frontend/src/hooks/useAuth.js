import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";

export function useAuth() {
    const context = useContext(AuthContext);

    // Safely ensure the user object always has a role property
    // We default to "user" (lowest privilege) to remain secure.
    if (context?.user && !context.user.role) {
        return {
            ...context,
            user: {
                ...context.user,
                role: "user" // ← Safe default. Change to "admin" ONLY for local testing!
            }
        };
    }

    return context;
}


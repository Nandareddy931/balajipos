
import {
    createContext,
    useContext,
    useEffect,
    useState,
    type ReactNode,
} from "react";

import {
    onAuthStateChanged,
    type User,
} from "firebase/auth";

import { auth } from "../firebase/config";

import {
    loadShopUser,
    type ShopUser,
} from "../services/authService";

interface AuthContextValue {
    user: User | null;
    shopUser: ShopUser | null;
    loading: boolean;
    profileError: string | null;
}

const AuthContext = createContext<AuthContextValue | undefined>(
    undefined
);

export function AuthProvider({
    children,
}: {
    children: ReactNode;
}) {
    const [user, setUser] = useState<User | null>(null);
    const [shopUser, setShopUser] = useState<ShopUser | null>(null);
    const [loading, setLoading] = useState(true);
    const [profileError, setProfileError] = useState<string | null>(null);

    useEffect(() => {
        let active = true;
        let authEventId = 0;

        const unsubscribe = onAuthStateChanged(
            auth,
            async (firebaseUser) => {
                const currentEventId = ++authEventId;

                if (!active) return;

                setUser(firebaseUser);
                setShopUser(null);
                setProfileError(null);
                setLoading(true);

                try {
                    const profile = firebaseUser
                        ? await loadShopUser(firebaseUser)
                        : null;

                    if (
                        active &&
                        currentEventId === authEventId
                    ) {
                        setShopUser(profile);
                    }
                } catch (error) {
                    console.error(
                        "Failed to load shop profile:",
                        error
                    );

                    if (
                        active &&
                        currentEventId === authEventId
                    ) {
                        setShopUser(null);

                        setProfileError(
                            error instanceof Error
                                ? error.message
                                : "Unable to load your shop profile."
                        );
                    }
                } finally {
                    if (
                        active &&
                        currentEventId === authEventId
                    ) {
                        setLoading(false);
                    }
                }
            },
            (error) => {
                console.error(
                    "Firebase authentication error:",
                    error
                );

                if (active) {
                    ++authEventId;
                    setUser(null);
                    setShopUser(null);
                    setProfileError(error.message);
                    setLoading(false);
                }
            }
        );

        return () => {
            active = false;
            unsubscribe();
        };
    }, []);

    return (
        <AuthContext.Provider
            value={{
                user,
                shopUser,
                loading,
                profileError,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth(): AuthContextValue {
    const context = useContext(AuthContext);

    if (context === undefined) {
        throw new Error(
            "useAuth must be used inside AuthProvider"
        );
    }

    return context;
}

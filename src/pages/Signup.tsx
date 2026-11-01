
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signupUser } from "../services/authService";

export default function Signup() {
    const navigate = useNavigate();
    const [shopName, setShopName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (password.length < 6) {
            setError("Password must be at least 6 characters.");
            return;
        }
        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        setLoading(true);
        try {
            await signupUser(email, password, shopName);
            navigate("/", { replace: true });
        } catch (err: any) {
            const code = err?.code ?? "";
            if (code === "auth/email-already-in-use") {
                setError("This email is already registered. Try logging in.");
            } else if (code === "auth/invalid-email") {
                setError("Please enter a valid email address.");
            } else if (code === "auth/weak-password") {
                setError("Password is too weak. Use at least 6 characters.");
            } else {
                setError(err?.message ?? "Signup failed. Please try again.");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-neutral-100 p-4">
            <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8">
                <div className="text-center mb-6">
                    <h1 className="text-2xl font-bold text-green-800">
                        New Balaji Stock
                    </h1>
                    <p className="text-sm text-neutral-500 mt-1">
                        Create your shop account
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="text-sm font-medium text-neutral-700">
                            Shop Name
                        </label>
                        <input
                            type="text"
                            value={shopName}
                            onChange={(e) => setShopName(e.target.value)}
                            required
                            placeholder="e.g. New Balaji Ruthu Depo"
                            className="w-full mt-1 px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
                        />
                    </div>

                    <div>
                        <label className="text-sm font-medium text-neutral-700">
                            Email
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            placeholder="you@example.com"
                            className="w-full mt-1 px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
                        />
                    </div>

                    <div>
                        <label className="text-sm font-medium text-neutral-700">
                            Password
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            placeholder="At least 6 characters"
                            className="w-full mt-1 px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
                        />
                    </div>

                    <div>
                        <label className="text-sm font-medium text-neutral-700">
                            Confirm Password
                        </label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            className="w-full mt-1 px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
                        />
                    </div>

                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-green-700 hover:bg-green-800 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg"
                    >
                        {loading ? "Creating account..." : "Create Shop Account"}
                    </button>
                </form>

                <p className="text-center text-sm text-neutral-500 mt-6">
                    Already have an account?{" "}
                    <Link
                        to="/login"
                        className="text-green-700 font-medium hover:underline"
                    >
                        Login
                    </Link>
                </p>
            </div>
        </div>
    );
}
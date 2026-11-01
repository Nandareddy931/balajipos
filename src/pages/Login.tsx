import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { loginUser } from "../services/authService";

export default function Login() {
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            await loginUser(email, password);
            navigate("/", { replace: true });
        } catch (err: any) {
            const code = err?.code ?? "";
            if (code === "auth/wrong-password" || code === "auth/invalid-credential") {
                setError("Incorrect email or password.");
            } else if (code === "auth/user-not-found") {
                setError("No account found with this email.");
            } else if (code === "auth/invalid-email") {
                setError("Please enter a valid email.");
            } else if (code === "auth/too-many-requests") {
                setError("Too many attempts. Try again in a few minutes.");
            } else {
                setError(err?.message ?? "Login failed. Please try again.");
            }
        } finally {
            setLoading(false);
        }
    };



    return (
        <div className="min-h-screen flex items-center justify-center bg-neutral-100 p-4">
            <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8">
                <div className="text-center mb-6">
                    <h1 className="text-2xl font-bold text-green-800">New Balaji Stock</h1>
                    <p className="text-sm text-neutral-500 mt-1">Login to your shop</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="text-sm font-medium text-neutral-700">Email</label>
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
                        {loading ? "Logging in..." : "Login"}
                    </button>

                    <button
                        type="button"
                        className="w-full text-sm text-neutral-500 hover:text-green-700"
                    >
                        Forgot password?
                    </button>
                </form>

                <p className="text-center text-sm text-neutral-500 mt-6">
                    New here?{" "}
                    <Link to="/signup" className="text-green-700 font-medium hover:underline">
                        Create your shop
                    </Link>
                </p>
            </div>
        </div>
    );
}
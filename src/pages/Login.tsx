
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
    UserRound,
    LockKeyhole,
    Eye,
    EyeOff,
    ArrowRight,
    ShoppingBasket,
} from "lucide-react";
import { loginUser } from "../services/authService";

export default function Login() {
    const navigate = useNavigate();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            await loginUser(email, password);
            navigate("/", { replace: true });
        } catch (err: any) {
            const code = err?.code ?? "";

            if (
                code === "auth/wrong-password" ||
                code === "auth/invalid-credential"
            ) {
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
        <div className="min-h-dvh w-full flex items-center justify-center bg-slate-100">

            {/* Mobile login screen */}
            <main className="relative isolate min-h-dvh w-full max-w-[430px] overflow-hidden bg-white shadow-2xl">

                {/* Original reference background */}
                <div
                    className="absolute inset-x-0 top-0 h-[57%] bg-cover bg-center"
                    style={{
                        backgroundImage: "url('/balaji-login-hero.png')",

                    }}
                />

                {/* White curved login panel */}
                <section
                    className="absolute inset-x-0 bottom-0 top-[50%] z-10 overflow-hidden bg-white"
                    style={{
                        borderRadius: "50% 50% 0 0 / 7% 7% 0 0",
                    }}
                >
                    <div className="relative z-20 mx-auto flex h-full w-full max-w-[390px] flex-col items-center justify-start px-6 pt-[12%]">
                        {/* Welcome */}
                        <div className="mb-5 text-center">
                            <h2 className="text-[19px] font-extrabold tracking-tight text-black">
                                Welcome Back!
                            </h2>
                            <p className="mt-0.5 text-[13px] font-medium text-slate-600">
                                Sign in to continue
                            </p>
                        </div>

                        {/* Login form */}
                        <form
                            onSubmit={handleSubmit}
                            className="w-full space-y-2.5"
                        >

                            {/* Email */}
                            <div className="relative">
                                <UserRound
                                    size={19}
                                    strokeWidth={2}
                                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
                                />

                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    autoComplete="username"
                                    placeholder="Email / Phone Number"
                                    className="h-[43px] w-full rounded-full border border-slate-300 bg-white pl-12 pr-4 text-[13px] font-medium text-slate-800 outline-none placeholder:text-slate-500 focus:border-green-600 focus:ring-2 focus:ring-green-100"
                                />
                            </div>

                            {/* Password */}
                            <div className="relative">
                                <LockKeyhole
                                    size={19}
                                    strokeWidth={2}
                                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
                                />

                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    autoComplete="current-password"
                                    placeholder="Password"
                                    className="h-[43px] w-full rounded-full border border-slate-300 bg-white pl-12 pr-12 text-[13px] font-medium text-slate-800 outline-none placeholder:text-slate-500 focus:border-green-600 focus:ring-2 focus:ring-green-100"
                                />

                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    aria-label={showPassword ? "Hide password" : "Show password"}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500"
                                >
                                    {showPassword ? (
                                        <EyeOff size={19} />
                                    ) : (
                                        <Eye size={19} />
                                    )}
                                </button>
                            </div>

                            {/* Error */}
                            {error && (
                                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                                    {error}
                                </div>
                            )}

                            {/* Login button */}
                            <button
                                type="submit"
                                disabled={loading}
                                className="flex h-[43px] w-full items-center justify-center rounded-full bg-gradient-to-r from-green-600 to-green-700 px-5 text-[15px] font-bold text-white shadow-md transition hover:from-green-700 hover:to-green-800 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                <span
                                    className="absolute left-1/2 -translate-x-1/2">
                                    {loading ? "Logging in..." : "Login"}
                                </span>

                                {!loading && (
                                    <ArrowRight
                                        size={22}
                                        strokeWidth={2.5}
                                        className="ml-auto"
                                    />
                                )}
                            </button>

                            {/* Forgot password */}
                            <div className="pt-0.5 text-center">
                                <button
                                    type="button"
                                    className="text-[12px] font-bold text-green-700 hover:text-green-900"
                                >
                                    Forgot Password?
                                </button>
                            </div>
                        </form>
                        {/* Sign up option */}
                        <div className="pt-2 text-center">
                            <p className="text-[12px] text-slate-600">
                                New to Balaji POS?{" "}
                                <Link
                                    to="/signup"
                                    className="font-bold text-green-700 hover:text-green-900 hover:underline"
                                >
                                    Create Your Shop
                                </Link>
                            </p>
                        </div>

                        {/* Footer */}
                        <div className="absolute bottom-[6.5%] left-0 z-30 flex w-full items-center justify-center gap-1.5 text-[11px] font-semibold text-slate-800">
                            <ShoppingBasket
                                size={17}
                                strokeWidth={2.5}
                                className="text-green-700"
                            />
                            <span>Powered by Balaji POS</span>
                        </div>
                    </div>
                </section>

                {/* Bottom green decorative curves */}
                <div className="pointer-events-none absolute bottom-0 left-0 z-0 h-[8%] w-full overflow-hidden">

                    <div
                        className="absolute -bottom-[55%] -left-[12%] h-[125%] w-[125%] rounded-[50%] bg-green-500"
                        style={{ transform: "rotate(-5deg)" }}
                    />

                    <div
                        className="absolute -bottom-[70%] -right-[18%] h-[145%] w-[130%] rounded-[50%] bg-gradient-to-r from-green-700 via-green-600 to-green-800"
                        style={{ transform: "rotate(5deg)" }}
                    />

                    <div className="absolute -bottom-[88%] -left-[15%] h-[150%] w-[130%] rounded-[50%] bg-green-700" />
                </div>
            </main >
        </div >
    );
}

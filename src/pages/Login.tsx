
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
    UserRound,
    LockKeyhole,
    Eye,
    EyeOff,
    ArrowRight,
    ShoppingBasket,
    Mail,
    TrendingUp,
    Package,
    ReceiptText,
    ShieldCheck,
} from "lucide-react";
import { loginUser } from "../services/authService";

function BalajiCartLogo({
    size = 90,
    className = "",
}: {
    size?: number;
    className?: string;
}) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
        >
            {/* Leaf */}
            <path
                d="M49 25C55 10 72 5 88 5C85 22 74 35 55 34L49 25Z"
                fill="#42B82A"
            />
            <path
                d="M53 29C63 21 73 14 84 9"
                stroke="#08723E"
                strokeWidth="2"
                strokeLinecap="round"
            />

            {/* Cart handle */}
            <path
                d="M13 31H23L31 70"
                stroke="currentColor"
                strokeWidth="6"
                strokeLinecap="round"
                strokeLinejoin="round"
            />

            {/* Cart basket */}
            <path
                d="M27 39H87L79 67H33L27 39Z"
                stroke="currentColor"
                strokeWidth="5.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />

            {/* Cart horizontal bars */}
            <path
                d="M33 49H82M36 59H79"
                stroke="currentColor"
                strokeWidth="4.5"
                strokeLinecap="round"
            />

            {/* Wheels */}
            <circle cx="40" cy="82" r="6" stroke="currentColor" strokeWidth="5" />
            <circle cx="75" cy="82" r="6" stroke="currentColor" strokeWidth="5" />
        </svg>
    );
}


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
        <div className="flex min-h-dvh w-full justify-center bg-slate-100 md:block">

            {/* ================================================== */}
            {/* DESKTOP AND TABLET LOGIN                            */}
            {/* ================================================== */}

            <main className="relative hidden min-h-dvh w-full overflow-hidden bg-white md:flex">

                {/* LEFT BRANDING PANEL */}

                <section className="relative z-0 min-h-dvh w-[54%] overflow-hidden bg-[#005b37] lg:w-[57%]">

                    {/* Background image */}

                    <div
                        className="absolute inset-0 bg-cover bg-center"
                        style={{
                            backgroundImage: "url('\login bg.png')",
                        }}
                    />

                    {/* Green image overlay */}

                    <div className="absolute inset-0 bg-gradient-to-br from-[#004b30]/95 via-[#00623b]/85 to-[#003c27]/90" />

                    <div className="absolute inset-0 bg-gradient-to-t from-[#003c28]/70 via-transparent to-[#00452d]/20" />

                    {/* Branding content */}

                    <div className="relative z-10 flex min-h-dvh flex-col px-[7%] py-[7.5%] text-white lg:px-[8.5%]">

                        {/* Logo */}

                        <div className="flex items-center gap-4">
                            <BalajiCartLogo
                                size={82}
                                className="shrink-0 text-white"
                            />

                            <div>
                                <h1 className="text-3xl font-extrabold tracking-wide lg:text-[42px]">
                                    BALAJI POS
                                </h1>
                                <p className="mt-1 text-[11px] font-semibold tracking-[0.32em] text-white/90 lg:text-[15px]">
                                    RETAIL MANAGEMENT
                                </p>
                            </div>
                        </div>

                        {/* Main message */}

                        <div className="mt-[12%] max-w-[650px] lg:mt-[13%]">

                            <h2 className="text-[clamp(28px,3.3vw,56px)] font-extrabold leading-[1.12] tracking-tight">
                                Manage your shop.
                                <br />
                                <span className="text-lime-300">
                                    Grow your business.
                                </span>
                            </h2>

                            <div className="mt-2 h-[4px] w-[150px] rounded-full bg-lime-400" />

                            <p className="mt-6 max-w-[570px] text-base font-medium leading-relaxed text-white/95 lg:text-[23px] lg:leading-[1.5]">
                                A smarter way to manage your products,
                                inventory, billing and daily operations
                                from one place.
                            </p>
                        </div>

                        {/* Feature highlights */}

                        <div className="mt-[7%] grid max-w-[590px] grid-cols-3">

                            <div className="flex flex-col items-center px-2 text-center">
                                <div className="flex h-[62px] w-[62px] items-center justify-center rounded-full border-2 border-lime-400 text-lime-300 lg:h-[80px] lg:w-[80px]">
                                    <TrendingUp size={38} strokeWidth={2} />
                                </div>
                                <p className="mt-3 text-sm font-bold leading-tight lg:text-lg">
                                    Track
                                    <br />
                                    Sales
                                </p>
                            </div>

                            <div className="flex flex-col items-center border-x border-white/40 px-2 text-center">
                                <div className="flex h-[62px] w-[62px] items-center justify-center rounded-full border-2 border-lime-400 text-lime-300 lg:h-[80px] lg:w-[80px]">
                                    <Package size={38} strokeWidth={2} />
                                </div>
                                <p className="mt-3 text-sm font-bold leading-tight lg:text-lg">
                                    Manage
                                    <br />
                                    Inventory
                                </p>
                            </div>

                            <div className="flex flex-col items-center px-2 text-center">
                                <div className="flex h-[62px] w-[62px] items-center justify-center rounded-full border-2 border-lime-400 text-lime-300 lg:h-[80px] lg:w-[80px]">
                                    <ReceiptText size={38} strokeWidth={2} />
                                </div>
                                <p className="mt-3 text-sm font-bold leading-tight lg:text-lg">
                                    Generate
                                    <br />
                                    Bills
                                </p>
                            </div>
                        </div>

                        {/* Footer */}

                        <div className="mt-auto flex items-center gap-5 pb-1 text-xs font-semibold lg:text-base">
                            <div className="flex items-center gap-3">
                                <ShieldCheck
                                    size={38}
                                    className="text-lime-400 lg:h-11 lg:w-11"
                                />
                                <span>Secure &amp; Reliable</span>
                            </div>

                            <div className="h-8 w-px bg-white/60" />

                            <span>Powered by Balaji POS</span>
                        </div>
                    </div>
                </section>

                {/* RIGHT WHITE LOGIN PANEL */}

                <section
                    className="absolute right-0 top-0 z-10 flex min-h-dvh w-[49%] items-center justify-center overflow-hidden bg-white md:w-[49%] lg:w-[46%]"
                    style={{
                        borderRadius: "14% 0 0 14% / 50% 0 0 50%",
                    }}
                >

                    {/* Decorative background shapes */}

                    <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-green-100/60" />
                    <div className="pointer-events-none absolute -bottom-28 -right-20 h-72 w-72 rounded-full border-[35px] border-green-50" />

                    {/* Login content */}

                    <div className="relative z-10 w-full max-w-[460px] px-7 py-10 lg:px-4">

                        {/* Logo */}

                        <div className="mb-4 flex justify-center">
                            <BalajiCartLogo
                                size={100}
                                className="text-[#006b3d]"
                            />
                        </div>

                        {/* Welcome */}

                        <div className="mb-10 text-center">
                            <h2 className="text-3xl font-extrabold tracking-tight text-[#075b37] lg:text-[43px]">
                                Welcome Back!
                            </h2>

                            <p className="mt-2 text-lg font-medium text-slate-500 lg:text-[27px]">
                                Sign in to your account
                            </p>
                        </div>

                        {/* Form */}

                        <form
                            onSubmit={handleSubmit}
                            className="w-full space-y-5"
                        >

                            {/* Email */}

                            <div className="relative">
                                <Mail
                                    size={29}
                                    strokeWidth={2}
                                    className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600"
                                />

                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    autoComplete="username"
                                    placeholder="Email address"
                                    className="h-[64px] w-full rounded-[20px] border border-slate-300 bg-white pl-[76px] pr-5 text-lg font-medium text-slate-800 outline-none transition focus:border-green-600 focus:ring-2 focus:ring-green-100 lg:h-[73px] lg:text-[21px]"
                                />
                            </div>

                            {/* Password */}

                            <div className="relative">
                                <LockKeyhole
                                    size={29}
                                    strokeWidth={2}
                                    className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600"
                                />

                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    autoComplete="current-password"
                                    placeholder="Password"
                                    className="h-[64px] w-full rounded-[20px] border border-slate-300 bg-white pl-[76px] pr-16 text-lg font-medium text-slate-800 outline-none transition focus:border-green-600 focus:ring-2 focus:ring-green-100 lg:h-[73px] lg:text-[21px]"
                                />

                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    aria-label={showPassword ? "Hide password" : "Show password"}
                                    className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-600"
                                >
                                    {showPassword ? (
                                        <EyeOff size={27} />
                                    ) : (
                                        <Eye size={27} />
                                    )}
                                </button>
                            </div>

                            {/* Error */}

                            {error && (
                                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                                    {error}
                                </div>
                            )}

                            {/* Forgot password */}

                            <div className="-mt-1 flex justify-end">
                                <button
                                    type="button"
                                    className="text-base font-bold text-green-700 hover:text-green-900 lg:text-[19px]"
                                >
                                    Forgot password?
                                </button>
                            </div>

                            {/* Sign in button */}

                            <button
                                type="submit"
                                disabled={loading}
                                className="relative flex h-[64px] w-full items-center justify-center rounded-[19px] bg-gradient-to-r from-green-700 to-[#005633] px-7 text-lg font-bold text-white shadow-lg transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60 lg:mt-2 lg:h-[73px] lg:text-[22px]"
                            >
                                <span className="text-center">
                                    {loading
                                        ? "Logging in..."
                                        : "Sign in to your account"}
                                </span>

                                {!loading && (
                                    <ArrowRight
                                        size={31}
                                        strokeWidth={2.5}
                                        className="absolute right-7"
                                    />
                                )}
                            </button>

                            {/* Create shop */}

                            <div className="flex items-center gap-4 pt-4 text-center">
                                <div className="h-px flex-1 bg-slate-300" />

                                <p className="whitespace-nowrap text-sm font-medium text-slate-600 lg:text-lg">
                                    New to Balaji POS?
                                </p>

                                <Link
                                    to="/signup"
                                    className="whitespace-nowrap text-sm font-bold text-green-700 underline decoration-2 underline-offset-4 hover:text-green-900 lg:text-lg"
                                >
                                    Create your shop
                                </Link>

                                <div className="h-px flex-1 bg-slate-300" />
                            </div>
                        </form>

                        {/* Security message */}

                        <div className="mt-12 flex items-center justify-center gap-4 text-sm font-medium text-slate-700 lg:text-base">
                            <ShieldCheck
                                size={36}
                                fill="#078b4a"
                                className="text-white"
                            />
                            <span>Your shop account is protected</span>
                        </div>
                    </div>
                </section>
            </main>

            {/* ================================================== */}
            {/* ORIGINAL MOBILE LOGIN - PRESERVED                  */}
            {/* ================================================== */}

            <main className="relative isolate mx-auto min-h-dvh w-full max-w-[430px] overflow-hidden bg-white shadow-2xl md:hidden">

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
                                className="relative flex h-[43px] w-full items-center justify-center rounded-full bg-gradient-to-r from-green-600 to-green-700 px-5 text-[15px] font-bold text-white shadow-md transition hover:from-green-700 hover:to-green-800 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                <span className="absolute left-1/2 -translate-x-1/2">
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
            </main>
        </div>
    );
}

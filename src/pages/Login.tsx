import React, { useState } from "react";
import { Lock, Mail, ChevronRight, ShieldCheck } from "lucide-react";
import { setCookie } from "../utils/cookieHelper";
import { normalizeAuthUser, setAuthUser } from "../utils/auth";
import { usePermissions } from '../utils/PermissionsContext';

/**
 * Raza Boiler Login Screen
 * Connected to Laravel API
 */
const LoginScreen = ({ onLogin }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const { setPermissions, setRoles } = usePermissions();

  const handleAuth = async (e) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Email and Password are required");
      return;
    }

    try {
      setLoading(true);

      const res = await fetch("http://127.0.0.1:8000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.message || "Login failed");

      // Adjust if your API returns different key
      const token = data.token || data.access_token || null;

      if (token) {
        setCookie("auth_token", token, 7); // Save token in cookie for 7 days
      }

      const authUser = normalizeAuthUser(data) || (data.user || data);
      setAuthUser(authUser);
      // Set permissions and roles from API response
      setPermissions(data.permissions || []);
      setRoles(data.roles || []);
      onLogin(authUser);
    } catch (err) {
      setError(err.message || "Invalid credentials. Try again.");
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 font-sans">
      {/* Brand Header */}
      <div className="mb-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4 shadow-lg shadow-blue-500/20">
          <ShieldCheck className="text-white w-10 h-10" />
        </div>
        <h1 className="text-3xl font-bold text-white tracking-tight">
          RAZA BOILER
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Enterprise Management Portal
        </p>
      </div>

      {/* Login Card */}
      <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl overflow-hidden p-8">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-slate-800">Welcome Back</h2>
          <p className="text-slate-500 text-sm">
            Login to access your dashboard
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-5">
          {/* Email Field */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Mail className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="block w-full pl-11 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>

          {/* Password Field */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Lock className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="block w-full pl-11 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>

          {/* Error Message */}
          {error && (
            <p className="text-red-500 text-xs font-medium text-center">
              {error}
            </p>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 rounded-2xl transition-all active:scale-[0.98] shadow-lg"
          >
            {loading ? "Signing in..." : "Login"}
            <ChevronRight className="w-5 h-5" />
          </button>
        </form>
      </div>

      {/* Footer */}
      <div className="mt-8">
        <p className="text-slate-500 text-sm">
          Technical issues?{" "}
          <span className="text-blue-400 font-medium cursor-pointer">
            Contact Support
          </span>
        </p>
      </div>
    </div>
  );
};

export default LoginScreen;

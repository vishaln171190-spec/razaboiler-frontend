// ...existing code...
import React, { useState } from "react";
import { Lock, Mail, ChevronRight } from "lucide-react";
import { setCookie } from "../utils/cookieHelper";
import { normalizeAuthUser, setAuthUser } from "../utils/auth";
import { usePermissions } from '../utils/PermissionsContext';
import { API_BASE_URL } from "../../constants";

const LoginScreen = ({ onLogin }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
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
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Login failed");
      const token = data.token || data.access_token || null;
      if (token) {
        setCookie("auth_token", token, 7);
      }
      const authUser = normalizeAuthUser(data) || (data.user || data);
      setAuthUser(authUser);
      setPermissions(data.permissions || []);
      setRoles(data.roles || []);
      onLogin(authUser);
    } catch (err) {
      setError(err.message || "Invalid credentials. Try again.");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center font-['Inter','Montserrat',sans-serif]" style={{ background: "linear-gradient(135deg, #1a1a1a 0%, #d47600 100%)" }}>
      <div className="backdrop-blur-md bg-white/80 rounded-3xl shadow-2xl p-10 w-full max-w-md flex flex-col items-center">
        <div className="flex items-center gap-4 mb-6">
          <img src="/logo-new.png" alt="Raza Boiler Logo" className="w-16 h-16 object-contain" />
          <div>
            <h1 className="text-2xl font-bold text-[#1a1a1a] tracking-tight">RAZA BOILER</h1>
            <p className="text-sm text-[#d47600] font-medium">Enterprise Management Portal</p>
          </div>
        </div>
        {/* Error Message on Top as Bootstrap Alert */}
        {error && (
          <div className="w-full mb-4 px-4 py-3 rounded-lg bg-red-100 border border-red-400 text-red-700 text-sm font-semibold text-center" role="alert">
            {error}
          </div>
        )}
        <form className="w-full space-y-5" onSubmit={handleAuth}>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
              <Mail className="h-5 w-5 text-gray-400" />
            </span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="block w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#d47600] focus:border-transparent transition-all"
            />
          </div>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
              <Lock className="h-5 w-5 text-gray-400" />
            </span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="block w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#d47600] focus:border-transparent transition-all"
            />
          </div>
          <div className="flex items-center text-sm">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} className="accent-[#d47600] rounded focus:ring-0" />
              <span className="text-gray-700">Remember Me</span>
            </label>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-[#d47600] text-white font-bold text-lg shadow-lg transition-all hover:bg-[#b35e00] active:scale-[0.98] flex items-center justify-center gap-2"
          >
            {loading ? "Signing in..." : "Login"}
            <ChevronRight className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginScreen;

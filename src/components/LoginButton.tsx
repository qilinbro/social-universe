'use client';

import { useState } from 'react';

export default function LoginButton() {
  const [loading, setLoading] = useState(false);

  const handleLogin = () => {
    setLoading(true);
    window.location.href = '/api/auth/login';
  };

  return (
    <button
      onClick={handleLogin}
      disabled={loading}
      className="group relative px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 rounded-2xl text-white font-semibold text-lg transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
    >
      <span className="relative z-10 flex items-center gap-3">
        {loading ? (
          <>
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span>正在跳转...</span>
          </>
        ) : (
          <>
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
              <polyline points="10 17 15 12 10 7" />
              <line x1="15" y1="12" x2="3" y2="12" />
            </svg>
            <span>使用 SecondMe 登录</span>
          </>
        )}
      </span>

      {/* 光效动画 */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
    </button>
  );
}
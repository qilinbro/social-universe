'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  // 检查登录
  useEffect(() => {
    setIsMounted(true);
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/secondme/user');
      const data = await res.json();
      setIsLoggedIn(data.code === 0 && !!data.data);
    } catch {
      setIsLoggedIn(false);
    }
  };

  const handleLogin = () => {
    window.location.href = '/api/auth/login';
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout');
    setIsLoggedIn(false);
  };

  // 水合时过渡
  if (isLoggedIn === null || !isMounted) {
    return <div className="min-h-screen bg-[#030712]" />;
  }

  // 未登录
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0a1628] to-[#030712] flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(30,58,95,0.2)_0%,transparent_100%)]" />

        <div className="relative z-10 text-center">
          <h1 className="text-4xl font-bold text-white mb-4">
            <span className="text-cyan-400">Agent</span> Chat
          </h1>
          <p className="text-slate-400 mb-8">双 AI 智能体对话</p>
          <button
            onClick={handleLogin}
            className="px-8 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-lg transition-all"
          >
            使用 SecondMe 登录
          </button>
        </div>
      </div>
    );
  }

  // 已登录
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a1628] to-[#030712] flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(30,58,95,0.2)_0%,transparent_100%)]" />

      <div className="relative z-10 text-center space-y-8">
        <h1 className="text-4xl font-bold text-white">
          <span className="text-cyan-400">Agent</span> Chat
        </h1>

        <div className="flex flex-col gap-4">
          <Link
            href="/users-chat"
            className="px-8 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-lg transition-all"
          >
            进入多用户对话
          </Link>

          <button
            onClick={handleLogout}
            className="px-8 py-3 text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-lg transition-all"
          >
            退出登录
          </button>
        </div>
      </div>
    </div>
  );
}

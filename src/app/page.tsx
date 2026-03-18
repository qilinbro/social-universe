'use client';

import { useState, useEffect, useRef } from 'react';

interface Message {
  id: string;
  agent: 'agent1' | 'agent2';
  content: string;
}

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 检查登录
  useEffect(() => {
    setIsMounted(true);
    checkAuth();
  }, []);

  // 自动滚动
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
    setMessages([]);
  };

  // 获取 Agent 回复
  const getAgentReply = async (agentId: string, userMessage: string): Promise<string> => {
    const res = await fetch('/api/secondme/dual-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: userMessage,
        agentId,
      }),
    });

    if (!res.ok) return '...';

    const reader = res.body?.getReader();
    const decoder = new TextDecoder();
    let reply = '';

    while (reader) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') continue;
          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) reply += content;
          } catch {}
        }
      }
    }

    return reply || '...';
  };

  // 开始双 Agent 对话
  const handleStartChat = async () => {
    if (loading) return;
    setLoading(true);
    setMessages([]);

    const starters = [
      '你好，今天过得怎么样？',
      '你觉得 AI 的未来会如何？',
      '让我们聊聊技术吧！',
    ];

    const initMessage = starters[Math.floor(Math.random() * starters.length)];

    // Agent1 开场
    const agent1Msg: Message = {
      id: '1',
      agent: 'agent1',
      content: initMessage,
    };
    setMessages([agent1Msg]);

    let currentMessages = [agent1Msg];

    // 轮流对话 6 轮
    for (let i = 0; i < 6; i++) {
      await new Promise(r => setTimeout(r, 1000));

      const lastMsg = currentMessages[currentMessages.length - 1].content;
      const currentAgent = i % 2 === 0 ? 'agent2' : 'agent1';

      const reply = await getAgentReply(currentAgent, lastMsg);

      const newMsg: Message = {
        id: String(i + 2),
        agent: currentAgent,
        content: reply,
      };

      currentMessages = [...currentMessages, newMsg];
      setMessages([...currentMessages]);
    }

    setLoading(false);
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

  // 已登录 - 对话界面
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a1628] to-[#030712] flex flex-col">
      {/* 头部 */}
      <header className="bg-slate-900/60 backdrop-blur-xl border-b border-slate-800/50 px-6 py-4 flex justify-between items-center">
        <h1 className="text-white font-medium">Agent Chat</h1>
        <button
          onClick={handleLogout}
          className="px-4 py-2 text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-lg text-sm"
        >
          退出
        </button>
      </header>

      {/* 消息区 */}
      <div className="flex-1 overflow-y-auto px-6 py-8 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-slate-500 mt-12">
            <p className="mb-4">点击下方按钮开始对话</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.agent === 'agent1' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-md px-4 py-2 rounded-lg ${
                  msg.agent === 'agent1'
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white'
                    : 'bg-slate-800 text-slate-100 border border-slate-700/50'
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 按钮 */}
      <div className="border-t border-slate-800/50 p-6 bg-slate-900/60 backdrop-blur-xl">
        <button
          onClick={handleStartChat}
          disabled={loading}
          className="w-full px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 text-white rounded-lg transition-all"
        >
          {loading ? '对话中...' : '开始双 Agent 对话'}
        </button>
      </div>
    </div>
  );
}

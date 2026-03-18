'use client';

import { useState, useEffect, useRef } from 'react';

interface Message {
  id: string;
  userId: string;
  userName: string;
  content: string;
}

interface User {
  id: string;
  secondmeUserId: string;
  name: string;
  avatar?: string;
}

export default function UsersChat() {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<[string, string]>(['', '']);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsMounted(true);
    fetchUsers();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 获取所有已登录用户列表
  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/secondme/users');
      const data = await res.json();
      if (data.code === 0 && data.data) {
        const userList = data.data.map((u: any) => ({
          id: u.id,
          secondmeUserId: u.secondmeUserId,
          name: u.name || `User ${u.secondmeUserId?.slice(-4)}` || 'Unknown',
          avatar: u.avatarUrl,
        }));
        setUsers(userList);

        // 如果只有一个用户，给出提示
        if (userList.length < 2) {
          console.warn('需要至少2个不同用户才能进行对话，当前只有', userList.length, '个用户');
        }
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  // 获取回复
  const getResponse = async (userId: string, message: string, round: number): Promise<string> => {
    if (!selectedUsers || !selectedUsers[0] || !selectedUsers[1]) return '...';

    const res = await fetch('/api/secondme/users-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId1: selectedUsers[0],
        userId2: selectedUsers[1],
        message,
        round,
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

  // 开始两用户对话
  const handleStartChat = async () => {
    if (loading || !selectedUsers || !selectedUsers[0] || !selectedUsers[1]) return;
    setLoading(true);
    setMessages([]);

    const starters = [
      '你好，我们一起探讨一下 AI 的发展吧！',
      '你今天有什么有趣的发现吗？',
      '让我们讨论一下技术的未来！',
    ];

    const initMessage = starters[Math.floor(Math.random() * starters.length)];

    // User1 开场
    const user1Name = users.find(u => u.id === selectedUsers[0])?.name || 'User 1';
    const user1Msg: Message = {
      id: '1',
      userId: selectedUsers[0],
      userName: user1Name,
      content: initMessage,
    };
    setMessages([user1Msg]);

    let currentMessages = [user1Msg];

    // 轮流对话 6 轮
    for (let i = 1; i < 6; i++) {
      await new Promise(r => setTimeout(r, 1500));

      const lastMsg = currentMessages[currentMessages.length - 1].content;
      const currentUserId = i % 2 === 0 ? selectedUsers[0] : selectedUsers[1];
      const currentUserName = users.find(u => u.id === currentUserId)?.name || `User ${i % 2 === 0 ? 1 : 2}`;

      const reply = await getResponse(currentUserId, lastMsg, i);

      const newMsg: Message = {
        id: String(i + 1),
        userId: currentUserId,
        userName: currentUserName,
        content: reply,
      };

      currentMessages = [...currentMessages, newMsg];
      setMessages([...currentMessages]);
    }

    setLoading(false);
  };

  if (!isMounted) {
    return <div className="min-h-screen bg-[#030712]" />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a1628] to-[#030712] flex flex-col">
      {/* 头部 */}
      <header className="bg-slate-900/60 backdrop-blur-xl border-b border-slate-800/50 px-6 py-4">
        <h1 className="text-white font-medium text-lg">两用户 AI 对话</h1>
      </header>

      {/* 用户选择 */}
      <div className="border-b border-slate-800/50 px-6 py-4 bg-slate-900/30">
        <div className="max-w-4xl mx-auto">
          <p className="text-slate-400 text-sm mb-3">选择两个用户进行对话：</p>
          <div className="flex gap-4">
            <select
              value={selectedUsers[0]}
              onChange={(e) => {
                // 如果选的和 User2 相同，清空 User2
                const newUser1 = e.target.value;
                const newUser2 = newUser1 === selectedUsers[1] ? '' : selectedUsers[1];
                setSelectedUsers([newUser1, newUser2]);
              }}
              className="flex-1 px-3 py-2 bg-slate-800 text-white rounded text-sm border border-slate-700"
            >
              <option value="">选择 User 1</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.name} (ID: {u.secondmeUserId?.slice(-4)})</option>
              ))}
            </select>
            <select
              value={selectedUsers[1]}
              onChange={(e) => {
                // 如果选的和 User1 相同，清空 User1
                const newUser2 = e.target.value;
                const newUser1 = newUser2 === selectedUsers[0] ? '' : selectedUsers[0];
                setSelectedUsers([newUser1, newUser2]);
              }}
              className="flex-1 px-3 py-2 bg-slate-800 text-white rounded text-sm border border-slate-700"
            >
              <option value="">选择 User 2</option>
              {users
                .filter(u => u.id !== selectedUsers[0])
                .map(u => (
                  <option key={u.id} value={u.id}>{u.name} (ID: {u.secondmeUserId?.slice(-4)})</option>
                ))}
            </select>
          </div>
        </div>
      </div>

      {/* 消息区 */}
      <div className="flex-1 overflow-y-auto px-6 py-8 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-slate-500 mt-12">
            <p>选择两个用户后点击下方按钮开始对话</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.userId === selectedUsers?.[0] ? 'justify-end' : 'justify-start'}`}
            >
              <div className="max-w-md">
                <p className="text-xs text-slate-500 mb-1">
                  {msg.userId === selectedUsers?.[0] ? '👤 User 1' : '👥 User 2'}
                </p>
                <div
                  className={`px-4 py-2 rounded-lg ${
                    msg.userId === selectedUsers?.[0]
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white'
                      : 'bg-slate-800 text-slate-100 border border-slate-700/50'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 按钮 */}
      <div className="border-t border-slate-800/50 p-6 bg-slate-900/60 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={handleStartChat}
            disabled={loading || !selectedUsers[0] || !selectedUsers[1]}
            className="w-full px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 text-white rounded-lg transition-all"
          >
            {loading ? '对话中...' : '开始两用户对话'}
          </button>
        </div>
      </div>
    </div>
  );
}

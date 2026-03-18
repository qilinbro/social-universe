'use client';

import { useEffect, useState } from 'react';

interface UserInfo {
  userId: string;
  email: string;
  name: string;
  avatarUrl: string;
  route: string;
}

export default function UserProfile() {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/user/info')
      .then((res) => res.json())
      .then((data) => {
        if (data.code === 0) {
          setUserInfo(data.data);
        } else {
          setError(data.message || '获取用户信息失败');
        }
      })
      .catch((err) => {
        setError('请求失败');
        console.error(err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[200px] gap-4">
        <div className="text-red-500">{error}</div>
        <button
          onClick={handleLogout}
          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          重新登录
        </button>
      </div>
    );
  }

  if (!userInfo) return null;

  return (
    <div className="max-w-md mx-auto p-6">
      <div className="flex flex-col items-center">
        {userInfo.avatarUrl ? (
          <img
            src={userInfo.avatarUrl}
            alt={userInfo.name}
            className="w-24 h-24 rounded-full mb-4"
          />
        ) : (
          <div className="w-24 h-24 rounded-full bg-gray-200 mb-4 flex items-center justify-center">
            <span className="text-3xl text-gray-500">
              {userInfo.name?.charAt(0) || '?'}
            </span>
          </div>
        )}

        <h1 className="text-2xl font-semibold mb-2">{userInfo.name}</h1>
        <p className="text-gray-600 mb-1">{userInfo.email}</p>
        <p className="text-gray-500 text-sm mb-6">@{userInfo.route}</p>

        <button
          onClick={handleLogout}
          className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          退出登录
        </button>
      </div>
    </div>
  );
}
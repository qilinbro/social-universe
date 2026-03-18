// @ts-nocheck
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// SecondMe API Base URL
const API_BASE = process.env.SECONDME_API_BASE_URL || 'https://api.mindverse.com/gate/lab';
const OAUTH_URL = process.env.SECONDME_OAUTH_URL || 'https://go.second.me/oauth/';

// Token 交换
export async function exchangeCodeForToken(code: string) {
  const response = await fetch(`${API_BASE}/api/oauth/token/code`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: process.env.SECONDME_REDIRECT_URI || '',
      client_id: process.env.SECONDME_CLIENT_ID || '',
      client_secret: process.env.SECONDME_CLIENT_SECRET || '',
    }),
  });

  const result = await response.json();

  if (result.code !== 0 || !result.data) {
    throw new Error(`Token exchange failed: ${result.message}`);
  }

  return {
    accessToken: result.data.accessToken,
    refreshToken: result.data.refreshToken,
    expiresIn: result.data.expiresIn,
  };
}

// 刷新 Token
export async function refreshAccessToken(refreshToken: string) {
  const response = await fetch(`${API_BASE}/api/oauth/token/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: process.env.SECONDME_CLIENT_ID || '',
      client_secret: process.env.SECONDME_CLIENT_SECRET || '',
    }),
  });

  const result = await response.json();

  if (result.code !== 0 || !result.data) {
    throw new Error(`Token refresh failed: ${result.message}`);
  }

  return {
    accessToken: result.data.accessToken,
    refreshToken: result.data.refreshToken,
    expiresIn: result.data.expiresIn,
  };
}

// ========== SecondMe API ==========

// 获取用户信息 (GET /api/secondme/user/info)
export async function getUserInfo(accessToken: string) {
  const response = await fetch(`${API_BASE}/api/secondme/user/info`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  const result = await response.json();

  if (result.code !== 0) {
    throw new Error(`Failed to get user info: ${result.message}`);
  }

  return result.data;
}

// 获取用户兴趣标签 (GET /api/secondme/user/shades)
export async function getUserShades(accessToken: string) {
  const response = await fetch(`${API_BASE}/api/secondme/user/shades`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  const result = await response.json();

  if (result.code !== 0) {
    throw new Error(`Failed to get user shades: ${result.message}`);
  }

  return result.data;
}

// 获取用户软记忆 (GET /api/secondme/user/softmemory)
export async function getUserSoftMemory(
  accessToken: string,
  options?: { keyword?: string; pageNo?: number; pageSize?: number }
) {
  const params = new URLSearchParams();
  if (options?.keyword) params.set('keyword', options.keyword);
  if (options?.pageNo) params.set('pageNo', String(options.pageNo));
  if (options?.pageSize) params.set('pageSize', String(options.pageSize));

  const response = await fetch(`${API_BASE}/api/secondme/user/softmemory?${params}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  const result = await response.json();

  if (result.code !== 0) {
    throw new Error(`Failed to get softmemory: ${result.message}`);
  }

  return result.data;
}

// 流式聊天 (POST /api/secondme/chat/stream)
export async function chatStream(
  accessToken: string,
  options: {
    message: string;
    sessionId?: string;
    model?: string;
    systemPrompt?: string;
    enableWebSearch?: boolean;
  }
) {
  const response = await fetch(`${API_BASE}/api/secondme/chat/stream`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(options),
  });

  return response;
}

// 流式动作判断 (POST /api/secondme/act/stream)
export async function actStream(
  accessToken: string,
  options: {
    message: string;
    actionControl: string;
    sessionId?: string;
    model?: string;
    systemPrompt?: string;
  }
) {
  const response = await fetch(`${API_BASE}/api/secondme/act/stream`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(options),
  });

  return response;
}

// 获取会话列表 (GET /api/secondme/chat/session/list)
export async function getSessionList(accessToken: string, appId?: string) {
  const url = appId
    ? `${API_BASE}/api/secondme/chat/session/list?appId=${appId}`
    : `${API_BASE}/api/secondme/chat/session/list`;

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  const result = await response.json();

  if (result.code !== 0) {
    throw new Error(`Failed to get session list: ${result.message}`);
  }

  return result.data;
}

// 获取会话消息历史 (GET /api/secondme/chat/session/messages)
export async function getSessionMessages(accessToken: string, sessionId: string) {
  const response = await fetch(
    `${API_BASE}/api/secondme/chat/session/messages?sessionId=${sessionId}`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    }
  );

  const result = await response.json();

  if (result.code !== 0) {
    throw new Error(`Failed to get session messages: ${result.message}`);
  }

  return result.data;
}

// 上报 Agent Memory 事件 (POST /api/secondme/agent_memory/ingest)
export async function ingestAgentMemory(
  accessToken: string,
  data: {
    channel: { kind: string; id?: string; url?: string; meta?: object };
    action: string;
    refs: Array<{
      objectType: string;
      objectId: string;
      type?: string;
      url?: string;
      contentPreview?: string;
    }>;
    actionLabel?: string;
    displayText?: string;
    eventDesc?: string;
    importance?: number;
    idempotencyKey?: string;
  }
) {
  const response = await fetch(`${API_BASE}/api/secondme/agent_memory/ingest`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  const result = await response.json();

  if (result.code !== 0) {
    throw new Error(`Failed to ingest agent memory: ${result.message}`);
  }

  return result.data;
}

// 生成 OAuth 授权 URL
export function getAuthUrl() {
  // 生产环境使用生产回调地址，开发环境使用本地回调地址
  const redirectUri = process.env.NODE_ENV === 'production'
    ? (process.env.SECONDME_REDIRECT_URI || process.env.SECONDME_REDIRECT_URI_PROD)
    : process.env.SECONDME_REDIRECT_URI;

  console.log('OAuth redirect_uri:', redirectUri);
  console.log('OAuth client_id:', process.env.SECONDME_CLIENT_ID);

  const params = new URLSearchParams({
    client_id: process.env.SECONDME_CLIENT_ID || '',
    redirect_uri: redirectUri || '',
    response_type: 'code',
  });

  return `${OAUTH_URL}?${params.toString()}`;
}
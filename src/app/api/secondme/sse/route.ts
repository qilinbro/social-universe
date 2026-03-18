// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAllUsers, getAllConnections, setUserOnline } from '@/lib/neo4j';
import { onMatchEvent, MatchEvent } from '@/lib/matchService';

// SSE 客户端存储
const clients: Set<ReadableStreamDefaultController<Uint8Array>> = new Set();

// 广播事件到所有客户端
function broadcast(event: string, data: any): void {
  const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  const encoder = new TextEncoder();
  const encoded = encoder.encode(message);

  clients.forEach((controller) => {
    try {
      controller.enqueue(encoded);
    } catch (e) {
      clients.delete(controller);
    }
  });
}

// 订阅匹配事件
onMatchEvent((event: MatchEvent) => {
  broadcast(event.type, event.data);
});

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/secondme/sse - Server-Sent Events 实时推送
export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get('userId');

  // 更新在线状态
  if (userId) {
    await setUserOnline(userId, true);
  }

  const stream = new ReadableStream({
    start(controller) {
      clients.add(controller);

      // 发送连接确认
      const encoder = new TextEncoder();
      controller.enqueue(encoder.encode(`event: connected\ndata: {"status":"ok"}\n\n`));

      // 发送初始数据
      const sendInitialData = async () => {
        const users = await getAllUsers();
        const connections = await getAllConnections();

        controller.enqueue(
          encoder.encode(
            `event: initial_data\ndata: ${JSON.stringify({ users, connections })}\n\n`
          )
        );
      };

      sendInitialData().catch(console.error);

      // 心跳保活
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`));
        } catch (e) {
          clearInterval(heartbeat);
          clients.delete(controller);
        }
      }, 30000);

      // 清理
      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeat);
        clients.delete(controller);
        if (userId) {
          setUserOnline(userId, false).catch(console.error);
        }
      });
    },
    cancel() {
      // 客户端断开
    },
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}

// POST /api/secondme/sse - 用户上下线
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, action } = body;

    if (action === 'online' && userId) {
      await setUserOnline(userId, true);
      broadcast('user_online', { userId });
      return NextResponse.json({ code: 0 });
    }

    if (action === 'offline' && userId) {
      await setUserOnline(userId, false);
      broadcast('user_offline', { userId });
      return NextResponse.json({ code: 0 });
    }

    return NextResponse.json({ code: 400, message: '无效的action' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ code: 400, message: '无效的请求' }, { status: 400 });
  }
}
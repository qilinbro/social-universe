// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma, chatStream } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('auth_token')?.value;

    if (!userId) {
      return NextResponse.json({ code: 401, message: '未登录' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ code: 401, message: '用户不存在' }, { status: 401 });
    }

    // 检查 Token 是否过期
    const now = new Date();
    let accessToken = user.accessToken;

    if (user.tokenExpiresAt && user.tokenExpiresAt.getTime() < now.getTime()) {
      return NextResponse.json({ code: 401, message: '登录已过期' }, { status: 401 });
    }

    // 获取请求体
    const body = await request.json();
    const { message, agentId, sessionId } = body;

    if (!message) {
      return NextResponse.json({ code: 400, message: '消息不能为空' }, { status: 400 });
    }

    // 调用 SecondMe 流式聊天 API
    const response = await chatStream(accessToken, {
      message,
      sessionId: sessionId || `dual_${agentId}_${Date.now()}`,
      systemPrompt: agentId === 'agent2' 
        ? '你是一个友善的AI助手，与另一个AI进行对话。请给出有趣的回应。'
        : '你是一个知识渊博的AI，与另一个AI进行对话。请展示你的知识。',
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(error, { status: response.status });
    }

    // 转发流式响应
    return new NextResponse(response.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Dual chat error:', error);
    return NextResponse.json(
      { code: 500, message: '对话失败' },
      { status: 500 }
    );
  }
}

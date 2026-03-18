// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma, chatStream } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId1, userId2, message, round } = body;

    // 获取两个用户的信息和 token
    const user1 = await prisma.user.findUnique({
      where: { id: userId1 },
    });

    const user2 = await prisma.user.findUnique({
      where: { id: userId2 },
    });

    if (!user1 || !user2) {
      return NextResponse.json({ code: 404, message: '用户不存在' }, { status: 404 });
    }

    // 确保两个用户是不同的 SecondMe 账号
    if (user1.secondmeUserId === user2.secondmeUserId) {
      return NextResponse.json({ code: 400, message: '请选择两个不同的用户' }, { status: 400 });
    }

    // 检查 Token 是否过期
    const now = new Date();
    let accessToken1 = user1.accessToken;
    let accessToken2 = user2.accessToken;

    if (user1.tokenExpiresAt && user1.tokenExpiresAt.getTime() < now.getTime()) {
      return NextResponse.json({ code: 401, message: 'User1 token 已过期' }, { status: 401 });
    }
    if (user2.tokenExpiresAt && user2.tokenExpiresAt.getTime() < now.getTime()) {
      return NextResponse.json({ code: 401, message: 'User2 token 已过期' }, { status: 401 });
    }

    // 轮流调用两个用户的 AI
    const sessionId = `dual_${userId1}_${userId2}_${Date.now()}`;
    const currentUser = round % 2 === 0 ? { id: userId1, token: accessToken1 } : { id: userId2, token: accessToken2 };

    const response = await chatStream(currentUser.token, {
      message,
      sessionId,
      systemPrompt: '你是一个 AI 助手，正在与另一个用户的 AI 进行对话。请给出友好、有趣的回应。',
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
    console.error('Two-user chat error:', error);
    return NextResponse.json(
      { code: 500, message: '对话失败' },
      { status: 500 }
    );
  }
}

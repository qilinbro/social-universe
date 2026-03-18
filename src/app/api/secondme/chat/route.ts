// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma, chatStream, refreshAccessToken } from '@/lib/auth';

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
      try {
        const newTokens = await refreshAccessToken(user.refreshToken);
        accessToken = newTokens.accessToken;

        await prisma.user.update({
          where: { id: userId },
          data: {
            accessToken: newTokens.accessToken,
            refreshToken: newTokens.refreshToken,
            tokenExpiresAt: new Date(Date.now() + newTokens.expiresIn * 1000),
          },
        });
      } catch {
        return NextResponse.json({ code: 401, message: '登录已过期' }, { status: 401 });
      }
    }

    // 获取请求体
    const body = await request.json();
    const { message, sessionId, model, systemPrompt, enableWebSearch } = body;

    if (!message) {
      return NextResponse.json({ code: 400, message: '消息不能为空' }, { status: 400 });
    }

    // 调用 SecondMe 流式聊天 API
    const response = await chatStream(accessToken, {
      message,
      sessionId,
      model,
      systemPrompt,
      enableWebSearch,
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
    console.error('Chat error:', error);
    return NextResponse.json(
      { code: 500, message: '聊天失败' },
      { status: 500 }
    );
  }
}
// @ts-nocheck
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma, getUserInfo, refreshAccessToken } from '@/lib/auth';

// GET /api/secondme/user - 获取当前用户信息
export async function GET() {
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
      // Token 已过期，尝试刷新
      try {
        const newTokens = await refreshAccessToken(user.refreshToken);
        accessToken = newTokens.accessToken;

        // 更新数据库中的 Token
        await prisma.user.update({
          where: { id: userId },
          data: {
            accessToken: newTokens.accessToken,
            refreshToken: newTokens.refreshToken,
            tokenExpiresAt: new Date(Date.now() + newTokens.expiresIn * 1000),
          },
        });
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        return NextResponse.json({ code: 401, message: '登录已过期，请重新登录' }, { status: 401 });
      }
    }

    // 获取最新用户信息 (调用 SecondMe API)
    const userInfo = await getUserInfo(accessToken);

    return NextResponse.json({
      code: 0,
      data: userInfo,
    });
  } catch (err) {
    console.error('Get user info error:', err);
    return NextResponse.json({ code: 500, message: '获取用户信息失败' }, { status: 500 });
  }
}
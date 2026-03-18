// @ts-nocheck
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma, getUserShades, refreshAccessToken } from '@/lib/auth';

// GET /api/secondme/user/shades - 获取用户兴趣标签
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

    const shades = await getUserShades(accessToken);

    return NextResponse.json({
      code: 0,
      data: shades,
    });
  } catch (err) {
    console.error('Get user shades error:', err);
    return NextResponse.json({ code: 500, message: '获取兴趣标签失败' }, { status: 500 });
  }
}
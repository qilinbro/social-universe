import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { exchangeCodeForToken, getUserInfo, getUserShades, prisma } from '@/lib/auth';
import { upsertUser, setUserOnline } from '@/lib/neo4j';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/?error=${error}`);
  }

  if (!code) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/?error=no_code`);
  }

  try {
    // 用授权码换取 Token
    const tokens = await exchangeCodeForToken(code);

    // 获取用户信息
    const userInfo = await getUserInfo(tokens.accessToken);

    // 获取用户兴趣标签
    let interests: string[] = [];
    try {
      const shades = await getUserShades(tokens.accessToken);
      if (shades?.shades) {
        interests = shades.shades.map((s: any) => s.shadeNamePublic || s.shadeName);
      }
    } catch (e) {
      console.log('No shades permission or error:', e);
    }

    // 计算 Token 过期时间
    const tokenExpiresAt = new Date(Date.now() + tokens.expiresIn * 1000);

    // 保存到 Prisma (MySQL)
    const user = await prisma.user.upsert({
      where: { secondmeUserId: userInfo.userId },
      create: {
        secondmeUserId: userInfo.userId,
        email: userInfo.email,
        name: userInfo.name,
        avatarUrl: userInfo.avatar,
        route: userInfo.route,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        tokenExpiresAt,
      },
      update: {
        email: userInfo.email,
        name: userInfo.name,
        avatarUrl: userInfo.avatar,
        route: userInfo.route,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        tokenExpiresAt,
      },
    });

    // 同步到 Neo4j 图数据库
    try {
      await upsertUser({
        userId: userInfo.userId,
        name: userInfo.name,
        avatarUrl: userInfo.avatar,
        bio: userInfo.bio || userInfo.selfIntroduction || '',
        interests,
        online: true,
      });
      await setUserOnline(userInfo.userId, true);
    } catch (neo4jError) {
      console.error('Neo4j sync error:', neo4jError);
      // Neo4j 错误不影响登录流程
    }

    // 设置登录态 Cookie
    const cookieStore = await cookies();
    cookieStore.set('auth_token', user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 天
      path: '/',
    });

    // 同时存储 SecondMe userId 用于后续API调用
    cookieStore.set('secondme_user_id', userInfo.userId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}`);
  } catch (err) {
    console.error('OAuth callback error:', err);
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/?error=auth_failed`);
  }
}
// @ts-nocheck
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/auth';

// GET /api/secondme/users - 获取所有已登录用户列表
export async function GET() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        secondmeUserId: true,
        name: true,
        avatarUrl: true,
        route: true,
      },
    });

    return NextResponse.json({
      code: 0,
      data: users,
    });
  } catch (err) {
    console.error('Get users list error:', err);
    return NextResponse.json({ code: 500, message: '获取用户列表失败' }, { status: 500 });
  }
}

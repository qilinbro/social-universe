// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { runMatchForUser, runBatchMatch, getRecommendations, triggerMatchForNewUser } from '@/lib/matchService';

// POST /api/secondme/match - 运行匹配算法
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    // 需要登录
    const cookieStore = await cookies();
    const secondmeUserId = cookieStore.get('secondme_user_id')?.value;

    if (action === 'batch') {
      // 批量匹配
      const results = await runBatchMatch();
      return NextResponse.json({
        code: 0,
        data: { results, count: results.length },
      });
    }

    if (action === 'newUser' && body.user) {
      // 新用户触发匹配
      const results = await triggerMatchForNewUser(body.user);
      return NextResponse.json({
        code: 0,
        data: { results, count: results.length },
      });
    }

    if (action === 'user' && secondmeUserId) {
      // 为当前用户运行匹配
      const results = await runMatchForUser(secondmeUserId);
      return NextResponse.json({
        code: 0,
        data: { results, count: results.length },
      });
    }

    return NextResponse.json(
      { code: 400, message: '无效的请求' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error running match:', error);
    return NextResponse.json(
      { code: 500, message: '运行匹配失败' },
      { status: 500 }
    );
  }
}

// GET /api/secondme/match - 获取推荐用户
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const secondmeUserId = cookieStore.get('secondme_user_id')?.value;

    if (!secondmeUserId) {
      return NextResponse.json({ code: 401, message: '未登录' }, { status: 401 });
    }

    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '10');
    const recommendations = await getRecommendations(secondmeUserId, limit);

    return NextResponse.json({
      code: 0,
      data: { recommendations },
    });
  } catch (error) {
    console.error('Error getting recommendations:', error);
    return NextResponse.json(
      { code: 500, message: '获取推荐失败' },
      { status: 500 }
    );
  }
}
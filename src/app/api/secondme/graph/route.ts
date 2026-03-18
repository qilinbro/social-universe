// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAllUsers, getAllConnections, getGraphStats, getFriends, getOnlineUsers } from '@/lib/neo4j';

// GET /api/secondme/graph - 获取社交图谱数据
export async function GET(request: NextRequest) {
  try {
    const action = request.nextUrl.searchParams.get('action');

    // 获取当前用户
    const cookieStore = await cookies();
    const secondmeUserId = cookieStore.get('secondme_user_id')?.value;

    if (action === 'stats') {
      const stats = await getGraphStats();
      return NextResponse.json({ code: 0, data: stats });
    }

    if (action === 'friends') {
      if (!secondmeUserId) {
        return NextResponse.json({ code: 401, message: '未登录' }, { status: 401 });
      }
      const friends = await getFriends(secondmeUserId);
      return NextResponse.json({ code: 0, data: { friends } });
    }

    if (action === 'online') {
      const users = await getOnlineUsers();
      return NextResponse.json({ code: 0, data: { users } });
    }

    // 默认返回完整图谱数据
    const nodes = await getAllUsers();
    const edges = await getAllConnections();
    const stats = await getGraphStats();

    return NextResponse.json({
      code: 0,
      data: {
        nodes,
        edges,
        stats,
      },
    });
  } catch (error) {
    console.error('Error fetching graph:', error);
    return NextResponse.json(
      { code: 500, message: '获取图谱数据失败' },
      { status: 500 }
    );
  }
}
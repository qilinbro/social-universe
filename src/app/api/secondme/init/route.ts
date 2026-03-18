// @ts-nocheck
import { NextResponse } from 'next/server';
import { initDemoData } from '@/lib/neo4j';

// POST /api/secondme/init - 初始化演示数据
export async function POST() {
  try {
    await initDemoData();
    return NextResponse.json({
      code: 0,
      message: '演示数据初始化成功',
    });
  } catch (error) {
    console.error('Init demo data error:', error);
    return NextResponse.json(
      { code: 500, message: '初始化失败' },
      { status: 500 }
    );
  }
}
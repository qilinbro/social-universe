// @ts-nocheck
// Agent Auto-Match Service
import {
  UserNode,
  getAllUsers,
  calculateMatchScore,
  createFriendConnection,
  getFriends,
  getUserById,
  upsertUser,
} from './neo4j';

export interface MatchResult {
  userId1: string;
  userId2: string;
  matchScore: number;
  shouldConnect: boolean;
}

export interface MatchEvent {
  type: 'new_connection' | 'chain_reaction';
  data: {
    userId1: string;
    userId2: string;
    matchScore?: number;
  };
}

// 匹配阈值
const MATCH_THRESHOLD = 0.3;
const CHAIN_THRESHOLD = 0.5;

// 事件回调
type MatchEventCallback = (event: MatchEvent) => void;
const eventListeners: MatchEventCallback[] = [];

// 订阅匹配事件
export function onMatchEvent(callback: MatchEventCallback): () => void {
  eventListeners.push(callback);
  return () => {
    const index = eventListeners.indexOf(callback);
    if (index > -1) eventListeners.splice(index, 1);
  };
}

// 触发匹配事件
function emitMatchEvent(event: MatchEvent): void {
  eventListeners.forEach((callback) => callback(event));
}

// 为指定用户运行匹配
export async function runMatchForUser(userId: string): Promise<MatchResult[]> {
  const results: MatchResult[] = [];
  const allUsers = await getAllUsers();
  const currentUser = await getUserById(userId);

  if (!currentUser) {
    console.log(`User ${userId} not found`);
    return results;
  }

  const existingFriends = await getFriends(userId);

  for (const otherUser of allUsers) {
    if (otherUser.userId === userId || existingFriends.includes(otherUser.userId)) {
      continue;
    }

    const matchScore = await calculateMatchScore(userId, otherUser.userId);

    const result: MatchResult = {
      userId1: userId,
      userId2: otherUser.userId,
      matchScore,
      shouldConnect: matchScore >= MATCH_THRESHOLD,
    };

    if (result.shouldConnect) {
      await createFriendConnection(userId, otherUser.userId, matchScore);

      emitMatchEvent({
        type: 'new_connection',
        data: { userId1: userId, userId2: otherUser.userId, matchScore },
      });

      // 连锁匹配
      await triggerChainMatch(userId, otherUser.userId, matchScore);
    }

    results.push(result);
  }

  return results;
}

// 触发连锁匹配
async function triggerChainMatch(userId1: string, userId2: string, initialScore: number): Promise<void> {
  if (initialScore < CHAIN_THRESHOLD) return;

  const user2Friends = await getFriends(userId2);

  for (const friendId of user2Friends) {
    const friendScore = await calculateMatchScore(userId1, friendId);

    if (friendScore >= MATCH_THRESHOLD) {
      const friends = await getFriends(userId1);
      if (!friends.includes(friendId)) {
        await createFriendConnection(userId1, friendId, friendScore);

        emitMatchEvent({
          type: 'chain_reaction',
          data: { userId1, userId2: friendId, matchScore: friendScore },
        });
      }
    }
  }
}

// 批量匹配
export async function runBatchMatch(): Promise<MatchResult[]> {
  const allResults: MatchResult[] = [];
  const allUsers = await getAllUsers();

  for (const user of allUsers) {
    const results = await runMatchForUser(user.userId);
    allResults.push(...results);
  }

  return allResults;
}

// 获取推荐用户
export async function getRecommendations(userId: string, limit: number = 10): Promise<Array<{
  user: UserNode;
  predictedScore: number;
  mutualFriends: number;
}>> {
  const allUsers = await getAllUsers();
  const currentUser = await getUserById(userId);

  if (!currentUser) return [];

  const existingFriends = await getFriends(userId);
  const userFriends = await getFriends(userId);

  const recommendations: Array<{
    user: UserNode;
    predictedScore: number;
    mutualFriends: number;
  }> = [];

  for (const user of allUsers) {
    if (user.userId === userId || existingFriends.includes(user.userId)) continue;

    const score = await calculateMatchScore(userId, user.userId);
    const otherFriends = await getFriends(user.userId);
    const mutualFriends = userFriends.filter(f => otherFriends.includes(f)).length;

    if (score > 0 || mutualFriends > 0) {
      recommendations.push({
        user,
        predictedScore: score,
        mutualFriends,
      });
    }
  }

  recommendations.sort((a, b) => b.predictedScore - a.predictedScore);
  return recommendations.slice(0, limit);
}

// 新用户注册后触发匹配
export async function triggerMatchForNewUser(user: UserNode): Promise<MatchResult[]> {
  await upsertUser(user);
  return runMatchForUser(user.userId);
}

// 定时任务
let matchInterval: NodeJS.Timeout | null = null;

export function startMatchEngine(intervalMs: number = 60000): void {
  if (matchInterval) return;

  console.log(`[MatchEngine] Starting... Interval: ${intervalMs}ms`);

  matchInterval = setInterval(async () => {
    try {
      console.log(`[MatchEngine] Running batch match...`);
      await runBatchMatch();
      console.log(`[MatchEngine] Batch match completed`);
    } catch (error) {
      console.error(`[MatchEngine] Error:`, error);
    }
  }, intervalMs);
}

export function stopMatchEngine(): void {
  if (matchInterval) {
    clearInterval(matchInterval);
    matchInterval = null;
    console.log(`[MatchEngine] Stopped`);
  }
}
// @ts-nocheck
// Neo4j Database Connection and Operations (with in-memory fallback)

const NEO4J_URI = process.env.NEO4J_URI || 'bolt://localhost:7687';
const NEO4J_USER = process.env.NEO4J_USER || 'neo4j';
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || 'password';

// 尝试动态导入 neo4j-driver
let neo4j: any = null;
let driver: any = null;
let neo4jAvailable = false;

async function initNeo4j() {
  if (neo4j) return neo4j;
  try {
    neo4j = (await import('neo4j-driver')).default;
    // 测试连接
    const testDriver = neo4j.driver(NEO4J_URI, neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD));
    await testDriver.verifyConnectivity();
    driver = testDriver;
    neo4jAvailable = true;
    console.log('Neo4j connected successfully');
    return neo4j;
  } catch (e) {
    console.log('Neo4j not available, using in-memory fallback');
    neo4jAvailable = false;
    return null;
  }
}

export function getDriver(): any {
  return driver;
}

export async function closeDriver(): Promise<void> {
  if (driver) {
    await driver.close();
    driver = null;
    neo4jAvailable = false;
  }
}

// 用户节点接口
export interface UserNode {
  userId: string;
  name: string;
  avatarUrl: string;
  bio?: string;
  interests: string[];
  online?: boolean;
  createdAt?: string;
}

export interface FriendConnection {
  userId1: string;
  userId2: string;
  matchScore: number;
  createdAt: string;
}

// 内存存储（Neo4j不可用时的fallback）
const memoryUsers: Map<string, UserNode> = new Map();
const memoryConnections: Map<string, FriendConnection> = new Map();

function getConnectionKey(u1: string, u2: string): string {
  return u1 < u2 ? `${u1}-${u2}` : `${u2}-${u1}`;
}

// 创建或更新用户节点
export async function upsertUser(user: UserNode): Promise<void> {
  await initNeo4j();

  if (!neo4jAvailable || !driver) {
    memoryUsers.set(user.userId, { ...user, createdAt: user.createdAt || new Date().toISOString() });
    return;
  }

  const session = driver.session();
  try {
    await session.run(
      `MERGE (u:User {userId: $userId})
       SET u.name = $name,
           u.avatarUrl = $avatarUrl,
           u.bio = $bio,
           u.interests = $interests,
           u.online = $online,
           u.createdAt = $createdAt
       RETURN u`,
      {
        userId: user.userId,
        name: user.name,
        avatarUrl: user.avatarUrl,
        bio: user.bio || '',
        interests: JSON.stringify(user.interests),
        online: user.online || false,
        createdAt: user.createdAt || new Date().toISOString(),
      }
    );
  } finally {
    await session.close();
  }
}

// 获取用户
export async function getUserById(userId: string): Promise<UserNode | null> {
  await initNeo4j();

  if (!neo4jAvailable || !driver) {
    return memoryUsers.get(userId) || null;
  }

  const session = driver.session();
  try {
    const result = await session.run(
      `MATCH (u:User {userId: $userId}) RETURN u`,
      { userId }
    );
    if (result.records.length === 0) return null;

    const record = result.records[0].get('u');
    return {
      userId: record.properties.userId,
      name: record.properties.name,
      avatarUrl: record.properties.avatarUrl,
      bio: record.properties.bio,
      interests: JSON.parse(record.properties.interests || '[]'),
      online: record.properties.online,
      createdAt: record.properties.createdAt,
    };
  } finally {
    await session.close();
  }
}

// 获取所有用户
export async function getAllUsers(): Promise<UserNode[]> {
  await initNeo4j();

  if (!neo4jAvailable || !driver) {
    return Array.from(memoryUsers.values());
  }

  const session = driver.session();
  try {
    const result = await session.run(
      `MATCH (u:User) RETURN u ORDER BY u.createdAt DESC`
    );
    return result.records.map((record: any) => {
      const u = record.get('u').properties;
      return {
        userId: u.userId,
        name: u.name,
        avatarUrl: u.avatarUrl,
        bio: u.bio,
        interests: JSON.parse(u.interests || '[]'),
        online: u.online,
        createdAt: u.createdAt,
      };
    });
  } finally {
    await session.close();
  }
}

// 获取在线用户
export async function getOnlineUsers(): Promise<UserNode[]> {
  await initNeo4j();

  if (!neo4jAvailable || !driver) {
    return Array.from(memoryUsers.values()).filter(u => u.online);
  }

  const session = driver.session();
  try {
    const result = await session.run(
      `MATCH (u:User) WHERE u.online = true RETURN u ORDER BY u.name`
    );
    return result.records.map((record: any) => {
      const u = record.get('u').properties;
      return {
        userId: u.userId,
        name: u.name,
        avatarUrl: u.avatarUrl,
        bio: u.bio,
        interests: JSON.parse(u.interests || '[]'),
        online: u.online,
      };
    });
  } finally {
    await session.close();
  }
}

// 更新用户在线状态
export async function setUserOnline(userId: string, online: boolean): Promise<void> {
  await initNeo4j();

  if (!neo4jAvailable || !driver) {
    const user = memoryUsers.get(userId);
    if (user) memoryUsers.set(userId, { ...user, online });
    return;
  }

  const session = driver.session();
  try {
    await session.run(
      `MATCH (u:User {userId: $userId}) SET u.online = $online`,
      { userId, online }
    );
  } finally {
    await session.close();
  }
}

// 创建好友连接
export async function createFriendConnection(
  userId1: string,
  userId2: string,
  matchScore: number
): Promise<void> {
  await initNeo4j();

  const conn: FriendConnection = {
    userId1,
    userId2,
    matchScore,
    createdAt: new Date().toISOString(),
  };

  if (!neo4jAvailable || !driver) {
    memoryConnections.set(getConnectionKey(userId1, userId2), conn);
    return;
  }

  const session = driver.session();
  try {
    await session.run(
      `MATCH (u1:User {userId: $userId1}), (u2:User {userId: $userId2})
       MERGE (u1)-[r:FRIEND {userId2: $userId2}]->(u2)
       SET r.matchScore = $matchScore,
           r.createdAt = $createdAt
       MERGE (u2)-[r2:FRIEND {userId1: $userId1}]->(u1)
       SET r2.matchScore = $matchScore,
           r2.createdAt = $createdAt`,
      {
        userId1,
        userId2,
        matchScore,
        createdAt: new Date().toISOString(),
      }
    );
  } finally {
    await session.close();
  }
}

// 检查是否是好友
export async function areFriends(userId1: string, userId2: string): Promise<boolean> {
  await initNeo4j();

  if (!neo4jAvailable || !driver) {
    const key = getConnectionKey(userId1, userId2);
    return memoryConnections.has(key);
  }

  const session = driver.session();
  try {
    const result = await session.run(
      `MATCH (u1:User {userId: $userId1})-[r:FRIEND]->(u2:User {userId: $userId2})
       RETURN r`,
      { userId1, userId2 }
    );
    return result.records.length > 0;
  } finally {
    await session.close();
  }
}

// 获取用户好友列表
export async function getFriends(userId: string): Promise<string[]> {
  await initNeo4j();

  if (!neo4jAvailable || !driver) {
    const friends: string[] = [];
    memoryConnections.forEach((conn) => {
      if (conn.userId1 === userId) friends.push(conn.userId2);
      if (conn.userId2 === userId) friends.push(conn.userId1);
    });
    return friends;
  }

  const session = driver.session();
  try {
    const result = await session.run(
      `MATCH (u:User {userId: $userId})-[r:FRIEND]->(f:User)
       RETURN f.userId as friendId`,
      { userId }
    );
    return result.records.map((r: any) => r.get('friendId'));
  } finally {
    await session.close();
  }
}

// 获取所有连接（用于图谱可视化）
export async function getAllConnections(): Promise<FriendConnection[]> {
  await initNeo4j();

  if (!neo4jAvailable || !driver) {
    return Array.from(memoryConnections.values());
  }

  const session = driver.session();
  try {
    const result = await session.run(
      `MATCH (u1:User)-[r:FRIEND]->(u2:User)
       WHERE u1.userId < u2.userId
       RETURN u1.userId as userId1, u2.userId as userId2,
              r.matchScore as matchScore, r.createdAt as createdAt`
    );
    return result.records.map((r: any) => ({
      userId1: r.get('userId1'),
      userId2: r.get('userId2'),
      matchScore: r.get('matchScore'),
      createdAt: r.get('createdAt'),
    }));
  } finally {
    await session.close();
  }
}

// 计算两个用户之间的匹配度
export async function calculateMatchScore(userId1: string, userId2: string): Promise<number> {
  const user1 = await getUserById(userId1);
  const user2 = await getUserById(userId2);

  if (!user1 || !user2) return 0;

  const interests1 = new Set(user1.interests);
  const interests2 = new Set(user2.interests);

  const overlap = [...interests1].filter(x => interests2.has(x)).length;
  const union = new Set([...interests1, ...interests2]).size;

  const interestScore = union > 0 ? overlap / union : 0;

  const friends1 = await getFriends(userId1);
  const friends2 = await getFriends(userId2);
  const mutualFriends = friends1.filter(f => friends2.includes(f)).length;
  const friendScore = Math.min(mutualFriends * 0.15, 0.4);

  return Math.min(interestScore * 0.6 + friendScore, 1.0);
}

// 获取推荐好友
export async function getRecommendedFriends(userId: string, limit: number = 10): Promise<Array<{userId: string, score: number}>> {
  const allUsers = await getAllUsers();
  const existingFriends = await getFriends(userId);

  const recommendations: Array<{userId: string, score: number}> = [];

  for (const user of allUsers) {
    if (user.userId === userId || existingFriends.includes(user.userId)) continue;

    const score = await calculateMatchScore(userId, user.userId);
    if (score > 0) {
      recommendations.push({ userId: user.userId, score });
    }
  }

  recommendations.sort((a, b) => b.score - a.score);
  return recommendations.slice(0, limit);
}

// 统计
export interface GraphStats {
  totalUsers: number;
  totalConnections: number;
  averageConnections: number;
}

export async function getGraphStats(): Promise<GraphStats> {
  const users = await getAllUsers();
  const connections = await getAllConnections();

  return {
    totalUsers: users.length,
    totalConnections: connections.length,
    averageConnections: users.length > 0 ? (connections.length * 2) / users.length : 0,
  };
}

// 初始化演示数据
export async function initDemoData(): Promise<void> {
  const demoUsers: UserNode[] = [
    { userId: 'demo_1', name: '星河', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=demo1', bio: '热爱AI的探索者', interests: ['科技', 'AI', '编程'], online: true },
    { userId: 'demo_2', name: '微光', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=demo2', bio: '音乐爱好者', interests: ['音乐', '电影', '旅行'], online: true },
    { userId: 'demo_3', name: '流星', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=demo3', bio: '游戏达人', interests: ['游戏', '编程', '动漫'], online: false },
    { userId: 'demo_4', name: '星辰', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=demo4', bio: '摄影爱好者', interests: ['摄影', '旅行', '健身'], online: true },
    { userId: 'demo_5', name: 'Nova', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=demo5', bio: '阅读爱好者', interests: ['阅读', '写作', '咖啡'], online: true },
  ];

  for (const user of demoUsers) {
    await upsertUser(user);
  }

  await createFriendConnection('demo_1', 'demo_2', 0.6);
  await createFriendConnection('demo_1', 'demo_3', 0.5);
  await createFriendConnection('demo_2', 'demo_4', 0.4);
  await createFriendConnection('demo_4', 'demo_5', 0.7);
  await createFriendConnection('demo_3', 'demo_5', 0.45);
}
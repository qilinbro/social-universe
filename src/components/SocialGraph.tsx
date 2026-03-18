'use client';

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html, OrbitControls, Line, Text } from '@react-three/drei';

interface User {
  userId: string;
  name: string;
  avatarUrl: string;
  bio?: string;
  interests: string[];
  online?: boolean;
}

interface Connection {
  userId1: string;
  userId2: string;
  matchScore: number;
}

interface SocialGraphProps {
  users: User[];
  connections: Connection[];
  onUserClick?: (user: User) => void;
  currentUserId?: string;
  highlightedUserId?: string;
}

// 使用力导向布局计算节点位置
function useForceLayout(users: User[], connections: Connection[]) {
  return useMemo(() => {
    if (users.length === 0) return new Map<string, [number, number, number]>();

    // 初始化位置
    const positions = new Map<string, [number, number, number]>();
    const velocity = new Map<string, [number, number, number]>();

    users.forEach((user, i) => {
      // 球面分布
      const phi = Math.acos(-1 + (2 * i) / users.length);
      const theta = Math.sqrt(users.length * Math.PI) * phi;
      const r = 10;
      positions.set(user.userId, [
        r * Math.cos(theta) * Math.sin(phi),
        r * Math.sin(theta) * Math.sin(phi),
        r * Math.cos(phi),
      ]);
      velocity.set(user.userId, [0, 0, 0]);
    });

    // 简单的力导向模拟
    const iterations = 100;
    const repulsion = 50;
    const attraction = 0.1;
    const damping = 0.9;

    for (let iter = 0; iter < iterations; iter++) {
      const forces = new Map<string, [number, number, number]>();
      users.forEach((u) => forces.set(u.userId, [0, 0, 0]));

      // 斥力
      for (let i = 0; i < users.length; i++) {
        for (let j = i + 1; j < users.length; j++) {
          const pos1 = positions.get(users[i].userId)!;
          const pos2 = positions.get(users[j].userId)!;
          const dx = pos1[0] - pos2[0];
          const dy = pos1[1] - pos2[1];
          const dz = pos1[2] - pos2[2];
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 0.01;
          const force = repulsion / (dist * dist);

          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          const fz = (dz / dist) * force;

          const f1 = forces.get(users[i].userId)!;
          const f2 = forces.get(users[j].userId)!;
          f1[0] += fx;
          f1[1] += fy;
          f1[2] += fz;
          f2[0] -= fx;
          f2[1] -= fy;
          f2[2] -= fz;
        }
      }

      // 引力（基于连接）
      connections.forEach((conn) => {
        const pos1 = positions.get(conn.userId1);
        const pos2 = positions.get(conn.userId2);
        if (!pos1 || !pos2) return;

        const dx = pos2[0] - pos1[0];
        const dy = pos2[1] - pos1[1];
        const dz = pos2[2] - pos1[2];
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 0.01;
        const force = dist * attraction;

        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        const fz = (dz / dist) * force;

        const f1 = forces.get(conn.userId1)!;
        const f2 = forces.get(conn.userId2)!;
        f1[0] += fx;
        f1[1] += fy;
        f1[2] += fz;
        f2[0] -= fx;
        f2[1] -= fy;
        f2[2] -= fz;
      });

      // 更新位置和速度
      users.forEach((user) => {
        const pos = positions.get(user.userId)!;
        const vel = velocity.get(user.userId)!;
        const force = forces.get(user.userId)!;

        vel[0] = (vel[0] + force[0]) * damping;
        vel[1] = (vel[1] + force[1]) * damping;
        vel[2] = (vel[2] + force[2]) * damping;

        pos[0] += vel[0];
        pos[1] += vel[1];
        pos[2] += vel[2];
      });
    }

    return positions;
  }, [users, connections]);
}

// 用户节点
function UserNode3D({
  user,
  position,
  isHighlighted,
  isFriend,
  isCurrentUser,
  onClick,
}: {
  user: User;
  position: [number, number, number];
  isHighlighted: boolean;
  isFriend: boolean;
  isCurrentUser: boolean;
  onClick: () => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  // 颜色逻辑
  let color = '#4488ff';
  if (isCurrentUser) color = '#ffff00';
  else if (isHighlighted) color = '#ff8800';
  else if (isFriend) color = '#00ff88';
  else if (!user.online) color = '#666666';

  useFrame((state) => {
    if (meshRef.current) {
      const t = state.clock.getElapsedTime();
      // 悬浮时的呼吸效果
      const scale = hovered ? 1.5 : 1 + Math.sin(t * 3 + position[0]) * 0.1;
      meshRef.current.scale.setScalar(scale);

      // 自转
      meshRef.current.rotation.y += 0.01;
    }
  });

  return (
    <group position={position}>
      {/* 外发光 */}
      <mesh>
        <sphereGeometry args={[0.6, 16, 16]} />
        <meshBasicMaterial color={color} transparent opacity={0.2} />
      </mesh>

      {/* 核心节点 */}
      <mesh
        ref={meshRef}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = 'auto';
        }}
      >
        <octahedronGeometry args={[0.3, 0]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={hovered ? 2 : 1}
          metalness={0.9}
          roughness={0.1}
        />
      </mesh>

      {/* 头像 */}
      <Html position={[0, 0.5, 0]} center distanceFactor={15}>
        <div className="flex flex-col items-center">
          <div
            className="w-10 h-10 rounded-full border-2 overflow-hidden"
            style={{ borderColor: color, boxShadow: `0 0 10px ${color}` }}
          >
            <img
              src={user.avatarUrl}
              alt={user.name}
              className="w-full h-full object-cover"
            />
          </div>
          <div
            className="mt-1 px-2 py-0.5 text-xs rounded whitespace-nowrap"
            style={{ backgroundColor: `${color}80`, color: '#fff' }}
          >
            {user.name}
          </div>
        </div>
      </Html>
    </group>
  );
}

// 连线
function Connection3D({
  start,
  end,
  matchScore,
  isHighlighted,
}: {
  start: [number, number, number];
  end: [number, number, number];
  matchScore: number;
  isHighlighted: boolean;
}) {
  const points = useMemo(() => [start, end], [start, end]);

  const color = isHighlighted
    ? '#ffff00'
    : matchScore > 0.7
    ? '#ff8800'
    : matchScore > 0.4
    ? '#00aaff'
    : '#333355';

  const opacity = isHighlighted ? 1 : matchScore > 0.5 ? 0.8 : 0.3;

  return (
    <Line
      points={points}
      color={color}
      lineWidth={2}
      transparent
      opacity={opacity}
    />
  );
}

// 主场景
function GraphScene({
  users,
  connections,
  onUserClick,
  currentUserId,
  highlightedUserId,
}: {
  users: User[];
  connections: Connection[];
  onUserClick?: (user: User) => void;
  currentUserId?: string;
  highlightedUserId?: string;
}) {
  const positions = useForceLayout(users, connections);

  // 获取当前用户的朋友
  const friends = useMemo(() => {
    const set = new Set<string>();
    connections.forEach((c) => {
      if (c.userId1 === currentUserId) set.add(c.userId2);
      if (c.userId2 === currentUserId) set.add(c.userId1);
    });
    return set;
  }, [connections, currentUserId]);

  // 获取高亮连接
  const highlightedConnections = useMemo(() => {
    const set = new Set<string>();
    if (highlightedUserId) {
      connections.forEach((c) => {
        if (c.userId1 === highlightedUserId || c.userId2 === highlightedUserId) {
          set.add(`${c.userId1}-${c.userId2}`);
          set.add(`${c.userId2}-${c.userId1}`);
        }
      });
    }
    return set;
  }, [connections, highlightedUserId]);

  return (
    <>
      {/* 连接线 */}
      {connections.map((conn, i) => {
        const start = positions.get(conn.userId1);
        const end = positions.get(conn.userId2);
        if (!start || !end) return null;

        return (
          <Connection3D
            key={`conn-${i}`}
            start={start}
            end={end}
            matchScore={conn.matchScore}
            isHighlighted={
              highlightedUserId
                ? conn.userId1 === highlightedUserId || conn.userId2 === highlightedUserId
                : false
            }
          />
        );
      })}

      {/* 用户节点 */}
      {users.map((user) => {
        const pos = positions.get(user.userId);
        if (!pos) return null;

        return (
          <UserNode3D
            key={user.userId}
            user={user}
            position={pos}
            isHighlighted={highlightedUserId === user.userId}
            isFriend={friends.has(user.userId)}
            isCurrentUser={user.userId === currentUserId}
            onClick={() => onUserClick?.(user)}
          />
        );
      })}
    </>
  );
}

export default function SocialGraph({
  users,
  connections,
  onUserClick,
  currentUserId,
  highlightedUserId,
}: SocialGraphProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // 防止水合不匹配：Canvas 在客户端挂载后才渲染
  if (!isMounted) {
    return <div className="w-full h-full bg-black" />;
  }

  return (
    <div className="w-full h-full">
      <Canvas
        camera={{ position: [0, 0, 25], fov: 60 }}
        style={{ background: 'linear-gradient(180deg, #0a0a1a 0%, #1a1a3a 100%)' }}
      >
        <ambientLight intensity={0.4} />
        <pointLight position={[20, 20, 20]} intensity={1} color="#ffffff" />
        <pointLight position={[-20, -20, -20]} intensity={0.5} color="#4444ff" />

        <GraphScene
          users={users}
          connections={connections}
          onUserClick={onUserClick}
          currentUserId={currentUserId}
          highlightedUserId={highlightedUserId}
        />

        <OrbitControls
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          autoRotate
          autoRotateSpeed={0.5}
        />
      </Canvas>
    </div>
  );
}
'use client';

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html, Text, Float, Line } from '@react-three/drei';

interface User {
  userId: string;
  name: string;
  avatarUrl: string;
  bio?: string;
  interests: string[];
  online?: boolean;
  position?: [number, number, number];
}

interface Connection {
  userId1: string;
  userId2: string;
  matchScore: number;
}

interface AvatarHallProps {
  users: User[];
  connections: Connection[];
  onUserClick?: (user: User) => void;
  currentUserId?: string;
}

// 头像节点组件
function AvatarNode({
  user,
  isSelected,
  isFriend,
  onClick,
}: {
  user: User;
  isSelected: boolean;
  isFriend: boolean;
  onClick: () => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  // 颜色根据状态变化
  const baseColor = user.online ? '#00ff88' : '#666666';
  const glowColor = isSelected ? '#ffff00' : isFriend ? '#00aaff' : baseColor;
  const emissiveIntensity = hovered ? 1.5 : isSelected ? 1 : 0.3;

  useFrame((state) => {
    if (meshRef.current) {
      // 脉冲效果
      const pulse = Math.sin(state.clock.getElapsedTime() * 2) * 0.1 + 1;
      meshRef.current.scale.setScalar(hovered ? 1.3 : pulse);
    }
  });

  return (
    <Float speed={2} rotationIntensity={0.2} floatIntensity={0.5}>
      <group position={user.position || [0, 0, 0]}>
        {/* 光晕 */}
        <mesh>
          <sphereGeometry args={[1.2, 32, 32]} />
          <meshBasicMaterial
            color={glowColor}
            transparent
            opacity={0.15}
            side={THREE.BackSide}
          />
        </mesh>

        {/* 头像主体 */}
        <mesh
          ref={meshRef}
          onClick={onClick}
          onPointerOver={() => setHovered(true)}
          onPointerOut={() => setHovered(false)}
        >
          <sphereGeometry args={[0.8, 32, 32]} />
          <meshStandardMaterial
            color={glowColor}
            emissive={glowColor}
            emissiveIntensity={emissiveIntensity}
            metalness={0.8}
            roughness={0.2}
          />
        </mesh>

        {/* 头像图片纹理 - 使用 Html 组件 */}
        <Html
          position={[0, 0, 0.9]}
          center
          distanceFactor={10}
          style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            overflow: 'hidden',
            border: `2px solid ${glowColor}`,
            boxShadow: `0 0 10px ${glowColor}`,
          }}
        >
          <img
            src={user.avatarUrl}
            alt={user.name}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        </Html>

        {/* 用户名 */}
        {hovered && (
          <Text
            position={[0, -1.5, 0]}
            fontSize={0.4}
            color="white"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.02}
            outlineColor="#000000"
          >
            {user.name}
          </Text>
        )}

        {/* 在线状态指示器 */}
        {user.online && (
          <mesh position={[0.6, 0.6, 0.6]}>
            <sphereGeometry args={[0.15, 16, 16]} />
            <meshBasicMaterial color="#00ff88" />
          </mesh>
        )}
      </group>
    </Float>
  );
}

// 连接线组件
function ConnectionLine({
  start,
  end,
  matchScore,
}: {
  start: [number, number, number];
  end: [number, number, number];
  matchScore: number;
}) {
  const points = useMemo(() => [start, end], [start, end]);
  const color = matchScore > 0.7 ? '#ffff00' : matchScore > 0.4 ? '#00aaff' : '#444444';
  const opacity = matchScore > 0.5 ? 0.8 : 0.3;

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

// 3D场景
function Scene({
  users,
  connections,
  onUserClick,
  currentUserId,
  selectedUserId,
}: {
  users: User[];
  connections: Connection[];
  onUserClick?: (user: User) => void;
  currentUserId?: string;
  selectedUserId?: string;
}) {
  const { camera, controls } = useThree();

  // 计算用户位置（在球面上分布）
  const positionedUsers = useMemo(() => {
    const radius = 15;
    return users.map((user, i) => {
      const phi = Math.acos(-1 + (2 * i) / users.length);
      const theta = Math.sqrt(users.length * Math.PI) * phi;
      return {
        ...user,
        position: [
          radius * Math.cos(theta) * Math.sin(phi),
          radius * Math.sin(theta) * Math.sin(phi),
          radius * Math.cos(phi),
        ] as [number, number, number],
      };
    });
  }, [users]);

  // 获取用户位置映射
  const userPositionMap = useMemo(() => {
    const map = new Map<string, [number, number, number]>();
    positionedUsers.forEach((u) => {
      if (u.position) map.set(u.userId, u.position);
    });
    return map;
  }, [positionedUsers]);

  // 相机控制
  useFrame(() => {
    // 缓慢旋转相机
    const t = Date.now() * 0.0001;
    camera.position.x = Math.sin(t) * 5;
    camera.position.z = Math.cos(t) * 5;
    camera.lookAt(0, 0, 0);
  });

  // 收集当前用户的朋友
  const friends = useMemo(() => {
    const friendSet = new Set<string>();
    connections.forEach((conn) => {
      if (conn.userId1 === currentUserId) friendSet.add(conn.userId2);
      if (conn.userId2 === currentUserId) friendSet.add(conn.userId1);
    });
    return friendSet;
  }, [connections, currentUserId]);

  return (
    <>
      {/* 连接线 */}
      {connections.map((conn, i) => {
        const start = userPositionMap.get(conn.userId1);
        const end = userPositionMap.get(conn.userId2);
        if (!start || !end) return null;
        return (
          <ConnectionLine
            key={`conn-${i}`}
            start={start}
            end={end}
            matchScore={conn.matchScore}
          />
        );
      })}

      {/* 头像节点 */}
      {positionedUsers.map((user) => (
        <AvatarNode
          key={user.userId}
          user={user}
          isSelected={selectedUserId === user.userId}
          isFriend={friends.has(user.userId)}
          onClick={() => onUserClick?.(user)}
        />
      ))}
    </>
  );
}

export default function AvatarHall({
  users,
  connections,
  onUserClick,
  currentUserId,
}: AvatarHallProps) {
  const [selectedUserId, setSelectedUserId] = useState<string | undefined>();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleUserClick = useCallback(
    (user: User) => {
      setSelectedUserId(user.userId);
      onUserClick?.(user);
    },
    [onUserClick]
  );

  // 防止水合不匹配：Canvas 在客户端挂载后才渲染
  if (!isMounted) {
    return <div className="w-full h-full bg-black" />;
  }

  return (
    <div className="w-full h-full relative">
      <Canvas camera={{ position: [0, 0, 30], fov: 60 }}>
        <ambientLight intensity={0.3} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <pointLight position={[-10, -10, -10]} intensity={0.5} color="#4444ff" />

        <Scene
          users={users}
          connections={connections}
          onUserClick={handleUserClick}
          currentUserId={currentUserId}
          selectedUserId={selectedUserId}
        />
      </Canvas>

      {/* 图例 */}
      <div className="absolute bottom-4 left-4 bg-black/50 backdrop-blur-md rounded-lg p-4 text-white">
        <h4 className="text-sm font-bold mb-2">图例</h4>
        <div className="flex flex-col gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#00ff88]"></span>
            在线
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#666666]"></span>
            离线
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#00aaff]"></span>
            已连接
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#ffff00]"></span>
            选中
          </div>
        </div>
      </div>
    </div>
  );
}
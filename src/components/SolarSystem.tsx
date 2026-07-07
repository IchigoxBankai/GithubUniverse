import React, { useRef, useState, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars, Html } from '@react-three/drei';
import * as THREE from 'three';
import type { GitHubRepo, GitHubUser } from '../services/github';


// Custom language colors mapping
export const LANGUAGE_COLORS: Record<string, string> = {
  JavaScript: '#f1e05a',
  TypeScript: '#3178c6',
  Python: '#3572A5',
  Java: '#b07219',
  Go: '#00ADD8',
  Rust: '#dee5e7',
  'C++': '#f34b7d',
  C: '#555555',
  HTML: '#e34c26',
  CSS: '#563d7c',
  Ruby: '#701516',
  PHP: '#4F5D95',
  Swift: '#F05138',
  Kotlin: '#A97BFF',
  Dart: '#00B4AB',
  Shell: '#89e051',
  Vue: '#41B883',
  React: '#61dafb',
};

export function getLanguageColor(lang: string | null): string {
  if (!lang) return '#8b5cf6'; // Violet fallback
  return LANGUAGE_COLORS[lang] || `#${Math.floor(Math.random()*16777215).toString(16)}`;
}

// 1. Camera Controller to smoothly pan/zoom to selected planet or reset to center
interface CameraControllerProps {
  selectedRepo: GitHubRepo | null;
  planetsData: Array<{ repo: GitHubRepo; radius: number; angle: number }>;
}

function CameraController({ selectedRepo, planetsData }: CameraControllerProps) {
  const { camera } = useThree();
  const targetLookAt = useRef(new THREE.Vector3(0, 0, 0));
  const currentLookAt = useRef(new THREE.Vector3(0, 0, 0));

  useFrame((state) => {
    let targetX = 0;
    let targetY = 12;
    let targetZ = 24;

    if (selectedRepo) {
      // Find current position of the selected repository planet
      const pData = planetsData.find((p) => p.repo.id === selectedRepo.id);
      if (pData) {
        // Approximate current orbital position based on elapsed time
        const time = state.clock.getElapsedTime();
        const speed = Math.max(0.1, 3 / Math.sqrt(pData.radius)) * (1 + Math.min(2, pData.repo.forks_count / 10));
        const currentAngle = pData.angle + time * speed * 0.1;
        const planetX = Math.cos(currentAngle) * pData.radius;
        const planetZ = Math.sin(currentAngle) * pData.radius;

        targetX = planetX;
        targetY = 2; // Look slightly from above
        targetZ = planetZ + 4; // Zoom close

        targetLookAt.current.set(planetX, 0, planetZ);
      }
    } else {
      // Reset to sun view
      targetX = 0;
      targetY = 14;
      targetZ = 28;
      targetLookAt.current.set(0, 0, 0);
    }

    // Smoothly interpolate camera position
    camera.position.x = THREE.MathUtils.lerp(camera.position.x, targetX, 0.05);
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, targetY, 0.05);
    camera.position.z = THREE.MathUtils.lerp(camera.position.z, targetZ, 0.05);

    // Smoothly interpolate lookAt target
    currentLookAt.current.lerp(targetLookAt.current, 0.05);
    camera.lookAt(currentLookAt.current);
  });

  return null;
}

// 2. Planet Component (Orbiting Repository)
interface PlanetProps {
  repo: GitHubRepo;
  radius: number;
  initialAngle: number;
  isSelected: boolean;
  onSelect: (repo: GitHubRepo) => void;
}

function Planet({ repo, radius, initialAngle, isSelected, onSelect }: PlanetProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  // Size mapping (log scale of repository size in KB)
  const size = useMemo(() => {
    const baseSize = Math.log10(repo.size || 10) * 0.25;
    return Math.max(0.2, Math.min(1.8, baseSize));
  }, [repo.size]);

  // Orbit speed based on pushes/updates activity (time since pushed_at)
  const speed = useMemo(() => {
    const baseSpeed = Math.max(0.1, 3 / Math.sqrt(radius));
    const hoursSincePush = (Date.now() - new Date(repo.pushed_at).getTime()) / (1000 * 60 * 60);
    // Active if pushed within last 48 hours
    const activityMultiplier = hoursSincePush < 48 ? 2.5 : hoursSincePush < 168 ? 1.5 : 0.8;
    return baseSpeed * activityMultiplier * 0.08;
  }, [radius, repo.pushed_at]);

  // Moons representation (stars count, up to 5 moons for clarity)
  const moonsCount = Math.min(5, repo.stargazers_count);
  const moonPositions = useMemo(() => {
    const list = [];
    for (let i = 0; i < moonsCount; i++) {
      const angle = (i / moonsCount) * Math.PI * 2;
      const dist = size + 0.3 + Math.random() * 0.1;
      list.push({ angle, dist });
    }
    return list;
  }, [moonsCount, size]);

  // Orbit ring calculations
  useFrame((state) => {
    if (meshRef.current) {
      const time = state.clock.getElapsedTime();
      // Rotation around the Sun
      const currentAngle = initialAngle + time * speed;
      meshRef.current.position.x = Math.cos(currentAngle) * radius;
      meshRef.current.position.z = Math.sin(currentAngle) * radius;

      // Spin planet on its own axis
      meshRef.current.rotation.y += 0.01;
    }
  });

  const languageColor = getLanguageColor(repo.language);

  // Adjust cursor on hover
  React.useEffect(() => {
    document.body.style.cursor = hovered ? 'pointer' : 'auto';
    return () => {
      document.body.style.cursor = 'auto';
    };
  }, [hovered]);

  return (
    <group>
      {/* 3. Orbit path line */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[radius - 0.02, radius + 0.02, 64]} />
        <meshBasicMaterial
          color="#3b3b4f"
          transparent
          opacity={isSelected ? 0.4 : hovered ? 0.25 : 0.12}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Planet Mesh */}
      <mesh
        ref={meshRef}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(repo);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          setHovered(false);
        }}
      >
        <sphereGeometry args={[size * (hovered || isSelected ? 1.15 : 1.0), 32, 32]} />
        <meshStandardMaterial
          color={languageColor}
          roughness={0.2}
          metalness={0.1}
          emissive={languageColor}
          emissiveIntensity={isSelected ? 0.7 : hovered ? 0.4 : 0.15}
        />

        {/* Rings representing Forks count */}
        {repo.forks_count > 0 && (
          <mesh rotation={[Math.PI / 2.3, 0, 0]}>
            <ringGeometry args={[size * 1.3, size * (1.4 + Math.min(1.0, repo.forks_count / 100)), 32]} />
            <meshStandardMaterial
              color={languageColor}
              transparent
              opacity={0.4}
              side={THREE.DoubleSide}
            />
          </mesh>
        )}

        {/* Star Moons */}
        {moonPositions.map((moon, index) => (
          <mesh
            key={index}
            position={[
              Math.cos(moon.angle) * moon.dist,
              Math.sin(moon.angle) * 0.1,
              Math.sin(moon.angle) * moon.dist,
            ]}
          >
            <sphereGeometry args={[0.06, 8, 8]} />
            <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={0.6} />
          </mesh>
        ))}

        {/* Hover/Selection HTML Tag */}
        {(hovered || isSelected) && (
          <Html distanceFactor={12} position={[0, size + 0.6, 0]} center>
            <div className="px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap bg-gray-950/90 border border-gray-800 text-white shadow-xl pointer-events-none select-none">
              <span className="text-gray-400 font-normal">{repo.language || 'Plain'}</span> • {repo.name}
            </div>
          </Html>
        )}
      </mesh>
    </group>
  );
}

// 4. Glowing Sun (The User Profile)
interface SunProps {
  user: GitHubUser;
  onClick: () => void;
}

function Sun({ user, onClick }: SunProps) {
  const sunRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  useFrame(() => {
    if (sunRef.current) {
      sunRef.current.rotation.y += 0.003;
    }
  });

  return (
    <group>
      {/* Outer Atmosphere Glow */}
      <mesh
        ref={sunRef}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <sphereGeometry args={[2.2, 32, 32]} />
        <meshStandardMaterial
          color="#ff7b00"
          emissive="#ff5100"
          emissiveIntensity={hovered ? 2.5 : 1.8}
        />
        
        {/* Core point light */}
        <pointLight intensity={3.5} distance={150} decay={1.5} color="#ff7b00" />

        {/* Sun Tag */}
        <Html distanceFactor={15} position={[0, 3.2, 0]} center>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-950/95 border border-orange-500/50 shadow-2xl backdrop-blur-md cursor-pointer select-none">
            <img src={user.avatar_url} alt="" className="w-5 h-5 rounded-full border border-orange-400/40" />
            <span className="text-xs font-bold text-orange-200 whitespace-nowrap">{user.name || user.login}</span>
          </div>
        </Html>
      </mesh>

      {/* Sun glow effect geometry */}
      <mesh>
        <sphereGeometry args={[2.5, 16, 16]} />
        <meshBasicMaterial color="#ff5100" transparent opacity={0.12} side={THREE.BackSide} />
      </mesh>
    </group>
  );
}

// 5. Main Solar System Renderer
interface SolarSystemProps {
  user: GitHubUser;
  repos: GitHubRepo[];
  selectedRepo: GitHubRepo | null;
  onSelectRepo: (repo: GitHubRepo | null) => void;
}

export function SolarSystem({ user, repos, selectedRepo, onSelectRepo }: SolarSystemProps) {
  // Sort repositories by age (created_at) to establish clean orbits
  const sortedRepos = useMemo(() => {
    return [...repos].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }, [repos]);

  // Memoize orbit calculations: index * radiusStep
  const planetsData = useMemo(() => {
    return sortedRepos.map((repo, index) => {
      // Space orbits starting from 6 units out, spaced by 1.8 units
      const radius = 6.5 + index * 1.65;
      const angle = (index * 137.5 * Math.PI) / 180; // Sunflower seed pattern distribution
      return { repo, radius, angle };
    });
  }, [sortedRepos]);

  return (
    <div className="w-full h-full relative bg-[#010103]">
      <Canvas
        camera={{ position: [0, 14, 28], fov: 60 }}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}
      >
        <ambientLight intensity={0.4} />
        {/* Fill directional light from above */}
        <directionalLight position={[10, 20, 10]} intensity={0.6} />

        {/* Glowing Sun center */}
        <Sun user={user} onClick={() => onSelectRepo(null)} />

        {/* Orbiting Repos */}
        {planetsData.map((p) => (
          <Planet
            key={p.repo.id}
            repo={p.repo}
            radius={p.radius}
            initialAngle={p.angle}
            isSelected={selectedRepo?.id === p.repo.id}
            onSelect={onSelectRepo}
          />
        ))}

        {/* Custom controller for zoom lerping */}
        <CameraController selectedRepo={selectedRepo} planetsData={planetsData} />

        {/* SpaceX Starfield background */}
        <Stars radius={120} depth={50} count={3500} factor={4} saturation={0.5} fade speed={1.5} />

        <OrbitControls
          enableDamping
          dampingFactor={0.05}
          maxDistance={120}
          minDistance={4}
          makeDefault
        />
      </Canvas>

      {/* Floating Camera Reset Info */}
      {selectedRepo && (
        <button
          onClick={() => onSelectRepo(null)}
          className="absolute bottom-4 right-4 z-10 px-4 py-2 text-xs font-semibold uppercase tracking-wider rounded-lg glass-panel text-orange-200 border-orange-500/30 hover:border-orange-500/60 active:scale-95 transition-all shadow-lg"
        >
          Reset View
        </button>
      )}
    </div>
  );
}

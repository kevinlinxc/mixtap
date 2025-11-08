"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Canvas, useFrame } from "@react-three/fiber";
import { RoundedBox, Sphere, Torus, Cone, Octahedron, Icosahedron } from "@react-three/drei";
import * as THREE from "three";

// Selected Phone Styles - one will be randomly chosen on load
const PHONE_STYLES = [
    { name: "Rose Gold Luxe", body: "#b76e79", screen: "#1a1a1a", bezel: "#9d5a65", buttons: "#a5636f", logo: { type: "octahedron", color: "#ec4899", glow: true }, island: { show: false, color: "#f5f5f5" }, screenGlow: "#ec4899" },
    { name: "Amethyst Pro", body: "#6b46c1", screen: "#000000", bezel: "#553c9a", buttons: "#5a3d8a", logo: { type: "cone", color: "#c084fc", glow: true }, island: { show: true, color: "#f5f5f5" }, screenGlow: "#a855f7" },
    { name: "24K Gold", body: "#d4af37", screen: "#1a1a1a", bezel: "#b8922f", buttons: "#c29f33", logo: { type: "torus", color: "#fbbf24", glow: true }, island: { show: true, color: "#ffffff" }, screenGlow: null },
    { name: "Emerald Dream", body: "#059669", screen: "#0a0a0a", bezel: "#047857", buttons: "#05825f", logo: { type: "sphere", color: "#6ee7b7", glow: true }, island: { show: false, color: "#ffffff" }, screenGlow: "#10b981" },
    { name: "Crimson Edition", body: "#b91c1c", screen: "#000000", bezel: "#991b1b", buttons: "#a71d1d", logo: { type: "icosahedron", color: "#fca5a5", glow: true }, island: { show: true, color: "#ffffff" }, screenGlow: "#ef4444" },
];

function Phone3D({ mousePos, isNear, style }: { mousePos: { x: number; y: number }; isNear: boolean; style: typeof PHONE_STYLES[0] }) {
    const phoneRef = useRef<THREE.Group>(null);
    const logoRef = useRef<THREE.Group>(null);
    const bezelRef = useRef<THREE.Mesh>(null);

    useFrame(({ clock }) => {
        if (phoneRef.current) {
            phoneRef.current.rotation.y = THREE.MathUtils.lerp(phoneRef.current.rotation.y, mousePos.x * 0.0015, 0.05);
            phoneRef.current.rotation.x = THREE.MathUtils.lerp(phoneRef.current.rotation.x, mousePos.y * 0.001, 0.05);
            phoneRef.current.position.x = THREE.MathUtils.lerp(phoneRef.current.position.x, mousePos.x * 0.005, 0.05);
            phoneRef.current.position.y = THREE.MathUtils.lerp(phoneRef.current.position.y, -mousePos.y * 0.003, 0.05);
        }
        if (logoRef.current) {
            logoRef.current.rotation.y = clock.getElapsedTime() * 0.5;
            logoRef.current.position.z = 0.11 + Math.sin(clock.getElapsedTime() * 2) * 0.02;
        }
        // Shimmer effect on bezel when near Spotify logo
        if (bezelRef.current) {
            const targetHeight = isNear ? 4.17 : 4.18;
            const currentScale = bezelRef.current.scale.y;
            const newScale = THREE.MathUtils.lerp(currentScale, targetHeight / 4.18, 0.1);
            bezelRef.current.scale.y = newScale;
        }
    });

    return (
        <group ref={phoneRef} scale={0.7}>
            {/* Phone Body */}
            <RoundedBox args={[2, 4.3, 0.15]} radius={0.28} smoothness={2}>
                <meshBasicMaterial color={style.body} />
            </RoundedBox>
            {/* Bezel */}
            <RoundedBox ref={bezelRef} args={[1.88, 4.18, 0.3]} radius={0.24} smoothness={2} position={[0, 0, 0.04]}>
                <meshBasicMaterial color={style.bezel} />
            </RoundedBox>
            {/* Screen */}
            <RoundedBox args={[1.88, 4.18, 0.3]} radius={0.24} smoothness={2} position={[0, 0, 0.04]}>
                <meshBasicMaterial color={style.screen} />
            </RoundedBox>
            {style.screenGlow && (
                <RoundedBox args={[1.88, 4.18, 0.2]} radius={0.24} smoothness={2} position={[0, 0, 0.04]}>
                    <meshBasicMaterial color={style.screenGlow} opacity={0.15} transparent />
                </RoundedBox>
            )}
            {style.island.show && (
                <RoundedBox args={[0.5, 0.12, 0.05]} radius={0.06} smoothness={2} position={[0, 1.89, 0.17]}>
                    <meshBasicMaterial color={style.island.color} />
                </RoundedBox>
            )}
            {/* Camera Bump */}
            <RoundedBox args={[0.35, 0.35, 0.04]} radius={0.08} smoothness={2} position={[-0.65, 1.6, -0.08]}>
                <meshBasicMaterial color={style.body} />
            </RoundedBox>
            <mesh position={[-0.72, 1.7, -0.05]}>
                <cylinderGeometry args={[0.06, 0.06, 0.03, 16]} />
                <meshBasicMaterial color="#1a1a1a" />
            </mesh>
            <mesh position={[-0.58, 1.7, -0.05]}>
                <cylinderGeometry args={[0.06, 0.06, 0.03, 16]} />
                <meshBasicMaterial color="#1a1a1a" />
            </mesh>
            <mesh position={[-0.72, 1.5, -0.05]}>
                <cylinderGeometry args={[0.06, 0.06, 0.03, 16]} />
                <meshBasicMaterial color="#1a1a1a" />
            </mesh>
            {/* Side Buttons */}
            <RoundedBox args={[0.025, 0.3, 0.08]} radius={0.01} smoothness={1} position={[-1.01, 0.5, 0]}>
                <meshBasicMaterial color={style.buttons} />
            </RoundedBox>
            <RoundedBox args={[0.025, 0.15, 0.08]} radius={0.01} smoothness={1} position={[-1.01, 0, 0]}>
                <meshBasicMaterial color={style.buttons} />
            </RoundedBox>
            <RoundedBox args={[0.025, 0.15, 0.08]} radius={0.01} smoothness={1} position={[-1.01, -0.25, 0]}>
                <meshBasicMaterial color={style.buttons} />
            </RoundedBox>
            <RoundedBox args={[0.025, 0.5, 0.08]} radius={0.01} smoothness={1} position={[1.01, 0.3, 0]}>
                <meshBasicMaterial color={style.buttons} />
            </RoundedBox>
            <group ref={logoRef} position={[0, -1.2, 1.51]}>
                {style.logo.glow && (
                    <mesh>
                        <sphereGeometry args={[0.35, 32, 32]} />
                        <meshBasicMaterial color={style.logo.color} opacity={0.15} transparent />
                    </mesh>
                )}
                {style.logo.type === "sphere" && (
                    <Sphere args={[0.22, 32, 32]}>
                        <meshBasicMaterial color={style.logo.color} />
                    </Sphere>
                )}
                {style.logo.type === "torus" && (
                    <Torus args={[0.18, 0.06, 16, 32]}>
                        <meshBasicMaterial color={style.logo.color} />
                    </Torus>
                )}
                {style.logo.type === "octahedron" && (
                    <Octahedron args={[0.25]}>
                        <meshBasicMaterial color={style.logo.color} />
                    </Octahedron>
                )}
                {style.logo.type === "icosahedron" && (
                    <Icosahedron args={[0.22]}>
                        <meshBasicMaterial color={style.logo.color} />
                    </Icosahedron>
                )}
                {style.logo.type === "cone" && (
                    <Cone args={[0.2, 0.35, 32]}>
                        <meshBasicMaterial color={style.logo.color} />
                    </Cone>
                )}
            </group>
        </group>
    );
}

export default function Landing() {
    const router = useRouter();
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const [isNear, setIsNear] = useState(false);
    const [holdProgress, setHoldProgress] = useState(0);
    const [isMouseInBounds, setIsMouseInBounds] = useState(true);
    const [currentStyleIndex] = useState(() => Math.floor(Math.random() * PHONE_STYLES.length));
    const [isUnlocked, setIsUnlocked] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!containerRef.current) return;
            const rect = containerRef.current.getBoundingClientRect();
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            const mouseXRatio = (e.clientX - rect.left) / rect.width;
            const mouseYRatio = (e.clientY - rect.top) / rect.height;
            // Very forgiving bounds - only snap back at extreme edges
            const inBounds = mouseXRatio >= 0.3 && mouseXRatio <= 0.7 && mouseYRatio >= 0.02 && mouseYRatio <= 0.98;
            setIsMouseInBounds(inBounds);
            if (!inBounds) {
                setMousePos({ x: 0, y: 0 });
                setIsNear(false);
                return;
            }
            const x = (e.clientX - rect.left - centerX);
            const y = (e.clientY - rect.top - centerY);
            setMousePos({ x, y });
            const logoY = -centerY + 150;
            const dx = x - 0;
            const dy = y - logoY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            setIsNear(distance < 80);
        };
        window.addEventListener("mousemove", handleMouseMove);
        return () => window.removeEventListener("mousemove", handleMouseMove);
    }, []);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isNear && !isUnlocked) {
            interval = setInterval(() => {
                setHoldProgress((prev) => {
                    const next = prev + 2;
                    if (next >= 100) {
                        setIsUnlocked(true);
                        return 100;
                    }
                    return next;
                });
            }, 20);
        } else {
            setHoldProgress(0);
        }
        return () => clearInterval(interval);
    }, [isNear, isUnlocked]);

    useEffect(() => {
        if (isUnlocked) {
            router.push("/main");
        }
    }, [isUnlocked, router]);

    return (
        <div ref={containerRef} className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-black via-zinc-950 to-black">
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:4rem_4rem]" />
            <div className="absolute left-1/2 top-[150px] z-10 -translate-x-1/2">
                <div className="relative">
                    {isNear && (
                        <>
                            <div className="absolute inset-0 -m-8 animate-ping rounded-full bg-green-500/20" />
                            <div className="absolute inset-0 -m-12 animate-pulse rounded-full bg-green-500/10" style={{ animationDelay: "0.2s" }} />
                            <div className="absolute inset-0 -m-16 animate-pulse rounded-full bg-green-500/5" style={{ animationDelay: "0.4s" }} />
                        </>
                    )}
                    <div className="relative flex h-32 w-32 items-center justify-center rounded-full bg-black shadow-2xl shadow-green-500/50 ring-4 ring-green-500">
                        <svg className="h-16 w-16 text-green-500" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
                        </svg>
                    </div>
                    {holdProgress > 0 && (
                        <svg className="absolute -inset-2 h-36 w-36 -rotate-90" viewBox="0 0 144 144">
                            <circle cx="72" cy="72" r="68" fill="none" stroke="currentColor" strokeWidth="4" className="text-green-500" strokeDasharray={`${(holdProgress / 100) * 427} 427`} strokeLinecap="round" />
                        </svg>
                    )}
                </div>
            </div>
            <div className="pointer-events-none absolute inset-0 z-20">
                <Canvas camera={{ position: [0, 0, 8], fov: 50 }} style={{ background: "transparent" }} gl={{ antialias: true }}>
                    <ambientLight intensity={1.5} />
                    <Phone3D mousePos={mousePos} isNear={isNear} style={PHONE_STYLES[currentStyleIndex]} />
                </Canvas>
            </div>
            <div className="absolute bottom-12 left-1/2 z-30 -translate-x-1/2 text-center">
                <p className="text-sm text-zinc-400">
                    {isNear ? "Hold near the Spotify logo to unlock..." : isMouseInBounds ? "Move your phone to the top to reach the Spotify logo" : "Move your mouse back to the screen"}
                </p>
            </div>
        </div>
    );
}

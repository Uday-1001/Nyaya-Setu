import { useEffect, useState } from "react";

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  opacity: number;
  duration: number;
  delay: number;
}

export const AnimatedAuthBackground = () => {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    // Generate floating particles
    const newParticles: Particle[] = Array.from({ length: 40 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 4 + 1,
      opacity: Math.random() * 0.6 + 0.1,
      duration: Math.random() * 30 + 20,
      delay: Math.random() * 10,
    }));
    setParticles(newParticles);
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      {/* Animated gradient background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-[#050505] via-[#0a0a1a] to-[#050505]" />

        {/* Animated gradient orbs */}
        <div
          className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(255,153,51,0.1) 0%, transparent 70%)",
            filter: "blur(60px)",
            animation: "float 15s ease-in-out infinite",
          }}
        />
        <div
          className="absolute bottom-0 left-0 w-[500px] h-[500px] rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(37,84,181,0.08) 0%, transparent 70%)",
            filter: "blur(60px)",
            animation: "float 20s ease-in-out infinite reverse",
            animationDelay: "2s",
          }}
        />
        <div
          className="absolute top-1/2 left-1/3 w-[400px] h-[400px] rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(19,136,8,0.06) 0%, transparent 70%)",
            filter: "blur(50px)",
            animation: "float 18s ease-in-out infinite",
            animationDelay: "1s",
          }}
        />
      </div>

      {/* Floating particles */}
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute rounded-full"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            background: "#FF9933",
            opacity: particle.opacity,
            animation: `float ${particle.duration}s ease-in-out infinite`,
            animationDelay: `${particle.delay}s`,
            boxShadow: `0 0 ${particle.size * 3}px rgba(255,153,51,${particle.opacity * 0.8})`,
          }}
        />
      ))}

      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)",
          backgroundSize: "50px 50px",
        }}
      />

      {/* Glowing corners */}
      <div
        className="absolute top-0 left-0 w-40 h-40"
        style={{
          background:
            "radial-gradient(circle, rgba(255,153,51,0.05), transparent 70%)",
          filter: "blur(40px)",
        }}
      />
      <div
        className="absolute bottom-0 right-0 w-40 h-40"
        style={{
          background:
            "radial-gradient(circle, rgba(37,84,181,0.05), transparent 70%)",
          filter: "blur(40px)",
        }}
      />

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) translateX(0px); }
          25% { transform: translateY(-20px) translateX(10px); }
          50% { transform: translateY(-40px) translateX(-10px); }
          75% { transform: translateY(-20px) translateX(10px); }
        }
      `}</style>
    </div>
  );
};

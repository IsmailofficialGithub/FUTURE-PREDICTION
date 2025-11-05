'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';

interface Particle {
  x: number;
  y: number;
  size: number;
  duration: number;
  targetY: number;
}

export default function Home() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Generate particles only on client side to avoid hydration mismatch
    const generatedParticles: Particle[] = Array.from({ length: 50 }, () => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 4 + 2,
      duration: Math.random() * 10 + 10,
      targetY: Math.random() * 100,
    }));
    setParticles(generatedParticles);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const scrolled = window.scrollY;
      const parallaxElements = document.querySelectorAll('[data-parallax]');
      parallaxElements.forEach((el) => {
        const speed = parseFloat(el.getAttribute('data-speed') || '0.5');
        const yPos = -(scrolled * speed);
        (el as HTMLElement).style.transform = `translateY(${yPos}px)`;
      });
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div ref={containerRef} className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-900 via-amber-900/50 to-yellow-900/40">
      {/* Animated background particles */}
      {mounted && (
        <div className="absolute inset-0 overflow-hidden">
          {particles.map((particle, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full bg-white/10"
              initial={{
                x: `${particle.x}%`,
                y: `${particle.y}%`,
                width: particle.size,
                height: particle.size,
              }}
              animate={{
                y: [`${particle.y}%`, `${particle.targetY}%`],
                opacity: [0.3, 0.7, 0.3],
              }}
              transition={{
                duration: particle.duration,
                repeat: Infinity,
                ease: 'linear',
              }}
            />
          ))}
        </div>
      )}

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className="text-center z-10"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.2 }}
            className="mb-6"
          >
            {/* Logo */}
            <motion.div
              className="flex justify-center mb-6"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.1 }}
            >
              <Image
                src="/logo.png"
                alt="Future Prediction Logo"
                width={200}
                height={200}
                className="w-32 h-32 md:w-48 md:h-48 object-contain"
                priority
              />
            </motion.div>
            <motion.span
              className="text-2xl md:text-4xl font-semibold text-cyan-400 block mb-4"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.3 }}
            >
              🔮 FUTURE PREDICTION
            </motion.span>
            <motion.h1
              className="text-7xl md:text-9xl font-bold text-white"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1, delay: 0.4 }}
            >
              <span className="bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                Predict
              </span>
              <br />
              <span className="text-white">Your Future</span>
              <br />
              <span className="text-6xl md:text-8xl">2026</span>
            </motion.h1>
          </motion.div>

          <motion.p
            className="text-xl md:text-3xl text-gray-200 mb-6 max-w-3xl mx-auto font-semibold"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.6 }}
          >
            Unlock the secrets of your destiny through advanced palm reading
          </motion.p>
          
          <motion.p
            className="text-lg md:text-xl text-gray-400 mb-12 max-w-2xl mx-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.7 }}
          >
            Get personalized predictions about your career, relationships, health, and life path in 2026
          </motion.p>

          <motion.button
            onClick={() => router.push('/scan')}
            className="relative px-12 py-6 text-xl font-semibold text-white bg-gradient-to-r from-purple-600 to-pink-600 rounded-full overflow-hidden group"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.7 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <span className="relative z-10 cursor-pointer">Start Prediction</span>
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-pink-600 to-purple-600"
              initial={{ x: '-100%' }}
              whileHover={{ x: 0 }}
              transition={{ duration: 0.3 }}
            />
          </motion.button>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-10 left-1/2 transform -translate-x-1/2"
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          <div className="w-6 h-10 border-2 border-white/50 rounded-full flex justify-center">
            <motion.div
              className="w-1 h-3 bg-white/50 rounded-full mt-2"
              animate={{ y: [0, 12, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          </div>
        </motion.div>
      </section>

      {/* About Section */}
      <section className="relative min-h-screen flex items-center justify-center px-4 py-20">
        <motion.div
          className="max-w-4xl mx-auto text-center"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.8 }}
        >
          <motion.h2
            className="text-5xl md:text-7xl font-bold text-white mb-8"
            data-parallax
            data-speed="0.3"
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            Your Future Awaits
          </motion.h2>
          <motion.p
            className="text-xl text-gray-300 leading-relaxed mb-12"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            Our advanced future prediction system analyzes your palms to reveal what lies ahead. 
            Discover predictions about your career, love life, health, wealth, and personal growth in 2026.
          </motion.p>

          <div className="grid md:grid-cols-3 gap-8 mt-16">
            {[
              { title: 'Left Hand Scan', desc: 'Reveals your natural talents and potential' },
              { title: 'Right Hand Scan', desc: 'Shows your future path and destiny' },
              { title: 'Future Revealed', desc: 'Watch your personalized prediction video' },
            ].map((feature, i) => (
              <motion.div
                key={i}
                className="p-8 bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10"
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.2 }}
                whileHover={{ scale: 1.05, y: -10 }}
              >
                <h3 className="text-2xl font-bold text-white mb-4">{feature.title}</h3>
                <p className="text-gray-400">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section className="relative min-h-screen flex items-center justify-center px-4 py-20">
        <div className="max-w-6xl mx-auto">
          <motion.h2
            className="text-5xl md:text-7xl font-bold text-white text-center mb-16"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            The Journey
          </motion.h2>

          <div className="space-y-20">
            {[
              {
                title: 'Step into the Future',
                desc: 'Start your personalized future prediction journey',
                gradient: 'from-cyan-500 to-blue-500',
              },
              {
                title: 'Scan Your Palms',
                desc: 'Our AI analyzes your hand lines to predict your future',
                gradient: 'from-purple-500 to-pink-500',
              },
              {
                title: 'Discover Your Destiny',
                desc: 'Watch your personalized future prediction video for 2026',
                gradient: 'from-pink-500 to-red-500',
              },
            ].map((step, i) => (
              <motion.div
                key={i}
                className={`flex flex-col ${i % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'} items-center gap-12`}
                initial={{ opacity: 0, x: i % 2 === 0 ? -100 : 100 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: i * 0.2 }}
              >
                <div className="flex-1">
                  <motion.div
                    className={`h-64 w-full rounded-2xl bg-gradient-to-br ${step.gradient} opacity-80`}
                    whileHover={{ scale: 1.05, rotate: 2 }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                <div className="flex-1 text-center md:text-left">
                  <h3 className="text-4xl font-bold text-white mb-4">{step.title}</h3>
                  <p className="text-xl text-gray-300">{step.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative min-h-screen flex items-center justify-center px-4">
        <motion.div
          className="text-center max-w-3xl mx-auto"
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1 }}
        >
          <motion.h2
            className="text-6xl md:text-8xl font-bold text-white mb-8"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            Ready to Predict Your Future?
          </motion.h2>
          <motion.p
            className="text-2xl text-gray-300 mb-12"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            Get your personalized future prediction for 2026 - discover what destiny has in store for you
          </motion.p>
          <motion.button
            onClick={() => router.push('/scan')}
            className="px-16 py-8 text-2xl font-bold text-white cursor-pointer bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 rounded-full"
            whileHover={{ scale: 1.1, boxShadow: '0 0 50px rgba(168, 85, 247, 0.5)' }}
            whileTap={{ scale: 0.95 }}
          >
            Start Your Prediction
          </motion.button>
        </motion.div>
      </section>
    </div>
  );
}

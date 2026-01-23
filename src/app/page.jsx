'use client';

import { useWeb3 } from '@/components/providers/Web3Provider';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Lock, FileCheck, Zap, ArrowRight, Github, Twitter, CheckCircle2 } from 'lucide-react';

export default function Home() {
  const { connectWallet, signer, account } = useWeb3();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    try {
      let currentSigner = signer;
      let currentAccount = account;

      if (!currentAccount) {
        const connection = await connectWallet();
        if (!connection) {
          setLoading(false);
          return;
        }
        currentSigner = connection.signer;
        currentAccount = connection.account;
      }

      const reqRes = await fetch('/api/auth/request-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: currentAccount }),
      });
      const { message, nonce } = await reqRes.json();

      const signature = await currentSigner.signMessage(message);

      const verifyRes = await fetch('/api/auth/verify-signature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: currentAccount, signature, nonce }),
      });
      const { token } = await verifyRes.json();

      if (token) {
        localStorage.setItem('token', token);
        router.push('/dashboard');
      }
    } catch (error) {
      console.error('Login failed:', error);
      alert('Login failed. See console for details.');
    } finally {
      setLoading(false);
    }
  };

  const features = [
    {
      icon: Shield,
      title: "Zero-Trust Security",
      description: "End-to-end encryption ensures your files are protected with military-grade security standards"
    },
    {
      icon: Lock,
      title: "Blockchain Access Control",
      description: "Smart contracts manage permissions with transparent and immutable audit trails"
    },
    {
      icon: FileCheck,
      title: "Decentralized Storage",
      description: "Files stored on IPFS network for maximum resilience and permanent availability"
    },
    {
      icon: Zap,
      title: "Lightning Fast",
      description: "Optimized client-side encryption and decentralized architecture for peak performance"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1A1235] via-[#1B1145] to-[#210F53] relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-20 -left-20 w-96 h-96 rounded-full blur-3xl"
          style={{
            background: 'radial-gradient(circle, rgba(45,20,117,0.4) 0%, rgba(45,20,117,0) 70%)'
          }}
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="absolute bottom-20 -right-20 w-[500px] h-[500px] rounded-full blur-3xl"
          style={{
            background: 'radial-gradient(circle, rgba(53,39,95,0.5) 0%, rgba(53,39,95,0) 70%)'
          }}
          animate={{
            scale: [1.3, 1, 1.3],
            opacity: [0.4, 0.7, 0.4],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-3xl"
          style={{
            background: 'radial-gradient(circle, rgba(84,71,105,0.3) 0%, rgba(84,71,105,0) 70%)'
          }}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </div>

      {/* Navigation */}
      <nav className="relative z-10 container mx-auto px-6 py-6">
        <div className="flex justify-between items-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3"
          >
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#2D1475] to-[#544769] flex items-center justify-center shadow-lg shadow-[#2D1475]/30">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-purple-300 via-purple-200 to-purple-300 bg-clip-text text-transparent">
              BlockSafe
            </span>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3"
          >
            <Button 
              variant="ghost" 
              size="icon"
              className="text-purple-200 hover:text-white hover:bg-white/10"
            >
              <Github className="w-5 h-5" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon"
              className="text-purple-200 hover:text-white hover:bg-white/10"
            >
              <Twitter className="w-5 h-5" />
            </Button>
          </motion.div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 container mx-auto px-6 py-12 lg:py-20">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left Column - Content */}
          <div className="space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-block">
                <span className="px-4 py-2 rounded-full bg-gradient-to-r from-[#2D1475]/30 to-[#544769]/30 text-purple-200 text-sm font-medium border border-purple-400/30 backdrop-blur-sm">
                  🔒 Decentralized Security
                </span>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-tight text-white">
                Your Files,{' '}
                <span className="block mt-2 bg-gradient-to-r from-purple-400 via-purple-300 to-purple-200 bg-clip-text text-transparent">
                  Your Control
                </span>
              </h1>
            </motion.div>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-xl text-purple-200/80 leading-relaxed max-w-xl"
            >
              Store, manage, and share sensitive data with blockchain-powered access control
              and IPFS resilience. Zero-trust architecture meets sovereign data ownership.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-wrap gap-4"
            >
              <Button
                size="lg"
                onClick={handleLogin}
                disabled={loading}
                className="text-lg px-8 py-6 bg-gradient-to-r from-[#2D1475] to-[#544769] hover:from-[#3a1a94] hover:to-[#655880] text-white shadow-xl shadow-[#2D1475]/40 hover:shadow-2xl hover:shadow-[#2D1475]/50 transition-all border border-purple-400/20"
              >
                {loading ? 'Connecting...' : account ? 'Enter Dashboard' : 'Connect Wallet'}
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
          
            </motion.div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="grid grid-cols-3 gap-8 pt-8 border-t border-purple-400/20"
            >
              <div>
                <div className="text-3xl font-bold bg-gradient-to-r from-purple-300 to-purple-200 bg-clip-text text-transparent">100%</div>
                <div className="text-sm text-purple-300/70 mt-1">Encrypted</div>
              </div>
              <div>
                <div className="text-3xl font-bold bg-gradient-to-r from-purple-300 to-purple-200 bg-clip-text text-transparent">24/7</div>
                <div className="text-sm text-purple-300/70 mt-1">Available</div>
              </div>
            
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="relative"
          >
            <div className="relative aspect-square rounded-3xl bg-gradient-to-br from-[#372C4E]/40 to-[#35275F]/40 border border-purple-400/20 shadow-2xl shadow-[#210F53]/50 p-8 backdrop-blur-sm">
              {/* Floating Card - Top Right - Encrypted */}
              <motion.div
                animate={{
                  y: [0, -15, 0],
                  rotate: [0, 3, 0]
                }}
                transition={{
                  duration: 5,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="absolute top-6 right-6 w-52 h-36 rounded-2xl bg-gradient-to-br from-[#2D1475]/80 to-[#544769]/80 border border-purple-400/30 backdrop-blur-md p-5 shadow-xl shadow-[#2D1475]/40"
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                    <Lock className="w-5 h-5 text-purple-200" />
                  </div>
                  <CheckCircle2 className="w-5 h-5 text-green-400 ml-auto" />
                </div>
                <div className="text-base font-semibold text-white mb-1">Encrypted</div>
                <div className="text-xs text-purple-200/70">AES-256-GCM</div>
              </motion.div>

              {/* Floating Card - Bottom Left - Decentralized */}
              <motion.div
                animate={{
                  y: [0, 12, 0],
                  rotate: [0, -3, 0]
                }}
                transition={{
                  duration: 6,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 0.7
                }}
                className="absolute bottom-6 left-6 w-52 h-36 rounded-2xl bg-gradient-to-br from-[#35275F]/80 to-[#311B63]/80 border border-purple-400/30 backdrop-blur-md p-5 shadow-xl shadow-[#311B63]/40"
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                    <FileCheck className="w-5 h-5 text-purple-200" />
                  </div>
                  <CheckCircle2 className="w-5 h-5 text-green-400 ml-auto" />
                </div>
                <div className="text-base font-semibold text-white mb-1">Decentralized</div>
                <div className="text-xs text-purple-200/70">IPFS Storage</div>
              </motion.div>

              {/* Center Element - Shield */}
              <div className="absolute inset-0 flex items-center justify-center">
                <motion.div
                  animate={{
                    scale: [1, 1.08, 1],
                  }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className="w-36 h-36 rounded-3xl bg-gradient-to-br from-[#2D1475] to-[#544769] flex items-center justify-center shadow-2xl shadow-[#2D1475]/60 border border-purple-300/20"
                >
                  <Shield className="w-20 h-20 text-white" />
                </motion.div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Features Section */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="mt-32"
        >
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">Why BlockSafe?</h2>
            <p className="text-purple-200/70 text-lg max-w-2xl mx-auto">
              Enterprise-grade security meets user-friendly design for sovereign data ownership
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.7 + index * 0.1 }}
                whileHover={{ y: -8, transition: { duration: 0.3 } }}
                className="relative group"
              >
                <div className="h-full rounded-2xl border border-purple-400/20 bg-gradient-to-br from-[#372C4E]/40 to-[#35275F]/40 p-6 shadow-lg hover:shadow-2xl hover:shadow-[#2D1475]/30 transition-all hover:border-purple-400/40 backdrop-blur-sm">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#2D1475]/50 to-[#544769]/50 flex items-center justify-center mb-5 group-hover:from-[#2D1475] group-hover:to-[#544769] transition-all border border-purple-400/20">
                    <feature.icon className="w-7 h-7 text-purple-200 group-hover:text-white transition-colors" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-3">{feature.title}</h3>
                  <p className="text-sm text-purple-200/70 leading-relaxed">{feature.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 container mx-auto px-6 py-12 mt-20 border-t border-purple-400/20">
        <div className="text-center text-sm text-purple-300/60">
          <p>© 2024 BlockSafe. Built with ❤️ for Web3 and decentralized storage.</p>
        </div>
      </footer>
    </div>
  );
}

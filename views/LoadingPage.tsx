
import React from 'react';
import { SohaLogo, SohaLogotype } from '../components/SohaLogo';

const LoadingPage: React.FC = () => {
  return (
    <div
      className="fixed inset-0 z-[3000] flex flex-col items-center justify-center"
      style={{
        background: 'radial-gradient(ellipse at 50% 40%, rgba(20, 184, 166, 0.06) 0%, transparent 60%), linear-gradient(180deg, var(--bg) 0%, var(--surface) 100%)',
      }}
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/3 w-72 h-72 rounded-full opacity-[0.07] animate-float-slow"
          style={{ background: 'var(--primary)', filter: 'blur(120px)' }} />
        <div className="absolute bottom-1/3 right-1/3 w-56 h-56 rounded-full opacity-[0.05] animate-float-slow"
          style={{ background: '#6366f1', filter: 'blur(100px)', animationDelay: '2s' }} />
      </div>

      <div className="relative mb-8">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-teal-400/20 to-indigo-500/20 blur-2xl animate-pulse-slow" style={{ transform: 'scale(1.3)' }}></div>
          <SohaLogo size={88} className="shadow-xl ring-1 ring-white/20" />
        </div>
      </div>

      <div className="mb-10 animate-fadeInUp" style={{ animationDelay: '0.3s' }}>
        <SohaLogotype fontSize="3.2rem" className="animate-blink" />
      </div>

      <div className="flex items-center gap-3 animate-fadeInUp" style={{ animationDelay: '0.6s' }}>
        {[0, 1, 2, 3].map(i => (
          <div
            key={i}
            className="w-1.5 h-1.5 rounded-full"
            style={{
              background: 'var(--primary)',
              animation: 'dotBounce 1.2s ease-in-out infinite',
              animationDelay: `${i * 0.15}s`,
              opacity: 0.2,
            }}
          />
        ))}
      </div>

      <style>{`
        @keyframes dotBounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.2; }
          40% { transform: translateY(-8px); opacity: 1; }
        }
        @keyframes float-slow {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(20px, -20px); }
        }
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.1); }
        }
        @keyframes blink {
          0%, 44%, 100% { opacity: 1; }
          50% { opacity: 0.15; }
        }
        .animate-blink { animation: blink 0.55s ease-in-out infinite; }
        .animate-float-slow { animation: float-slow 8s ease-in-out infinite; }
        .animate-pulse-slow { animation: pulse-slow 3s ease-in-out infinite; }
      `}</style>
    </div>
  );
};

export default LoadingPage;

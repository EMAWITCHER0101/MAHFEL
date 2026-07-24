import React from 'react';

interface WelcomeVideoProps {
  videoSrc: string;
  onComplete: () => void;
}

const WelcomeVideo: React.FC<WelcomeVideoProps> = ({ videoSrc, onComplete }) => {
  return (
    <div className="fixed inset-0 z-[5500] flex items-center justify-center p-4 animate-fadeIn">
      {/* Background */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onComplete} />

      {/* Card */}
      <div className="relative z-10 w-full max-w-sm bg-white rounded-[2rem] shadow-2xl overflow-hidden animate-scaleIn">
        {/* Video */}
        <div className="relative aspect-square bg-black">
          <video
            src={videoSrc}
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            className="w-full h-full object-cover"
          />
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        </div>

        {/* Content */}
        <div className="p-6 text-center">
          <h2 className="text-xl font-black mb-1" style={{ color: '#06b6d4' }}>
            خوش آمدید!
          </h2>
          <p className="text-sm font-bold mb-5 leading-relaxed" style={{ color: '#0891b2' }}>
            به اپلیکیشن محفل خوش آمدید
          </p>
          <button
            onClick={onComplete}
            className="w-full py-3 rounded-xl text-sm font-black text-white shadow-lg transition-all active:scale-95"
            style={{
              background: 'linear-gradient(135deg, #14b8a6, #0d9488)',
              boxShadow: '0 8px 24px rgba(20, 184, 166, 0.4)',
            }}
          >
            شروع کنید!
          </button>
        </div>
      </div>
    </div>
  );
};

export default WelcomeVideo;

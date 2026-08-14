import React, { useEffect, useMemo, useRef, useState } from 'react';

interface WelcomeVideoProps {
  videoSrc?: string;
  onComplete: () => void;
}

const DEFAULT_MOBILE_SRC = '/videopage/welcomemobile.mp4';
const DEFAULT_DESKTOP_SRC = '/videopage/welcomepage.mp4';

const WelcomeVideo: React.FC<WelcomeVideoProps> = ({ videoSrc, onComplete }) => {
  const [videoReady, setVideoReady] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const [srcIndex, setSrcIndex] = useState(0);

  const sources = useMemo(() => {
    if (videoSrc) return [videoSrc];
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    return isMobile ? [DEFAULT_MOBILE_SRC, DEFAULT_DESKTOP_SRC] : [DEFAULT_DESKTOP_SRC];
  }, [videoSrc]);

  const src = sources[Math.min(srcIndex, sources.length - 1)];

  const failTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (videoReady) return;
    failTimeout.current = setTimeout(() => {
      if (srcIndex >= sources.length - 1) setVideoFailed(true);
      else setSrcIndex(srcIndex + 1);
    }, 10000);
    return () => {
      if (failTimeout.current) clearTimeout(failTimeout.current);
    };
  }, [videoReady, srcIndex, sources.length]);

  const handleError = () => {
    if (srcIndex < sources.length - 1) {
      setVideoReady(false);
      setSrcIndex(srcIndex + 1);
    } else {
      setVideoFailed(true);
    }
  };

  return (
    <div className="fixed inset-0 z-[5500] flex items-center justify-center p-4 animate-fadeIn">
      {/* Background */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onComplete} />

      {/* Card */}
      <div className="relative z-10 w-full max-w-sm md:max-w-4xl bg-white rounded-[2rem] shadow-2xl overflow-hidden animate-scaleIn">
        {/* Video */}
        <div className="relative aspect-square md:aspect-video bg-black">
          {!videoReady && !videoFailed && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
              <div className="w-10 h-10 border-4 border-white/20 border-t-teal-400 rounded-full animate-spin"></div>
            </div>
          )}
          {videoFailed && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
              <img src="/logo.png" alt="محفل" className="w-24 h-24 md:w-36 md:h-36 object-contain opacity-60" />
            </div>
          )}
          {!videoFailed && (
            <video
              key={src}
              src={src}
              autoPlay
              loop
              muted
              playsInline
              disablePictureInPicture
              preload="auto"
              onLoadedData={() => setVideoReady(true)}
              onError={handleError}
              className={`w-full h-full object-cover transition-opacity duration-300 ${videoReady ? 'opacity-100' : 'opacity-0'}`}
            />
          )}
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
        </div>

        {/* Content */}
        <div className="p-6 md:p-10 text-center">
          <h2 className="text-xl md:text-4xl font-black mb-1 md:mb-3" style={{ color: '#06b6d4' }}>
            خوش آمدید!
          </h2>
          <p className="text-sm md:text-xl font-bold mb-5 md:mb-8 leading-relaxed" style={{ color: '#0891b2' }}>
            به اپلیکیشن محفل خوش آمدید
          </p>
          <button
            onClick={onComplete}
            className="w-full md:w-72 py-3 md:py-4 rounded-xl md:rounded-2xl text-sm md:text-lg font-black text-white shadow-lg transition-all active:scale-95"
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

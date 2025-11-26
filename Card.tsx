import React, { useState, useEffect } from 'react';
import { EntityType, GameEntity } from '../types';
import { Shield, User, Trophy, Flag, GraduationCap } from 'lucide-react';

interface CardProps {
  entity: GameEntity;
  animationDelay?: string;
}

// Fallback images ensuring we always have a visual for every type
const FALLBACK_IMAGES: Record<EntityType, string> = {
  [EntityType.TEAM]: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d3/Soccerball.svg/600px-Soccerball.svg.png",
  [EntityType.PLAYER]: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/89/Portrait_Placeholder.png/480px-Portrait_Placeholder.png",
  [EntityType.COACH]: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5f/User_with_smile.svg/1024px-User_with_smile.svg.png",
  [EntityType.TROPHY]: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/10/Trophy_Cup_Flat_Icon.svg/1024px-Trophy_Cup_Flat_Icon.svg.png",
  [EntityType.NATIONAL_TEAM]: "https://upload.wikimedia.org/wikipedia/commons/thumb/db/db/World_map_green.png/640px-World_map_green.png",
  [EntityType.YEAR]: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/08/Simple_icon_time.svg/600px-Simple_icon_time.svg.png"
};

const Card: React.FC<CardProps> = ({ entity, animationDelay = "0s" }) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Reset states when entity changes to support component reuse
  useEffect(() => {
    setImageError(false);
    setImageLoaded(false);
  }, [entity.imageUrl, entity.name]);

  const getIcon = (className: string) => {
    switch (entity.type) {
      case EntityType.TEAM: return <Shield className={className} />;
      case EntityType.PLAYER: return <User className={className} />;
      case EntityType.TROPHY: return <Trophy className={className} />;
      case EntityType.NATIONAL_TEAM: return <Flag className={className} />;
      case EntityType.COACH: return <GraduationCap className={className} />;
      default: return <Shield className={className} />;
    }
  };

  const getLabel = () => {
    switch (entity.type) {
      case EntityType.TEAM: return "فريق";
      case EntityType.PLAYER: return "لاعب";
      case EntityType.TROPHY: return "بطولة / لقب";
      case EntityType.NATIONAL_TEAM: return "منتخب";
      case EntityType.COACH: return "مدرب";
      default: return "كيان";
    }
  };

  const isFallback = imageError || !entity.imageUrl;
  
  // The generic fallback specific to this entity type (used for background blur)
  const typeFallbackSrc = FALLBACK_IMAGES[entity.type] || FALLBACK_IMAGES[EntityType.TEAM];
  
  // The actual image we want to show
  const effectiveImageSrc = (!imageError && entity.imageUrl) 
    ? entity.imageUrl 
    : typeFallbackSrc;

  const customColor = entity.color || '#10b981'; // Default emerald

  return (
    <div 
      className={`
        relative overflow-hidden group
        bg-slate-800/80 backdrop-blur-md
        rounded-2xl flex flex-col items-center justify-center 
        shadow-[0_0_20px_rgba(0,0,0,0.3)]
        transform transition-all duration-500 
        hover:scale-105 hover:-translate-y-1
        hover:shadow-xl
        animate-in fade-in zoom-in slide-in-from-bottom-4
        w-full aspect-[3/4] max-w-[200px] md:max-w-[240px]
        border border-slate-700
      `}
      style={{ 
        animationDelay,
        borderColor: 'rgba(255,255,255,0.1)'
      }}
    >
      {/* Background Image Layer */}
      <>
        {/* 1. Base Layer: Blurred Fallback (Always visible as a placeholder base) */}
        <div className="absolute inset-0 overflow-hidden bg-slate-800">
          <img 
            src={typeFallbackSrc} 
            alt="" 
            className="w-full h-full object-cover object-center opacity-30 blur-md scale-110" 
          />
        </div>

        {/* 2. Loading Shimmer (Visible only while loading) */}
        {!imageLoaded && !isFallback && (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer z-0" 
               style={{ backgroundSize: '200% 100%', animation: 'shimmer 2s infinite linear' }}
          ></div>
        )}

        {/* 3. Main Image Layer (Fades in) */}
        <img 
          src={effectiveImageSrc} 
          alt={entity.name}
          loading="lazy"
          className={`
            absolute inset-0 w-full h-full 
            object-cover object-center 
            rounded-2xl
            transition-all duration-700 ease-in-out
            group-hover:scale-110 
            ${imageLoaded || isFallback ? 'opacity-100' : 'opacity-0'}
            ${isFallback ? 'opacity-60 grayscale-[0.2] mix-blend-overlay' : ''}
          `}
          onError={() => setImageError(true)}
          onLoad={() => setImageLoaded(true)}
        />
        
        {/* Gradient Overlay for Text Readability */}
        <div className={`absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/60 to-transparent opacity-90 transition-opacity duration-500`}></div>
        
        {/* Color Tint based on team color */}
        <div className={`absolute inset-0 opacity-20 mix-blend-overlay transition-opacity duration-500`} style={{ backgroundColor: customColor }}></div>
      </>

      {/* Top Right Icon */}
      <div className={`absolute top-0 right-0 p-3 transition-opacity z-10 text-white/70`}>
        {getIcon("w-6 h-6 opacity-80 drop-shadow-md")}
      </div>
      
      {/* Central Content */}
      <div className="relative z-10 flex flex-col items-center p-4 w-full h-full justify-end pb-8">
        <span className="text-xs uppercase tracking-widest text-slate-300 mb-2 font-semibold bg-slate-900/50 px-2 py-0.5 rounded backdrop-blur-sm shadow-sm border border-white/5">
          {getLabel()}
        </span>
        
        <h3 
          className="text-xl md:text-2xl font-black text-center text-white leading-tight break-words drop-shadow-xl"
          style={{ textShadow: '0 2px 10px rgba(0,0,0,0.9)' }}
        >
          {entity.name}
        </h3>
      </div>
      
      {/* Bottom Glow */}
      <div 
        className="absolute -bottom-10 -left-10 w-32 h-32 rounded-full blur-2xl pointer-events-none group-hover:opacity-100 transition-all duration-500 opacity-50"
        style={{ backgroundColor: customColor }}
      ></div>
      
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
};

export default Card;
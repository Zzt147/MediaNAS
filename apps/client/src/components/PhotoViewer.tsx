import React, { useRef } from 'react';
import { X } from 'lucide-react';
// 使用 type 关键字修复 ts(1484)
import { type MediaFile, API_BASE } from '../constants';

interface PhotoViewerProps {
  photos: MediaFile[];
  currentIndex: number;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
}

export const PhotoViewer: React.FC<PhotoViewerProps> = ({ photos, currentIndex, onClose, onNext, onPrev }) => {
  const touchStartX = useRef(0);
  const currentPhoto = photos[currentIndex];

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const touchEndX = e.changedTouches[0].clientX;
    const distance = touchStartX.current - touchEndX;
    const threshold = 50;

    if (Math.abs(distance) > threshold) {
      if (distance > 0) onNext();
      else onPrev();
    }
  };

  if (!currentPhoto) return null;

  return (
    <div 
      className="fixed inset-0 z-[60] bg-black flex flex-col justify-center animate-in fade-in duration-200"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <img 
        src={`${API_BASE}/api/view/${currentPhoto.id}`} 
        className="w-full h-full object-contain"
        alt=""
      />
      <div className="absolute top-0 left-0 w-full p-4 bg-gradient-to-b from-black/50 to-transparent flex justify-between items-center text-white">
        <button onClick={onClose} className="p-2 bg-black/20 rounded-full backdrop-blur-md">
          <X size={24} />
        </button>
        <span className="text-sm font-medium">{currentIndex + 1} / {photos.length}</span>
      </div>
    </div>
  );
};
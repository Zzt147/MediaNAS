import React from 'react';
import { ChevronLeft } from 'lucide-react';
// 使用 type 关键字修复 ts(1484)
import { type MediaFile, API_BASE } from '../constants';

interface VideoPlayerProps {
  video: MediaFile;
  onClose: () => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ video, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col animate-in fade-in duration-200">
      <div className="w-full aspect-video bg-black sticky top-0 z-20 shadow-lg flex items-center justify-center">
        <video 
          src={`${API_BASE}/api/view/${video.id}`} 
          controls autoPlay playsInline className="w-full h-full object-contain"
        />
        <button 
          onClick={onClose}
          className="absolute top-4 left-4 bg-black/50 p-2 rounded-full backdrop-blur-sm active:scale-90 transition-transform"
        >
          <ChevronLeft size={24} color="white" />
        </button>
      </div>
      <div className="p-4 text-white bg-gray-900 flex-1">
        <h1 className="text-lg font-bold">{video.fileName}</h1>
      </div>
    </div>
  );
};
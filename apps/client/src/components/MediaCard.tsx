import React from 'react';
import { PlayCircle, Image as ImageIcon } from 'lucide-react';
// 使用 type 关键字修复 ts(1484)
import { type MediaFile, API_BASE } from '../constants';

interface MediaCardProps {
  file: MediaFile;
  onClick: () => void;
}

export const MediaCard: React.FC<MediaCardProps> = ({ file, onClick }) => {
  const isVideo = file.mimeType === 'video';
  const folderName = file.folder.split(/[/\\]/).pop();

  return (
    <div 
      onClick={onClick}
      className="bg-white rounded-lg shadow-sm overflow-hidden flex flex-col cursor-pointer active:scale-95 transition-transform duration-100"
    >
      <div className="aspect-[16/10] bg-gray-200 relative group overflow-hidden">
        {isVideo ? (
          <video 
            src={`${API_BASE}/api/view/${file.id}#t=0.1`} 
            className="w-full h-full object-cover pointer-events-none" 
            muted preload="metadata" playsInline
          />
        ) : (
          <img 
            src={`${API_BASE}/api/thumbnail/${file.id}`}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={(e) => ((e.target as HTMLImageElement).src = `${API_BASE}/api/view/${file.id}`)}
            alt=""
          />
        )}

        <div className={`absolute bottom-1 right-1 backdrop-blur-sm text-white text-[10px] px-1.5 py-0.5 rounded flex items-center ${isVideo ? 'bg-black/60' : 'bg-pink-600/80'}`}>
          {isVideo ? (
            <><PlayCircle size={10} className="mr-1"/> <span>Video</span></>
          ) : (
            <><ImageIcon size={10} className="mr-1"/> <span>{folderName}</span></>
          )}
        </div>
      </div>
      
      <div className="p-2">
        <p className="text-xs text-gray-700 line-clamp-2 leading-relaxed h-8 font-medium">
          {isVideo ? file.fileName : folderName}
        </p>
      </div>
    </div>
  );
};
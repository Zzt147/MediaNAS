import React from 'react';
import { ChevronLeft } from 'lucide-react';
// 使用 type 关键字修复 ts(1484)
import { type MediaFile, API_BASE } from '../constants';
interface AlbumGridProps {
  folder: string;
  photos: MediaFile[];
  onClose: () => void;
  onPhotoClick: (index: number) => void;
}

export const AlbumGrid: React.FC<AlbumGridProps> = ({ folder, photos, onClose, onPhotoClick }) => {
  const folderName = folder.split(/[/\\]/).pop();

  return (
    <div className="fixed inset-0 z-40 bg-white flex flex-col animate-in slide-in-from-right duration-300">
      <div className="h-14 bg-white border-b border-gray-100 flex items-center px-2 sticky top-0 z-10">
        <button onClick={onClose} className="p-2 active:bg-gray-100 rounded-full">
          <ChevronLeft size={24} className="text-gray-700" />
        </button>
        <div className="ml-2">
          <h2 className="text-base font-bold text-gray-800 line-clamp-1">{folderName}</h2>
          <p className="text-xs text-gray-400">{photos.length} 张照片</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-1 bg-gray-50">
        <div className="grid grid-cols-2 gap-1">
          {photos.map((photo, index) => (
            <div 
              key={photo.id} 
              className="aspect-square bg-gray-200 relative overflow-hidden cursor-pointer active:opacity-80"
              onClick={() => onPhotoClick(index)}
            >
              <img 
                src={`${API_BASE}/api/thumbnail/${photo.id}`} 
                className="w-full h-full object-cover"
                loading="lazy"
                alt=""
              />
            </div>
          ))}
        </div>
        {photos.length === 0 && (
          <div className="text-center py-20 text-gray-400 text-sm">加载中或没有照片...</div>
        )}
      </div>
    </div>
  );
};
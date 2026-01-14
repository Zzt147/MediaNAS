import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Header } from './components/Header';
import { MediaCard } from './components/MediaCard';
import { VideoPlayer } from './components/VideoPlayer';
import { AlbumGrid } from './components/AlbumGrid';
import { PhotoViewer } from './components/PhotoViewer';
import { BottomNav } from './components/BottomNav';
// 使用 type 关键字修复 ts(1484)
import { type MediaFile, API_BASE } from './constants';
function App() {
  const [activeTab, setActiveTab] = useState('刷刷');
  const [homeFiles, setHomeFiles] = useState<MediaFile[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<MediaFile | null>(null);
  const [currentAlbumFolder, setCurrentAlbumFolder] = useState<string | null>(null);
  const [albumPhotos, setAlbumPhotos] = useState<MediaFile[]>([]);
  const [photoIndex, setPhotoIndex] = useState<number>(-1);

  const homePageRef = useRef(1);
  const homeLoadingRef = useRef(false);
  const homeHasMoreRef = useRef(true);

  const fetchHomeFiles = async (pageNum: number) => {
    if (homeLoadingRef.current || !homeHasMoreRef.current) return;
    homeLoadingRef.current = true;
    try {
      const res = await axios.get(`${API_BASE}/api/files?page=${pageNum}`);
      if (res.data.length === 0) {
        homeHasMoreRef.current = false;
      } else {
        setHomeFiles(prev => {
          if (pageNum === 1) return res.data;
          const uniqueMap = new Map();
          [...prev, ...res.data].forEach(f => uniqueMap.set(f.id, f));
          return Array.from(uniqueMap.values()) as MediaFile[];
        });
        homePageRef.current = pageNum;
      }
    } catch (e) { console.error(e); } 
    finally { homeLoadingRef.current = false; }
  };

  const openAlbum = async (folderPath: string) => {
    setCurrentAlbumFolder(folderPath);
    setAlbumPhotos([]);
    try {
      const res = await axios.get(`${API_BASE}/api/album?folder=${encodeURIComponent(folderPath)}`);
      setAlbumPhotos(res.data);
    } catch (error) { console.error(error); }
  };

  useEffect(() => { fetchHomeFiles(1); }, []);

  const handleHomeScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (selectedVideo || currentAlbumFolder) return; 
    const { scrollTop, clientHeight, scrollHeight } = e.currentTarget;
    if (scrollHeight - scrollTop - clientHeight < 150) {
      fetchHomeFiles(homePageRef.current + 1);
    }
  };

  return (
    <>
      {photoIndex !== -1 && (
        <PhotoViewer 
          photos={albumPhotos} currentIndex={photoIndex} 
          onClose={() => setPhotoIndex(-1)}
          onNext={() => photoIndex < albumPhotos.length - 1 && setPhotoIndex(p => p + 1)}
          onPrev={() => photoIndex > 0 && setPhotoIndex(p => p - 1)}
        />
      )}
      
      {selectedVideo && (
        <VideoPlayer video={selectedVideo} onClose={() => setSelectedVideo(null)} />
      )}

      {currentAlbumFolder && (
        <AlbumGrid 
          folder={currentAlbumFolder} photos={albumPhotos} 
          onClose={() => setCurrentAlbumFolder(null)}
          onPhotoClick={(idx) => setPhotoIndex(idx)}
        />
      )}

      <div className="flex flex-col h-screen bg-gray-50 text-gray-800 font-sans">
        <Header />
        
        <div className="flex-1 overflow-y-auto min-h-0 p-2" onScroll={handleHomeScroll}>
          {activeTab === '刷刷' ? (
            <div className="pb-4">
              <div className="grid grid-cols-2 gap-2">
                {homeFiles.map((file) => (
                  <MediaCard 
                    key={file.id} file={file} 
                    onClick={() => file.mimeType === 'video' ? setSelectedVideo(file) : openAlbum(file.folder)} 
                  />
                ))}
              </div>
              <div className="py-6 text-center">
                {!homeHasMoreRef.current && <span className="text-gray-300 text-xs">- 到底了 -</span>}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-4">
               <p>{activeTab} 功能开发中...</p>
            </div>
          )}
        </div>

        <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
      </div>
    </>
  );
}

export default App;
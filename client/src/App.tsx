import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Home, FolderOpen, BarChart2, User, Search, ChevronLeft, PlayCircle, Image as ImageIcon, X } from 'lucide-react';

// --- 类型定义 ---
interface MediaFile {
  id: number;
  fileName: string;
  path: string;
  mimeType: string;
  folder: string;
}

interface TabItemProps {
  icon: any; 
  label: string;
  isActive: boolean;
  onClick: () => void;
}

const API_BASE = 'http://192.168.1.101:3000';

function App() {
  // --- 全局状态 ---
  const [activeTab, setActiveTab] = useState('刷刷');

  // --- 首页列表状态 ---
  const [homeFiles, setHomeFiles] = useState<MediaFile[]>([]);
  const homePageRef = useRef(1);
  const homeLoadingRef = useRef(false);
  const homeHasMoreRef = useRef(true);

  // --- 播放器/相册状态 ---
  // selectedVideo: 只有看视频时才有值
  const [selectedVideo, setSelectedVideo] = useState<MediaFile | null>(null);
  
  // currentAlbumFolder: 当前进入的相册路径 (如果不为空，说明在相册列表页)
  const [currentAlbumFolder, setCurrentAlbumFolder] = useState<string | null>(null);
  const [albumPhotos, setAlbumPhotos] = useState<MediaFile[]>([]);
  
  // photoIndex: 当前大图浏览的索引 (-1 表示没打开大图)
  const [photoIndex, setPhotoIndex] = useState<number>(-1);

  // 滑动相关 Ref
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  // --- 1. 获取首页数据 (视频流 + 相册封面) ---
  const fetchHomeFiles = async (pageNum: number) => {
    if (homeLoadingRef.current || !homeHasMoreRef.current) return;
    homeLoadingRef.current = true;
    console.log(`[Home] 加载第 ${pageNum} 页...`);

    try {
      const res = await axios.get(`${API_BASE}/api/files?page=${pageNum}`);
      const newFiles: MediaFile[] = res.data;

      if (newFiles.length === 0) {
        homeHasMoreRef.current = false;
      } else {
        setHomeFiles(prev => {
          if (pageNum === 1) return newFiles;
          const uniqueMap = new Map();
          [...prev, ...newFiles].forEach(f => uniqueMap.set(f.id, f));
          return Array.from(uniqueMap.values()) as MediaFile[];
        });
        homePageRef.current = pageNum;
      }
    } catch (e) { console.error(e); } 
    finally { homeLoadingRef.current = false; }
  };

  // --- 2. 获取相册详情 (点击相册封面后) ---
  const openAlbum = async (folderPath: string) => {
    setCurrentAlbumFolder(folderPath); // 进入相册视图
    setAlbumPhotos([]); // 清空旧数据
    try {
      // 这里的 encodeURIComponent 很重要，处理路径里的斜杠和特殊字符
      const res = await axios.get(`${API_BASE}/api/album?folder=${encodeURIComponent(folderPath)}`);
      setAlbumPhotos(res.data);
    } catch (error) {
      console.error("加载相册失败", error);
    }
  };

  // --- 3. 左右滑动逻辑 ---
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };
  const handleTouchEnd = () => {
    if (photoIndex === -1) return;
    const distance = touchStartX.current - touchEndX.current;
    const threshold = 50; // 滑动超过 50px 触发

    if (Math.abs(distance) > threshold) {
      if (distance > 0) {
        // 左滑 -> 下一张
        if (photoIndex < albumPhotos.length - 1) setPhotoIndex(prev => prev + 1);
      } else {
        // 右滑 -> 上一张
        if (photoIndex > 0) setPhotoIndex(prev => prev - 1);
      }
    }
  };

  // 初始化首页
  useEffect(() => { fetchHomeFiles(1); }, []);

  // 首页无限滚动
  const handleHomeScroll = (e: React.UIEvent<HTMLDivElement>) => {
    // 只有在首页且没打开其他视图时才触发
    if (selectedVideo || currentAlbumFolder) return; 
    const { scrollTop, clientHeight, scrollHeight } = e.currentTarget;
    if (scrollHeight - scrollTop - clientHeight < 150) {
      fetchHomeFiles(homePageRef.current + 1);
    }
  };

  // --- 视图渲染 ---

  // A. 大图浏览模式 (Overlay)
  const renderPhotoViewer = () => {
    if (photoIndex === -1) return null;
    const currentPhoto = albumPhotos[photoIndex];
    if (!currentPhoto) return null;

    return (
      <div 
        className="fixed inset-0 z-[60] bg-black flex flex-col justify-center animate-in fade-in duration-200"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* 大图 (原图) */}
        <img 
          src={`${API_BASE}/api/view/${currentPhoto.id}`} 
          className="w-full h-full object-contain"
          alt="Original"
        />
        
        {/* 顶部关闭栏 */}
        <div className="absolute top-0 left-0 w-full p-4 bg-gradient-to-b from-black/50 to-transparent flex justify-between items-center text-white">
          <button onClick={() => setPhotoIndex(-1)} className="p-2 bg-black/20 rounded-full backdrop-blur-md">
            <X size={24} />
          </button>
          <span className="text-sm font-medium">{photoIndex + 1} / {albumPhotos.length}</span>
        </div>
      </div>
    );
  };

  // B. 视频播放器 (Overlay)
  const renderVideoPlayer = () => {
    if (!selectedVideo) return null;
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col animate-in fade-in duration-200">
        <div className="w-full aspect-video bg-black sticky top-0 z-20 shadow-lg flex items-center justify-center">
          <video 
            src={`${API_BASE}/api/view/${selectedVideo.id}`} 
            controls autoPlay playsInline className="w-full h-full object-contain"
          />
          <button 
            onClick={() => setSelectedVideo(null)}
            className="absolute top-4 left-4 bg-black/50 p-2 rounded-full backdrop-blur-sm active:scale-90 transition-transform"
          >
            <ChevronLeft size={24} color="white" />
          </button>
        </div>
        <div className="p-4 text-white bg-gray-900 flex-1">
          <h1 className="text-lg font-bold">{selectedVideo.fileName}</h1>
        </div>
      </div>
    );
  };

  // C. 相册网格视图 (覆盖在首页之上)
  const renderAlbumGrid = () => {
    if (!currentAlbumFolder) return null;
    const folderName = currentAlbumFolder.split(/[/\\]/).pop();

    return (
      <div className="fixed inset-0 z-40 bg-white flex flex-col animate-in slide-in-from-right duration-300">
        {/* 顶部导航 */}
        <div className="h-14 bg-white border-b border-gray-100 flex items-center px-2 sticky top-0 z-10">
          <button onClick={() => setCurrentAlbumFolder(null)} className="p-2 active:bg-gray-100 rounded-full">
            <ChevronLeft size={24} className="text-gray-700" />
          </button>
          <div className="ml-2">
            <h2 className="text-base font-bold text-gray-800 line-clamp-1">{folderName}</h2>
            <p className="text-xs text-gray-400">{albumPhotos.length} 张照片</p>
          </div>
        </div>

        {/* 照片网格 (两列) */}
        <div className="flex-1 overflow-y-auto p-1 bg-gray-50">
          <div className="grid grid-cols-2 gap-1">
            {albumPhotos.map((photo, index) => (
              <div 
                key={photo.id} 
                className="aspect-square bg-gray-200 relative overflow-hidden cursor-pointer active:opacity-80"
                onClick={() => setPhotoIndex(index)} // 点击看大图
              >
                {/* 🔥 关键：这里使用 thumbnail 接口，节省流量 */}
                <img 
                  src={`${API_BASE}/api/thumbnail/${photo.id}`} 
                  className="w-full h-full object-cover"
                  loading="lazy"
                  alt=""
                />
              </div>
            ))}
          </div>
          {albumPhotos.length === 0 && (
            <div className="text-center py-20 text-gray-400 text-sm">加载中或没有照片...</div>
          )}
        </div>
      </div>
    );
  };

  // --- 主渲染 ---
  return (
    <>
      {/* 1. 大图查看器 (最高层级) */}
      {renderPhotoViewer()}
      
      {/* 2. 视频播放器 (第二层级) */}
      {renderVideoPlayer()}

      {/* 3. 相册网格 (第三层级) */}
      {renderAlbumGrid()}

      {/* 4. 首页 (底层) */}
      <div className="flex flex-col h-screen bg-gray-50 text-gray-800 font-sans">
        {/* 搜索栏 */}
        <div className="bg-white p-3 sticky top-0 z-10 shadow-sm">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input type="text" className="block w-full pl-9 pr-3 py-2 border border-gray-200 rounded-full bg-gray-100 text-sm" placeholder="搜索..." />
          </div>
        </div>

        {/* 首页瀑布流 */}
        <div className="flex-1 overflow-y-auto min-h-0 p-2" onScroll={handleHomeScroll}>
          {activeTab === '刷刷' ? (
            <div className="pb-4">
              <div className="grid grid-cols-2 gap-2">
                {homeFiles.map((file) => (
                  <div 
                    key={file.id} 
                    // 点击逻辑区分：是视频就看视频，是相册就进相册列表
                    onClick={() => {
                        if (file.mimeType === 'video') setSelectedVideo(file);
                        else openAlbum(file.folder);
                    }}
                    className="bg-white rounded-lg shadow-sm overflow-hidden flex flex-col cursor-pointer active:scale-95 transition-transform duration-100"
                  >
                    <div className="aspect-[16/10] bg-gray-200 relative group overflow-hidden">
                       {file.mimeType === 'video' ? (
                         <video 
                           src={`${API_BASE}/api/view/${file.id}#t=0.1`} 
                           className="w-full h-full object-cover pointer-events-none" 
                           muted preload="metadata" playsInline
                         />
                       ) : (
                         // 首页封面图也建议用缩略图，加载更快
                         <img 
                           src={`${API_BASE}/api/thumbnail/${file.id}`}
                           className="w-full h-full object-cover"
                           loading="lazy"
                           onError={(e) => (e.target as HTMLImageElement).src = `${API_BASE}/api/view/${file.id}`} // 降级处理
                         />
                       )}

                       {file.mimeType === 'video' ? (
                         <div className="absolute bottom-1 right-1 bg-black/60 backdrop-blur-sm text-white text-[10px] px-1.5 py-0.5 rounded flex items-center">
                            <PlayCircle size={10} className="mr-1"/> <span>Video</span>
                         </div>
                       ) : (
                         <div className="absolute bottom-1 right-1 bg-pink-600/80 backdrop-blur-sm text-white text-[10px] px-1.5 py-0.5 rounded flex items-center">
                            <ImageIcon size={10} className="mr-1"/> <span>{file.folder.split(/[/\\]/).pop()}</span>
                         </div>
                       )}
                    </div>
                    
                    <div className="p-2">
                      <p className="text-xs text-gray-700 line-clamp-2 leading-relaxed h-8 font-medium">
                        {file.mimeType === 'image' 
                          ? file.folder.split(/[/\\]/).pop() 
                          : file.fileName
                        }
                      </p>
                    </div>
                  </div>
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

        {/* 底部导航 */}
        <div className="bg-white border-t border-gray-100 safe-area-bottom shadow-[0_-1px_3px_rgba(0,0,0,0.02)]">
          <div className="flex justify-around items-center h-14">
            <TabItem icon={<Home size={22} />} label="首页" isActive={activeTab === '刷刷'} onClick={() => setActiveTab('刷刷')} />
            <TabItem icon={<FolderOpen size={22} />} label="频道" isActive={activeTab === '管理'} onClick={() => setActiveTab('管理')} />
            <TabItem icon={<BarChart2 size={22} />} label="动态" isActive={activeTab === '排名'} onClick={() => setActiveTab('排名')} />
            <TabItem icon={<User size={22} />} label="我的" isActive={activeTab === '我的'} onClick={() => setActiveTab('我的')} />
          </div>
        </div>
      </div>
    </>
  );
}

function TabItem({ icon, label, isActive, onClick }: TabItemProps) {
  return (
    <button onClick={onClick} className={`flex flex-col items-center justify-center w-full h-full space-y-0.5 active:bg-gray-50 transition-colors ${isActive ? 'text-pink-500' : 'text-gray-400'}`}>
      {icon} <span className="text-[10px] scale-90 font-medium">{label}</span>
    </button>
  );
}

export default App;
import { useState, useEffect} from 'react';
import axios from 'axios';
import { Home, FolderOpen, BarChart2, User, Search, ChevronLeft, PlayCircle } from 'lucide-react';

// 定义数据类型
interface MediaFile {
  id: number;
  fileName: string;
  filePath: string;
  thumbnailPath: string | null;
  type: string;
}

interface TabItemProps {
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
}

const API_BASE = 'http://localhost:3000';

function App() {
  // --- 状态定义 ---
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [page, setPage] = useState(1);         // 当前页码
  const [loading, setLoading] = useState(false); // 是否正在加载
  const [hasMore, setHasMore] = useState(true);  // 还有没有更多数据
  const [activeTab, setActiveTab] = useState('刷刷');
  
  // 详情页状态：如果有值，说明进入了详情页
  const [selectedFile, setSelectedFile] = useState<MediaFile | null>(null);

  // --- 核心逻辑：加载数据 ---
  const fetchFiles = async (pageNum: number) => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/api/files?page=${pageNum}`);
      const newFiles = res.data;

      if (newFiles.length === 0) {
        setHasMore(false); // 没数据了，以后不加载了
      } else {
        // 如果是第1页，直接覆盖；如果是翻页，追加到后面
        setFiles(prev => pageNum === 1 ? newFiles : [...prev, ...newFiles]);
      }
    } catch (error) {
      console.error("加载失败", error);
    } finally {
      setLoading(false);
    }
  };

  // 初始化加载第1页
  useEffect(() => {
    fetchFiles(1);
  }, );

  // --- 滚动监听 (无限刷) ---
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    // 只有在“列表模式”且“还有数据”时才触发
    if (selectedFile || !hasMore || loading) return;

    const { scrollTop, clientHeight, scrollHeight } = e.currentTarget;
    // 如果滚动条距离底部小于 50px，就开始加载下一页
    if (scrollHeight - scrollTop - clientHeight < 50) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchFiles(nextPage);
    }
  };

  // --- 渲染：详情页模式 (B站播放页) ---
  if (selectedFile) {
    return (
      <div className="flex flex-col h-screen bg-black text-white">
        {/* 顶部：视频播放区域 */}
        <div className="w-full aspect-video bg-black sticky top-0 z-20">
          <video 
            src={`${API_BASE}/api/view/${selectedFile.id}`} 
            controls 
            autoPlay 
            className="w-full h-full object-contain"
          />
          {/* 返回按钮 */}
          <button 
            onClick={() => setSelectedFile(null)}
            className="absolute top-4 left-4 bg-black/50 p-2 rounded-full backdrop-blur-sm"
          >
            <ChevronLeft size={24} color="white" />
          </button>
        </div>

        {/* 下部：文件详情 (可滚动) */}
        <div className="flex-1 overflow-y-auto bg-gray-900 p-4">
          <h1 className="text-lg font-bold mb-2 break-words">{selectedFile.fileName}</h1>
          
          <div className="flex items-center space-x-4 text-sm text-gray-400 mb-6">
            <span>ID: {selectedFile.id}</span>
            <span>类型: {selectedFile.fileName.split('.').pop()}</span>
          </div>

          <div className="border-t border-gray-800 pt-4">
            <h2 className="text-md font-semibold mb-3">相关推荐 (模拟)</h2>
            {/* 模拟一些推荐列表 */}
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="flex space-x-3 mb-4">
                <div className="w-32 h-20 bg-gray-800 rounded-lg flex-shrink-0"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-800 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-800 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // --- 渲染：列表模式 (刷刷) ---
  return (
    <div className="flex flex-col h-screen bg-gray-50 text-gray-800 font-sans">
      
      {/* 顶部搜索 */}
      <div className="bg-white p-4 sticky top-0 z-10 shadow-sm">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-full bg-gray-100 focus:bg-white focus:ring-1 focus:ring-pink-500 focus:outline-none transition-all text-sm"
            placeholder="搜索你感兴趣的视频..."
          />
        </div>
      </div>

      {/* 瀑布流内容区 (绑定了滚动事件) */}
      <div 
        className="flex-1 overflow-y-auto p-2" 
        onScroll={handleScroll}
      >
        {activeTab === '刷刷' ? (
          <div className="grid grid-cols-2 gap-2">
            {files.map((file) => (
              <div 
                key={file.id} 
                onClick={() => setSelectedFile(file)} // 点击进入详情页
                className="bg-white rounded-lg shadow-sm overflow-hidden flex flex-col cursor-pointer active:scale-95 transition-transform"
              >
                {/* 封面图 */}
                <div className="aspect-video bg-gray-200 relative">
                   {/* 这里暂时用 view 接口当封面，因为你的缩略图还没生成好 */}
                   {/* 如果文件是图片，直接显示；如果是视频，用 video 标签展示第一帧(简易版) */}
                   <img 
                      src={`${API_BASE}/api/view/${file.id}`}
                      alt={file.fileName}
                      className="w-full h-full object-cover"
                      loading="lazy"
                   />
                   {/* 视频角标 */}
                   <div className="absolute bottom-1 right-1 bg-black/60 text-white text-[10px] px-1 rounded flex items-center">
                      <PlayCircle size={10} className="mr-1"/> 
                      Video
                   </div>
                </div>
                {/* 标题 */}
                <div className="p-2">
                  <p className="text-xs text-gray-700 line-clamp-2 leading-relaxed h-8">
                    {file.fileName}
                  </p>
                </div>
              </div>
            ))}
            
            {/* 加载中提示 */}
            {loading && (
              <div className="col-span-2 text-center py-4 text-gray-400 text-sm">
                正在加载更多...
              </div>
            )}
            
            {!hasMore && files.length > 0 && (
              <div className="col-span-2 text-center py-4 text-gray-300 text-xs">
                - 已经到底啦 -
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            {activeTab} 功能开发中...
          </div>
        )}
      </div>

      {/* 底部导航栏 */}
      <div className="bg-white border-t border-gray-200 safe-area-bottom">
        <div className="flex justify-around items-center h-14">
          <TabItem icon={<Home size={22} />} label="首页" isActive={activeTab === '刷刷'} onClick={() => setActiveTab('刷刷')} />
          <TabItem icon={<FolderOpen size={22} />} label="频道" isActive={activeTab === '管理'} onClick={() => setActiveTab('管理')} />
          <TabItem icon={<BarChart2 size={22} />} label="动态" isActive={activeTab === '排名'} onClick={() => setActiveTab('排名')} />
          <TabItem icon={<User size={22} />} label="我的" isActive={activeTab === '我的'} onClick={() => setActiveTab('我的')} />
        </div>
      </div>
    </div>
  );
}

// 底部按钮组件
function TabItem({ icon, label, isActive, onClick }: TabItemProps) {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center justify-center w-full h-full space-y-0.5 ${
        isActive ? 'text-pink-500' : 'text-gray-400'
      }`}
    >
      {icon}
      <span className="text-[10px] scale-90">{label}</span>
    </button>
  );
}

export default App;
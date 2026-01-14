import React from 'react';
import { Home, FolderOpen, BarChart2, User } from 'lucide-react';

interface BottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange }) => {
  return (
    <div className="bg-white border-t border-gray-100 safe-area-bottom shadow-[0_-1px_3px_rgba(0,0,0,0.02)]">
      <div className="flex justify-around items-center h-14">
        <TabItem icon={<Home size={22} />} label="首页" isActive={activeTab === '刷刷'} onClick={() => onTabChange('刷刷')} />
        <TabItem icon={<FolderOpen size={22} />} label="频道" isActive={activeTab === '管理'} onClick={() => onTabChange('管理')} />
        <TabItem icon={<BarChart2 size={22} />} label="动态" isActive={activeTab === '排名'} onClick={() => onTabChange('排名')} />
        <TabItem icon={<User size={22} />} label="我的" isActive={activeTab === '我的'} onClick={() => onTabChange('我的')} />
      </div>
    </div>
  );
};

// 修复点：将 icon 的类型从 any 改为 React.ReactNode
function TabItem({ icon, label, isActive, onClick }: { 
  icon: React.ReactNode, 
  label: string, 
  isActive: boolean, 
  onClick: () => void 
}) {
  return (
    <button 
      onClick={onClick} 
      className={`flex flex-col items-center justify-center w-full h-full space-y-0.5 active:bg-gray-50 transition-colors ${
        isActive ? 'text-pink-500' : 'text-gray-400'
      }`}
    >
      {icon} 
      <span className="text-[10px] scale-90 font-medium">{label}</span>
    </button>
  );
}
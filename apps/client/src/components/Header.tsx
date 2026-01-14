import React from 'react';
import { Search } from 'lucide-react';

export const Header: React.FC = () => {
  return (
    <div className="bg-white p-3 sticky top-0 z-10 shadow-sm">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-gray-400" />
        </div>
        <input 
          type="text" 
          className="block w-full pl-9 pr-3 py-2 border border-gray-200 rounded-full bg-gray-100 text-sm" 
          placeholder="搜索..." 
        />
      </div>
    </div>
  );
};
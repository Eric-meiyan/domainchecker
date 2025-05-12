import React, { useState, useEffect, useRef } from 'react';

interface TldOption {
  name: string;
  displayName: string;
}

interface TldSelectorProps {
  onSelectionChange: (selectedTlds: string[]) => void;
}

export default function TldSelector({ onSelectionChange }: TldSelectorProps) {
  const [tlds, setTlds] = useState<TldOption[]>([]);
  const [selectedTlds, setSelectedTlds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const initialSelectionSent = useRef(false);

  // 加载可用的TLD列表
  useEffect(() => {
    const fetchTlds = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/domain-check');
        
        if (!response.ok) {
          throw new Error(`Error loading TLDs: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success && Array.isArray(data.tlds)) {
          setTlds(data.tlds);
          // 默认选择前3个TLD
          const defaultSelected = data.tlds.slice(0, 3).map((tld: TldOption) => tld.name);
          setSelectedTlds(defaultSelected);
          
          // 只在初始加载时发送一次默认选择
          if (!initialSelectionSent.current) {
            onSelectionChange(defaultSelected);
            initialSelectionSent.current = true;
          }
        } else {
          throw new Error('Invalid response format');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load TLDs');
        console.error('Failed to load TLDs:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTlds();
  }, []); // 不再依赖onSelectionChange，只在组件挂载时执行一次

  // 处理TLD选择变更
  const handleTldChange = (tld: string, isChecked: boolean) => {
    let newSelected: string[];
    
    if (isChecked) {
      newSelected = [...selectedTlds, tld];
    } else {
      newSelected = selectedTlds.filter(item => item !== tld);
    }
    
    setSelectedTlds(newSelected);
    onSelectionChange(newSelected);
  };

  if (loading) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg">
        <p className="text-gray-500">Loading TLD options...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 rounded-lg">
        <p className="text-red-500">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="mt-4">
      <h3 className="text-lg font-medium mb-2">Select TLDs</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
        {tlds.map((tld) => (
          <div key={tld.name} className="flex items-center">
            <input
              id={`tld-${tld.name}`}
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              checked={selectedTlds.includes(tld.name)}
              onChange={(e) => handleTldChange(tld.name, e.target.checked)}
            />
            <label htmlFor={`tld-${tld.name}`} className="ml-2 text-sm text-gray-700">
              {tld.displayName}
            </label>
          </div>
        ))}
      </div>
      {selectedTlds.length === 0 && (
        <p className="mt-2 text-sm text-red-500">Please select at least one TLD</p>
      )}
    </div>
  );
} 
import React, { useState, useCallback } from 'react';

interface KeywordInputProps {
  onKeywordsChange: (keywords: string[]) => void;
}

export default function KeywordInput({ onKeywordsChange }: KeywordInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [keywords, setKeywords] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    
    // 清除错误提示
    if (error) {
      setError(null);
    }
  }, [error]);

  const handleAddKeywords = useCallback(() => {
    if (!inputValue.trim()) {
      setError('Please enter at least one keyword');
      return;
    }

    // 按逗号分隔并清理关键词
    const newKeywords = inputValue
      .split(',')
      .map(kw => kw.trim())
      .filter(kw => kw.length > 0);
    
    // 验证关键词格式
    const invalidKeywords = newKeywords.filter(kw => !isValidKeyword(kw));
    if (invalidKeywords.length > 0) {
      setError(`Invalid keywords: ${invalidKeywords.join(', ')}`);
      return;
    }
    
    // 更新关键词列表
    setKeywords(newKeywords);
    onKeywordsChange(newKeywords);
    setError(null);
  }, [inputValue, onKeywordsChange]);

  // 验证关键词格式 (只允许字母、数字和连字符)
  const isValidKeyword = (keyword: string): boolean => {
    return /^[a-zA-Z0-9-]+$/.test(keyword);
  };

  return (
    <div className="mt-4">
      <h3 className="text-lg font-medium mb-2">Enter Domain Keywords</h3>
      <p className="text-sm text-gray-600 mb-2">
        Enter one or more keywords separated by commas (e.g. blog,news,tech)
      </p>
      
      <textarea
        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        rows={3}
        value={inputValue}
        onChange={handleInputChange}
        placeholder="Enter keywords separated by commas, e.g. blog,news,tech"
      />
      
      {error && (
        <p className="mt-2 text-sm text-red-500">{error}</p>
      )}
      
      <button
        className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        onClick={handleAddKeywords}
      >
        Update Keywords
      </button>
      
      {keywords.length > 0 && (
        <div className="mt-4">
          <h4 className="text-sm font-medium text-gray-700">Current Keywords:</h4>
          <div className="mt-2 flex flex-wrap gap-2">
            {keywords.map((keyword, index) => (
              <span 
                key={index} 
                className="inline-flex items-center px-2.5 py-0.5 rounded-md text-sm font-medium bg-blue-100 text-blue-800"
              >
                {keyword}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 
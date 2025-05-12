'use client';

import React, { useState, useCallback } from 'react';
import KeywordInput from './components/KeywordInput';
import TldSelector from './components/TldSelector';
import ResultsDisplay from './components/ResultsDisplay';
import { DomainCheckResult } from './services/DomainCheckService';

export default function Home() {
  const [keywords, setKeywords] = useState<string[]>([]);
  const [selectedTlds, setSelectedTlds] = useState<string[]>([]);
  const [results, setResults] = useState<DomainCheckResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleKeywordsChange = useCallback((newKeywords: string[]) => {
    setKeywords(newKeywords);
  }, []);

  const handleTldChange = useCallback((newTlds: string[]) => {
    setSelectedTlds(newTlds);
  }, []);

  const handleSearch = async () => {
    // 验证输入
    if (keywords.length === 0) {
      setError('Please enter at least one keyword');
      return;
    }

    if (selectedTlds.length === 0) {
      setError('Please select at least one TLD');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setResults([]); // 清空之前的结果
      
      console.log('Sending domain check request:', { keywords, tlds: selectedTlds });
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60秒超时
      
      const response = await fetch('/api/domain-check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          keywords,
          tlds: selectedTlds,
        }),
        signal: controller.signal,
      }).finally(() => clearTimeout(timeoutId));

      // 检查响应状态
      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        
        // 如果是JSON响应，尝试解析错误信息
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Server error: ${response.status}`);
        } else {
          // 如果不是JSON，显示通用错误
          const text = await response.text();
          console.error('Non-JSON response:', text.substring(0, 500));
          throw new Error(`Connection error. Please try with fewer TLDs or domains.`);
        }
      }

      const data = await response.json();
      console.log('Domain check response:', data);

      if (data.success && Array.isArray(data.results)) {
        setResults(data.results);
        
        // 显示适当的提示信息
        if (data.limitApplied) {
          let limitMessage = '';
          
          if (data.totalRequestedKeywords > data.totalProcessedKeywords) {
            limitMessage += `Only the first ${data.totalProcessedKeywords} of ${data.totalRequestedKeywords} keywords were processed. `;
          }
          
          if (data.totalRequestedTlds > data.totalProcessedTlds) {
            limitMessage += `Only the first ${data.totalProcessedTlds} of ${data.totalRequestedTlds} TLDs were processed. `;
          }
          
          limitMessage += 'This limitation helps prevent server overload.';
          setError(limitMessage);
        }
        
        // 检查是否有错误的结果
        const errorsCount = data.results.filter((result: DomainCheckResult) => result.error).length;
        if (errorsCount > 0) {
          const totalCount = data.results.length;
          const errorPercent = Math.round((errorsCount / totalCount) * 100);
          
          if (errorPercent > 30) {
            // 如果超过30%的查询出错，显示警告
            setError(`Note: ${errorsCount} out of ${totalCount} (${errorPercent}%) domain queries failed. This might be due to rate limits or connectivity issues with WHOIS servers.`);
          }
        }
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err) {
      console.error('Domain check error:', err);
      
      if (err instanceof DOMException && err.name === 'AbortError') {
        setError('Request timed out. Please try with fewer TLDs or keywords.');
      } else {
        setError(err instanceof Error ? err.message : 'An error occurred during domain check');
      }
      
      // 即使发生错误，也显示部分结果（如果有的话）
      if (results.length > 0) {
        setError((prevError) => `${prevError || ''} Some results are displayed below, but they may be incomplete.`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900">Domain Availability Checker</h1>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white shadow rounded-lg p-6">
            <KeywordInput onKeywordsChange={handleKeywordsChange} />
            
            <TldSelector onSelectionChange={handleTldChange} />
            
            <div className="mt-6">
              <button
                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                onClick={handleSearch}
                disabled={keywords.length === 0 || selectedTlds.length === 0 || loading}
              >
                {loading ? 'Checking...' : 'Check Domain Availability'}
              </button>
            </div>
            
            {error && !loading && (
              <div className="mt-4 p-3 bg-yellow-50 rounded-md">
                <p className="text-yellow-800">{error}</p>
              </div>
            )}
          </div>
          
          <ResultsDisplay 
            results={results} 
            loading={loading} 
            error={error && loading ? error : null} 
          />
        </div>
      </main>
      
      <footer className="bg-white shadow-inner mt-8">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <p className="text-center text-gray-500 text-sm">
            Domain MegaBot - Check domain availability across multiple TLDs
          </p>
        </div>
      </footer>
    </div>
  );
}

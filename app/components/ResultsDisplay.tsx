import React from 'react';
import { DomainCheckResult } from '@/app/services/DomainCheckService';

interface ResultsDisplayProps {
  results: DomainCheckResult[];
  loading: boolean;
  error: string | null;
}

export default function ResultsDisplay({ results, loading, error }: ResultsDisplayProps) {
  // 按可用性和字母顺序排序结果
  const sortedResults = [...results].sort((a, b) => {
    // 首先按可用性排序（可用的排在前面）
    if (a.available !== b.available) {
      return a.available ? -1 : 1;
    }
    // 其次按域名字母顺序排序
    return a.domain.localeCompare(b.domain);
  });

  // 按TLD分组结果
  const resultsByTld: Record<string, DomainCheckResult[]> = {};
  sortedResults.forEach(result => {
    if (!resultsByTld[result.tld]) {
      resultsByTld[result.tld] = [];
    }
    resultsByTld[result.tld].push(result);
  });

  if (loading) {
    return (
      <div className="mt-8 p-6 bg-gray-50 rounded-lg">
        <div className="flex justify-center items-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
          <p className="ml-3 text-gray-600">Checking domain availability...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-8 p-6 bg-red-50 rounded-lg">
        <h3 className="text-lg font-medium text-red-800">Error</h3>
        <p className="mt-2 text-red-700">{error}</p>
      </div>
    );
  }

  if (results.length === 0) {
    return null;
  }

  const availableDomains = results.filter(r => r.available);
  const unavailableDomains = results.filter(r => !r.available);

  return (
    <div className="mt-8">
      <h2 className="text-xl font-bold mb-4">Domain Check Results</h2>
      
      <div className="mb-4 grid grid-cols-2 gap-4 text-center">
        <div className="p-4 bg-green-50 rounded-lg">
          <span className="text-2xl font-bold text-green-600">{availableDomains.length}</span>
          <p className="text-green-800">Available Domains</p>
        </div>
        <div className="p-4 bg-red-50 rounded-lg">
          <span className="text-2xl font-bold text-red-600">{unavailableDomains.length}</span>
          <p className="text-red-800">Unavailable Domains</p>
        </div>
      </div>

      {Object.entries(resultsByTld).map(([tld, tldResults]) => (
        <div key={tld} className="mb-6">
          <h3 className="text-lg font-medium mb-2">.{tld} Domains</h3>
          <div className="bg-white shadow overflow-hidden rounded-md">
            <ul className="divide-y divide-gray-200">
              {tldResults.map((result) => (
                <li key={result.domain} className="px-4 py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <span className={`inline-block w-3 h-3 rounded-full mr-3 ${result.available ? 'bg-green-500' : 'bg-red-500'}`}></span>
                      <span className="text-gray-900 font-medium">{result.domain}</span>
                    </div>
                    {result.available ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-sm font-medium bg-green-100 text-green-800">
                        Available
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-sm font-medium bg-red-100 text-red-800">
                        Unavailable
                      </span>
                    )}
                  </div>
                  {result.error && (
                    <p className="mt-1 text-sm text-red-600">Error: {result.error}</p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      ))}
    </div>
  );
} 
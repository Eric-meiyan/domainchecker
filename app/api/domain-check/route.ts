import { NextRequest, NextResponse } from 'next/server';
import { domainCheckService } from '@/app/services/DomainCheckService';

// 确保服务已初始化
let serviceInitialized = false;

/**
 * 初始化域名检查服务
 */
async function initializeService() {
  if (!serviceInitialized) {
    console.log('Initializing Domain Check Service...');
    await domainCheckService.initialize();
    serviceInitialized = true;
    console.log('Domain Check Service initialized');
  }
}

// 获取所有可用的TLD
export async function GET() {
  console.log('GET /api/domain-check - Fetching TLDs');
  try {
    await initializeService();
    const tlds = domainCheckService.getEnabledTlds();
    
    console.log(`GET /api/domain-check - Found ${tlds.length} TLDs`);
    return NextResponse.json({
      success: true,
      tlds: tlds.map(tld => ({
        name: tld.name,
        displayName: tld.displayName
      }))
    });
  } catch (error) {
    console.error('Error fetching TLDs:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch TLDs' },
      { status: 500 }
    );
  }
}

// 检查域名可用性
export async function POST(request: NextRequest) {
  console.log('POST /api/domain-check - Starting domain check');
  
  // 统一的错误处理函数，确保返回JSON响应
  const handleError = (error: any, status: number = 500) => {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error('Error in domain check API:', errorMessage);
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status }
    );
  };
  
  try {
    // 初始化服务
    await initializeService();
    
    // 解析请求体
    let body;
    try {
      body = await request.json();
    } catch (err) {
      console.error('Error parsing request body:', err);
      return handleError('Invalid JSON in request body', 400);
    }
    
    console.log('POST /api/domain-check - Request body:', body);
    
    // 验证请求参数
    if (!body.keywords || !Array.isArray(body.keywords) || body.keywords.length === 0) {
      console.error('POST /api/domain-check - Missing keywords');
      return handleError('Keywords are required', 400);
    }
    
    if (!body.tlds || !Array.isArray(body.tlds) || body.tlds.length === 0) {
      console.error('POST /api/domain-check - Missing TLDs');
      return handleError('TLDs are required', 400);
    }
    
    // 处理关键词，按逗号拆分并清理空格
    const processedKeywords: string[] = [];
    
    body.keywords.forEach((keyword: string) => {
      if (typeof keyword === 'string') {
        const splitKeywords = keyword
          .split(',')
          .map((k: string) => k.trim())
          .filter((k: string) => k.length > 0);
        processedKeywords.push(...splitKeywords);
      }
    });
    
    if (processedKeywords.length === 0) {
      console.error('POST /api/domain-check - No valid keywords after processing');
      return handleError('No valid keywords provided', 400);
    }
    
    console.log(`POST /api/domain-check - Processing ${processedKeywords.length} keywords for ${body.tlds.length} TLDs`);
    
    // 限制关键词数量，防止过多请求
    const maxKeywords = 10; // 降低上限以减少同时进行的请求
    const limitedKeywords = processedKeywords.slice(0, maxKeywords);
    const limitApplied = processedKeywords.length > maxKeywords;
    
    // 限制TLD数量
    const maxTlds = 10; // 设置TLD数量上限
    const limitedTlds = body.tlds.slice(0, maxTlds);
    const tldsLimitApplied = body.tlds.length > maxTlds;
    
    // 执行域名检查
    const results = await domainCheckService.checkDomains(limitedKeywords, limitedTlds);
    
    console.log(`POST /api/domain-check - Check completed with ${results.length} results`);
    
    return NextResponse.json({
      success: true,
      results,
      limitApplied: limitApplied || tldsLimitApplied,
      totalRequestedKeywords: processedKeywords.length,
      totalProcessedKeywords: limitedKeywords.length,
      totalRequestedTlds: body.tlds.length,
      totalProcessedTlds: limitedTlds.length
    });
  } catch (error) {
    return handleError(error);
  }
} 
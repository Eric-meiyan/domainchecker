import * as dns from 'dns';
import * as net from 'net';
import { promises as fs } from 'fs';
import path from 'path';

// 定义TLD配置接口
export interface TldConfig {
  name: string;
  server: string;
  availablePattern: string;
  enabled: boolean;
  displayName: string;
}

// 定义域名检查结果接口
export interface DomainCheckResult {
  domain: string;
  available: boolean;
  tld: string;
  timestamp: number;
  error?: string;
}

export class DomainCheckService {
  private tldConfigs: TldConfig[] = [];
  
  constructor() {}
  
  /**
   * 初始化服务，加载TLD配置
   */
  async initialize(): Promise<void> {
    try {
      // 首先尝试从应用根目录加载配置
      const configPath = path.join(process.cwd(), 'app/config/tld-config.json');
      console.log('Loading TLD config from:', configPath);
      
      try {
        const configData = await fs.readFile(configPath, 'utf8');
        const config = JSON.parse(configData);
        
        if (!config.tlds || !Array.isArray(config.tlds)) {
          throw new Error('Invalid TLD configuration format');
        }
        
        this.tldConfigs = config.tlds;
        console.log(`Loaded ${this.tldConfigs.length} TLD configurations`);
      } catch (readError) {
        console.error('Error reading config file:', readError);
        
        // 如果读取失败，使用默认配置
        console.log('Using default TLD configuration');
        this.tldConfigs = [
          {
            name: "com",
            server: "whois.verisign-grs.com",
            availablePattern: "No match for",
            enabled: true,
            displayName: ".com"
          },
          {
            name: "net",
            server: "whois.verisign-grs.com",
            availablePattern: "No match for",
            enabled: true,
            displayName: ".net"
          },
          {
            name: "org",
            server: "whois.pir.org",
            availablePattern: "NOT FOUND",
            enabled: true,
            displayName: ".org"
          }
        ];
      }
    } catch (error) {
      console.error('Failed to initialize Domain Check Service:', error);
      throw new Error('Failed to initialize Domain Check Service');
    }
  }
  
  /**
   * 获取所有可用的TLD配置
   */
  getEnabledTlds(): TldConfig[] {
    return this.tldConfigs.filter(tld => tld.enabled);
  }
  
  /**
   * 检查多个关键词在多个TLD下的域名可用性
   */
  async checkDomains(keywords: string[], tlds: string[]): Promise<DomainCheckResult[]> {
    // 验证请求的TLD是否在配置中
    const validTlds = tlds.filter(tld => this.tldConfigs.some(config => config.name === tld && config.enabled));
    
    if (validTlds.length === 0) {
      throw new Error('No valid TLDs selected');
    }
    
    // 生成所有需要检查的域名组合
    const domainsToCheck: {domain: string, tld: string, server: string, pattern: string}[] = [];
    
    for (const keyword of keywords) {
      for (const tld of validTlds) {
        const tldConfig = this.tldConfigs.find(config => config.name === tld);
        if (tldConfig) {
          domainsToCheck.push({
            domain: `${keyword}.${tld}`,
            tld: tld,
            server: tldConfig.server,
            pattern: tldConfig.availablePattern
          });
        }
      }
    }
    
    console.log(`Checking ${domainsToCheck.length} domains...`);
    
    // 并行执行域名检查，但限制并发数量以避免过多连接
    const results: DomainCheckResult[] = [];
    const concurrencyLimit = 3; // 降低并发数，避免过多连接导致网络错误
    const chunks = [];
    
    // 将查询分组处理
    for (let i = 0; i < domainsToCheck.length; i += concurrencyLimit) {
      chunks.push(domainsToCheck.slice(i, i + concurrencyLimit));
    }
    
    // 逐个处理分组
    for (const chunk of chunks) {
      try {
        const chunkPromises = chunk.map(item => 
          this.checkSingleDomain(item.domain, item.server, item.pattern, item.tld)
        );
        
        const chunkResults = await Promise.allSettled(chunkPromises);
        
        // 处理每个Promise的结果
        chunkResults.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            results.push(result.value);
          } else {
            // 如果Promise被拒绝，添加一个错误结果
            const item = chunk[index];
            results.push({
              domain: item.domain,
              available: false,
              tld: item.tld,
              timestamp: Date.now(),
              error: `Error: ${result.reason?.message || 'Unknown error'}`
            });
          }
        });
        
        // 在每个批次之间添加短暂延迟，避免请求过于密集
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error('Error processing domain check chunk:', error);
        // 继续处理下一个批次，不中断整个过程
      }
    }
    
    return results;
  }
  
  /**
   * 检查单个域名的可用性
   */
  private async checkSingleDomain(
    domain: string, 
    whoisServer: string, 
    availablePattern: string,
    tld: string
  ): Promise<DomainCheckResult> {
    console.log(`Checking domain: ${domain}`);
    
    const result: DomainCheckResult = {
      domain,
      available: false,
      tld,
      timestamp: Date.now()
    };
    
    try {
      const response = await this.whoisQuery(whoisServer, domain);
      result.available = response.includes(availablePattern);
      console.log(`Domain ${domain} is ${result.available ? 'available' : 'not available'}`);
    } catch (error) {
      result.error = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Error checking domain ${domain}:`, error);
    }
    
    return result;
  }
  
  /**
   * 将主机名解析为IP地址
   */
  private async hostnameToIp(hostname: string): Promise<string> {
    return new Promise((resolve, reject) => {
      // 增加DNS超时处理
      const timeout = setTimeout(() => {
        reject(new Error('DNS lookup timeout'));
      }, 5000);
      
      dns.lookup(hostname, (err, address) => {
        clearTimeout(timeout);
        if (err) {
          reject(err);
          return;
        }
        resolve(address);
      });
    });
  }
  
  /**
   * 向WHOIS服务器发送查询请求
   */
  private async whoisQuery(server: string, query: string): Promise<string> {
    return new Promise<string>(async (resolve, reject) => {
      let ip: string;
      try {
        // 检查服务器地址是否有效
        if (!server || server.trim() === '') {
          throw new Error('Invalid WHOIS server address');
        }
        
        // 确保不使用URL.canParse (Node.js 20+的API)
        try {
          ip = await this.hostnameToIp(server);
          console.log(`Resolved ${server} to ${ip}`);
        } catch (err) {
          console.error(`Failed to resolve hostname ${server}:`, err);
          reject(new Error(`Failed to resolve hostname: ${err instanceof Error ? err.message : 'unknown error'}`));
          return;
        }
      } catch (err) {
        reject(new Error(`Invalid server address: ${err instanceof Error ? err.message : 'unknown error'}`));
        return;
      }

      const socket = new net.Socket();
      let response = '';
      let connectTimeout: NodeJS.Timeout;
      let dataTimeout: NodeJS.Timeout;

      // 设置连接超时
      connectTimeout = setTimeout(() => {
        if (!socket.destroyed) {
          socket.destroy();
          reject(new Error(`Connection timeout for ${server}`));
        }
      }, 5000); // 减少超时时间

      socket.connect(43, ip, () => {
        clearTimeout(connectTimeout);
        
        // 成功连接后，发送查询请求
        socket.write(`${query}\r\n`);
        
        // 设置数据接收超时
        dataTimeout = setTimeout(() => {
          if (!socket.destroyed) {
            socket.destroy();
            reject(new Error(`Data receive timeout for ${server}`));
          }
        }, 5000); // 减少超时时间
      });

      socket.on('data', (data: Buffer) => {
        // 收到数据，清除数据超时计时器并重新设置
        if (dataTimeout) clearTimeout(dataTimeout);
        
        response += data.toString();
        
        // 重新设置数据接收超时
        dataTimeout = setTimeout(() => {
          socket.end(); // 认为已经接收完毕，正常关闭连接
        }, 1000); // 减少超时时间
      });

      socket.on('close', () => {
        if (dataTimeout) clearTimeout(dataTimeout);
        resolve(response);
      });

      socket.on('error', (err: Error) => {
        console.error(`Socket error for ${server}:`, err);
        if (connectTimeout) clearTimeout(connectTimeout);
        if (dataTimeout) clearTimeout(dataTimeout);
        reject(new Error(`Failed to connect to WHOIS server: ${err.message}`));
      });
    });
  }
}

// 创建单例实例
export const domainCheckService = new DomainCheckService(); 
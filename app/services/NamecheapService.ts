import axios from 'axios';
import crypto from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';

interface NamecheapConfig {
  apiUser: string;
  apiKey: string;
  clientIp: string;
  useSandbox: boolean;
}

interface TldInfo {
  Name: string;
  Type: string;
  MinLength: number;
  MaxLength: number;
  Category: string;
}

export class NamecheapService {
  private config!: NamecheapConfig;
  private baseUrl: string;

  constructor() {
    this.baseUrl = 'https://api.namecheap.com/xml.response';
  }

  /**
   * 初始化服务，加载配置
   */
  async initialize(): Promise<void> {
    try {
      const configPath = path.join(process.cwd(), 'app/config/namecheap-config.json');
      const configData = await fs.readFile(configPath, 'utf8');
      this.config = JSON.parse(configData);

      // 根据配置决定是否使用沙箱环境
      if (this.config.useSandbox) {
        this.baseUrl = 'https://api.sandbox.namecheap.com/xml.response';
      }
    } catch (error) {
      console.error('Failed to initialize Namecheap Service:', error);
      throw new Error('Failed to initialize Namecheap Service');
    }
  }

  /**
   * 生成 API 请求所需的签名
   */
  private generateSignature(): string {
    const timestamp = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const signatureString = this.config.apiUser + this.config.apiKey + timestamp;
    return crypto.createHash('md5').update(signatureString).digest('hex');
  }

  /**
   * 获取 TLD 列表
   * @returns 返回 TLD 信息数组
   */
  async getTldList(): Promise<TldInfo[]> {
    try {
      const params = new URLSearchParams({
        ApiUser: this.config.apiUser,
        ApiKey: this.config.apiKey,
        UserName: this.config.apiUser,
        Command: 'namecheap.domains.getTldList',
        ClientIp: this.config.clientIp,
        Signature: this.generateSignature()
      });

      const response = await axios.get(`${this.baseUrl}?${params.toString()}`);
      
      // 检查响应状态
      if (response.status !== 200) {
        throw new Error(`API request failed with status ${response.status}`);
      }

      // 解析 XML 响应
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(response.data, 'text/xml');

      // 检查 API 响应状态
      const status = xmlDoc.getElementsByTagName('Status')[0]?.textContent;
      if (status !== 'OK') {
        const errors = xmlDoc.getElementsByTagName('Errors');
        const errorMessage = errors[0]?.textContent || 'Unknown error';
        throw new Error(`API Error: ${errorMessage}`);
      }

      // 提取 TLD 信息
      const tldList = xmlDoc.getElementsByTagName('Tld');
      const tlds: TldInfo[] = [];

      for (let i = 0; i < tldList.length; i++) {
        const tld = tldList[i];
        tlds.push({
          Name: tld.getAttribute('Name') || '',
          Type: tld.getAttribute('Type') || '',
          MinLength: parseInt(tld.getAttribute('MinLength') || '0'),
          MaxLength: parseInt(tld.getAttribute('MaxLength') || '0'),
          Category: tld.getAttribute('Category') || ''
        });
      }

      return tlds;
    } catch (error) {
      console.error('Error fetching TLD list:', error);
      throw new Error('Failed to fetch TLD list from Namecheap API');
    }
  }

  /**
   * 将 TLD 列表保存到配置文件
   * @param tlds TLD 信息数组
   */
  async saveTldListToConfig(tlds: TldInfo[]): Promise<void> {
    try {
      // 转换为我们的 TLD 配置格式
      const tldConfigs = tlds.map(tld => ({
        name: tld.Name.toLowerCase(),
        server: this.getWhoisServer(tld.Name), // 需要实现这个方法
        availablePattern: this.getAvailablePattern(tld.Name), // 需要实现这个方法
        enabled: true,
        displayName: `.${tld.Name.toLowerCase()}`,
        minLength: tld.MinLength,
        maxLength: tld.MaxLength,
        category: tld.Category
      }));

      // 保存到配置文件
      const configPath = path.join(process.cwd(), 'app/config/tld-config.json');
      await fs.writeFile(
        configPath,
        JSON.stringify({ tlds: tldConfigs }, null, 2),
        'utf8'
      );

      console.log(`Successfully saved ${tldConfigs.length} TLD configurations`);
    } catch (error) {
      console.error('Error saving TLD list to config:', error);
      throw new Error('Failed to save TLD list to configuration');
    }
  }

  /**
   * 获取指定 TLD 的 WHOIS 服务器
   * 注意：这是一个示例实现，实际使用时需要维护一个完整的映射表
   */
  private getWhoisServer(tld: string): string {
    const serverMap: { [key: string]: string } = {
      'com': 'whois.verisign-grs.com',
      'net': 'whois.verisign-grs.com',
      'org': 'whois.pir.org',
      // 添加更多 TLD 的 WHOIS 服务器映射
    };
    return serverMap[tld.toLowerCase()] || `whois.${tld.toLowerCase()}.com`;
  }

  /**
   * 获取指定 TLD 的可用性匹配模式
   * 注意：这是一个示例实现，实际使用时需要维护一个完整的映射表
   */
  private getAvailablePattern(tld: string): string {
    const patternMap: { [key: string]: string } = {
      'com': 'No match for',
      'net': 'No match for',
      'org': 'NOT FOUND',
      // 添加更多 TLD 的匹配模式
    };
    return patternMap[tld.toLowerCase()] || 'No match for';
  }
}

// 创建单例实例
export const namecheapService = new NamecheapService(); 
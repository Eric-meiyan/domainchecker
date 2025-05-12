declare module '@/app/services/DomainCheckService' {
  export interface TldConfig {
    name: string;
    server: string;
    availablePattern: string;
    enabled: boolean;
    displayName: string;
  }
  
  export interface DomainCheckResult {
    domain: string;
    available: boolean;
    tld: string;
    timestamp: number;
    error?: string;
  }
  
  export class DomainCheckService {
    initialize(): Promise<void>;
    getEnabledTlds(): TldConfig[];
    checkDomains(keywords: string[], tlds: string[]): Promise<DomainCheckResult[]>;
  }
  
  export const domainCheckService: DomainCheckService;
} 
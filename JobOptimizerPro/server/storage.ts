import { 
  jobs, 
  optimizations, 
  configurations, 
  analytics, 
  keywords,
  type Job, 
  type InsertJob,
  type Optimization,
  type InsertOptimization,
  type Configuration,
  type InsertConfiguration,
  type Analytics,
  type InsertAnalytics,
  type Keyword,
  type InsertKeyword
} from "@shared/schema";

export interface IStorage {
  // Jobs
  getJob(id: number): Promise<Job | undefined>;
  getJobByWpId(wpJobId: number): Promise<Job | undefined>;
  getJobs(status?: string): Promise<Job[]>;
  createJob(job: InsertJob): Promise<Job>;
  updateJob(id: number, job: Partial<InsertJob>): Promise<Job | undefined>;
  deleteJob(id: number): Promise<boolean>;

  // Optimizations
  getOptimization(id: number): Promise<Optimization | undefined>;
  getOptimizationsByJobId(jobId: number): Promise<Optimization[]>;
  getRecentOptimizations(limit?: number): Promise<Optimization[]>;
  createOptimization(optimization: InsertOptimization): Promise<Optimization>;

  // Configurations
  getConfiguration(key: string): Promise<Configuration | undefined>;
  getConfigurations(): Promise<Configuration[]>;
  setConfiguration(config: InsertConfiguration): Promise<Configuration>;
  updateConfiguration(key: string, value: string): Promise<Configuration | undefined>;

  // Analytics
  getAnalytics(date?: Date): Promise<Analytics | undefined>;
  getAnalyticsRange(startDate: Date, endDate: Date): Promise<Analytics[]>;
  createAnalytics(analytics: InsertAnalytics): Promise<Analytics>;
  updateAnalytics(date: Date, analytics: Partial<InsertAnalytics>): Promise<Analytics | undefined>;

  // Keywords
  getKeyword(term: string): Promise<Keyword | undefined>;
  getTopKeywords(limit?: number): Promise<Keyword[]>;
  createKeyword(keyword: InsertKeyword): Promise<Keyword>;
  updateKeyword(term: string, keyword: Partial<InsertKeyword>): Promise<Keyword | undefined>;
}

export class MemStorage implements IStorage {
  private jobs: Map<number, Job>;
  private optimizations: Map<number, Optimization>;
  private configurations: Map<string, Configuration>;
  private analytics: Map<string, Analytics>;
  private keywords: Map<string, Keyword>;
  private currentJobId: number;
  private currentOptimizationId: number;
  private currentConfigId: number;
  private currentAnalyticsId: number;
  private currentKeywordId: number;

  constructor() {
    this.jobs = new Map();
    this.optimizations = new Map();
    this.configurations = new Map();
    this.analytics = new Map();
    this.keywords = new Map();
    this.currentJobId = 1;
    this.currentOptimizationId = 1;
    this.currentConfigId = 1;
    this.currentAnalyticsId = 1;
    this.currentKeywordId = 1;

    // Initialize with default configurations
    this.initializeDefaultConfigs();
    this.initializeDefaultAnalytics();
    this.initializeDefaultKeywords();
  }

  private async initializeDefaultConfigs() {
    const defaultConfigs = [
      { key: "wp_site_url", value: "https://wizadmissions.info", description: "WordPress site URL" },
      { key: "wp_api_endpoint", value: "/wp-json/wp/v2/", description: "WordPress REST API endpoint" },
      { key: "auto_optimize", value: "true", description: "Auto-optimize new jobs" },
      { key: "optimization_schedule", value: "every_6_hours", description: "Optimization frequency" },
      { key: "batch_size", value: "10", description: "Optimization batch size" },
    ];

    for (const config of defaultConfigs) {
      await this.setConfiguration(config);
    }
  }

  private async initializeDefaultAnalytics() {
    const today = new Date();
    const analytics = {
      date: today,
      totalJobs: 247,
      optimizedJobs: 189,
      avgSeoScore: 84,
      totalApplications: 1852,
      viewIncrease: 34,
      clickIncrease: 28,
      seoImprovement: 42,
    };
    await this.createAnalytics(analytics);
  }

  private async initializeDefaultKeywords() {
    const defaultKeywords = [
      { term: "healthcare jobs south africa", rank: 3, previousRank: 5, jobCount: 45, performance: "up" as const },
      { term: "remote software engineer", rank: 5, previousRank: 6, jobCount: 23, performance: "up" as const },
      { term: "marketing manager jobs", rank: 7, previousRank: 7, jobCount: 18, performance: "neutral" as const },
      { term: "data analyst positions", rank: 12, previousRank: 16, jobCount: 15, performance: "up" as const },
    ];

    for (const keyword of defaultKeywords) {
      await this.createKeyword(keyword);
    }
  }

  // Jobs
  async getJob(id: number): Promise<Job | undefined> {
    return this.jobs.get(id);
  }

  async getJobByWpId(wpJobId: number): Promise<Job | undefined> {
    return Array.from(this.jobs.values()).find(job => job.wpJobId === wpJobId);
  }

  async getJobs(status?: string): Promise<Job[]> {
    const allJobs = Array.from(this.jobs.values());
    if (status) {
      return allJobs.filter(job => job.status === status);
    }
    return allJobs;
  }

  async createJob(insertJob: InsertJob): Promise<Job> {
    const id = this.currentJobId++;
    const now = new Date();
    const job: Job = { 
      ...insertJob, 
      id, 
      createdAt: now, 
      updatedAt: now 
    };
    this.jobs.set(id, job);
    return job;
  }

  async updateJob(id: number, jobUpdate: Partial<InsertJob>): Promise<Job | undefined> {
    const job = this.jobs.get(id);
    if (!job) return undefined;
    
    const updatedJob: Job = { 
      ...job, 
      ...jobUpdate, 
      updatedAt: new Date() 
    };
    this.jobs.set(id, updatedJob);
    return updatedJob;
  }

  async deleteJob(id: number): Promise<boolean> {
    return this.jobs.delete(id);
  }

  // Optimizations
  async getOptimization(id: number): Promise<Optimization | undefined> {
    return this.optimizations.get(id);
  }

  async getOptimizationsByJobId(jobId: number): Promise<Optimization[]> {
    return Array.from(this.optimizations.values()).filter(opt => opt.jobId === jobId);
  }

  async getRecentOptimizations(limit: number = 10): Promise<Optimization[]> {
    const allOptimizations = Array.from(this.optimizations.values());
    return allOptimizations
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  async createOptimization(insertOptimization: InsertOptimization): Promise<Optimization> {
    const id = this.currentOptimizationId++;
    const optimization: Optimization = { 
      ...insertOptimization, 
      id, 
      createdAt: new Date() 
    };
    this.optimizations.set(id, optimization);
    return optimization;
  }

  // Configurations
  async getConfiguration(key: string): Promise<Configuration | undefined> {
    return this.configurations.get(key);
  }

  async getConfigurations(): Promise<Configuration[]> {
    return Array.from(this.configurations.values());
  }

  async setConfiguration(config: InsertConfiguration): Promise<Configuration> {
    const existing = this.configurations.get(config.key);
    if (existing) {
      const updated: Configuration = { 
        ...existing, 
        value: config.value, 
        updatedAt: new Date() 
      };
      this.configurations.set(config.key, updated);
      return updated;
    }
    
    const id = this.currentConfigId++;
    const now = new Date();
    const newConfig: Configuration = { 
      ...config, 
      id, 
      createdAt: now, 
      updatedAt: now 
    };
    this.configurations.set(config.key, newConfig);
    return newConfig;
  }

  async updateConfiguration(key: string, value: string): Promise<Configuration | undefined> {
    const config = this.configurations.get(key);
    if (!config) return undefined;
    
    const updated: Configuration = { 
      ...config, 
      value, 
      updatedAt: new Date() 
    };
    this.configurations.set(key, updated);
    return updated;
  }

  // Analytics
  async getAnalytics(date?: Date): Promise<Analytics | undefined> {
    if (!date) {
      date = new Date();
    }
    const dateKey = date.toISOString().split('T')[0];
    return this.analytics.get(dateKey);
  }

  async getAnalyticsRange(startDate: Date, endDate: Date): Promise<Analytics[]> {
    const result: Analytics[] = [];
    const current = new Date(startDate);
    
    while (current <= endDate) {
      const dateKey = current.toISOString().split('T')[0];
      const analytics = this.analytics.get(dateKey);
      if (analytics) {
        result.push(analytics);
      }
      current.setDate(current.getDate() + 1);
    }
    
    return result;
  }

  async createAnalytics(insertAnalytics: InsertAnalytics): Promise<Analytics> {
    const id = this.currentAnalyticsId++;
    const analytics: Analytics = { 
      ...insertAnalytics, 
      id, 
      createdAt: new Date() 
    };
    const dateKey = analytics.date.toISOString().split('T')[0];
    this.analytics.set(dateKey, analytics);
    return analytics;
  }

  async updateAnalytics(date: Date, analyticsUpdate: Partial<InsertAnalytics>): Promise<Analytics | undefined> {
    const dateKey = date.toISOString().split('T')[0];
    const analytics = this.analytics.get(dateKey);
    if (!analytics) return undefined;
    
    const updated: Analytics = { 
      ...analytics, 
      ...analyticsUpdate 
    };
    this.analytics.set(dateKey, updated);
    return updated;
  }

  // Keywords
  async getKeyword(term: string): Promise<Keyword | undefined> {
    return this.keywords.get(term);
  }

  async getTopKeywords(limit: number = 10): Promise<Keyword[]> {
    return Array.from(this.keywords.values())
      .sort((a, b) => (a.rank || Infinity) - (b.rank || Infinity))
      .slice(0, limit);
  }

  async createKeyword(insertKeyword: InsertKeyword): Promise<Keyword> {
    const id = this.currentKeywordId++;
    const keyword: Keyword = { 
      ...insertKeyword, 
      id, 
      updatedAt: new Date() 
    };
    this.keywords.set(insertKeyword.term, keyword);
    return keyword;
  }

  async updateKeyword(term: string, keywordUpdate: Partial<InsertKeyword>): Promise<Keyword | undefined> {
    const keyword = this.keywords.get(term);
    if (!keyword) return undefined;
    
    const updated: Keyword = { 
      ...keyword, 
      ...keywordUpdate, 
      updatedAt: new Date() 
    };
    this.keywords.set(term, updated);
    return updated;
  }
}

export const storage = new MemStorage();

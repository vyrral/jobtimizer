interface WordPressCredentials {
  siteUrl: string;
  username: string;
  applicationPassword: string;
}

interface WPJob {
  id: number;
  title: { rendered: string };
  content: { rendered: string };
  excerpt: { rendered: string };
  status: string;
  meta: Record<string, any>;
  job_listing_category?: number[];
  job_listing_type?: number[];
  _company_name?: string;
  _job_location?: string;
  _job_salary?: string;
  _yoast_wpseo_title?: string;
  _yoast_wpseo_metadesc?: string;
  _yoast_wpseo_focuskw?: string;
}

interface WPJobUpdate {
  title?: string;
  content?: string;
  excerpt?: string;
  meta?: Record<string, any>;
}

export class WordPressClient {
  private credentials: WordPressCredentials | null = null;
  private baseUrl: string = '';

  setCredentials(credentials: WordPressCredentials) {
    this.credentials = credentials;
    this.baseUrl = `${credentials.siteUrl.replace(/\/$/, '')}/wp-json/wp/v2`;
  }

  private getAuthHeaders(): Record<string, string> {
    if (!this.credentials) {
      throw new Error('WordPress credentials not configured');
    }

    const auth = Buffer.from(
      `${this.credentials.username}:${this.credentials.applicationPassword}`
    ).toString('base64');

    return {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json',
    };
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/users/me`, {
        headers: this.getAuthHeaders(),
      });
      return response.ok;
    } catch (error) {
      console.error('WordPress connection test failed:', error);
      return false;
    }
  }

  async getJobs(page: number = 1, perPage: number = 100): Promise<WPJob[]> {
    const url = `${this.baseUrl}/job-listings?page=${page}&per_page=${perPage}&status=publish`;
    
    const response = await fetch(url, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch jobs: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async getJob(id: number): Promise<WPJob> {
    const url = `${this.baseUrl}/job-listings/${id}`;
    
    const response = await fetch(url, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch job ${id}: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async updateJob(id: number, updates: WPJobUpdate): Promise<WPJob> {
    const url = `${this.baseUrl}/job-listings/${id}`;
    
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders(),
      },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      throw new Error(`Failed to update job ${id}: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async updateJobMeta(id: number, metaData: Record<string, any>): Promise<WPJob> {
    return this.updateJob(id, { meta: metaData });
  }

  async updateYoastSEO(id: number, seoData: {
    title?: string;
    metaDescription?: string;
    focusKeyphrase?: string;
  }): Promise<WPJob> {
    const metaData: Record<string, any> = {};
    
    if (seoData.title) {
      metaData._yoast_wpseo_title = seoData.title;
    }
    if (seoData.metaDescription) {
      metaData._yoast_wpseo_metadesc = seoData.metaDescription;
    }
    if (seoData.focusKeyphrase) {
      metaData._yoast_wpseo_focuskw = seoData.focusKeyphrase;
    }

    return this.updateJobMeta(id, metaData);
  }

  async getJobCategories(): Promise<any[]> {
    const url = `${this.baseUrl}/job_listing_category`;
    
    const response = await fetch(url, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch job categories: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async getJobTypes(): Promise<any[]> {
    const url = `${this.baseUrl}/job_listing_type`;
    
    const response = await fetch(url, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch job types: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }
}

export const wordpressClient = new WordPressClient();

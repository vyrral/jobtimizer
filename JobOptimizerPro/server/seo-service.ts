import { Job } from "@shared/schema";

interface SEOAnalysis {
  score: number;
  recommendations: string[];
  focusKeyphrase?: string;
  metaDescription?: string;
  optimizedTitle?: string;
}

interface KeywordData {
  term: string;
  frequency: number;
  relevance: number;
}

export class SEOService {
  private industryKeywords = [
    'healthcare', 'software', 'engineer', 'manager', 'analyst', 'remote', 'full time',
    'part time', 'senior', 'junior', 'assistant', 'director', 'coordinator',
    'south africa', 'cape town', 'johannesburg', 'durban', 'pretoria',
    'nursing', 'pharmacy', 'medical', 'hospital', 'clinic',
    'developer', 'programmer', 'technical', 'IT', 'technology',
    'marketing', 'sales', 'customer service', 'administration',
    'finance', 'accounting', 'banking', 'insurance',
    'education', 'teaching', 'training', 'academic',
    'construction', 'engineering', 'maintenance', 'operations'
  ];

  private stopWords = [
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
    'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
    'do', 'does', 'did', 'will', 'would', 'should', 'could', 'can', 'may', 'might',
    'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they'
  ];

  analyzeJob(job: Job): SEOAnalysis {
    const title = job.title.toLowerCase();
    const description = job.description.toLowerCase();
    const content = `${title} ${description} ${job.company || ''} ${job.location || ''}`.toLowerCase();

    const keywords = this.extractKeywords(content);
    const focusKeyphrase = this.generateFocusKeyphrase(keywords, job);
    const metaDescription = this.generateMetaDescription(job);
    const optimizedTitle = this.optimizeTitle(job.title);

    const score = this.calculateSEOScore(job, keywords, focusKeyphrase);
    const recommendations = this.generateRecommendations(job, score, keywords);

    return {
      score,
      recommendations,
      focusKeyphrase,
      metaDescription,
      optimizedTitle
    };
  }

  private extractKeywords(content: string): KeywordData[] {
    const words = content
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !this.stopWords.includes(word));

    const frequency: Record<string, number> = {};
    words.forEach(word => {
      frequency[word] = (frequency[word] || 0) + 1;
    });

    const keywords: KeywordData[] = Object.entries(frequency)
      .map(([term, freq]) => ({
        term,
        frequency: freq,
        relevance: this.calculateRelevance(term)
      }))
      .sort((a, b) => (b.frequency * b.relevance) - (a.frequency * a.relevance));

    return keywords.slice(0, 20);
  }

  private calculateRelevance(term: string): number {
    const isIndustryKeyword = this.industryKeywords.some(keyword => 
      keyword.includes(term) || term.includes(keyword)
    );
    return isIndustryKeyword ? 2.0 : 1.0;
  }

  private generateFocusKeyphrase(keywords: KeywordData[], job: Job): string {
    const topKeywords = keywords.slice(0, 3).map(k => k.term);
    
    // Try to include job type and location if available
    const location = job.location?.toLowerCase().replace(/[^\w\s]/g, '').trim();
    if (location && !topKeywords.includes(location)) {
      topKeywords.push(location);
    }

    return topKeywords.slice(0, 3).join(' ');
  }

  private generateMetaDescription(job: Job): string {
    const company = job.company || 'Leading company';
    const location = job.location || 'South Africa';
    const jobType = job.jobType || 'position';
    
    let description = `Join ${company} as a ${job.title} in ${location}. `;
    
    if (job.salary) {
      description += `Competitive salary ${job.salary}. `;
    }
    
    description += `Apply now for this exciting ${jobType} opportunity.`;
    
    // Ensure meta description is under 160 characters
    if (description.length > 160) {
      description = description.substring(0, 157) + '...';
    }
    
    return description;
  }

  private optimizeTitle(title: string): string {
    // Remove excessive punctuation and format properly
    let optimized = title
      .replace(/[!@#$%^&*()_+={}[\]|\\:";'<>?,.\/~`]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Capitalize first letter of each word
    optimized = optimized.replace(/\b\w/g, letter => letter.toUpperCase());

    // Add location or remote indicator if missing
    if (!optimized.toLowerCase().includes('remote') && 
        !optimized.toLowerCase().includes('south africa') &&
        !optimized.toLowerCase().includes('cape town') &&
        !optimized.toLowerCase().includes('johannesburg')) {
      optimized += ' - South Africa';
    }

    return optimized;
  }

  private calculateSEOScore(job: Job, keywords: KeywordData[], focusKeyphrase: string): number {
    let score = 50; // Base score

    // Title optimization
    if (job.title && job.title.length >= 10 && job.title.length <= 60) {
      score += 10;
    }

    // Description length
    if (job.description && job.description.length >= 150 && job.description.length <= 2000) {
      score += 10;
    }

    // Keyword density
    const topKeyword = keywords[0];
    if (topKeyword && topKeyword.frequency >= 2 && topKeyword.frequency <= 5) {
      score += 10;
    }

    // Company name presence
    if (job.company && job.company.length > 0) {
      score += 5;
    }

    // Location presence
    if (job.location && job.location.length > 0) {
      score += 5;
    }

    // Job type presence
    if (job.jobType && job.jobType.length > 0) {
      score += 5;
    }

    // Category presence
    if (job.category && job.category.length > 0) {
      score += 5;
    }

    // Existing SEO fields
    if (job.focusKeyphrase) {
      score += 10;
    }
    if (job.metaDescription) {
      score += 10;
    }

    return Math.min(100, Math.max(0, score));
  }

  private generateRecommendations(job: Job, score: number, keywords: KeywordData[]): string[] {
    const recommendations: string[] = [];

    if (!job.title || job.title.length < 10) {
      recommendations.push('Improve job title - should be 10-60 characters long');
    }

    if (!job.description || job.description.length < 150) {
      recommendations.push('Add more detailed job description (minimum 150 characters)');
    }

    if (!job.company) {
      recommendations.push('Add company name for better credibility');
    }

    if (!job.location) {
      recommendations.push('Specify job location for better local SEO');
    }

    if (!job.focusKeyphrase) {
      recommendations.push('Add focus keyphrase for better search ranking');
    }

    if (!job.metaDescription) {
      recommendations.push('Create compelling meta description to improve click-through rate');
    }

    if (keywords.length > 0) {
      const topKeyword = keywords[0];
      if (topKeyword.frequency < 2) {
        recommendations.push(`Include "${topKeyword.term}" more frequently in the description`);
      }
    }

    if (score < 70) {
      recommendations.push('Overall SEO optimization needed - consider professional review');
    }

    return recommendations;
  }

  optimizeJobSEO(job: Job): {
    focusKeyphrase: string;
    metaDescription: string;
    optimizedTitle: string;
    optimizedContent: string;
    recommendations: string[];
    seoScore: number;
  } {
    const analysis = this.analyzeJob(job);
    const optimizedContent = this.restructureContent(job);
    
    return {
      focusKeyphrase: analysis.focusKeyphrase || '',
      metaDescription: analysis.metaDescription || '',
      optimizedTitle: analysis.optimizedTitle || job.title,
      optimizedContent: optimizedContent,
      recommendations: analysis.recommendations,
      seoScore: analysis.score
    };
  }

  private restructureContent(job: Job): string {
    // Clean and structure the job content for better readability and SEO
    let content = job.description
      .replace(/&#8211;/g, '-')
      .replace(/&#038;/g, '&')
      .replace(/\s+/g, ' ')
      .trim();

    // Split content into logical sections
    const sections = this.identifyContentSections(content);
    
    let structuredContent = '';

    // Add job overview section
    if (sections.overview) {
      structuredContent += `<h2>Job Overview</h2>\n<p>${sections.overview}</p>\n\n`;
    }

    // Add key responsibilities
    if (sections.responsibilities.length > 0) {
      structuredContent += `<h2>Key Responsibilities</h2>\n<ul>\n`;
      sections.responsibilities.forEach(resp => {
        structuredContent += `<li>${resp}</li>\n`;
      });
      structuredContent += `</ul>\n\n`;
    }

    // Add requirements
    if (sections.requirements.length > 0) {
      structuredContent += `<h2>Requirements</h2>\n<ul>\n`;
      sections.requirements.forEach(req => {
        structuredContent += `<li>${req}</li>\n`;
      });
      structuredContent += `</ul>\n\n`;
    }

    // Add skills
    if (sections.skills.length > 0) {
      structuredContent += `<h2>Required Skills</h2>\n<ul>\n`;
      sections.skills.forEach(skill => {
        structuredContent += `<li>${skill}</li>\n`;
      });
      structuredContent += `</ul>\n\n`;
    }

    // Add company info
    if (sections.companyInfo) {
      structuredContent += `<h2>About the Company</h2>\n<p>${sections.companyInfo}</p>\n\n`;
    }

    // Add application instructions
    if (sections.applicationInfo) {
      structuredContent += `<h2>How to Apply</h2>\n<p>${sections.applicationInfo}</p>\n\n`;
    }

    // Add contact information
    if (sections.contactInfo) {
      structuredContent += `<h2>Contact Information</h2>\n<p>${sections.contactInfo}</p>\n`;
    }

    return structuredContent || content;
  }

  private identifyContentSections(content: string): {
    overview: string;
    responsibilities: string[];
    requirements: string[];
    skills: string[];
    companyInfo: string;
    applicationInfo: string;
    contactInfo: string;
  } {
    const sections = {
      overview: '',
      responsibilities: [],
      requirements: [],
      skills: [],
      companyInfo: '',
      applicationInfo: '',
      contactInfo: ''
    };

    // Extract contact information (phone numbers, emails)
    const contactMatches = content.match(/(?:contact|call|phone|email)[\s\S]*?(?:\d{3}[\s-]?\d{3}[\s-]?\d{4}|\d{10}|[\w.-]+@[\w.-]+)/gi);
    if (contactMatches) {
      sections.contactInfo = contactMatches.join(' ').trim();
      content = content.replace(new RegExp(contactMatches.join('|'), 'gi'), '');
    }

    // Extract responsibilities
    const responsibilityKeywords = ['responsibilities', 'duties', 'tasks', 'role', 'position', 'areas include'];
    const responsibilitySection = this.extractSection(content, responsibilityKeywords);
    if (responsibilitySection) {
      sections.responsibilities = this.extractListItems(responsibilitySection);
      content = content.replace(responsibilitySection, '');
    }

    // Extract requirements
    const requirementKeywords = ['requirements', 'qualifications', 'experience', 'education', 'minimum', 'must have'];
    const requirementSection = this.extractSection(content, requirementKeywords);
    if (requirementSection) {
      sections.requirements = this.extractListItems(requirementSection);
      content = content.replace(requirementSection, '');
    }

    // Extract skills
    const skillKeywords = ['skills', 'competencies', 'abilities', 'technical', 'software', 'computer'];
    const skillSection = this.extractSection(content, skillKeywords);
    if (skillSection) {
      sections.skills = this.extractListItems(skillSection);
      content = content.replace(skillSection, '');
    }

    // Extract company information
    const companyKeywords = ['company', 'organization', 'group', 'about us', 'our', 'we are'];
    const companySection = this.extractSection(content, companyKeywords);
    if (companySection) {
      sections.companyInfo = companySection.substring(0, 300);
      content = content.replace(companySection, '');
    }

    // Remaining content becomes overview
    sections.overview = content.trim().substring(0, 200);

    return sections;
  }

  private extractSection(content: string, keywords: string[]): string {
    for (const keyword of keywords) {
      const regex = new RegExp(`\\b${keyword}[\\s\\S]{0,500}`, 'gi');
      const match = content.match(regex);
      if (match) {
        return match[0];
      }
    }
    return '';
  }

  private extractListItems(section: string): string[] {
    // Extract items that start with - or bullet points
    const items = section.split(/[-•·]/)
      .map(item => item.trim())
      .filter(item => item.length > 10 && item.length < 150);
    
    return items.slice(0, 8); // Limit to 8 items
  }
}

export const seoService = new SEOService();

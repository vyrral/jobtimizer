import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { wordpressClient } from "./wordpress-client";
import { seoService } from "./seo-service";
import { insertJobSchema, insertOptimizationSchema, insertConfigurationSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Dashboard stats
  app.get("/api/dashboard/stats", async (req, res) => {
    try {
      const jobs = await storage.getJobs();
      const optimizedJobs = await storage.getJobs("optimized");
      const pendingJobs = await storage.getJobs("pending");
      const analytics = await storage.getAnalytics();

      const stats = {
        totalJobs: jobs.length,
        optimizedJobs: optimizedJobs.length,
        pendingJobs: pendingJobs.length,
        avgSeoScore: analytics?.avgSeoScore || 0,
        totalApplications: analytics?.totalApplications || 0,
      };

      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // Recent optimizations
  app.get("/api/optimizations/recent", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const optimizations = await storage.getRecentOptimizations(limit);
      
      // Enrich with job data
      const enrichedOptimizations = await Promise.all(
        optimizations.map(async (opt) => {
          const job = await storage.getJob(opt.jobId);
          return {
            ...opt,
            jobTitle: job?.title || 'Unknown Job',
            company: job?.company || 'Unknown Company',
          };
        })
      );

      res.json(enrichedOptimizations);
    } catch (error) {
      console.error("Error fetching recent optimizations:", error);
      res.status(500).json({ message: "Failed to fetch recent optimizations" });
    }
  });

  // Jobs management
  app.get("/api/jobs", async (req, res) => {
    try {
      const status = req.query.status as string;
      const jobs = await storage.getJobs(status);
      res.json(jobs);
    } catch (error) {
      console.error("Error fetching jobs:", error);
      res.status(500).json({ message: "Failed to fetch jobs" });
    }
  });

  app.get("/api/jobs/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const job = await storage.getJob(id);
      
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }

      res.json(job);
    } catch (error) {
      console.error("Error fetching job:", error);
      res.status(500).json({ message: "Failed to fetch job" });
    }
  });

  // Sync jobs from WordPress
  app.post("/api/jobs/sync", async (req, res) => {
    try {
      // Get WordPress credentials
      const wpUrl = await storage.getConfiguration("wp_site_url");
      const wpUsername = await storage.getConfiguration("wp_username");
      const wpPassword = await storage.getConfiguration("wp_application_password");

      if (!wpUrl || !wpUsername || !wpPassword) {
        return res.status(400).json({ message: "WordPress credentials not configured" });
      }

      wordpressClient.setCredentials({
        siteUrl: wpUrl.value,
        username: wpUsername.value,
        applicationPassword: wpPassword.value,
      });

      const wpJobs = await wordpressClient.getJobs();
      let syncedCount = 0;

      for (const wpJob of wpJobs) {
        const existingJob = await storage.getJobByWpId(wpJob.id);
        
        if (!existingJob) {
          const jobData = {
            wpJobId: wpJob.id,
            title: wpJob.title.rendered,
            description: wpJob.content.rendered.replace(/<[^>]*>/g, ''), // Strip HTML
            company: wpJob._company_name || '',
            location: wpJob._job_location || '',
            jobType: '',
            category: '',
            salary: wpJob._job_salary || '',
            status: "pending" as const,
            seoScore: null,
            focusKeyphrase: wpJob._yoast_wpseo_focuskw || null,
            metaDescription: wpJob._yoast_wpseo_metadesc || null,
            optimizedAt: null,
          };

          await storage.createJob(jobData);
          syncedCount++;
        }
      }

      res.json({ message: `Synced ${syncedCount} new jobs from WordPress` });
    } catch (error) {
      console.error("Error syncing jobs:", error);
      res.status(500).json({ message: "Failed to sync jobs from WordPress" });
    }
  });

  // Optimize single job
  app.post("/api/jobs/:id/optimize", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const job = await storage.getJob(id);
      
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }

      const optimization = seoService.optimizeJobSEO(job);
      
      // Update job with optimization results
      const updatedJob = await storage.updateJob(id, {
        focusKeyphrase: optimization.focusKeyphrase,
        metaDescription: optimization.metaDescription,
        title: optimization.optimizedTitle,
        description: optimization.optimizedContent,
        seoScore: optimization.seoScore,
        status: "optimized",
        optimizedAt: new Date(),
      });

      // Create optimization record
      await storage.createOptimization({
        jobId: id,
        type: "seo",
        originalValue: job.title,
        optimizedValue: optimization.optimizedTitle,
        improvements: optimization.recommendations.join(', '),
        seoScoreBefore: job.seoScore || 0,
        seoScoreAfter: optimization.seoScore,
        status: "completed",
      });

      // Update WordPress if credentials are available
      try {
        const wpUrl = await storage.getConfiguration("wp_site_url");
        const wpUsername = await storage.getConfiguration("wp_username");
        const wpPassword = await storage.getConfiguration("wp_application_password");

        if (wpUrl && wpUsername && wpPassword) {
          wordpressClient.setCredentials({
            siteUrl: wpUrl.value,
            username: wpUsername.value,
            applicationPassword: wpPassword.value,
          });

          // First update the job content with structured formatting
          await wordpressClient.updateJob(job.wpJobId, {
            title: optimization.optimizedTitle,
            content: optimization.optimizedContent
          });

          // Then update Yoast SEO fields
          await wordpressClient.updateYoastSEO(job.wpJobId, {
            title: optimization.optimizedTitle,
            metaDescription: optimization.metaDescription,
            focusKeyphrase: optimization.focusKeyphrase,
          });
        }
      } catch (wpError) {
        console.error("WordPress update failed:", wpError);
        // Don't fail the entire operation if WordPress update fails
      }

      res.json({
        job: updatedJob,
        optimization: optimization,
      });
    } catch (error) {
      console.error("Error optimizing job:", error);
      res.status(500).json({ message: "Failed to optimize job" });
    }
  });

  // Optimize all pending jobs
  app.post("/api/jobs/optimize-all", async (req, res) => {
    try {
      const pendingJobs = await storage.getJobs("pending");
      const batchSizeConfig = await storage.getConfiguration("batch_size");
      const batchSize = parseInt(batchSizeConfig?.value || "10");
      
      const jobsToProcess = pendingJobs.slice(0, batchSize);
      const results = [];

      for (const job of jobsToProcess) {
        try {
          const optimization = seoService.optimizeJobSEO(job);
          
          await storage.updateJob(job.id, {
            focusKeyphrase: optimization.focusKeyphrase,
            metaDescription: optimization.metaDescription,
            title: optimization.optimizedTitle,
            seoScore: optimization.seoScore,
            status: "optimized",
            optimizedAt: new Date(),
          });

          await storage.createOptimization({
            jobId: job.id,
            type: "seo",
            originalValue: job.title,
            optimizedValue: optimization.optimizedTitle,
            improvements: optimization.recommendations.join(', '),
            seoScoreBefore: job.seoScore || 0,
            seoScoreAfter: optimization.seoScore,
            status: "completed",
          });

          results.push({ jobId: job.id, status: "success", seoScore: optimization.seoScore });
        } catch (error) {
          console.error(`Error optimizing job ${job.id}:`, error);
          results.push({ jobId: job.id, status: "failed", error: error.message });
        }
      }

      res.json({
        message: `Processed ${results.length} jobs`,
        results: results,
      });
    } catch (error) {
      console.error("Error in batch optimization:", error);
      res.status(500).json({ message: "Failed to process optimization queue" });
    }
  });

  // Analytics
  app.get("/api/analytics", async (req, res) => {
    try {
      const analytics = await storage.getAnalytics();
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching analytics:", error);
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  // Keywords
  app.get("/api/keywords", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const keywords = await storage.getTopKeywords(limit);
      res.json(keywords);
    } catch (error) {
      console.error("Error fetching keywords:", error);
      res.status(500).json({ message: "Failed to fetch keywords" });
    }
  });

  // Configuration management
  app.get("/api/config", async (req, res) => {
    try {
      const configurations = await storage.getConfigurations();
      res.json(configurations);
    } catch (error) {
      console.error("Error fetching configurations:", error);
      res.status(500).json({ message: "Failed to fetch configurations" });
    }
  });

  app.post("/api/config", async (req, res) => {
    try {
      const configData = insertConfigurationSchema.parse(req.body);
      const config = await storage.setConfiguration(configData);
      res.json(config);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid configuration data", errors: error.errors });
      }
      console.error("Error saving configuration:", error);
      res.status(500).json({ message: "Failed to save configuration" });
    }
  });

  app.put("/api/config/:key", async (req, res) => {
    try {
      const { key } = req.params;
      const { value } = req.body;
      
      if (!value) {
        return res.status(400).json({ message: "Value is required" });
      }

      const config = await storage.updateConfiguration(key, value);
      
      if (!config) {
        return res.status(404).json({ message: "Configuration not found" });
      }

      res.json(config);
    } catch (error) {
      console.error("Error updating configuration:", error);
      res.status(500).json({ message: "Failed to update configuration" });
    }
  });

  // Test WordPress connection
  app.post("/api/wordpress/test", async (req, res) => {
    try {
      const { siteUrl, username, applicationPassword } = req.body;

      if (!siteUrl || !username || !applicationPassword) {
        return res.status(400).json({ message: "Missing required credentials" });
      }

      wordpressClient.setCredentials({ siteUrl, username, applicationPassword });
      const isConnected = await wordpressClient.testConnection();

      if (isConnected) {
        // Save credentials if connection successful
        await storage.setConfiguration({ key: "wp_site_url", value: siteUrl, description: "WordPress site URL" });
        await storage.setConfiguration({ key: "wp_username", value: username, description: "WordPress username" });
        await storage.setConfiguration({ key: "wp_application_password", value: applicationPassword, description: "WordPress application password" });
        
        res.json({ success: true, message: "WordPress connection successful" });
      } else {
        res.status(400).json({ success: false, message: "WordPress connection failed" });
      }
    } catch (error) {
      console.error("WordPress connection test error:", error);
      res.status(500).json({ success: false, message: "Connection test failed" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

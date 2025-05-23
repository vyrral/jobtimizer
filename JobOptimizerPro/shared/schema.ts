import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const jobs = pgTable("jobs", {
  id: serial("id").primaryKey(),
  wpJobId: integer("wp_job_id").notNull().unique(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  company: text("company"),
  location: text("location"),
  jobType: text("job_type"),
  category: text("category"),
  salary: text("salary"),
  status: text("status").notNull().default("pending"), // pending, optimized, failed
  seoScore: integer("seo_score"),
  focusKeyphrase: text("focus_keyphrase"),
  metaDescription: text("meta_description"),
  optimizedAt: timestamp("optimized_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const optimizations = pgTable("optimizations", {
  id: serial("id").primaryKey(),
  jobId: integer("job_id").references(() => jobs.id).notNull(),
  type: text("type").notNull(), // title, description, seo, category
  originalValue: text("original_value"),
  optimizedValue: text("optimized_value").notNull(),
  improvements: text("improvements"),
  seoScoreBefore: integer("seo_score_before"),
  seoScoreAfter: integer("seo_score_after"),
  status: text("status").notNull().default("completed"), // completed, failed
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const configurations = pgTable("configurations", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const analytics = pgTable("analytics", {
  id: serial("id").primaryKey(),
  date: timestamp("date").notNull(),
  totalJobs: integer("total_jobs").notNull().default(0),
  optimizedJobs: integer("optimized_jobs").notNull().default(0),
  avgSeoScore: integer("avg_seo_score").notNull().default(0),
  totalApplications: integer("total_applications").notNull().default(0),
  viewIncrease: integer("view_increase").notNull().default(0),
  clickIncrease: integer("click_increase").notNull().default(0),
  seoImprovement: integer("seo_improvement").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const keywords = pgTable("keywords", {
  id: serial("id").primaryKey(),
  term: text("term").notNull().unique(),
  rank: integer("rank"),
  previousRank: integer("previous_rank"),
  jobCount: integer("job_count").notNull().default(0),
  performance: text("performance").notNull().default("neutral"), // up, down, neutral
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertJobSchema = createInsertSchema(jobs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertOptimizationSchema = createInsertSchema(optimizations).omit({
  id: true,
  createdAt: true,
});

export const insertConfigurationSchema = createInsertSchema(configurations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAnalyticsSchema = createInsertSchema(analytics).omit({
  id: true,
  createdAt: true,
});

export const insertKeywordSchema = createInsertSchema(keywords).omit({
  id: true,
  updatedAt: true,
});

export type Job = typeof jobs.$inferSelect;
export type InsertJob = z.infer<typeof insertJobSchema>;
export type Optimization = typeof optimizations.$inferSelect;
export type InsertOptimization = z.infer<typeof insertOptimizationSchema>;
export type Configuration = typeof configurations.$inferSelect;
export type InsertConfiguration = z.infer<typeof insertConfigurationSchema>;
export type Analytics = typeof analytics.$inferSelect;
export type InsertAnalytics = z.infer<typeof insertAnalyticsSchema>;
export type Keyword = typeof keywords.$inferSelect;
export type InsertKeyword = z.infer<typeof insertKeywordSchema>;

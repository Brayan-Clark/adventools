import { z } from 'zod';

/**
 * US-12: Data Validation Schemas
 * Used to ensure API responses match expected structures before use.
 */

export const LessonSchema = z.object({
  id: z.string().optional(),
  title: z.string(),
  startDate: z.string().optional().default(""),
  endDate: z.string().optional().default(""),
  index: z.string().optional().default(""),
  name: z.string().optional().default(""),
});

export const QuarterlyItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional().default(""),
  covers: z.object({
    portrait: z.string(),
    landscape: z.string().optional().default(""),
  }),
  startDate: z.string().optional().default(""),
  endDate: z.string().optional().default(""),
  index: z.string().optional().default(""),
  groupTitle: z.string().optional().default(""),
});

export const ContentBlockSchema = z.lazy(() => z.object({
  id: z.string().optional(),
  type: z.string(),
  markdown: z.string().optional(),
  items: z.array(ContentBlockSchema).optional(),
  data: z.any().optional(),
  image: z.string().optional(),
  caption: z.string().optional(),
}));

export const SegmentSchema = z.object({
  id: z.string().optional(),
  title: z.string(),
  date: z.string().optional(),
  name: z.string().optional(),
  type: z.string().optional(),
  blocks: z.array(ContentBlockSchema).optional(),
  pdf: z.array(z.object({
    src: z.string(),
    title: z.string(),
    id: z.string().optional(),
  })).optional(),
});

export const WeeklyLessonSchema = z.object({
  id: z.string().optional(),
  title: z.string(),
  segments: z.array(SegmentSchema),
  introduction: z.string().optional(),
  cover: z.string().optional(),
  startDate: z.string().optional(),
  audio: z.array(z.any()).optional(),
  video: z.array(z.any()).optional(),
  pdf: z.array(z.any()).optional(),
});

export const QuarterlySchema = QuarterlyItemSchema.extend({
  lessons: z.array(LessonSchema).optional(),
});

/**
 * Generic helper for safe parsing with defaults
 */
export function safeValidate<T>(schema: z.Schema<T>, data: any, fallback: T): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    console.warn('[Zod Validation Error]', result.error.format());
    return fallback;
  }
  return result.data;
}

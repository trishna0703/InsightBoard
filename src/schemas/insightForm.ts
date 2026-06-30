import { z } from 'zod';

export const InsightFormSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(255, 'Title must be under 255 characters'),
  description: z
    .string()
    .min(1, 'Description is required'),
  priority: z.enum(['P1', 'P2', 'P3', 'P4'], {
    errorMap: () => ({ message: 'Priority is required' }),
  }),
  stage: z.enum(['Observation', 'Insight', 'Actionable', 'Impact']),
  categoryId: z.string().nullable().optional(),
  hcpId: z.string().nullable().optional(),
  drugName: z.string().nullable().optional(),
  tagIds: z.array(z.string()).default([]),
});

export type InsightFormValues = z.infer<typeof InsightFormSchema>;

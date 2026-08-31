import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';

const stamp = z.object({
  start: z.string(),
  end: z.string().optional(),
  precision: z.enum(['minute', 'hour', 'day', 'range', 'unknown']),
  timezone: z.literal('Asia/Seoul').default('Asia/Seoul'),
});

const source = z.object({
  id: z.string(),
  type: z.enum([
    'chat-conversation',
    'medical-record',
    'physician-report',
    'nurse-report',
    'caregiver-observation',
    'user-recollection',
    'external-reference',
    'gpt-analysis',
  ]),
  certainty: z.enum(['confirmed', 'reported', 'observed', 'inferred', 'uncertain']),
  label: z.string(),
  url: z.url().optional(),
  accessedAt: stamp.optional(),
});

const userMessageFidelity = z.enum(['exact', 'typo-corrected', 'pending-original']);

const exchange = z.object({
  id: z.string(),
  recordedAt: stamp,
  sourceVerified: z.boolean().default(false),
  sourceVerifiedAt: stamp.optional(),
  user: z.object({
    sourceMessageId: z.string().optional(),
    rawRef: z.string().optional(),
    original: z.string().min(1),
    originalSha256: z.string().regex(/^sha256:[a-f0-9]{64}$/).optional(),
    corrected: z.string().optional(),
    correctionPolicy: z.literal('typos-only').optional(),
    fidelity: userMessageFidelity,
  }),
  assistant: z
    .object({
      sourceMessageId: z.string().optional(),
      text: z.string().min(1),
      textSha256: z.string().regex(/^sha256:[a-f0-9]{64}$/).optional(),
      modelLabel: z.string().default('ChatGPT'),
      fidelity: z.literal('exact'),
    })
    .optional(),
  sourceRefs: z.array(z.string()).default([]),
});

const amendment = z.object({
  id: z.string(),
  recordedAt: stamp,
  kind: z.enum(['correction', 'clarification', 'follow-up']),
  target: z.string(),
  note: z.string(),
  supersedes: z.string().optional(),
  sourceRefs: z.array(z.string()).default([]),
});

// The public repository accepts only complete, source-verified conversation records.
const posts = defineCollection({
  loader: glob({ base: './src/content/posts', pattern: '**/*.{md,mdx}' }),
  schema: z.object({
    schemaVersion: z.literal(1),
    recordId: z.string(),
    board: z.enum(['trauma', 'life', 'medical', 'rehabilitation', 'media']),
    entryType: z.enum([
      'clinical-update',
      'letter',
      'medical-knowledge',
      'rehabilitation-plan',
      'media-record',
      'project-log',
    ]),
    title: z.string(),
    status: z.enum(['draft', 'published']).default('draft'),
    sensitivity: z.enum(['private', 'highly-sensitive']).default('highly-sensitive'),
    eventAt: stamp.optional(),
    recordedAt: stamp,
    updatedAt: stamp.optional(),
    tags: z.array(z.string()).default([]),
    sources: z.array(source).default([]),
    exchanges: z.array(exchange).min(1),
    amendments: z.array(amendment).default([]),
    media: z
      .array(
        z.object({
          id: z.string(),
          role: z.enum(['cover', 'inline', 'attachment', 'evidence']),
          caption: z.string().optional(),
        }),
      )
      .default([]),
    related: z.array(z.string()).default([]),
    privacyReviewed: z.boolean().default(false),
  }),
});

export const collections = { posts };

import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';

const stamp = z.object({
  start: z.string(),
  end: z.string().optional(),
  precision: z.enum(['second', 'minute', 'hour', 'day', 'range', 'unknown']),
  timezone: z.literal('Asia/Seoul').default('Asia/Seoul'),
});

const httpUrl = z.url().refine((url) => /^https?:\/\//i.test(url), 'Only HTTP(S) URLs are allowed');

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
  url: httpUrl.optional(),
  accessedAt: stamp.optional(),
});

const userMessageFidelity = z.enum(['exact', 'typo-corrected', 'pending-original']);

const messageBase = z.object({
  id: z.string(),
  recordedAt: stamp,
  sourceVerified: z.boolean().default(false),
  sourceVerifiedAt: stamp.optional(),
  sourceMessageId: z.string().optional(),
  sourceOrdinal: z.number().int().positive().optional(),
  turnId: z.string().optional(),
  sourceRefs: z.array(z.string()).default([]),
});

const userMessage = messageBase.extend({
  role: z.literal('user'),
  original: z.string().min(1),
  originalSha256: z.string().regex(/^sha256:[a-f0-9]{64}$/).optional(),
  corrected: z.string().optional(),
  correctionPolicy: z.literal('typos-only').optional(),
  fidelity: userMessageFidelity,
});

const assistantMessage = messageBase.extend({
  role: z.literal('assistant'),
  channel: z.enum(['commentary', 'final', 'unknown']).default('unknown'),
  text: z.string().min(1),
  textSha256: z.string().regex(/^sha256:[a-f0-9]{64}$/).optional(),
  modelLabel: z.string().default('ChatGPT'),
  fidelity: z.literal('exact'),
  references: z
    .array(
      z.object({
        title: z.string().min(1),
        url: httpUrl,
        attribution: z.string().optional(),
      }),
    )
    .default([]),
});

const archiveMessage = z.discriminatedUnion('role', [userMessage, assistantMessage]);

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
  loader: glob({ base: './src/content/posts', pattern: '**/*.{md,mdx,json}' }),
  schema: z.object({
    schemaVersion: z.literal(2),
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
    messages: z.array(archiveMessage).min(1),
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

import { z } from "zod";

export const signupSchema = z.object({
  fullName: z.string().min(1, "Full name is required").max(100),
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password is required"),
});

export const profileUpdateSchema = z.object({
  fullName: z.string().min(1).max(100).optional(),
  displayName: z.string().max(50).optional().nullable(),
  email: z.string().email().optional(),
  phone: z.string().max(30).optional().nullable(),
  bio: z.string().max(500).optional().nullable(),
  location: z.string().max(100).optional().nullable(),
  timezone: z.string().max(50).optional(),
});

export const projectCreateSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional().nullable(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  status: z.enum(["IN_PROGRESS", "COMPLETED", "ON_HOLD"]).optional(),
});

export const projectUpdateSchema = projectCreateSchema.partial().extend({
  progress: z.number().int().min(0).max(100).optional(),
});

export const taskCreateSchema = z.object({
  title: z.string().min(1).max(200),
  tag: z.string().max(30).optional().nullable(),
  projectId: z.string().cuid().optional().nullable(),
  completed: z.boolean().optional(),
});

export const taskUpdateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  completed: z.boolean().optional(),
  tag: z.string().max(30).optional().nullable(),
  projectId: z.string().cuid().optional().nullable(),
});

export const settingsUpdateSchema = z.object({
  emailNotifications: z.boolean().optional(),
  pushNotifications: z.boolean().optional(),
  weeklySummary: z.boolean().optional(),
  marketingEmails: z.boolean().optional(),
  theme: z.enum(["Dark", "Light", "System"]).optional(),
  density: z.enum(["Comfortable", "Compact"]).optional(),
  reduceMotion: z.boolean().optional(),
  twoFactor: z.boolean().optional(),
  showOnlineStatus: z.boolean().optional(),
  publicProfile: z.boolean().optional(),
});

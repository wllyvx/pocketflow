import { z } from "zod";

export const successResponseSchema = z.object({
  success: z.literal(true),
  data: z.unknown().optional(),
  message: z.string().optional(),
});

export const errorResponseSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
});

export const apiResponseSchema = z.discriminatedUnion("success", [
  successResponseSchema,
  errorResponseSchema,
]);

export type ApiResponse = z.infer<typeof apiResponseSchema>;

export const onboardingSchema = z.object({
  displayName: z.string().trim().min(1).max(80),
  skip: z.boolean().default(false),
  starterEnvelopes: z.array(z.string().trim().min(1).max(80)).max(5).default([]),
}).superRefine((input, context) => {
  const starterEnvelopes = input.starterEnvelopes.map((name) => name.trim());
  if (new Set(starterEnvelopes).size !== starterEnvelopes.length) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["starterEnvelopes"], message: "Starter envelopes must be unique." });
  }
  if (!input.skip && (starterEnvelopes.length < 3 || starterEnvelopes.length > 5)) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["starterEnvelopes"], message: "Choose between 3 and 5 starter envelopes, or skip onboarding." });
  }
});

export type OnboardingInput = z.infer<typeof onboardingSchema>;

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

/* -------------------------------------------------------------------------- */
/*                                Transactions                                */
/* -------------------------------------------------------------------------- */

export const transactionTypeSchema = z.enum(["income", "expense", "transfer"]);
export type TransactionType = z.infer<typeof transactionTypeSchema>;

const isValidDateString = (val: string) => {
  const parsed = Date.parse(val);
  if (isNaN(parsed)) return false;
  const maxFuture = new Date();
  maxFuture.setFullYear(maxFuture.getFullYear() + 1);
  return parsed <= maxFuture.getTime();
};

export const createTransactionSchema = z
  .object({
    type: transactionTypeSchema,
    amount: z.number({ invalid_type_error: "Amount must be a number" }).positive("Amount must be greater than 0"),
    description: z
      .string()
      .trim()
      .min(1, "Description is required")
      .max(255, "Description must not exceed 255 characters"),
    date: z
      .string()
      .trim()
      .min(1, "Date is required")
      .refine(isValidDateString, {
        message: "Date must be a valid date and not more than 1 year in the future",
      }),
    envelopeId: z.string().trim().min(1).nullable().optional(),
    destinationEnvelopeId: z.string().trim().min(1).nullable().optional(),
    receiptImageUrl: z
      .string()
      .trim()
      .url("Receipt image URL must be a valid URL")
      .nullable()
      .optional()
      .or(z.literal("")),
    sourceAccountId: z.string().trim().min(1).nullable().optional(),
    destinationAccountId: z.string().trim().min(1).nullable().optional(),
  })
  .superRefine((input, ctx) => {
    if (input.type === "expense" && (!input.envelopeId || input.envelopeId.trim() === "")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["envelopeId"],
        message: "Envelope is required for expense transactions.",
      });
    }
  });

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;

export const updateTransactionSchema = z
  .object({
    type: transactionTypeSchema.optional(),
    amount: z.number({ invalid_type_error: "Amount must be a number" }).positive("Amount must be greater than 0").optional(),
    description: z
      .string()
      .trim()
      .min(1, "Description is required")
      .max(255, "Description must not exceed 255 characters")
      .optional(),
    date: z
      .string()
      .trim()
      .min(1, "Date is required")
      .refine(isValidDateString, {
        message: "Date must be a valid date and not more than 1 year in the future",
      })
      .optional(),
    envelopeId: z.string().trim().min(1).nullable().optional(),
    destinationEnvelopeId: z.string().trim().min(1).nullable().optional(),
    receiptImageUrl: z
      .string()
      .trim()
      .url("Receipt image URL must be a valid URL")
      .nullable()
      .optional()
      .or(z.literal("")),
    sourceAccountId: z.string().trim().min(1).nullable().optional(),
    destinationAccountId: z.string().trim().min(1).nullable().optional(),
  })
  .superRefine((input, ctx) => {
    if (input.type === "expense" && input.envelopeId === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["envelopeId"],
        message: "Envelope is required for expense transactions.",
      });
    }
  });

export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;

export const listTransactionsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  type: transactionTypeSchema.optional(),
  envelopeId: z.string().trim().min(1).optional(),
  startDate: z.string().trim().min(1).optional(),
  endDate: z.string().trim().min(1).optional(),
});

export type ListTransactionsQuery = z.infer<typeof listTransactionsQuerySchema>;

export interface TransactionItem {
  id: string;
  userId: string;
  type: TransactionType;
  amount: number;
  description: string;
  date: string;
  envelopeId?: string | null;
  destinationEnvelopeId?: string | null;
  sourceAccountId?: string | null;
  destinationAccountId?: string | null;
  receiptImageUrl?: string | null;
  envelopeName?: string | null;
  envelopeColorHex?: string | null;
  isManual?: boolean;
  createdAt: string;
  updatedAt?: string;
}

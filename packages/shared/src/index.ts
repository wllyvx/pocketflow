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
    if (input.type === "transfer") {
      if (!input.envelopeId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["envelopeId"],
          message: "Source envelope is required for transfers.",
        });
      }
      if (!input.destinationEnvelopeId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["destinationEnvelopeId"],
          message: "Destination envelope is required for transfers.",
        });
      }
      if (input.envelopeId && input.envelopeId === input.destinationEnvelopeId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["destinationEnvelopeId"],
          message: "Source and destination envelopes must be different.",
        });
      }
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
    if (input.type === "transfer") {
      if (input.envelopeId === undefined || input.envelopeId === null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["envelopeId"],
          message: "Source envelope is required for transfers.",
        });
      }
      if (input.destinationEnvelopeId === undefined || input.destinationEnvelopeId === null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["destinationEnvelopeId"],
          message: "Destination envelope is required for transfers.",
        });
      }
      if (input.envelopeId && input.envelopeId === input.destinationEnvelopeId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["destinationEnvelopeId"],
          message: "Source and destination envelopes must be different.",
        });
      }
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

export const envelopeResetFrequencySchema = z.enum(["monthly", "weekly", "once"]);
export type EnvelopeResetFrequency = z.infer<typeof envelopeResetFrequencySchema>;

export const createEnvelopeSchema = z.object({
  name: z.string().trim().min(1, "Envelope name is required").max(80, "Envelope name must not exceed 80 characters"),
  categoryId: z.string().trim().min(1, "Category ID is required"),
  budgetedAmount: z.number({ invalid_type_error: "Budgeted amount must be a number" }).nonnegative("Budgeted amount cannot be negative"),
  resetFrequency: envelopeResetFrequencySchema.default("monthly"),
});
export type CreateEnvelopeInput = z.infer<typeof createEnvelopeSchema>;

export const updateEnvelopeSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  categoryId: z.string().trim().min(1).optional(),
  budgetedAmount: z.number({ invalid_type_error: "Budgeted amount must be a number" }).nonnegative("Budgeted amount cannot be negative").optional(),
  resetFrequency: envelopeResetFrequencySchema.optional(),
});
export type UpdateEnvelopeInput = z.infer<typeof updateEnvelopeSchema>;

export const fillEnvelopeSchema = z.object({
  amount: z.number({ invalid_type_error: "Amount must be a number" }).positive("Fill amount must be greater than 0"),
});
export type FillEnvelopeInput = z.infer<typeof fillEnvelopeSchema>;

export const transferEnvelopeSchema = z.object({
  fromEnvelopeId: z.string().trim().min(1, "Source envelope ID is required"),
  toEnvelopeId: z.string().trim().min(1, "Destination envelope ID is required"),
  amount: z.number({ invalid_type_error: "Amount must be a number" }).positive("Transfer amount must be greater than 0"),
}).superRefine((data, ctx) => {
  if (data.fromEnvelopeId === data.toEnvelopeId) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["toEnvelopeId"], message: "Source and destination envelopes must be different." });
  }
});
export type TransferEnvelopeInput = z.infer<typeof transferEnvelopeSchema>;

export const deleteEnvelopeSchema = z.object({
  transferToEnvelopeId: z.string().trim().min(1).optional(),
  returnToAvailableToSpend: z.boolean().default(false),
}).superRefine((input, ctx) => {
  if (input.transferToEnvelopeId && input.returnToAvailableToSpend) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["returnToAvailableToSpend"],
      message: "Choose either a transfer target or Available to Spend, not both.",
    });
  }
});
export type DeleteEnvelopeInput = z.infer<typeof deleteEnvelopeSchema>;

export interface EnvelopeItem {
  id: string;
  userId: string;
  categoryId: string;
  categoryName?: string | null;
  name: string;
  budgetedAmount: number;
  currentAmount: number;
  resetFrequency: EnvelopeResetFrequency;
  lastResetDate: string;
  createdAt: string;
  updatedAt: string;
  relatedTransactionCount?: number;
  totalSpent?: number;
  remainingAmount?: number;
  isOverBudget?: boolean;
}

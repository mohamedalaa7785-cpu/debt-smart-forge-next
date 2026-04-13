import { z } from "zod";

export const SearchSortSchema = z.enum([
  "newest",
  "oldest",
  "name_asc",
  "name_desc",
]);

export const SearchPortfolioSchema = z.enum(["ACTIVE", "WRITEOFF"]);
export const SearchDomainSchema = z.enum(["FIRST", "THIRD", "WRITEOFF"]);

export const SearchQuerySchema = z.object({
  q: z.string().trim().min(2).max(120),
  sort: SearchSortSchema.default("newest"),
  portfolio: SearchPortfolioSchema.optional(),
  domain: SearchDomainSchema.optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type SearchQuery = z.infer<typeof SearchQuerySchema>;

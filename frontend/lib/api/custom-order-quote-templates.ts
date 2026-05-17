import { apiClient } from "./client";

export type QuoteStructuredValue = string[] | Record<string, unknown>;

export interface CustomOrderQuoteTemplate {
  id: string;
  sellerId: string;
  name: string;
  title: string;
  description: string;
  estimatedPrice: string | null;
  minPrice: string | null;
  maxPrice: string | null;
  materials: QuoteStructuredValue;
  sizeOptions: QuoteStructuredValue;
  estimatedLeadTime: string | null;
  revisionPolicy: string | null;
  shippingNote: string | null;
  termsNote: string | null;
  isActive: boolean;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCustomOrderQuoteTemplateDto {
  name: string;
  title: string;
  description?: string;
  estimatedPrice?: number | null;
  minPrice?: number | null;
  maxPrice?: number | null;
  materials?: string[];
  sizeOptions?: string[];
  estimatedLeadTime?: string;
  revisionPolicy?: string;
  shippingNote?: string;
  termsNote?: string;
  isActive?: boolean;
}

export type UpdateCustomOrderQuoteTemplateDto =
  Partial<CreateCustomOrderQuoteTemplateDto>;

const QUOTE_TEMPLATES_ENDPOINT = "/custom-order-quote-templates";

export const customOrderQuoteTemplatesApi = {
  getQuoteTemplates: () =>
    apiClient.get<CustomOrderQuoteTemplate[]>(QUOTE_TEMPLATES_ENDPOINT),

  getQuoteTemplate: (id: string) =>
    apiClient.get<CustomOrderQuoteTemplate>(
      `${QUOTE_TEMPLATES_ENDPOINT}/${id}`,
    ),

  createQuoteTemplate: (data: CreateCustomOrderQuoteTemplateDto) =>
    apiClient.post<CustomOrderQuoteTemplate>(
      QUOTE_TEMPLATES_ENDPOINT,
      data,
    ),

  updateQuoteTemplate: (
    id: string,
    data: UpdateCustomOrderQuoteTemplateDto,
  ) =>
    apiClient.patch<CustomOrderQuoteTemplate>(
      `${QUOTE_TEMPLATES_ENDPOINT}/${id}`,
      data,
    ),

  deleteQuoteTemplate: (id: string) =>
    apiClient.delete<CustomOrderQuoteTemplate>(
      `${QUOTE_TEMPLATES_ENDPOINT}/${id}`,
    ),
};

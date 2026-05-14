import { IsDateString, IsIn, IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

export const paymentReliabilityAnomalyTypes = [
  'STRIPE_ORDER_UNPAID_EXPIRED',
  'CUSTOM_ORDER_UNPAID_EXPIRED',
  'PAID_ORDER_MISSING_CAPTURE_LEDGER',
  'REFUND_STATUS_MISMATCH',
  'PAID_WITHOUT_WEBHOOK_RECORD',
] as const;

export type PaymentReliabilityAnomalyType =
  (typeof paymentReliabilityAnomalyTypes)[number];

export const paymentReliabilitySeverities = ['HIGH', 'MEDIUM', 'LOW'] as const;
export type PaymentReliabilitySeverity =
  (typeof paymentReliabilitySeverities)[number];

export const paymentReliabilityEntityTypes = ['ORDER', 'CUSTOM_ORDER'] as const;
export type PaymentReliabilityEntityType =
  (typeof paymentReliabilityEntityTypes)[number];

export const paymentReliabilityReconciliationStatuses = [
  'RECONCILED',
  'PENDING_PAYMENT',
  'UNPAID_EXPIRED',
  'MISSING_CAPTURE_LEDGER',
  'REFUND_STATUS_MISMATCH',
  'PAID_WITHOUT_WEBHOOK',
] as const;

export type PaymentReliabilityReconciliationStatus =
  (typeof paymentReliabilityReconciliationStatuses)[number];

class PaymentReliabilityWindowQueryDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}

export class PaymentReliabilitySummaryQueryDto extends PaymentReliabilityWindowQueryDto {}

export class PaymentReliabilityAnomaliesQueryDto extends PaginationDto {
  @IsOptional()
  @IsIn(paymentReliabilityAnomalyTypes)
  type?: PaymentReliabilityAnomalyType;

  @IsOptional()
  @IsIn(paymentReliabilitySeverities)
  severity?: PaymentReliabilitySeverity;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}

export class PaymentReliabilityReconciliationQueryDto extends PaginationDto {
  @IsOptional()
  @IsIn(paymentReliabilityEntityTypes)
  entityType?: PaymentReliabilityEntityType;

  @IsOptional()
  @IsIn(paymentReliabilityReconciliationStatuses)
  status?: PaymentReliabilityReconciliationStatus;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}

export class PaymentReliabilityWebhooksQueryDto extends PaginationDto {
  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}

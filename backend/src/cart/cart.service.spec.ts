import { CartService } from './cart.service';

describe('CartService voucher range matching', () => {
  let service: CartService;

  beforeEach(() => {
    service = new CartService({} as never, {} as never, {} as never);
  });

  const buildRange = (overrides: Record<string, unknown> = {}) => ({
    id: 'range-1',
    voucherId: 'voucher-1',
    minPrice: 100,
    maxPrice: 1000,
    discountPercent: 10,
    endDate: new Date('2030-01-01T00:00:00.000Z'),
    deletedAt: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  });

  it('matches voucher ranges inclusively at maxPrice boundary', () => {
    const match = service['findMatchingVoucherRange'](
      [buildRange()],
      1000,
    );

    expect(match?.id).toBe('range-1');
  });

  it('treats null maxPrice as no upper bound defensively', () => {
    const match = service['findMatchingVoucherRange'](
      [buildRange({ maxPrice: null })],
      5000,
    );

    expect(match?.id).toBe('range-1');
  });
});

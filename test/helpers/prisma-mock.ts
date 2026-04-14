/**
 * Returns a full in-memory mock of PrismaService.
 * Every model method is a jest.fn() that returns sensible defaults.
 * Tests can override individual methods via jest.spyOn or .mockResolvedValue.
 */

const modelMock = () => ({
  findMany:   jest.fn().mockResolvedValue([]),
  findFirst:  jest.fn().mockResolvedValue(null),
  findUnique: jest.fn().mockResolvedValue(null),
  create:     jest.fn().mockResolvedValue({ id: 'mock-id' }),
  createMany: jest.fn().mockResolvedValue({ count: 1 }),
  update:     jest.fn().mockResolvedValue({ id: 'mock-id' }),
  updateMany: jest.fn().mockResolvedValue({ count: 1 }),
  upsert:     jest.fn().mockResolvedValue({ id: 'mock-id' }),
  delete:     jest.fn().mockResolvedValue({ id: 'mock-id' }),
  deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
  count:      jest.fn().mockResolvedValue(0),
  aggregate:  jest.fn().mockResolvedValue({
    _sum:   { sentCount: 0, failedCount: 0, quantity: 0, totalAmount: 0 },
    _avg:   { rating: 0 },
    _count: { id: 0 },
  }),
  groupBy: jest.fn().mockResolvedValue([]),
});

export const createPrismaMock = () => ({
  user:              modelMock(),
  product:           modelMock(),
  productVariant:    modelMock(),
  productImage:      modelMock(),
  category:          modelMock(),
  brand:             modelMock(),
  order:             modelMock(),
  orderItem:         modelMock(),
  cart:              modelMock(),
  cartItem:          modelMock(),
  address:           modelMock(),
  payment:           modelMock(),
  review:            modelMock(),
  banner:            modelMock(),
  coupon:            modelMock(),
  emailCampaign:     modelMock(),
  activityLog:       modelMock(),
  notification:      modelMock(),
  inventoryItem:     modelMock(),
  inventoryLocation: modelMock(),
  supplier:          modelMock(),
  purchaseOrder:     modelMock(),
  purchaseOrderItem: modelMock(),
  stockMovement:     modelMock(),
  adminNotification:    modelMock(),
  paymentGatewayConfig: modelMock(),
  ticket:               modelMock(),
  ticketMessage:        modelMock(),
  wishlist:             modelMock(),
  wishlistItem:         modelMock(),
  flashSale:            modelMock(),
  flashSaleItem:        modelMock(),
  shippingZone:         modelMock(),
  warehouseLocation:    modelMock(),

  // Raw SQL query — returns empty array by default
  $queryRaw: jest.fn().mockResolvedValue([]),

  // Prisma transaction — calls the callback with `this` as the tx client
  $transaction: jest.fn().mockImplementation((fn: any) => {
    if (typeof fn === 'function') return fn(createPrismaMock());
    return Promise.all(fn);
  }),
  $connect:    jest.fn().mockResolvedValue(undefined),
  $disconnect: jest.fn().mockResolvedValue(undefined),
});

export type PrismaMock = ReturnType<typeof createPrismaMock>;

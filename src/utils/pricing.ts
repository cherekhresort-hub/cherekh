export interface RoomDisplayPricing {
  listPrice: number
  salePrice: number
  promoActive: boolean
  discountPercent: number
}

export const getDiscountPercentFromPrices = (listPrice: number, salePrice: number): number => {
  if (listPrice <= 0 || salePrice <= 0 || listPrice <= salePrice) return 0
  return Math.round(((listPrice - salePrice) / listPrice) * 100)
}

/** Resolve strikethrough list price and badge from per-room original vs discounted rates only. */
export const resolveRoomDisplayPricing = (
  salePrice: number,
  roomListPrice?: number | null
): RoomDisplayPricing => {
  const normalizedSale = Math.max(0, Math.round(salePrice))
  const explicitList =
    roomListPrice != null && roomListPrice > 0 ? Math.round(roomListPrice) : null

  if (explicitList != null && explicitList > normalizedSale) {
    return {
      listPrice: explicitList,
      salePrice: normalizedSale,
      promoActive: true,
      discountPercent: getDiscountPercentFromPrices(explicitList, normalizedSale),
    }
  }

  return {
    listPrice: normalizedSale,
    salePrice: normalizedSale,
    promoActive: false,
    discountPercent: 0,
  }
}

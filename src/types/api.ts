import type { UserRole, UserRoles } from '../constants/roles'

export type ApiSuccess<T> = {
  success: true
  data: T
  message?: string
}

export type ApiFailure = {
  success: false
  error: string
  details?: unknown
}

export type ApiEnvelope<T> = ApiSuccess<T> | ApiFailure

export type AuthTokens = {
  accessToken: string
  refreshToken: string
  expiresIn?: string
}

export type User = {
  _id: string
  name: string
  email: string
  username: string
  phone?: string
  profilePhoto?: string
  roles?: UserRoles
  role?: UserRole | string | number
  isEmailVerified: boolean
  isKycVerified: boolean
  hasShop: boolean
  wallet?: {
    balance: number
    escrow: number
  }
  location?: {
    region?: string
    city?: string
  }
  kycId?: KycRecord | string | null
  following?: string[]
  createdAt?: string
  updatedAt?: string
}

export type Shop = {
  _id: string
  ownerId?: User | string
  shopName: string
  slug: string
  bio?: string
  logoUrl?: string
  bannerUrl?: string
  category?: 'retail' | 'wholesale' | 'both'
  isLive?: boolean
  rating?: number
  totalReviews?: number
  location?: {
    region?: string
    city?: string
  }
  payoutMethod?: {
    type?: 'mobile_money' | 'bank_transfer'
    accountName?: string
    provider?: string
    accountNumber?: string
    bankName?: string
    branch?: string
  }
}

export type Listing = {
  _id: string
  shopId?: Shop | string
  title: string
  description?: string
  category?: string
  brand?: string
  size?: string
  gender?: 'men' | 'women' | 'unisex' | 'kids'
  condition?: 'new' | 'used'
  type: 'retail' | 'wholesale'
  price: number
  currency?: string
  quantity?: number
  bulkMinQty?: number
  bulkWeight?: string
  volumeDiscounts?: Array<{
    minQty?: number
    pricePerUnit?: number
  }>
  images?: string[]
  promotionTags?: string[]
  visibility?: 'marketplace' | 'event'
  status?: 'active' | 'sold' | 'draft' | 'removed'
  views?: number
  createdAt?: string
  updatedAt?: string
}

export type Order = {
  _id: string
  buyerId?: User | string
  shopId?: Shop | string
  items: Array<{
    _id?: string
    listingId?: Listing | string
    title: string
    price: number
    quantity: number
  }>
  subtotalAmount?: number
  deliveryFee?: number
  totalAmount: number
  currency?: string
  status?: 'pending' | 'paid' | 'processing' | 'shipped' | 'delivered' | 'disputed' | 'cancelled' | 'refunded'
  fulfillmentStatus?: 'awaiting_seller' | 'ready_for_pickup' | 'in_transit' | 'completed' | 'cancelled'
  settlementStatus?:
    | 'payment_pending'
    | 'cash_due'
    | 'cash_collected'
    | 'held'
    | 'released'
    | 'refund_pending'
    | 'refund_attention'
    | 'refunded'
    | 'refund_failed'
    | 'void'
  paymentMethod?: 'paystack_mock' | 'paystack' | 'cash_on_pickup'
  paymentStatus?: 'unpaid' | 'paid' | 'cash_on_pickup' | 'refunded'
  paymentRef?: string
  escrowStatus?: 'not_held' | 'held' | 'released' | 'refunded'
  sellerAction?: 'pending' | 'accepted' | 'shipped' | 'pickup_ready'
  sellerActionAt?: string
  sellerActionDeadline?: string
  sellerNote?: string
  autoReleaseAt?: string
  releasedAt?: string
  buyerConfirmedAt?: string
  sellerActionDueAt?: string
  pickupReadyAt?: string
  pickupExpiresAt?: string
  sentAt?: string
  deliveryReleaseAt?: string
  completedAt?: string
  cancelledAt?: string
  inventoryRestoredAt?: string
  settledAt?: string
  activeReportId?: OrderReport | string
  disputeReason?: string
  delivery?: {
    method?: 'station_pickup' | 'shop_pickup' | 'airport_to_airport'
    company?: string
    fee?: number
    recipient?: {
      name?: string
      phone?: string
    }
    destination?: {
      recipientName?: string
      recipientPhone?: string
      region?: string
      town?: string
      preferredTerminal?: string
    }
    transit?: {
      serviceName?: string
      driverPhone?: string
      parcelNumber?: string
      billAttachmentId?: string
      cargoTrackingNumber?: string
      billImage?: {
        originalName?: string
        mimetype?: string
        size?: number
      }
    }
    address?: {
      region?: string
      city?: string
      street?: string
    }
    trackingInfo?: string
  }
  createdAt?: string
  updatedAt?: string
}

export type OrderReportCategory =
  | 'not_received'
  | 'invalid_transit_details'
  | 'seller_or_driver_unreachable'
  | 'wrong_or_missing_items'
  | 'damaged_or_not_as_described'
  | 'fraud_or_safety_concern'
  | 'other'

export type OrderReport = {
  _id: string
  orderId?: Order | string
  reporterId?: User | string
  category: OrderReportCategory
  affectedItemIds?: string[]
  requestedOutcome?: 'refund' | 'replacement' | 'complete_order' | 'other'
  summary?: string
  details?: string
  detailedAccount?: string
  evidence?: Array<{
    _id?: string
    originalName?: string
    mimetype?: string
    contentType?: string
    size?: number
  }>
  declarationAccepted?: boolean
  status: 'submitted' | 'under_review' | 'resolved' | 'dismissed'
  isActive?: boolean
  resolution?: {
    awardedTo?: 'buyer' | 'seller'
    resolverId?: User | string
    note?: string
    resolvedAt?: string
  }
  frozenAt?: string
  submittedAt?: string
  createdAt?: string
  updatedAt?: string
}

export type KycRecord = {
  _id?: string
  userId?: User | string
  idType?: 'Ghana Card' | 'Passport' | 'Driving License'
  idNo?: string
  dob?: string
  phone?: string
  phoneVerified?: boolean
  idImgUrl?: string
  selfieImgUrl?: string
  status: 'not_submitted' | 'pending' | 'approved' | 'rejected'
  rejectionReason?: string
  submissionCount?: number
  submittedAt?: string
  reviewedAt?: string
  reviewedBy?: User | string
}

export type Event = {
  _id: string
  organizerId?: User | string
  shopId?: Shop | string
  title: string
  description?: string
  date: string
  startTime?: string
  endTime?: string
  startsAt?: string
  endsAt?: string
  location?: string
  coverImage?: string
  eventListings?: Listing[] | string[]
  promotionTags?: string[]
  type: 'online-pop-up' | 'in-person-pop-up' | 'pop-up' | 'fair' | 'online'
  attendees?: string[]
  status?: 'upcoming' | 'ongoing' | 'past'
}

export type GalleryPost = {
  _id: string
  imageUrl: string
  caption?: string
  tags?: string[]
  likes?: string[]
  userId?: User | string
  createdAt?: string
}

export type FavoriteCollections = {
  ids: {
    events: string[]
    finspos: string[]
    listings: string[]
  }
  events: Event[]
  finspos: GalleryPost[]
  listings: Listing[]
}

export type Notification = {
  _id: string
  userId?: User | string
  type: 'order' | 'chat' | 'review' | 'kyc' | 'system'
  title: string
  body?: string
  link?: string
  isRead?: boolean
  createdAt?: string
}

export type PopularSearch = {
  count: number
  query: string
  normalizedQuery: string
}

export type WeeklyTopSeller = Shop & {
  completedOrders: number
  revenue: number
}

export type ChatConversation = {
  conversationId: string
  latestMessage: {
    _id: string
    attachments?: ChatAttachment[]
    content: string
    createdAt?: string
    isRead?: boolean
    senderId?: User | string
    receiverId?: User | string
    listingId?: Listing | string
  }
  unreadCount: number
  participant?: User | string
  listing?: Listing | string
}

export type ChatAttachment = {
  url: string
  type: 'image' | 'video'
  mimetype?: string
  originalname?: string
}

export type AuthPayload = {
  user: User
  tokens: AuthTokens
}

export type PaginatedListings = {
  results: Listing[]
  total: number
  page: number
  pages: number
}

export type PaginatedKycRecords = {
  records: KycRecord[]
  total: number
  page: number
  pages: number
  limit: number
}

export type AdminStats = {
  charts: {
    disputeEscrow: Array<{ count: number; escrowStatus: string }>
    disputeTrend: Array<{ date: string; disputes: number }>
    kycStatus: Array<{ count: number; status: KycRecord['status'] | string }>
    listingStatus: Array<{ count: number; status: Listing['status'] | string }>
    listingTrend: Array<{ date: string; listings: number }>
    listingType: Array<{ count: number; type: Listing['type'] | string }>
    orderStatus: Array<{ count: number; status: Order['status'] | string }>
    orderTrend: Array<{ date: string; orders: number }>
    pendingKycByIdType: Array<{ count: number; idType: KycRecord['idType'] | string }>
    revenueTrend: Array<{ date: string; orders: number; revenue: number }>
    shopCategory: Array<{ category: Shop['category'] | string; count: number }>
    shopLive: Array<{ count: number; status: 'Live' | 'Offline' | string }>
    shopTrend: Array<{ date: string; shops: number }>
    userStatus: Array<{ count: number; status: string }>
    userTrend: Array<{ date: string; users: number }>
    userVerification: Array<{ count: number; status: string }>
  }
  users: number
  shops: number
  orders: number
  listings: number
  pendingKyc: number
  pendingOrders: number
  disputes: number
  revenue: number
}

export type AdminAnalyticsFinspoPost = {
  _id: string
  author: { name: string; username: string }
  caption: string
  commentCount: number
  createdAt: string
  imageUrl: string
  likes: number
  views: number
}

export type AdminProductAnalytics = {
  days: number
  finspo: {
    comments: number
    postsCreated: number
    topPosts: AdminAnalyticsFinspoPost[]
    totalLikes: number
    totalViews: number
    trend: Array<{ comments: number; date: string; posts: number }>
  }
  orders: {
    completed: number
    completionRate: number
    created: number
    outcomeBreakdown: Array<{ count: number; outcome: string }>
    revenue: number
    trend: Array<{ completed: number; created: number; date: string }>
  }
}

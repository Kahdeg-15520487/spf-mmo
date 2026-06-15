const vi = {
  // App
  app: {
    title: 'SPF MMO',
    subtitle: 'Giao Đồ Ăn — Game Đa Người Chơi',
    loginPlaceholder: 'Nhập tên người chơi...',
    loginButton: 'Vào Game',
    loggingIn: 'Đang đăng nhập...',
    noPassword: 'Không cần mật khẩu — cứ chọn tên và chơi thôi!',
    coins: 'xu',
  },

  // Header
  header: {
    roleBuyer: '🛒 Mua',
    roleShop: '🍳 Bán',
    roleShipper: '🛵 Ship',
    exit: 'Thoát',
  },

  // Buyer
  buyer: {
    browse: '🛍️ Khám Phá',
    orders: '📦 Đơn Hàng',
    noShops: 'Chưa có shop nào. Chuyển sang vai trò Bán để tạo shop!',
    noOrders: 'Chưa có đơn hàng nào. Hãy khám phá shop để đặt món!',
    backToShops: '← Quay lại',
    cartItems: (n: number) => `${n} món trong giỏ`,
    cartTotal: 'Tổng',
    delivery: 'ship',
    placeOrder: 'Đặt Hàng 🚀',
    placing: 'Đang đặt...',
    cancelOrder: 'Hủy đơn',
    homeBanner: 'Nhà của bạn',
    changeHome: 'Đổi',
    welcomeHome: 'Chào mừng! Chọn Nơi Ở Của Bạn',
    welcomeHomeDesc: 'Chọn khu dân cư nơi bạn sống — đồ ăn sẽ được giao đến đây!',
    chooseHome: 'Chọn Khu Vực',
    chooseHomeTitle: '🏠 Chọn Khu Vực Sinh Sống',
    review: '⭐ Đánh giá',
    reviewTitle: 'Để lại đánh giá',
    shipperComment: 'Nhận xét shipper...',
    foodComment: 'Nhận xét món ăn...',
    submitReview: 'Gửi đánh giá',
    submitting: 'Đang gửi...',
    reviewed: (sr: number, fr: number) => `✅ Đã đánh giá — Shipper: ${sr}/5 | Món: ${fr}/5`,
    shipper: 'Shipper',
    foodRating: 'Món ăn',
  },

  // Order statuses
  orderStatus: {
    pending: 'Chờ xử lý',
    confirmed: 'Đã xác nhận',
    rejected: 'Đã từ chối',
    accepted: 'Đã nhận',
    picked_up: 'Đã lấy hàng',
    in_transit: 'Đang giao',
    delivered: 'Đã giao',
    cancelled: 'Đã hủy',
    expired: 'Hết hạn',
  },

  // Shop
  shop: {
    loading: 'Đang tạo shop của bạn...',
    reload: 'Tải lại',
    chooseLocation: '📍 Chọn Vị Trí Shop',
    chooseLocationDesc: (name: string) => `Chọn một khu thương mại để đặt ${name}. Đây là nơi shipper đến lấy hàng!`,
    changeLocation: 'Đổi địa điểm',
    menu: (n: number) => `Thực đơn (${n} món)`,
    addItem: '+ Thêm món',
    save: 'Lưu',
    cancel: 'Hủy',
    noOrders: 'Chưa có đơn hàng nào. Hãy chờ người mua đặt hàng từ shop của bạn!',
    incomingOrders: (n: number) => `Đơn hàng (${n})`,
    categories: ['Chung', 'Súp', 'Món chính', 'Khai vị', 'Bánh mì', 'Đồ uống', 'Tráng miệng', 'Pizza', 'Mỳ Ý', 'Salad'],
    itemName: 'Tên món',
    desc: 'Mô tả',
    price: 'Giá (xu)',
    deleteConfirm: 'Xóa món này?',
    edit: '✏️',
    delete: '🗑️',
  },

  // Shipper
  shipper: {
    loading: 'Đang tạo hồ sơ shipper...',
    reload: 'Tải lại',
    online: '🟢 Online',
    offline: '🔴 Offline',
    deliveries: (n: number) => `${n} đơn`,
    activeDelivery: (status: string) => `Đơn đang giao — ${status.toUpperCase()}`,
    fromTo: 'Từ',
    to: 'Đến',
    pickedUp: '📦 Đã lấy hàng',
    startDelivery: '🚀 Bắt đầu giao',
    delivered: '✅ Đã giao hàng',
    availableOrders: (n: number) => `📋 Đơn đang chờ (${n})`,
    noOrders: 'Chưa có đơn nào. Quay lại sau nhé!',
    accept: 'Nhận đơn',
    recentDeliveries: '📜 Đơn đã giao gần đây',
    noDeliveries: 'Chưa có đơn đã giao nào.',
    pickup: 'Lấy',
    expiresAt: 'Hết hạn',
  },

  // Zones
  zones: {
    commercialTitle: '🏪 Chọn khu thương mại cho shop của bạn',
    residentialTitle: '🏠 Chọn nơi bạn sinh sống',
    selectCommercial: 'Chọn khu thương mại này',
    selectResidential: 'Chọn khu dân cư này',
  },

  // Order Tracker
  tracker: {
    tracking: '🗺️ Theo dõi trực tiếp',
    moving: '— Shipper đang di chuyển!',
    waiting: '— Đang chờ shipper...',
    pickup: '🏪 Lấy hàng:',
    delivery: '📍 Giao hàng',
  },

  // Map
  map: {
    clickToMove: '🖱️ Bấm vào bản đồ để di chuyển shipper',
    youAreHere: 'Bạn đang ở đây',
    pickup: 'Lấy hàng:',
    delivery: 'Giao hàng:',
  },

  // General
  general: {
    error: 'Lỗi',
    orderFailed: 'Đặt hàng thất bại',
    acceptFailed: 'Không thể nhận đơn',
  },
} as const;

export default vi;
export type Translations = typeof vi;

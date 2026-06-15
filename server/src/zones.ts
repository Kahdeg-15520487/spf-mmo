export interface Zone {
  id: string;
  name: string;
  type: 'commercial' | 'residential';
  lat: number;
  lng: number;
  description: string;
  rent?: number; // daily rent for shops (commercial) or living cost (residential)
}

// === COMMERCIAL ZONES — 30 locations across HCMC ===
export const COMMERCIAL_ZONES: Zone[] = [
  // Quận 1 — Premium downtown
  { id: 'c-q1-bui-vien', name: 'Q1 — Phố Bùi Viện', type: 'commercial', lat: 10.7672, lng: 106.6936, description: 'Phố Tây sầm uất, du khách đông đúc 24/7.', rent: 55 },
  { id: 'c-q1-nguyen-hue', name: 'Q1 — Nguyễn Huệ', type: 'commercial', lat: 10.7740, lng: 106.7035, description: 'Phố đi bộ trung tâm, nhà hàng cao cấp.', rent: 60 },
  { id: 'c-q1-ben-thanh', name: 'Q1 — Chợ Bến Thành', type: 'commercial', lat: 10.7725, lng: 106.6980, description: 'Khu chợ biểu tượng, ăn uống đủ loại.', rent: 50 },
  { id: 'c-q1-hai-ba-trung', name: 'Q1 — Hai Bà Trưng', type: 'commercial', lat: 10.7790, lng: 106.6975, description: 'Con đường thời trang & ẩm thực.', rent: 45 },
  { id: 'c-q1-le-loi', name: 'Q1 — Lê Lợi', type: 'commercial', lat: 10.7735, lng: 106.7005, description: 'Khu mua sắm sầm uất gần nhà hát thành phố.', rent: 55 },
  { id: 'c-q1-pasteur', name: 'Q1 — Pasteur', type: 'commercial', lat: 10.7770, lng: 106.6955, description: 'Phố ẩm thực Hàn - Nhật - Việt.', rent: 45 },

  // Quận 3 — Historic & trendy
  { id: 'c-q3-vo-van-tan', name: 'Q3 — Võ Văn Tần', type: 'commercial', lat: 10.7760, lng: 106.6830, description: 'Khu cà phê sách, quán chay, bánh ngọt.', rent: 35 },
  { id: 'c-q3-nguyen-dinh-chieu', name: 'Q3 — Nguyễn Đình Chiểu', type: 'commercial', lat: 10.7785, lng: 106.6810, description: 'Đường ăn vặt nổi tiếng Sài Gòn.', rent: 30 },
  { id: 'c-q3-le-van-sy', name: 'Q3 — Lê Văn Sỹ', type: 'commercial', lat: 10.7820, lng: 106.6780, description: 'Chợ vải & quán cơm bình dân.', rent: 30 },
  { id: 'c-q3-nguyen-thong', name: 'Q3 — Nguyễn Thông', type: 'commercial', lat: 10.7745, lng: 106.6865, description: 'Khu phố cổ, quán hủ tiếu lâu đời.', rent: 25 },

  // Quận 5 — Chinatown
  { id: 'c-q5-nguyen-trai', name: 'Q5 — Nguyễn Trãi', type: 'commercial', lat: 10.7530, lng: 106.6670, description: 'Con đường chính Chợ Lớn, dimsum & mì gia truyền.', rent: 35 },
  { id: 'c-q5-hai-thuong', name: 'Q5 — Hải Thượng Lãn Ông', type: 'commercial', lat: 10.7545, lng: 106.6635, description: 'Phố thuốc bắc & quán ăn người Hoa.', rent: 25 },
  { id: 'c-q5-tran-hung-dao', name: 'Q5 — Trần Hưng Đạo', type: 'commercial', lat: 10.7570, lng: 106.6685, description: 'Khu ẩm thực đêm Chợ Lớn.', rent: 30 },
  { id: 'c-q5-cho-binh-tay', name: 'Q5 — Chợ Bình Tây', type: 'commercial', lat: 10.7505, lng: 106.6590, description: 'Chợ đầu mối, hải sản & gia vị.', rent: 20 },

  // Quận 7 — Modern expat
  { id: 'c-q7-crescent', name: 'Q7 — Crescent Mall', type: 'commercial', lat: 10.7310, lng: 106.7185, description: 'Khu mua sắm hồ Bán Nguyệt, nhà hàng sang.', rent: 50 },
  { id: 'c-q7-my-khanh', name: 'Q7 — Mỹ Khánh', type: 'commercial', lat: 10.7280, lng: 106.7080, description: 'Khu biệt thự & quán café ven sông.', rent: 40 },
  { id: 'c-q7-ton-dan', name: 'Q7 — Tôn Dật Tiên', type: 'commercial', lat: 10.7335, lng: 106.7140, description: 'Phố Hàn Quốc, BBQ & gà rán.', rent: 45 },
  { id: 'c-q7-canh-vien', name: 'Q7 — Cảnh Viên', type: 'commercial', lat: 10.7350, lng: 106.7220, description: 'Khu phức hợp mới, gia đình trẻ.', rent: 35 },

  // Bình Thạnh — Riverside
  { id: 'c-bt-phan-van-han', name: 'Bình Thạnh — Phan Văn Hân', type: 'commercial', lat: 10.8025, lng: 106.7085, description: 'Chợ & quán nhậu bình dân.', rent: 20 },
  { id: 'c-bt-nguyen-gia-tri', name: 'Bình Thạnh — Nguyễn Gia Trí', type: 'commercial', lat: 10.7975, lng: 106.7130, description: 'Khu ăn uống ven kênh Nhiêu Lộc.', rent: 30 },
  { id: 'c-bt-dien-bien-phu', name: 'Bình Thạnh — Điện Biên Phủ', type: 'commercial', lat: 10.7990, lng: 106.7060, description: 'Trục đường chính, quán cơm văn phòng.', rent: 25 },
  { id: 'c-bt-cho-ba-chieu', name: 'Bình Thạnh — Chợ Bà Chiểu', type: 'commercial', lat: 10.7950, lng: 106.7000, description: 'Chợ truyền thống lâu đời nhất Sài Gòn.', rent: 20 },

  // Tân Bình — Airport area
  { id: 'c-tb-truong-son', name: 'Tân Bình — Trường Sơn', type: 'commercial', lat: 10.7920, lng: 106.6580, description: 'Cổng sân bay, fast food & cà phê.', rent: 30 },
  { id: 'c-tb-cong-hoa', name: 'Tân Bình — Cộng Hòa', type: 'commercial', lat: 10.7875, lng: 106.6520, description: 'Đại lộ chính, nhà hàng tiệc cưới.', rent: 25 },
  { id: 'c-tb-hoang-van-thu', name: 'Tân Bình — Hoàng Văn Thụ', type: 'commercial', lat: 10.7945, lng: 106.6620, description: 'Khu công viên, quán xá sầm uất.', rent: 25 },

  // Gò Vấp — Suburban growth
  { id: 'c-gv-nguyen-van-luong', name: 'Gò Vấp — Nguyễn Văn Lượng', type: 'commercial', lat: 10.8320, lng: 106.6580, description: 'Khu phố ẩm thực mới nổi.', rent: 20 },
  { id: 'c-gv-quang-trung', name: 'Gò Vấp — Quang Trung', type: 'commercial', lat: 10.8260, lng: 106.6540, description: 'Trục đường chính Gò Vấp.', rent: 18 },

  // Tân Phú — New development
  { id: 'c-tp-luy-ban-bich', name: 'Tân Phú — Lũy Bán Bích', type: 'commercial', lat: 10.7830, lng: 106.6350, description: 'Khu dân cư đông, quán ăn gia đình.', rent: 15 },
  { id: 'c-tp-aeon-tan-phu', name: 'Tân Phú — Aeon Mall', type: 'commercial', lat: 10.7800, lng: 106.6250, description: 'Trung tâm thương mại lớn, food court.', rent: 40 },
];

// === RESIDENTIAL ZONES — 30 locations across HCMC ===
export const RESIDENTIAL_ZONES: Zone[] = [
  // Thủ Đức — Student hub
  { id: 'r-td-linh-trung', name: 'Thủ Đức — Linh Trung', type: 'residential', lat: 10.8550, lng: 106.7750, description: 'Làng đại học, sinh viên đông đúc.', rent: 5 },
  { id: 'r-td-tang-nhon-phu', name: 'Thủ Đức — Tăng Nhơn Phú', type: 'residential', lat: 10.8420, lng: 106.7820, description: 'Khu chung cư sinh viên mới.', rent: 5 },
  { id: 'r-td-hiep-phu', name: 'Thủ Đức — Hiệp Phú', type: 'residential', lat: 10.8480, lng: 106.7650, description: 'Gần Suối Tiên, khu dân cư trẻ.', rent: 5 },

  // Quận 2 — Expat & luxury
  { id: 'r-q2-thao-dien', name: 'Q2 — Thảo Điền', type: 'residential', lat: 10.7920, lng: 106.7420, description: 'Biệt thự & căn hộ cao cấp, Tây ở nhiều.', rent: 30 },
  { id: 'r-q2-an-phu', name: 'Q2 — An Phú', type: 'residential', lat: 10.7860, lng: 106.7500, description: 'Khu compound sang trọng, gia đình ngoại giao.', rent: 35 },
  { id: 'r-q2-binh-trung-tay', name: 'Q2 — Bình Trưng Tây', type: 'residential', lat: 10.7800, lng: 106.7620, description: 'Khu dân cư mới ven sông.', rent: 20 },
  { id: 'r-q2-cat-lai', name: 'Q2 — Cát Lái', type: 'residential', lat: 10.7700, lng: 106.7750, description: 'Khu đô thị mới, chung cư giá tốt.', rent: 15 },

  // Quận 4 — Dense riverside
  { id: 'r-q4-doan-van-bo', name: 'Q4 — Đoàn Văn Bơ', type: 'residential', lat: 10.7610, lng: 106.7030, description: 'Chung cư cũ sát sông, dân lao động.', rent: 5 },
  { id: 'r-q4-ton-dan', name: 'Q4 — Tôn Đản', type: 'residential', lat: 10.7580, lng: 106.7060, description: 'Khu phố nhỏ, view sông Sài Gòn.', rent: 5 },
  { id: 'r-q4-khanh-hoi', name: 'Q4 — Khánh Hội', type: 'residential', lat: 10.7630, lng: 106.7000, description: 'Gần cầu Ông Lãnh, nhà trọ công nhân.', rent: 5 },

  // Quận 10 — Traditional
  { id: 'r-q10-nguyen-tri-phuong', name: 'Q10 — Nguyễn Tri Phương', type: 'residential', lat: 10.7690, lng: 106.6670, description: 'Khu phố cổ, nhà ống san sát.', rent: 10 },
  { id: 'r-q10-to-hien-thanh', name: 'Q10 — Tô Hiến Thành', type: 'residential', lat: 10.7730, lng: 106.6650, description: 'Gần chợ Hòa Hưng, dân trí thức.', rent: 10 },
  { id: 'r-q10-su-van-hanh', name: 'Q10 — Sư Vạn Hạnh', type: 'residential', lat: 10.7715, lng: 106.6710, description: 'Khu mua sắm & chung cư cao tầng.', rent: 15 },

  // Phú Nhuận — Quiet garden homes
  { id: 'r-pn-phan-xich-long', name: 'Phú Nhuận — Phan Xích Long', type: 'residential', lat: 10.7970, lng: 106.6820, description: 'Khu biệt thự, phố ẩm thực nhỏ.', rent: 15 },
  { id: 'r-pn-nguyen-dinh-chinh', name: 'Phú Nhuận — Nguyễn Đình Chính', type: 'residential', lat: 10.7930, lng: 106.6780, description: 'Phố yên tĩnh gần sân bay.', rent: 12 },
  { id: 'r-pn-truong-sa', name: 'Phú Nhuận — Trường Sa', type: 'residential', lat: 10.7990, lng: 106.6850, description: 'Ven kênh Nhiêu Lộc, view đẹp.', rent: 18 },

  // Gò Vấp — Suburban
  { id: 'r-gv-nguyen-khiem', name: 'Gò Vấp — Nguyễn Kiệm', type: 'residential', lat: 10.8280, lng: 106.6630, description: 'Khu nhà phố đông đúc.', rent: 8 },
  { id: 'r-gv-pham-van-chieu', name: 'Gò Vấp — Phạm Văn Chiêu', type: 'residential', lat: 10.8350, lng: 106.6550, description: 'Khu dân cư mới, nhiều gia đình trẻ.', rent: 8 },
  { id: 'r-gv-le-duc-tho', name: 'Gò Vấp — Lê Đức Thọ', type: 'residential', lat: 10.8310, lng: 106.6480, description: 'Trục đường chính, chung cư mới.', rent: 10 },

  // Quận 8 — Canal life
  { id: 'r-q8-pham-the-hien', name: 'Q8 — Phạm Thế Hiển', type: 'residential', lat: 10.7380, lng: 106.6530, description: 'Khu dân cư ven kênh Tàu Hủ.', rent: 5 },
  { id: 'r-q8-binh-dong', name: 'Q8 — Bình Đông', type: 'residential', lat: 10.7420, lng: 106.6580, description: 'Làng nghề truyền thống cạnh kênh.', rent: 5 },

  // Tân Phú — New Saigon
  { id: 'r-tp-dam-sen', name: 'Tân Phú — Đầm Sen', type: 'residential', lat: 10.7880, lng: 106.6320, description: 'Gần công viên Đầm Sen, khu vui chơi.', rent: 8 },
  { id: 'r-tp-au-co', name: 'Tân Phú — Âu Cơ', type: 'residential', lat: 10.7820, lng: 106.6380, description: 'Khu chợ Tân Phú, dân cư đông.', rent: 8 },

  // Quận 6 — Working class
  { id: 'r-q6-hau-giang', name: 'Q6 — Hậu Giang', type: 'residential', lat: 10.7480, lng: 106.6450, description: 'Khu dân cư người Hoa lao động.', rent: 5 },
  { id: 'r-q6-binh-phu', name: 'Q6 — Bình Phú', type: 'residential', lat: 10.7450, lng: 106.6500, description: 'Chung cư bình dân mới xây.', rent: 6 },

  // Quận 11 — Family
  { id: 'r-q11-le-dai-hanh', name: 'Q11 — Lê Đại Hành', type: 'residential', lat: 10.7620, lng: 106.6500, description: 'Khu phố Tàu nhỏ, gia đình đông con.', rent: 7 },
  { id: 'r-q11-on-ich-khiem', name: 'Q11 — Ông Ích Khiêm', type: 'residential', lat: 10.7650, lng: 106.6480, description: 'Gần Đầm Sen, nhà trọ & chung cư.', rent: 7 },

  // Bình Tân — Outer growth
  { id: 'r-bt-kinh-duong-vuong', name: 'Bình Tân — Kinh Dương Vương', type: 'residential', lat: 10.7400, lng: 106.6150, description: 'Khu dân cư mới mở rộng phía Tây.', rent: 5 },
  { id: 'r-bt-aeon-binh-tan', name: 'Bình Tân — Aeon Bình Tân', type: 'residential', lat: 10.7450, lng: 106.6100, description: 'Gần trung tâm thương mại lớn nhất.', rent: 10 },
];

export const ALL_ZONES = [...COMMERCIAL_ZONES, ...RESIDENTIAL_ZONES];

export function getZoneById(id: string): Zone | undefined {
  return ALL_ZONES.find((z) => z.id === id);
}

export function getCommercialZones(): Zone[] {
  return COMMERCIAL_ZONES;
}

export function getResidentialZones(): Zone[] {
  return RESIDENTIAL_ZONES;
}

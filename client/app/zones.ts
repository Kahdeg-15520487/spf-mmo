export interface Zone {
  id: string;
  name: string;
  type: 'commercial' | 'residential';
  lat: number;
  lng: number;
  description: string;
}

export const COMMERCIAL_ZONES: Zone[] = [
  { id: 'c-district-1', name: 'Quận 1 — Phố Ẩm Thực', type: 'commercial', lat: 10.775, lng: 106.698, description: 'Trung tâm sầm uất, giá thuê cao. Phổ biến với nhà hàng và quán cà phê.' },
  { id: 'c-district-3', name: 'Quận 3 — Chợ Trung Tâm', type: 'commercial', lat: 10.780, lng: 106.685, description: 'Khu chợ lịch sử, lý tưởng cho tiệm bánh và quán ăn đường phố.' },
  { id: 'c-district-5', name: 'Quận 5 — Khu Chợ Lớn', type: 'commercial', lat: 10.755, lng: 106.665, description: 'Chợ Lớn, nổi tiếng với quán mì và nhà hàng dimsum.' },
  { id: 'c-district-7', name: 'Quận 7 — Phú Mỹ Hưng', type: 'commercial', lat: 10.730, lng: 106.710, description: 'Khu hiện đại, điểm nóng ẩm thực Hàn Quốc và Nhật Bản.' },
  { id: 'c-binh-thanh', name: 'Bình Thạnh — Chợ Kênh', type: 'commercial', lat: 10.800, lng: 106.710, description: 'Ven sông, nổi tiếng với quán hải sản và đồ nướng.' },
  { id: 'c-tan-binh', name: 'Tân Bình — Quảng Trường Sân Bay', type: 'commercial', lat: 10.790, lng: 106.655, description: 'Gần sân bay, thức ăn nhanh phát triển mạnh ở đây.' },
];

export const RESIDENTIAL_ZONES: Zone[] = [
  { id: 'r-thu-duc', name: 'Thủ Đức — Khu Đại Học', type: 'residential', lat: 10.850, lng: 106.770, description: 'Khu sinh viên, nhiều đơn đặt đồ ăn khuya.' },
  { id: 'r-district-2', name: 'Quận 2 — Thảo Điền', type: 'residential', lat: 10.790, lng: 106.740, description: 'Khu người nước ngoài, biệt thự và căn hộ. Khu vực giao hàng cao cấp.' },
  { id: 'r-district-4', name: 'Quận 4 — Chung Cư Ven Sông', type: 'residential', lat: 10.760, lng: 106.705, description: 'Chung cư dày đặc dọc sông Sài Gòn.' },
  { id: 'r-district-10', name: 'Quận 10 — Phố Cổ', type: 'residential', lat: 10.770, lng: 106.670, description: 'Khu phố truyền thống, nhà gia đình, món ăn địa phương.' },
  { id: 'r-phu-nhuan', name: 'Phú Nhuận — Nhà Vườn', type: 'residential', lat: 10.795, lng: 106.680, description: 'Đường phố yên tĩnh với biệt thự và nhà vườn.' },
  { id: 'r-go-vap', name: 'Gò Vấp — Khu Ngoại Ô', type: 'residential', lat: 10.830, lng: 106.660, description: 'Vùng ngoại ô đang phát triển, chung cư mới, hướng gia đình.' },
  { id: 'r-district-8', name: 'Quận 8 — Làng Kênh', type: 'residential', lat: 10.735, lng: 106.650, description: 'Khu dân cư lao động dọc theo kênh rạch.' },
  { id: 'r-tan-phu', name: 'Tân Phú — Sài Gòn Mới', type: 'residential', lat: 10.785, lng: 106.630, description: 'Khu dân cư mới phát triển, đang phát triển nhanh.' },
];

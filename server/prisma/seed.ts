import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding SPF MMO database with bots...');

  const shopData = [
    { username: 'alice', shopName: "Bếp Nhà Alice", zoneId: 'c-q1-ben-thanh', desc: 'Cơm nhà làm ngon tuyệt! Nguyên liệu tươi mỗi ngày.',
      menu: [
        { name: 'Phở Bò', desc: 'Phở bò truyền thống nước dùng đậm đà', price: 45, cat: 'Súp' },
        { name: 'Bánh Mì', desc: 'Bánh mì thịt nướng giòn tan', price: 25, cat: 'Bánh mì' },
        { name: 'Bún Chả', desc: 'Bún chả Hà Nội chuẩn vị', price: 50, cat: 'Món chính' },
        { name: 'Chả Giò', desc: 'Chả giò chiên giòn (4 cuốn)', price: 30, cat: 'Khai vị' },
        { name: 'Cà Phê Sữa Đá', desc: 'Cà phê sữa đá Việt Nam', price: 20, cat: 'Đồ uống' },
        { name: 'Sinh Tố Xoài', desc: 'Xoài tươi xay cùng sữa chua', price: 35, cat: 'Đồ uống' },
      ] },
    { username: 'diana', shopName: "Pizza & Pasta Diana", zoneId: 'c-q3-vo-van-tan', desc: 'Ẩm thực Ý phong cách Việt!',
      menu: [
        { name: 'Pizza Margherita', desc: 'Cà chua, mozzarella, húng quế', price: 80, cat: 'Pizza' },
        { name: 'Mỳ Ý Bolognese', desc: 'Sốt thịt bò đậm đà phô mai', price: 65, cat: 'Mỳ Ý' },
        { name: 'Salad Caesar', desc: 'Rau romaine sốt nhà làm', price: 40, cat: 'Salad' },
        { name: 'Tiramisu', desc: 'Tráng miệng Ý cổ điển', price: 45, cat: 'Tráng miệng' },
      ] },
    { username: 'bep_viet', shopName: 'Bếp Việt', zoneId: 'c-q5-nguyen-trai', desc: 'Cơm tấm, bún bò, hủ tiếu — đậm chất Sài Gòn.',
      menu: [
        { name: 'Cơm Tấm Sườn', desc: 'Sườn nướng, bì, chả, trứng ốp la', price: 40, cat: 'Món chính' },
        { name: 'Bún Bò Huế', desc: 'Bún bò cay chuẩn vị cố đô', price: 45, cat: 'Súp' },
        { name: 'Hủ Tiếu Nam Vang', desc: 'Hủ tiếu tôm thịt nước lèo ngọt', price: 38, cat: 'Súp' },
        { name: 'Gỏi Cuốn', desc: 'Gỏi cuốn tôm thịt (3 cuốn)', price: 28, cat: 'Khai vị' },
        { name: 'Chè Ba Màu', desc: 'Chè đậu xanh, đậu đỏ, thạch', price: 15, cat: 'Tráng miệng' },
      ] },
    { username: 'sushi_master', shopName: 'Sushi Bậc Thầy', zoneId: 'c-q7-crescent', desc: 'Sushi và sashimi tươi ngon mỗi ngày.',
      menu: [
        { name: 'Sushi Cá Hồi', desc: '6 miếng sushi cá hồi tươi', price: 85, cat: 'Món chính' },
        { name: 'Sashimi Tổng Hợp', desc: 'Cá hồi, cá ngừ, bạch tuộc', price: 120, cat: 'Món chính' },
        { name: 'Cơm Cà Ri Nhật', desc: 'Cơm cà ri gà kiểu Nhật', price: 55, cat: 'Món chính' },
        { name: 'Edamame', desc: 'Đậu nành Nhật hấp muối', price: 20, cat: 'Khai vị' },
        { name: 'Trà Xanh Matcha', desc: 'Trà xanh matcha đá', price: 25, cat: 'Đồ uống' },
      ] },
    { username: 'banh_mi_king', shopName: 'Vua Bánh Mì', zoneId: 'c-bt-cho-ba-chieu', desc: 'Vua bánh mì — 20 năm kinh nghiệm!',
      menu: [
        { name: 'Bánh Mì Đặc Biệt', desc: 'Thịt nguội, pate, chả, đồ chua', price: 20, cat: 'Bánh mì' },
        { name: 'Bánh Mì Gà Xé', desc: 'Gà xé sả ớt bơ đậu phộng', price: 22, cat: 'Bánh mì' },
        { name: 'Bánh Mì Chay', desc: 'Đậu hũ sốt nấm rau củ', price: 18, cat: 'Bánh mì' },
        { name: 'Sữa Đậu Nành', desc: 'Sữa đậu nành nóng hoặc đá', price: 10, cat: 'Đồ uống' },
      ] },
    { username: 'seafood_grill', shopName: 'Hải Sản Nướng 99', zoneId: 'c-bt-nguyen-gia-tri', desc: 'Hải sản tươi sống nướng tại chỗ. Vỉa hè Sài Gòn!',
      menu: [
        { name: 'Tôm Nướng Muối Ớt', desc: 'Tôm sú nướng muối ớt cay', price: 75, cat: 'Món chính' },
        { name: 'Mực Nướng Sa Tế', desc: 'Mực ống nướng sa tế thơm lừng', price: 60, cat: 'Món chính' },
        { name: 'Hàu Nướng Phô Mai', desc: '6 con hàu sữa nướng phô mai', price: 55, cat: 'Món chính' },
        { name: 'Ốc Hương Rang Muối', desc: 'Ốc hương rang muối tiêu', price: 50, cat: 'Khai vị' },
        { name: 'Bia Saigon', desc: 'Bia Saigon lạnh', price: 15, cat: 'Đồ uống' },
      ] },
    { username: 'chef_minh', shopName: 'Nhà Hàng Minh', zoneId: 'c-tb-cong-hoa', desc: 'Cơm văn phòng, cơm phần — nhanh gọn, sạch sẽ.',
      menu: [
        { name: 'Cơm Gà Xối Mỡ', desc: 'Gà chiên giòn, cơm, dưa góp', price: 42, cat: 'Món chính' },
        { name: 'Cơm Sườn Nướng', desc: 'Sườn cốt lết nướng mật ong', price: 40, cat: 'Món chính' },
        { name: 'Cơm Cá Kho Tộ', desc: 'Cá basa kho tộ đậm đà', price: 38, cat: 'Món chính' },
        { name: 'Canh Chua Cá', desc: 'Canh chua cá lóc rau muống', price: 25, cat: 'Súp' },
        { name: 'Trà Đá', desc: 'Trà đá vắt chanh', price: 5, cat: 'Đồ uống' },
      ] },
    { username: 'dessert_house', shopName: 'Tiệm Chè Cô Tư', zoneId: 'c-q3-le-van-sy', desc: 'Chè, bánh ngọt, tráng miệng — ngọt ngào mỗi ngày!',
      menu: [
        { name: 'Chè Thái', desc: 'Chè Thái thập cẩm trái cây', price: 25, cat: 'Tráng miệng' },
        { name: 'Bánh Flan', desc: 'Bánh flan caramel béo mịn', price: 15, cat: 'Tráng miệng' },
        { name: 'Kem Dừa', desc: 'Kem dừa sầu riêng', price: 30, cat: 'Tráng miệng' },
        { name: 'Trà Sữa Trân Châu', desc: 'Trà sữa trân châu đường đen', price: 28, cat: 'Đồ uống' },
        { name: 'Sinh Tố Bơ', desc: 'Bơ sáp xay sữa đặc', price: 32, cat: 'Đồ uống' },
      ] },
  ];

  for (const s of shopData) {
    const user = await prisma.user.upsert({
      where: { username: s.username },
      update: { balance: 999999 },
      create: { username: s.username, balance: 0, role: 'shop',
        homeZoneId: 'r-q10-nguyen-tri-phuong', homeAddress: 'Quận 10 — Nguyễn Tri Phương', homeLat: 10.7690, homeLng: 106.6670,
      },
    });
    const { getZoneById } = await import('../src/zones');
    const zone = getZoneById(s.zoneId);
    const shop = await prisma.shop.upsert({
      where: { ownerId: user.id },
      update: { name: s.shopName, description: s.desc, zoneId: s.zoneId, lat: zone?.lat || 10.77, lng: zone?.lng || 106.69, address: zone?.name || s.shopName },
      create: { ownerId: user.id, name: s.shopName, description: s.desc, zoneId: s.zoneId, lat: zone?.lat || 10.77, lng: zone?.lng || 106.69, address: zone?.name || s.shopName },
    });
    for (const item of s.menu) {
      await prisma.menuItem.upsert({
        where: { id: `${shop.id}-${item.name}` },
        update: { price: item.price },
        create: { id: `${shop.id}-${item.name}`, shopId: shop.id, name: item.name, description: item.desc, price: item.price, category: item.cat, imageUrl: '🍽️' },
      });
    }
  }

  const shipperData = [
    { username: 'charlie', vehicle: 'Xe Máy' },
    { username: 'shipper_linh', vehicle: 'Xe Máy' },
    { username: 'shipper_tuan', vehicle: 'Xe Đạp' },
    { username: 'shipper_mai', vehicle: 'Xe Máy' },
    { username: 'shipper_hung', vehicle: 'Ô Tô' },
    { username: 'shipper_anh', vehicle: 'Xe Đạp' },
    { username: 'shipper_dat', vehicle: 'Xe Máy' },
  ];

  const resZones = ['r-td-linh-trung','r-q4-doan-van-bo','r-q10-nguyen-tri-phuong','r-pn-phan-xich-long','r-gv-nguyen-khiem','r-q8-pham-the-hien','r-tp-dam-sen'];
  for (const s of shipperData) {
    const zid = resZones[Math.floor(Math.random() * resZones.length)];
    const user = await prisma.user.upsert({
      where: { username: s.username },
      update: { balance: 999999 },
      create: { username: s.username, balance: 0, role: 'shipper', homeZoneId: zid, homeAddress: '', homeLat: 10.77, homeLng: 106.69 },
    });
    await prisma.shipper.upsert({
      where: { userId: user.id },
      update: { vehicle: s.vehicle, rating: 3 + Math.random() * 2, totalDeliveries: Math.floor(Math.random() * 50) },
      create: { userId: user.id, vehicle: s.vehicle, rating: 3 + Math.random() * 2, totalDeliveries: Math.floor(Math.random() * 50), isOnline: false, lat: 10.76 + Math.random() * 0.05, lng: 106.66 + Math.random() * 0.05 },
    });
  }

  const buyerData = [
    { username: 'bob', zoneId: 'r-td-linh-trung' },
    { username: 'buyer_em', zoneId: 'r-q2-thao-dien' },
    { username: 'buyer_hoa', zoneId: 'r-q4-doan-van-bo' },
    { username: 'buyer_long', zoneId: 'r-q10-nguyen-tri-phuong' },
    { username: 'buyer_thao', zoneId: 'r-pn-phan-xich-long' },
    { username: 'buyer_minh', zoneId: 'r-gv-nguyen-khiem' },
    { username: 'buyer_trang', zoneId: 'r-q8-pham-the-hien' },
    { username: 'buyer_hai', zoneId: 'r-tp-dam-sen' },
    { username: 'buyer_nam', zoneId: 'r-td-tang-nhon-phu' },
    { username: 'buyer_phuc', zoneId: 'r-q2-an-phu' },
  ];

  const addrMap: Record<string, string> = {
    'r-td-linh-trung': 'Thủ Đức — Linh Trung',
    'r-td-tang-nhon-phu': 'Thủ Đức — Tăng Nhơn Phú',
    'r-q2-thao-dien': 'Q2 — Thảo Điền',
    'r-q2-an-phu': 'Q2 — An Phú',
    'r-q4-doan-van-bo': 'Q4 — Đoàn Văn Bơ',
    'r-q10-nguyen-tri-phuong': 'Q10 — Nguyễn Tri Phương',
    'r-pn-phan-xich-long': 'Phú Nhuận — Phan Xích Long',
    'r-gv-nguyen-khiem': 'Gò Vấp — Nguyễn Kiệm',
    'r-q8-pham-the-hien': 'Q8 — Phạm Thế Hiển',
    'r-tp-dam-sen': 'Tân Phú — Đầm Sen',
  };

  for (const b of buyerData) {
    await prisma.user.upsert({
      where: { username: b.username },
      update: { balance: 0, homeZoneId: b.zoneId },
      create: {
        username: b.username, balance: 0, role: 'buyer',
        homeZoneId: b.zoneId, homeAddress: addrMap[b.zoneId] || b.zoneId,
        homeLat: 10.77 + Math.random() * 0.08, homeLng: 106.63 + Math.random() * 0.14,
      },
    });
  }

  console.log('✅ Seed complete!');
  console.log(`   🏪 ${shopData.length} shops with menus`);
  console.log(`   🛵 ${shipperData.length} shippers`);
  console.log(`   🛒 ${buyerData.length} buyers`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });

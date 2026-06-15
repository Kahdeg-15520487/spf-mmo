import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding SPF MMO database with bots...');

  // ---- SHOPS ----
  const shopData = [
    { username: 'alice', shopName: "Alice's Kitchen", zoneId: 'c-district-1', desc: 'Cơm nhà làm ngon tuyệt! Nguyên liệu tươi mỗi ngày.', lat: 10.775, lng: 106.698,
      menu: [
        { name: 'Phở Bò', desc: 'Phở bò truyền thống nước dùng đậm đà', price: 45, cat: 'Súp' },
        { name: 'Bánh Mì', desc: 'Bánh mì thịt nướng giòn tan', price: 25, cat: 'Bánh mì' },
        { name: 'Bún Chả', desc: 'Bún chả Hà Nội chuẩn vị', price: 50, cat: 'Món chính' },
        { name: 'Chả Giò', desc: 'Chả giò chiên giòn (4 cuốn)', price: 30, cat: 'Khai vị' },
        { name: 'Cà Phê Sữa Đá', desc: 'Cà phê sữa đá Việt Nam', price: 20, cat: 'Đồ uống' },
        { name: 'Sinh Tố Xoài', desc: 'Xoài tươi xay cùng sữa chua', price: 35, cat: 'Đồ uống' },
      ] },
    { username: 'diana', shopName: "Diana's Pizza & Pasta", zoneId: 'c-district-3', desc: 'Ẩm thực Ý phong cách Việt!', lat: 10.780, lng: 106.685,
      menu: [
        { name: 'Pizza Margherita', desc: 'Cà chua, mozzarella, húng quế', price: 80, cat: 'Pizza' },
        { name: 'Mỳ Ý Bolognese', desc: 'Sốt thịt bò đậm đà phô mai', price: 65, cat: 'Mỳ Ý' },
        { name: 'Salad Caesar', desc: 'Rau romaine sốt nhà làm', price: 40, cat: 'Salad' },
        { name: 'Tiramisu', desc: 'Tráng miệng Ý cổ điển', price: 45, cat: 'Tráng miệng' },
      ] },
    { username: 'bep_viet', shopName: 'Bếp Việt', zoneId: 'c-district-5', desc: 'Cơm tấm, bún bò, hủ tiếu — đậm chất Sài Gòn.', lat: 10.755, lng: 106.665,
      menu: [
        { name: 'Cơm Tấm Sườn', desc: 'Sườn nướng, bì, chả, trứng ốp la', price: 40, cat: 'Món chính' },
        { name: 'Bún Bò Huế', desc: 'Bún bò cay chuẩn vị cố đô', price: 45, cat: 'Súp' },
        { name: 'Hủ Tiếu Nam Vang', desc: 'Hủ tiếu tôm thịt nước lèo ngọt', price: 38, cat: 'Súp' },
        { name: 'Gỏi Cuốn', desc: 'Gỏi cuốn tôm thịt (3 cuốn)', price: 28, cat: 'Khai vị' },
        { name: 'Chè Ba Màu', desc: 'Chè đậu xanh, đậu đỏ, thạch', price: 15, cat: 'Tráng miệng' },
      ] },
    { username: 'sushi_master', shopName: 'Sushi Master', zoneId: 'c-district-7', desc: 'Sushi và sashimi tươi ngon mỗi ngày.', lat: 10.730, lng: 106.710,
      menu: [
        { name: 'Sushi Cá Hồi', desc: '6 miếng sushi cá hồi tươi', price: 85, cat: 'Món chính' },
        { name: 'Sashimi Tổng Hợp', desc: 'Cá hồi, cá ngừ, bạch tuộc', price: 120, cat: 'Món chính' },
        { name: 'Cơm Cà Ri Nhật', desc: 'Cơm cà ri gà kiểu Nhật', price: 55, cat: 'Món chính' },
        { name: 'Edamame', desc: 'Đậu nành Nhật hấp muối', price: 20, cat: 'Khai vị' },
        { name: 'Trà Xanh Matcha', desc: 'Trà xanh matcha đá', price: 25, cat: 'Đồ uống' },
      ] },
    { username: 'banh_mi_king', shopName: 'Bánh Mì King', zoneId: 'c-binh-thanh', desc: 'Vua bánh mì — 20 năm kinh nghiệm!', lat: 10.800, lng: 106.710,
      menu: [
        { name: 'Bánh Mì Đặc Biệt', desc: 'Thịt nguội, pate, chả, đồ chua', price: 20, cat: 'Bánh mì' },
        { name: 'Bánh Mì Gà Xé', desc: 'Gà xé sả ớt bơ đậu phộng', price: 22, cat: 'Bánh mì' },
        { name: 'Bánh Mì Chay', desc: 'Đậu hũ sốt nấm rau củ', price: 18, cat: 'Bánh mì' },
        { name: 'Sữa Đậu Nành', desc: 'Sữa đậu nành nóng hoặc đá', price: 10, cat: 'Đồ uống' },
      ] },
    { username: 'seafood_grill', shopName: 'Hải Sản Nướng 99', zoneId: 'c-binh-thanh', desc: 'Hải sản tươi sống nướng tại chỗ. Vỉa hè Sài Gòn!', lat: 10.803, lng: 106.713,
      menu: [
        { name: 'Tôm Nướng Muối Ớt', desc: 'Tôm sú nướng muối ớt cay', price: 75, cat: 'Món chính' },
        { name: 'Mực Nướng Sa Tế', desc: 'Mực ống nướng sa tế thơm lừng', price: 60, cat: 'Món chính' },
        { name: 'Hàu Nướng Phô Mai', desc: '6 con hàu sữa nướng phô mai', price: 55, cat: 'Món chính' },
        { name: 'Ốc Hương Rang Muối', desc: 'Ốc hương rang muối tiêu', price: 50, cat: 'Khai vị' },
        { name: 'Bia Saigon', desc: 'Bia Saigon lạnh', price: 15, cat: 'Đồ uống' },
      ] },
    { username: 'chef_minh', shopName: 'Nhà Hàng Minh', zoneId: 'c-tan-binh', desc: 'Cơm văn phòng, cơm phần — nhanh gọn, sạch sẽ.', lat: 10.790, lng: 106.655,
      menu: [
        { name: 'Cơm Gà Xối Mỡ', desc: 'Gà chiên giòn, cơm, dưa góp', price: 42, cat: 'Món chính' },
        { name: 'Cơm Sườn Nướng', desc: 'Sườn cốt lết nướng mật ong', price: 40, cat: 'Món chính' },
        { name: 'Cơm Cá Kho Tộ', desc: 'Cá basa kho tộ đậm đà', price: 38, cat: 'Món chính' },
        { name: 'Canh Chua Cá', desc: 'Canh chua cá lóc rau muống', price: 25, cat: 'Súp' },
        { name: 'Trà Đá', desc: 'Trà đá vắt chanh', price: 5, cat: 'Đồ uống' },
      ] },
    { username: 'dessert_house', shopName: 'Tiệm Chè Cô Tư', zoneId: 'c-district-3', desc: 'Chè, bánh ngọt, tráng miệng — ngọt ngào mỗi ngày!', lat: 10.782, lng: 106.688,
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
      update: { balance: 5000 + Math.random() * 10000 },
      create: {
        username: s.username,
        balance: 5000 + Math.random() * 10000,
        role: 'shop',
        homeZoneId: 'r-district-10',
        homeAddress: 'Quận 10 — Phố Cổ',
        homeLat: 10.770,
        homeLng: 106.670,
      },
    });
    const shop = await prisma.shop.upsert({
      where: { ownerId: user.id },
      update: { name: s.shopName, description: s.desc, zoneId: s.zoneId, lat: s.lat, lng: s.lng, address: s.shopName },
      create: { ownerId: user.id, name: s.shopName, description: s.desc, zoneId: s.zoneId, lat: s.lat, lng: s.lng, address: s.shopName },
    });
    for (const item of s.menu) {
      await prisma.menuItem.upsert({
        where: { id: `${shop.id}-${item.name}` },
        update: { price: item.price },
        create: { id: `${shop.id}-${item.name}`, shopId: shop.id, name: item.name, description: item.desc, price: item.price, category: item.cat, imageUrl: '🍽️' },
      });
    }
  }

  // ---- SHIPPERS ----
  const shipperData = [
    { username: 'charlie', vehicle: 'Xe Máy' },
    { username: 'shipper_linh', vehicle: 'Xe Máy' },
    { username: 'shipper_tuan', vehicle: 'Xe Đạp' },
    { username: 'shipper_mai', vehicle: 'Xe Máy' },
    { username: 'shipper_hung', vehicle: 'Ô Tô' },
    { username: 'shipper_anh', vehicle: 'Xe Đạp' },
    { username: 'shipper_dat', vehicle: 'Xe Máy' },
  ];

  for (const s of shipperData) {
    const user = await prisma.user.upsert({
      where: { username: s.username },
      update: { balance: 1000 + Math.random() * 2000 },
      create: {
        username: s.username,
        balance: 1000 + Math.random() * 2000,
        role: 'shipper',
        homeZoneId: ['r-thu-duc','r-district-4','r-district-10','r-phu-nhuan','r-go-vap','r-district-8','r-tan-phu'][Math.floor(Math.random() * 7)],
        homeAddress: '',
        homeLat: 10.77,
        homeLng: 106.69,
      },
    });
    await prisma.shipper.upsert({
      where: { userId: user.id },
      update: { vehicle: s.vehicle, rating: 3 + Math.random() * 2, totalDeliveries: Math.floor(Math.random() * 50) },
      create: { userId: user.id, vehicle: s.vehicle, rating: 3 + Math.random() * 2, totalDeliveries: Math.floor(Math.random() * 50), isOnline: Math.random() > 0.5, lat: 10.76 + Math.random() * 0.05, lng: 106.66 + Math.random() * 0.05 },
    });
  }

  // ---- BUYERS ----
  const buyerData = [
    { username: 'bob', zoneId: 'r-thu-duc' },
    { username: 'buyer_em', zoneId: 'r-district-2' },
    { username: 'buyer_hoa', zoneId: 'r-district-4' },
    { username: 'buyer_long', zoneId: 'r-district-10' },
    { username: 'buyer_thao', zoneId: 'r-phu-nhuan' },
    { username: 'buyer_minh', zoneId: 'r-go-vap' },
    { username: 'buyer_trang', zoneId: 'r-district-8' },
    { username: 'buyer_hai', zoneId: 'r-tan-phu' },
    { username: 'buyer_nam', zoneId: 'r-thu-duc' },
    { username: 'buyer_phuc', zoneId: 'r-district-2' },
  ];

  for (const b of buyerData) {
    await prisma.user.upsert({
      where: { username: b.username },
      update: { balance: 500 + Math.random() * 1500, homeZoneId: b.zoneId },
      create: {
        username: b.username,
        balance: 500 + Math.random() * 1500,
        role: 'buyer',
        homeZoneId: b.zoneId,
        homeAddress: ['Thủ Đức — Khu Đại Học','Quận 2 — Thảo Điền','Quận 4 — Chung Cư Ven Sông','Quận 10 — Phố Cổ','Phú Nhuận — Nhà Vườn','Gò Vấp — Khu Ngoại Ô','Quận 8 — Làng Kênh','Tân Phú — Sài Gòn Mới'][['r-thu-duc','r-district-2','r-district-4','r-district-10','r-phu-nhuan','r-go-vap','r-district-8','r-tan-phu'].indexOf(b.zoneId)] || b.zoneId,
        homeLat: 10.77 + Math.random() * 0.08,
        homeLng: 106.63 + Math.random() * 0.14,
      },
    });
  }

  console.log('✅ Seed complete!');
  console.log(`   🏪 ${shopData.length} shops with menus`);
  console.log(`   🛵 ${shipperData.length} shippers`);
  console.log(`   🛒 ${buyerData.length} buyers`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });

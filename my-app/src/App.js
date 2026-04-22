import { useState, useEffect, useRef } from "react";
import AdminPanel from "./AdminPanel";
import { defaultCategories as categories, getStoredProducts, getSEOSettings, getHeaderBanners, getSliderConfig, getCustomCategories, getSubcategories, getBrandLogos, getCategoryOverrides, trackProductView, trackProductSales, registerCustomer, loginCustomer, getCurrentCustomer, logoutCustomer, updateCustomer, saveOrder, getStoredOrders, getWishlist, saveWishlist, decrementProductStock, getRecentlyViewed, addToRecentlyViewed } from "./data";

const HOEGERT_CAT = "HOEGERT";

// Returns first available image src for a product (uploaded base64 or legacy URL)
function getProductImg(p) {
  if (p.images && p.images.length > 0) return p.images[0];
  return p.img || null;
}

const translations = {
  en: {
    storeName: "Master Group", searchPlaceholder: "Search products...", allCategories: "All Categories",
    addToCart: "Add to Cart", cart: "Cart", total: "Total", checkout: "Proceed to Checkout",
    inStock: "In Stock", outOfStock: "Out of Stock", sortBy: "Sort by", barcode: "Barcode",
    priceAsc: "Price: Low to High", priceDesc: "Price: High to Low", nameAsc: "Name: A–Z",
    emptyCart: "Your cart is empty", heroBtn: "Browse Products", featured: "Shop by Category",
    home: "Home", catalog: "Catalog", contact: "Contact", currency: "₾",
    contactTitle: "Get in Touch", contactInfo: "Visit our store or reach out for bulk orders.",
    address: "Rafael Agladze St. N15, Megaline, Tbilisi", phone: "032 22 65 43 44", email: "info@mgp.ge",
    viewAll: "View All", off: "OFF", new: "NEW", hot2: "HOT", seeAll: "See all",
    discount: "Discounts", hot: "Hot Deals", newArr: "New Arrivals", save: "Save",
    back: "← Back", firstName: "First Name", lastName: "Last Name",
    idNumber: "ID Number", phone2: "Phone Number", submitOrder: "Place Order",
    orderSuccess: "Order Placed!", orderSuccessMsg: "We will contact you shortly to confirm your order.",
    orderForm: "Checkout", related: "Related Products", sku: "SKU", brand: "Brand",
    availability: "Availability", category: "Category", qty: "Quantity",
    recentlyViewed: "Recently Viewed", specifications: "Specifications", productDetails: "Product Details",
    priceRange: "Price Range", minPrice: "Min", maxPrice: "Max", inStockOnly: "In Stock Only", filters: "Filters", clearFilters: "Clear",
    orderStatus: "Order Status", statusPending: "Pending", statusConfirmed: "Confirmed", statusShipped: "Shipped", statusDelivered: "Delivered", statusCancelled: "Cancelled",
    profile: "My Profile", wishlist: "Wishlist", orderHistory: "Order History", logout: "Log Out",
    editProfile: "Edit Profile", saveProfile: "Save Changes", profileInfo: "Profile Info",
    loginRequired: "Please sign in to place an order.", addedToWishlist: "Added to wishlist", removedFromWishlist: "Removed from wishlist",
    stockLeft: "left", noOrders: "No orders yet.", noWishlist: "Your wishlist is empty.",
    orderDate: "Date", orderTotal: "Total", orderItems: "Items",
  },
  ka: {
    storeName: "მასტერ ჯგუფი", searchPlaceholder: "მოძებნეთ პროდუქტი...", allCategories: "ყველა კატეგორია",
    addToCart: "კალათში დამატება", cart: "კალათი", total: "ჯამი", checkout: "შეკვეთის გაფორმება",
    inStock: "მარაგშია", outOfStock: "არ არის", sortBy: "დალაგება", barcode: "შტრიხ-კოდი",
    priceAsc: "ფასი: დაბლიდან", priceDesc: "ფასი: მაღლიდან", nameAsc: "სახელი: ა–ჰ",
    emptyCart: "კალათი ცარიელია", heroBtn: "პროდუქტები", featured: "კატეგორიები",
    home: "მთავარი", catalog: "კატალოგი", contact: "კონტაქტი", currency: "₾",
    contactTitle: "დაგვიკავშირდით", contactInfo: "ეწვიეთ ჩვენს მაღაზიას ან დაგვირეკეთ.",
    address: "რაფაელ აგლაძის ქუჩა N15, მეგალაინი, თბილისი", phone: "032 22 65 43 44", email: "info@mgp.ge",
    viewAll: "ყველა", off: "ფასდ.", new: "ახალი", hot2: "ცხელი", seeAll: "ყველა",
    discount: "ფასდაკლებები", hot: "ცხელი შეთავაზება", newArr: "სიახლეები", save: "დაზოგე",
    back: "← უკან", firstName: "სახელი", lastName: "გვარი",
    idNumber: "პირადი ნომერი", phone2: "ტელეფონი", submitOrder: "შეკვეთა",
    orderSuccess: "შეკვეთა გაფორმდა!", orderSuccessMsg: "მალე დაგიკავშირდებით შეკვეთის დასადასტურებლად.",
    orderForm: "გაფორმება", related: "მსგავსი პროდუქტები", sku: "არტიკული", brand: "ბრენდი",
    availability: "მარაგი", category: "კატეგორია", qty: "რაოდენობა",
    recentlyViewed: "ახლახან ნანახი", specifications: "მახასიათებლები", productDetails: "დეტალური აღწერა",
    priceRange: "ფასის დიაპაზონი", minPrice: "მინ", maxPrice: "მაქს", inStockOnly: "მხოლოდ მარაგში", filters: "ფილტრი", clearFilters: "გასუფთავება",
    orderStatus: "შეკვეთის სტატუსი", statusPending: "მოლოდინში", statusConfirmed: "დადასტურდა", statusShipped: "გაიგზავნა", statusDelivered: "მიტანილია", statusCancelled: "გაუქმდა",
    profile: "ჩემი პროფილი", wishlist: "სასურველი", orderHistory: "შეკვეთები", logout: "გასვლა",
    editProfile: "პროფილის რედაქტირება", saveProfile: "შენახვა", profileInfo: "ინფორმაცია",
    loginRequired: "შეკვეთის გასაფორმებლად გთხოვთ შეხვიდეთ.", addedToWishlist: "დამატებულია", removedFromWishlist: "წაშლილია",
    stockLeft: "დარჩა", noOrders: "შეკვეთები არ არის.", noWishlist: "სასურველი სია ცარიელია.",
    orderDate: "თარიღი", orderTotal: "ჯამი", orderItems: "პოზიციები",
  },
  ru: {
    storeName: "Мастер Групп", searchPlaceholder: "Поиск товаров...", allCategories: "Все категории",
    addToCart: "В корзину", cart: "Корзина", total: "Итого", checkout: "Оформить заказ",
    inStock: "В наличии", outOfStock: "Нет в наличии", sortBy: "Сортировка", barcode: "Штрих-код",
    priceAsc: "Цена: по возрастанию", priceDesc: "Цена: по убыванию", nameAsc: "Название: А–Я",
    emptyCart: "Корзина пуста", heroBtn: "Смотреть товары", featured: "Категории",
    home: "Главная", catalog: "Каталог", contact: "Контакты", currency: "₾",
    contactTitle: "Свяжитесь с нами", contactInfo: "Посетите наш магазин или позвоните.",
    address: "ул. Рафаэля Агладзе 15, Мегалайн, Тбилиси", phone: "032 22 65 43 44", email: "info@mgp.ge",
    viewAll: "Все", off: "СКИДКА", new: "НОВИНКА", hot2: "ХИТ", seeAll: "Все",
    discount: "Скидки", hot: "Горячие предложения", newArr: "Новинки", save: "Экономия",
    back: "← Назад", firstName: "Имя", lastName: "Фамилия",
    idNumber: "Номер уд. личности", phone2: "Телефон", submitOrder: "Оформить",
    orderSuccess: "Заказ принят!", orderSuccessMsg: "Мы свяжемся с вами для подтверждения заказа.",
    orderForm: "Оформление", related: "Похожие товары", sku: "Артикул", brand: "Бренд",
    availability: "Наличие", category: "Категория", qty: "Количество",
    recentlyViewed: "Недавно просмотренные", specifications: "Характеристики", productDetails: "Подробное описание",
    priceRange: "Диапазон цен", minPrice: "От", maxPrice: "До", inStockOnly: "Только в наличии", filters: "Фильтры", clearFilters: "Сбросить",
    orderStatus: "Статус заказа", statusPending: "Ожидает", statusConfirmed: "Подтверждён", statusShipped: "Отправлен", statusDelivered: "Доставлен", statusCancelled: "Отменён",
    profile: "Мой профиль", wishlist: "Избранное", orderHistory: "История заказов", logout: "Выйти",
    editProfile: "Редактировать профиль", saveProfile: "Сохранить", profileInfo: "Информация",
    loginRequired: "Войдите, чтобы оформить заказ.", addedToWishlist: "Добавлено в избранное", removedFromWishlist: "Удалено из избранного",
    stockLeft: "осталось", noOrders: "Заказов пока нет.", noWishlist: "Избранное пусто.",
    orderDate: "Дата", orderTotal: "Сумма", orderItems: "Позиции",
  },
};

const SZ = "&w=280&h=210&zc=1&q=100";
const SZ_LG = "&w=600&h=500&zc=1&q=100";

// For product page large view: base64 images are already full-res; URL images get upscaled via timthumb
function getLargeImg(src) {
  if (!src) return null;
  if (src.startsWith("data:")) return src;
  return src.replace(SZ, SZ_LG);
}

function DiscBadge({ pct }) {
  return (
    <div style={{ position: "absolute", top: 8, right: 8, width: 44, height: 44, borderRadius: "50%", background: "#E65C00", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 2, boxShadow: "0 2px 8px rgba(230,92,0,0.4)" }}>
      <span style={{ color: "#fff", fontSize: 12, fontWeight: 800, lineHeight: 1 }}>{pct}%</span>
      <span style={{ color: "rgba(255,255,255,0.85)", fontSize: 8, fontWeight: 700 }}>OFF</span>
    </div>
  );
}

function ProductCard({ p, t, onAdd, onView, lang, cats, wishlist, onToggleWishlist }) {
  const tagStyles = { discount: { bg: "#FEE2E2", color: "#991B1B" }, hot: { bg: "#FEF3C7", color: "#92400E" }, new: { bg: "#D1FAE5", color: "#065F46" } };
  const ts = p.tag && tagStyles[p.tag];
  const label = p.tag === "discount" ? t.off : p.tag === "hot" ? t.hot2 : t.new;
  const displayName = lang === "en" ? (p.en || p.name) : p.name;
  const [imgErr, setImgErr] = useState(false);
  const allCats = cats || categories;
  const cat = allCats.find(c => c.name === p.cat);
  const img = getProductImg(p);
  const accentColor = cat?.color || "#E65C00";
  const inWishlist = wishlist && wishlist.includes(p.id);
  const isOutOfStock = !p.stock || (p.stockQty != null && p.stockQty <= 0);

  return (
    <div className="prod-card" onClick={() => onView && onView(p)}
      style={{ background: "#fff", border: "1.5px solid #e8e8e8", borderRadius: 14, overflow: "hidden", display: "flex", flexDirection: "column", minWidth: 175, maxWidth: 215, cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
      {/* Colored top accent */}
      <div style={{ height: 3, background: accentColor, flexShrink: 0 }} />
      <div style={{ position: "relative", height: 155, background: cat ? cat.bg : "#f5f5f5", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", padding: 10 }}>
        {img && !imgErr
          ? <img src={img} alt={displayName} onError={() => setImgErr(true)} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
          : <span style={{ fontSize: 48 }}>{cat?.icon || "📦"}</span>}
        {p.images && p.images.length > 1 && (
          <span style={{ position: "absolute", bottom: 6, right: 6, background: "rgba(0,0,0,0.55)", color: "#fff", fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 4 }}>+{p.images.length}</span>
        )}
        {p.disc && <DiscBadge pct={p.disc} />}
        {!p.disc && ts && <span style={{ position: "absolute", top: 8, left: 8, background: ts.bg, color: ts.color, fontSize: 9, fontWeight: 800, padding: "3px 7px", borderRadius: 5 }}>{label}</span>}
        {onToggleWishlist && (
          <button onClick={e => { e.stopPropagation(); onToggleWishlist(p.id); }}
            style={{ position: "absolute", top: 6, right: p.disc ? 54 : 6, width: 28, height: 28, borderRadius: "50%", background: inWishlist ? "#E65C00" : "rgba(255,255,255,0.92)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, boxShadow: "0 1px 4px rgba(0,0,0,0.15)", zIndex: 3 }}>
            {inWishlist ? "♥" : "♡"}
          </button>
        )}
      </div>
      <div style={{ padding: "10px 13px 14px", flex: 1, display: "flex", flexDirection: "column" }}>
        <div style={{ fontSize: 10, color: "#bbb", marginBottom: 4, display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: accentColor, display: "inline-block", flexShrink: 0 }} />
          {cat ? (lang === "en" ? cat.en : cat.name) : p.cat}
        </div>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1a1a", marginBottom: 4, lineHeight: 1.35 }}>{displayName}</div>
        {p.desc && <div style={{ fontSize: 11, color: "#999", marginBottom: 8, lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{p.desc}</div>}
        <div style={{ flex: 1 }} />
        <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 6 }}>
          {p.price > 0
            ? <><span style={{ fontSize: 18, fontWeight: 800, color: "#E65C00" }}>₾{p.price.toFixed(2)}</span>{p.oldPrice && <span style={{ fontSize: 12, color: "#ccc", textDecoration: "line-through" }}>₾{p.oldPrice.toFixed(2)}</span>}</>
            : <span style={{ fontSize: 12, color: "#aaa", fontWeight: 600 }}>კონტაქტი / Call</span>}
        </div>
        <div style={{ marginBottom: 9, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, background: isOutOfStock ? "#FEE2E2" : "#E1F5EE", color: isOutOfStock ? "#991B1B" : "#065F46", fontWeight: 700 }}>{isOutOfStock ? t.outOfStock : t.inStock}</span>
          {!isOutOfStock && p.stockQty != null && p.stockQty <= 10 && (
            <span style={{ fontSize: 10, color: "#E65C00", fontWeight: 700 }}>{p.stockQty} {t.stockLeft}</span>
          )}
        </div>
        <button disabled={isOutOfStock} onClick={e => { e.stopPropagation(); !isOutOfStock && onAdd(p); }}
          style={{ width: "100%", background: isOutOfStock ? "#e8e8e8" : "#E65C00", color: isOutOfStock ? "#aaa" : "#fff", border: "none", borderRadius: 9, padding: "9px 0", fontSize: 12, fontWeight: 700, cursor: isOutOfStock ? "default" : "pointer", boxShadow: isOutOfStock ? "none" : "0 2px 8px rgba(230,92,0,0.25)" }}>
          {t.addToCart}
        </button>
      </div>
    </div>
  );
}

function CategorySlider({ cat, allProducts, t, onAdd, onSeeAll, onView, lang, cats, wishlist, onToggleWishlist }) {
  const ref = useRef(null);
  const catProds = allProducts.filter(p => p.cat === cat.name);
  if (!catProds.length) return null;
  const scroll = d => { if (ref.current) ref.current.scrollLeft += d * 220; };
  const catLabel = lang === "en" ? cat.en : lang === "ru" ? cat.ru : cat.name;
  const accent = cat.color || "#E65C00";
  return (
    <div style={{ margin: "0 2rem 2rem", background: "#fff", borderRadius: 16, border: "1.5px solid #ebebeb", boxShadow: "0 2px 16px rgba(0,0,0,0.06)", overflow: "hidden" }}>
      {/* Colored top accent bar */}
      <div style={{ height: 4, background: `linear-gradient(90deg, ${accent} 0%, ${accent}88 100%)`, flexShrink: 0 }} />
      {/* Header row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1rem 1.25rem 0.75rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
          <div style={{ width: 42, height: 42, borderRadius: 10, background: cat.bg || "#f5f5f5", border: `1.5px solid ${accent}33`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>
            {cat.icon
              ? cat.icon
              : <img src="/hoger.png" alt="" style={{ height: 20, objectFit: "contain" }} />}
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#1a1a1a", letterSpacing: 0.2 }}>{catLabel}</div>
            <div style={{ fontSize: 11, color: "#aaa", marginTop: 1 }}>{catProds.length} {lang === "ka" ? "პროდუქტი" : lang === "ru" ? "товаров" : "products"}</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <span onClick={() => onSeeAll(cat.name)} style={{ color: accent, fontSize: 12, fontWeight: 700, cursor: "pointer", marginRight: 4 }}>{t.seeAll} →</span>
          <button onClick={() => scroll(-1)} style={{ width: 32, height: 32, borderRadius: "50%", border: `1.5px solid ${accent}44`, background: "#fff", cursor: "pointer", fontSize: 17, color: accent, display: "flex", alignItems: "center", justifyContent: "center" }}>‹</button>
          <button onClick={() => scroll(1)} style={{ width: 32, height: 32, borderRadius: "50%", border: `1.5px solid ${accent}44`, background: "#fff", cursor: "pointer", fontSize: 17, color: accent, display: "flex", alignItems: "center", justifyContent: "center" }}>›</button>
        </div>
      </div>
      {/* Subtle divider */}
      <div style={{ height: 1, background: "#f3f3f3", margin: "0 1.25rem" }} />
      {/* Products scroll row */}
      <div ref={ref} style={{ display: "flex", gap: 14, overflowX: "auto", padding: "1rem 1.25rem 1.25rem", scrollBehavior: "smooth", scrollbarWidth: "none" }}>
        {catProds.map(p => <ProductCard key={p.id} p={p} t={t} onAdd={onAdd} onView={onView} lang={lang} cats={cats} wishlist={wishlist} onToggleWishlist={onToggleWishlist} />)}
      </div>
    </div>
  );
}



function PromoSlider({ t, lang, onShop, onView, products, sliderConfig }) {
  const [active, setActive] = useState(0);
  const timer = useRef(null);

  let slides = [];
  if (sliderConfig && sliderConfig.length > 0) {
    slides = sliderConfig
      .map(s => {
        const id = s.productId || s.leftId;
        return products.find(p => p.id === parseInt(id));
      })
      .filter(Boolean);
  } else {
    slides = products.filter(p => p.disc && p.price > 10 && getProductImg(p)).slice(0, 5);
  }

  useEffect(() => {
    if (slides.length <= 1) return;
    timer.current = setInterval(() => setActive(a => (a + 1) % slides.length), 4500);
    return () => clearInterval(timer.current);
  }, [slides.length]);

  if (!slides.length) return null;
  const p = slides[active] || slides[0];
  const img = getLargeImg(getProductImg(p));
  const name = lang === "en" ? (p.en || p.name) : p.name;

  return (
    <div style={{ height: 380, display: "flex", overflow: "hidden", position: "relative", flexShrink: 0 }}>
      <div style={{ width: "42%", background: "#1a1a1a", display: "flex", flexDirection: "column", justifyContent: "center", padding: "2.5rem 3rem", flexShrink: 0, zIndex: 1 }}>
        {p.disc && (
          <div style={{ marginBottom: 14 }}>
            <span style={{ background: "#E65C00", color: "#fff", fontSize: 12, fontWeight: 800, padding: "5px 14px", borderRadius: 6 }}>{p.disc}% OFF</span>
          </div>
        )}
        <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", lineHeight: 1.35, marginBottom: 12 }}>{name}</div>
        {p.desc && <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", lineHeight: 1.65, marginBottom: 20, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{p.desc}</div>}
        <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 26 }}>
          {p.price > 0
            ? <><span style={{ fontSize: 30, fontWeight: 800, color: "#E65C00" }}>₾{p.price.toFixed(2)}</span>{p.oldPrice && <span style={{ fontSize: 15, color: "#555", textDecoration: "line-through" }}>₾{p.oldPrice.toFixed(2)}</span>}</>
            : <span style={{ fontSize: 14, color: "#666" }}>კონტაქტი / Call</span>}
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => onView && onView(p)} style={{ background: "#E65C00", color: "#fff", border: "none", borderRadius: 9, padding: "11px 22px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>View Product →</button>
          <button onClick={onShop} style={{ background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.75)", border: "1.5px solid rgba(255,255,255,0.15)", borderRadius: 9, padding: "11px 18px", fontSize: 13, cursor: "pointer" }}>{t.heroBtn}</button>
        </div>
        {slides.length > 1 && (
          <div style={{ display: "flex", gap: 6, marginTop: 26 }}>
            {slides.map((_, i) => (
              <div key={i} onClick={() => setActive(i)} style={{ width: i === active ? 22 : 7, height: 7, borderRadius: 4, background: i === active ? "#E65C00" : "rgba(255,255,255,0.22)", cursor: "pointer", transition: "all 0.3s" }} />
            ))}
          </div>
        )}
      </div>
      <div style={{ flex: 1, position: "relative", overflow: "hidden", background: "#111" }}>
        {img && <img src={img} alt={name} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.88 }} />}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to right, rgba(26,26,26,0.65) 0%, transparent 45%)" }} />
      </div>
    </div>
  );
}

function ProductPage({ p, t, lang, onAdd, onBack, onView, allProducts, cats, onGoCategory, subcategories, wishlist, onToggleWishlist }) {
  const [activeImg, setActiveImg] = useState(0);
  const [imgErr, setImgErr] = useState(false);
  const [qty, setQty] = useState(1);
  useEffect(() => { window.scrollTo(0, 0); setActiveImg(0); setImgErr(false); }, [p.id]);
  const allCats = cats || categories;
  const cat = allCats.find(c => c.name === p.cat);
  const displayName = lang === "en" ? (p.en || p.name) : p.name;
  const catLabel = cat ? (lang === "en" ? cat.en : lang === "ru" ? cat.ru : cat.name) : p.cat;
  const brandName = (p.cat.includes("HOGERT") || p.cat === HOEGERT_CAT) ? "HOEGERT" : "MGP";
  const sku = p.sku || `MGP-${String(p.id).padStart(4, "0")}`;
  const related = allProducts.filter(r => r.cat === p.cat && r.id !== p.id).slice(0, 4);
  const tagStyles = { discount: { bg: "#FEE2E2", color: "#991B1B" }, hot: { bg: "#FEF3C7", color: "#92400E" }, new: { bg: "#D1FAE5", color: "#065F46" } };
  const ts = p.tag && tagStyles[p.tag];
  const tagLabel = p.tag === "discount" ? t.off : p.tag === "hot" ? t.hot2 : t.new;

  const specs = [
    { label: t.category, val: catLabel },
    { label: t.sku, val: sku },
    { label: t.brand, val: brandName },
    { label: t.availability, val: p.stock ? t.inStock : t.outOfStock },
    ...(p.barcode ? [{ label: t.barcode, val: p.barcode }] : []),
  ];

  // Build images array: uploaded base64 images first, fallback to old URL
  const images = (p.images && p.images.length > 0) ? p.images : (p.img ? [p.img] : []);
  const rawImg = images[activeImg] || null;
  const displayImg = rawImg ? getLargeImg(rawImg) : null;

  const allCatsForSidebar = cats || categories;

  return (
    <div style={{ display: "flex", minHeight: "70vh" }}>
      {/* Left category sidebar */}
      <div className="sidebar-col" style={{ width: 220, flexShrink: 0, background: "#1a1a1a", padding: "1.25rem 0.875rem", overflowY: "auto", alignSelf: "stretch" }}>
        <div style={{ fontSize: 10, color: "#E65C00", fontWeight: 700, letterSpacing: 1.5, marginBottom: "0.875rem", paddingLeft: 4 }}>BROWSE</div>
        {allCatsForSidebar.map(cat => {
          const catSubs = (subcategories || []).filter(s => s.parentName === cat.name);
          const catLabel2 = lang === "en" ? cat.en : lang === "ru" ? (cat.ru || cat.en) : cat.name;
          const isActive = cat.name === p.cat;
          return (
            <div key={cat.name}>
              <div onClick={() => onGoCategory && onGoCategory(cat.name)}
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", borderRadius: 7, cursor: "pointer", marginBottom: 1,
                  background: isActive ? "rgba(230,92,0,0.22)" : "transparent", borderLeft: isActive ? "2px solid #E65C00" : "2px solid transparent" }}>
                {cat.icon && <span style={{ fontSize: 14, flexShrink: 0 }}>{cat.icon}</span>}
                {!cat.icon && cat.name === HOEGERT_CAT && (
                  <img src="/hoger.png" alt="HOEGERT" style={{ height: 14, objectFit: "contain", flexShrink: 0, filter: "brightness(0) invert(1)", opacity: 0.7 }} />
                )}
                <span style={{ fontSize: 11, color: isActive ? "#fff" : "#ccc", fontWeight: isActive ? 600 : 400, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{catLabel2}</span>
                {catSubs.length > 0 && <span style={{ color: "#555", fontSize: 10 }}>›</span>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Main product content */}
      <div style={{ flex: 1, padding: "1.5rem 2rem", minWidth: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: "1.5rem", fontSize: 13, flexWrap: "wrap" }}>
        <span onClick={onBack} style={{ cursor: "pointer", color: "#E65C00", fontWeight: 600 }}>{t.back}</span>
        <span style={{ color: "#ccc" }}>›</span>
        <span style={{ color: "#888" }}>{catLabel}</span>
        <span style={{ color: "#ccc" }}>›</span>
        <span style={{ color: "#1a1a1a", fontWeight: 600 }}>{displayName}</span>
      </div>

      <div className="product-main" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2.5rem", background: "#fff", borderRadius: 16, padding: "2rem", marginBottom: "2rem", border: "1.5px solid #ececec" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ borderRadius: 12, background: cat ? cat.bg : "#f5f5f5", display: "flex", alignItems: "center", justifyContent: "center", minHeight: 320, position: "relative", overflow: "hidden" }}>
            {displayImg && !imgErr
              ? <img src={displayImg} alt={displayName} onError={() => setImgErr(true)} style={{ width: "100%", height: "100%", objectFit: "contain", maxHeight: 400, padding: "1.5rem" }} />
              : (cat && cat.icon ? <span style={{ fontSize: 100 }}>{cat.icon}</span> : <span style={{ fontSize: 100 }}>📦</span>)}
            {p.disc && (
              <div style={{ position: "absolute", top: 16, right: 16, width: 60, height: 60, borderRadius: "50%", background: "#E65C00", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 12px rgba(230,92,0,0.4)" }}>
                <span style={{ color: "#fff", fontSize: 15, fontWeight: 800, lineHeight: 1 }}>{p.disc}%</span>
                <span style={{ color: "rgba(255,255,255,0.85)", fontSize: 10, fontWeight: 700 }}>OFF</span>
              </div>
            )}
            {!p.disc && ts && (
              <div style={{ position: "absolute", top: 16, left: 16 }}>
                <span style={{ background: ts.bg, color: ts.color, fontSize: 12, fontWeight: 800, padding: "5px 12px", borderRadius: 7 }}>{tagLabel}</span>
              </div>
            )}
          </div>
          {images.length > 1 && (
            <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
              {images.map((src, i) => (
                <div key={i} onClick={() => { setActiveImg(i); setImgErr(false); }}
                  style={{ width: 64, height: 64, flexShrink: 0, borderRadius: 8, overflow: "hidden", cursor: "pointer", border: `2px solid ${i === activeImg ? "#E65C00" : "#e0e0e0"}`, background: cat ? cat.bg : "#f5f5f5", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => { e.target.style.display = "none"; }} />
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 12, color: "#aaa", marginBottom: 6 }}>MGP · {sku}</div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "#1a1a1a", margin: "0 0 12px", lineHeight: 1.3 }}>{displayName}</h1>

          {p.desc && (
            <p style={{ fontSize: 14, color: "#555", lineHeight: 1.75, margin: "0 0 1.5rem", borderLeft: "3px solid #E65C00", paddingLeft: 14 }}>{p.desc}</p>
          )}

          <div style={{ background: "#FFF8F5", borderRadius: 12, padding: "1rem 1.25rem", marginBottom: "1.25rem" }}>
            {p.price > 0 ? (
              <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
                <span style={{ fontSize: 36, fontWeight: 800, color: "#E65C00", lineHeight: 1 }}>₾{p.price.toFixed(2)}</span>
                {p.oldPrice && <span style={{ fontSize: 20, color: "#bbb", textDecoration: "line-through" }}>₾{p.oldPrice.toFixed(2)}</span>}
                {p.disc && <span style={{ background: "#FEE2E2", color: "#991B1B", fontSize: 12, fontWeight: 700, padding: "3px 9px", borderRadius: 6 }}>-{p.disc}% {t.off}</span>}
              </div>
            ) : (
              <span style={{ fontSize: 16, color: "#aaa", fontWeight: 600 }}>კონტაქტი / Call for Price</span>
            )}
          </div>

          <div style={{ marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span style={{ fontSize: 13, padding: "6px 14px", borderRadius: 8, background: p.stock ? "#E1F5EE" : "#FEE2E2", color: p.stock ? "#065F46" : "#991B1B", fontWeight: 700 }}>
              {p.stock ? "✓ " + t.inStock : "✗ " + t.outOfStock}
            </span>
            {p.stock && p.stockQty != null && (
              <span style={{ fontSize: 12, color: p.stockQty <= 5 ? "#dc2626" : "#888", fontWeight: 600 }}>{p.stockQty} {t.stockLeft}</span>
            )}
            {onToggleWishlist && (
              <button onClick={() => onToggleWishlist(p.id)}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", border: `1.5px solid ${wishlist && wishlist.includes(p.id) ? "#E65C00" : "#ddd"}`, borderRadius: 8, background: wishlist && wishlist.includes(p.id) ? "#FFF0E6" : "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600, color: wishlist && wishlist.includes(p.id) ? "#E65C00" : "#555" }}>
                {wishlist && wishlist.includes(p.id) ? "♥" : "♡"} {t.wishlist}
              </button>
            )}
          </div>

          {p.stock && p.price > 0 && (
            <div style={{ marginBottom: "1.5rem" }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#555", marginBottom: 8 }}>{t.qty}</div>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", border: "1.5px solid #ddd", borderRadius: 10, overflow: "hidden" }}>
                  <button onClick={() => setQty(q => Math.max(1, q - 1))} style={{ width: 40, height: 46, border: "none", background: "#f7f7f7", cursor: "pointer", fontSize: 20, color: "#555", fontWeight: 400 }}>−</button>
                  <span style={{ width: 48, textAlign: "center", fontSize: 16, fontWeight: 700, color: "#1a1a1a" }}>{qty}</span>
                  <button onClick={() => setQty(q => p.stockQty != null ? Math.min(p.stockQty, q + 1) : q + 1)} style={{ width: 40, height: 46, border: "none", background: "#f7f7f7", cursor: "pointer", fontSize: 20, color: "#555", fontWeight: 400 }}>+</button>
                </div>
                <button onClick={() => onAdd(p, qty)} style={{ flex: 1, background: "#E65C00", color: "#fff", border: "none", borderRadius: 10, height: 46, fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
                  {t.addToCart}
                </button>
              </div>
            </div>
          )}

          <div style={{ borderTop: "1.5px solid #f0f0f0", paddingTop: "1rem" }}>
            {specs.map((s, i) => (
              <div key={i} style={{ display: "flex", padding: "8px 0", borderBottom: i < specs.length - 1 ? "1px solid #f5f5f5" : "none", alignItems: "center" }}>
                <span style={{ fontSize: 12, color: "#aaa", fontWeight: 600, width: 120, flexShrink: 0 }}>{s.label}</span>
                <span style={{ fontSize: 13, color: "#1a1a1a", fontWeight: 500 }}>{s.val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Custom specs table (admin-defined) */}
      {p.specs && p.specs.length > 0 && (
        <div style={{ background: "#fff", borderRadius: 14, border: "1.5px solid #ececec", marginBottom: "1.5rem", overflow: "hidden" }}>
          <div style={{ background: "#E65C00", padding: "12px 18px" }}>
            <span style={{ color: "#fff", fontWeight: 800, fontSize: 14, letterSpacing: 0.3 }}>{t.specifications}</span>
          </div>
          {p.specs.map((s, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 2fr auto", alignItems: "center", padding: "11px 18px", background: i % 2 === 0 ? "#fff" : "#fafafa", borderBottom: i < p.specs.length - 1 ? "1px solid #f0f0f0" : "none" }}>
              <span style={{ fontSize: 13, color: "#888", fontWeight: 500 }}>{s.label}</span>
              <span style={{ fontSize: 13, color: "#1a1a1a", fontWeight: 700 }}>{s.value}</span>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="11" fill="#22c55e"/><path d="M7 12.5l3.5 3.5 6.5-7" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
          ))}
        </div>
      )}

      {/* Full details plain text */}
      {p.details && (
        <div style={{ background: "#fff", borderRadius: 14, border: "1.5px solid #ececec", marginBottom: "1.5rem", overflow: "hidden" }}>
          <div style={{ background: "#1a1a1a", padding: "12px 18px" }}>
            <span style={{ color: "#fff", fontWeight: 800, fontSize: 14, letterSpacing: 0.3 }}>{t.productDetails}</span>
          </div>
          <div style={{ padding: "1.25rem 1.5rem", fontSize: 14, color: "#444", lineHeight: 1.85, whiteSpace: "pre-wrap" }}>{p.details}</div>
        </div>
      )}

      {related.length > 0 && (
        <div style={{ marginTop: "1rem" }}>
          <h3 style={{ fontSize: 17, fontWeight: 700, color: "#1a1a1a", marginBottom: "1rem", paddingBottom: 8, borderBottom: "2px solid #f0f0f0" }}>{t.related}</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(185px, 1fr))", gap: 16 }}>
            {related.map(r => <ProductCard key={r.id} p={r} t={t} onAdd={onAdd} onView={onView} lang={lang} wishlist={wishlist} onToggleWishlist={onToggleWishlist} />)}
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

function ProfilePage({ currentUser, t, lang, onLogout, onView, products, wishlist, onToggleWishlist, onGoHome }) {
  const [tab, setTab] = useState("info");
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ firstName: currentUser.firstName, lastName: currentUser.lastName, phone: currentUser.phone, address: currentUser.address || "" });
  const setF = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const inp2 = { width: "100%", padding: "9px 12px", border: "1.5px solid #ddd", borderRadius: 8, fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: "inherit" };

  const wishlistProducts = (wishlist || []).map(id => products.find(p => p.id === id)).filter(Boolean);
  const orders = getStoredOrders().filter(o => o.customerId === currentUser.id || o.email === currentUser.email);

  const handleSave = () => {
    updateCustomer({ ...currentUser, ...form });
    Object.assign(currentUser, form);
    setEditing(false);
  };

  const tabs = [
    { key: "info", label: t.profileInfo },
    { key: "wishlist", label: `${t.wishlist} (${wishlistProducts.length})` },
    { key: "orders", label: `${t.orderHistory} (${orders.length})` },
  ];

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "2rem 1.5rem" }}>
      {/* Header card */}
      <div style={{ background: "#1a1a1a", borderRadius: 16, padding: "2rem", display: "flex", alignItems: "center", gap: 20, marginBottom: "1.5rem", flexWrap: "wrap" }}>
        <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#E65C00", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, fontWeight: 800, color: "#fff", flexShrink: 0 }}>
          {currentUser.firstName[0].toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#fff" }}>{currentUser.firstName} {currentUser.lastName}</div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", marginTop: 3 }}>{currentUser.email}</div>
        </div>
        <button onClick={onLogout}
          style={{ background: "rgba(255,255,255,0.1)", border: "1.5px solid rgba(255,255,255,0.2)", color: "#fff", borderRadius: 9, padding: "8px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer", flexShrink: 0 }}>
          {t.logout}
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", background: "#fff", borderRadius: 12, border: "1.5px solid #e8e8e8", overflow: "hidden", marginBottom: "1.5rem" }}>
        {tabs.map((tb, i) => (
          <button key={tb.key} onClick={() => setTab(tb.key)}
            style={{ flex: 1, padding: "12px 8px", border: "none", borderRight: i < tabs.length - 1 ? "1px solid #f0f0f0" : "none", background: tab === tb.key ? "#FFF0E6" : "#fff", color: tab === tb.key ? "#E65C00" : "#555", fontWeight: tab === tb.key ? 700 : 400, cursor: "pointer", fontSize: 13, transition: "all 0.15s" }}>
            {tb.label}
          </button>
        ))}
      </div>

      {/* Profile Info tab */}
      {tab === "info" && (
        <div style={{ background: "#fff", borderRadius: 14, border: "1.5px solid #e8e8e8", padding: "1.75rem" }}>
          {!editing ? (
            <>
              {[["Email", currentUser.email], [lang === "ka" ? "სახელი" : lang === "ru" ? "Имя" : "First Name", currentUser.firstName], [lang === "ka" ? "გვარი" : lang === "ru" ? "Фамилия" : "Last Name", currentUser.lastName], [lang === "ka" ? "ტელეფონი" : lang === "ru" ? "Телефон" : "Phone", currentUser.phone], [lang === "ka" ? "მისამართი" : lang === "ru" ? "Адрес" : "Address", currentUser.address || "—"]].map(([label, val]) => (
                <div key={label} style={{ display: "flex", padding: "10px 0", borderBottom: "1px solid #f5f5f5" }}>
                  <span style={{ width: 130, fontSize: 12, color: "#aaa", fontWeight: 600, flexShrink: 0 }}>{label}</span>
                  <span style={{ fontSize: 14, color: "#1a1a1a" }}>{val}</span>
                </div>
              ))}
              <button onClick={() => setEditing(true)}
                style={{ marginTop: "1.25rem", background: "#E65C00", color: "#fff", border: "none", borderRadius: 9, padding: "10px 22px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                {t.editProfile}
              </button>
            </>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div><label style={{ fontSize: 12, fontWeight: 600, color: "#555", display: "block", marginBottom: 4 }}>{lang === "ka" ? "სახელი" : lang === "ru" ? "Имя" : "First Name"}</label><input style={inp2} value={form.firstName} onChange={e => setF("firstName", e.target.value)} /></div>
                <div><label style={{ fontSize: 12, fontWeight: 600, color: "#555", display: "block", marginBottom: 4 }}>{lang === "ka" ? "გვარი" : lang === "ru" ? "Фамилия" : "Last Name"}</label><input style={inp2} value={form.lastName} onChange={e => setF("lastName", e.target.value)} /></div>
              </div>
              <div><label style={{ fontSize: 12, fontWeight: 600, color: "#555", display: "block", marginBottom: 4 }}>{lang === "ka" ? "ტელეფონი" : lang === "ru" ? "Телефон" : "Phone"}</label><input style={inp2} type="tel" value={form.phone} onChange={e => setF("phone", e.target.value)} /></div>
              <div><label style={{ fontSize: 12, fontWeight: 600, color: "#555", display: "block", marginBottom: 4 }}>{lang === "ka" ? "მისამართი" : lang === "ru" ? "Адрес" : "Address"}</label><input style={inp2} value={form.address} onChange={e => setF("address", e.target.value)} /></div>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setEditing(false)} style={{ padding: "9px 20px", border: "1.5px solid #ddd", borderRadius: 9, background: "#fff", cursor: "pointer", fontSize: 13 }}>Cancel</button>
                <button onClick={handleSave} style={{ padding: "9px 22px", background: "#E65C00", color: "#fff", border: "none", borderRadius: 9, cursor: "pointer", fontSize: 13, fontWeight: 700 }}>{t.saveProfile}</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Wishlist tab */}
      {tab === "wishlist" && (
        <div>
          {wishlistProducts.length === 0
            ? <div style={{ textAlign: "center", padding: "3rem 0", color: "#aaa", fontSize: 15 }}>{t.noWishlist}</div>
            : <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(185px, 1fr))", gap: 16 }}>
                {wishlistProducts.map(p => (
                  <ProductCard key={p.id} p={p} t={t} onAdd={() => {}} onView={onView} lang={lang} wishlist={wishlist} onToggleWishlist={onToggleWishlist} />
                ))}
              </div>
          }
        </div>
      )}

      {/* Orders tab */}
      {tab === "orders" && (
        <div>
          {orders.length === 0
            ? <div style={{ textAlign: "center", padding: "3rem 0", color: "#aaa", fontSize: 15 }}>{t.noOrders}</div>
            : orders.map(o => {
                const status = o.status || "pending";
                const statusMeta = { pending: { label: t.statusPending, color: "#92400E", bg: "#FEF3C7", dot: "#F59E0B" }, confirmed: { label: t.statusConfirmed, color: "#0066B3", bg: "#EEF5FF", dot: "#0066B3" }, shipped: { label: t.statusShipped, color: "#7C3AED", bg: "#F5F3FF", dot: "#7C3AED" }, delivered: { label: t.statusDelivered, color: "#065F46", bg: "#E1F5EE", dot: "#22C55E" }, cancelled: { label: t.statusCancelled, color: "#991B1B", bg: "#FEE2E2", dot: "#DC2626" } };
                const sm = statusMeta[status] || statusMeta.pending;
                const steps = ["pending", "confirmed", "shipped", "delivered"];
                const stepIdx = steps.indexOf(status);
                return (
                  <div key={o.orderNumber} style={{ background: "#fff", borderRadius: 14, border: "1.5px solid #e8e8e8", padding: "1.25rem 1.5rem", marginBottom: 14, boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 15, color: "#E65C00" }}>{o.orderNumber}</div>
                        <div style={{ fontSize: 12, color: "#aaa", marginTop: 2 }}>{t.orderDate}: {new Date(o.date).toLocaleDateString()}</div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: sm.bg, color: sm.color, fontWeight: 700, fontSize: 11, padding: "4px 10px", borderRadius: 20 }}>
                          <span style={{ width: 6, height: 6, borderRadius: "50%", background: sm.dot }} />{sm.label}
                        </span>
                        <span style={{ fontSize: 16, fontWeight: 800, color: "#1a1a1a" }}>₾{o.total?.toFixed(2)}</span>
                      </div>
                    </div>
                    {/* Progress stepper (only for non-cancelled) */}
                    {status !== "cancelled" && (
                      <div style={{ display: "flex", alignItems: "center", marginBottom: 14 }}>
                        {steps.map((s, i) => {
                          const done = stepIdx >= i;
                          const sm2 = statusMeta[s];
                          return (
                            <div key={s} style={{ display: "flex", alignItems: "center", flex: i < steps.length - 1 ? 1 : "none" }}>
                              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                                <div style={{ width: 22, height: 22, borderRadius: "50%", background: done ? sm2.dot : "#e8e8e8", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.3s" }}>
                                  {done ? <span style={{ color: "#fff", fontSize: 11, fontWeight: 900 }}>✓</span> : <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#bbb", display: "block" }} />}
                                </div>
                                <span style={{ fontSize: 9, color: done ? sm2.color : "#bbb", fontWeight: done ? 700 : 400, whiteSpace: "nowrap" }}>{sm2.label}</span>
                              </div>
                              {i < steps.length - 1 && <div style={{ flex: 1, height: 2, background: stepIdx > i ? sm2.dot : "#e8e8e8", margin: "0 4px", marginBottom: 14, transition: "all 0.3s" }} />}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    <div style={{ fontSize: 12, color: "#555", borderTop: "1px solid #f5f5f5", paddingTop: 10 }}>
                      {o.items?.map((item, i) => (
                        <span key={i}>{lang === "en" ? (item.en || item.name) : item.name} ×{item.qty}{i < o.items.length - 1 ? " · " : ""}</span>
                      ))}
                    </div>
                  </div>
                );
              })
          }
        </div>
      )}
    </div>
  );
}

const WEBHOOK_URL = "https://hook.eu2.make.com/46q2ssu63iywyni5725482pugie8s65t";

function AuthModal({ onClose, onAuth, lang }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", phone: "", address: "", password: "", confirm: "" });
  const [err, setErr] = useState("");
  const set = (k, v) => { setForm(p => ({ ...p, [k]: v })); setErr(""); };
  const inp2 = { width: "100%", padding: "10px 12px", border: "1.5px solid #ddd", borderRadius: 9, fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: "inherit" };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (mode === "login") {
      const res = loginCustomer(form.email, form.password);
      if (res.error) { setErr(res.error); return; }
      onAuth(res.customer);
    } else {
      if (!form.firstName || !form.lastName || !form.email || !form.phone || !form.password) { setErr("Please fill all required fields"); return; }
      if (form.password !== form.confirm) { setErr("Passwords do not match"); return; }
      const res = registerCustomer(form);
      if (res.error) { setErr(res.error); return; }
      onAuth(res.customer);
    }
  };

  return (
    <>
      <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 400 }} onClick={onClose} />
      <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", background: "#fff", borderRadius: 18, padding: "2rem", width: "min(420px, 92vw)", zIndex: 401, maxHeight: "92vh", overflowY: "auto", boxShadow: "0 16px 48px rgba(0,0,0,0.18)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <h3 style={{ margin: 0, fontSize: 19, fontWeight: 800, color: "#1a1a1a" }}>
            {mode === "login" ? (lang === "ka" ? "შესვლა" : lang === "ru" ? "Войти" : "Sign In") : (lang === "ka" ? "რეგისტრაცია" : lang === "ru" ? "Регистрация" : "Create Account")}
          </h3>
          <button onClick={onClose} style={{ background: "#f0f0f0", border: "none", borderRadius: 8, width: 32, height: 32, fontSize: 18, cursor: "pointer", color: "#555" }}>×</button>
        </div>
        <div style={{ display: "flex", background: "#f5f5f5", borderRadius: 10, padding: 3, marginBottom: "1.5rem" }}>
          {["login", "signup"].map(m => (
            <button key={m} onClick={() => { setMode(m); setErr(""); }} style={{ flex: 1, padding: "8px", border: "none", borderRadius: 8, background: mode === m ? "#fff" : "transparent", cursor: "pointer", fontSize: 13, fontWeight: mode === m ? 700 : 400, color: mode === m ? "#E65C00" : "#666", boxShadow: mode === m ? "0 1px 4px rgba(0,0,0,0.1)" : "none", transition: "all 0.2s" }}>
              {m === "login" ? (lang === "ka" ? "შესვლა" : lang === "ru" ? "Войти" : "Sign In") : (lang === "ka" ? "რეგისტრაცია" : lang === "ru" ? "Регистрация" : "Sign Up")}
            </button>
          ))}
        </div>
        {err && <div style={{ background: "#FEF2F2", border: "1.5px solid #FEE2E2", borderRadius: 9, padding: "9px 13px", marginBottom: 14, fontSize: 13, color: "#dc2626" }}>{err}</div>}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {mode === "signup" && (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#555", display: "block", marginBottom: 4 }}>{lang === "ka" ? "სახელი" : lang === "ru" ? "Имя" : "First Name"} *</label>
                  <input required value={form.firstName} onChange={e => set("firstName", e.target.value)} style={inp2} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#555", display: "block", marginBottom: 4 }}>{lang === "ka" ? "გვარი" : lang === "ru" ? "Фамилия" : "Last Name"} *</label>
                  <input required value={form.lastName} onChange={e => set("lastName", e.target.value)} style={inp2} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#555", display: "block", marginBottom: 4 }}>{lang === "ka" ? "ტელეფონი" : lang === "ru" ? "Телефон" : "Phone"} *</label>
                <input required type="tel" value={form.phone} onChange={e => set("phone", e.target.value)} style={inp2} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#555", display: "block", marginBottom: 4 }}>{lang === "ka" ? "მისამართი" : lang === "ru" ? "Адрес" : "Address"}</label>
                <input value={form.address} onChange={e => set("address", e.target.value)} style={inp2} />
              </div>
            </>
          )}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#555", display: "block", marginBottom: 4 }}>Email *</label>
            <input required type="email" value={form.email} onChange={e => set("email", e.target.value)} style={inp2} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#555", display: "block", marginBottom: 4 }}>{lang === "ka" ? "პაროლი" : lang === "ru" ? "Пароль" : "Password"} *</label>
            <input required type="password" value={form.password} onChange={e => set("password", e.target.value)} style={inp2} />
          </div>
          {mode === "signup" && (
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#555", display: "block", marginBottom: 4 }}>{lang === "ka" ? "გაიმეორეთ პაროლი" : lang === "ru" ? "Повторите пароль" : "Confirm Password"} *</label>
              <input required type="password" value={form.confirm} onChange={e => set("confirm", e.target.value)} style={inp2} />
            </div>
          )}
          <button type="submit" style={{ background: "#E65C00", color: "#fff", border: "none", borderRadius: 10, padding: "12px", fontSize: 14, fontWeight: 700, cursor: "pointer", marginTop: 4 }}>
            {mode === "login" ? (lang === "ka" ? "შესვლა" : lang === "ru" ? "Войти" : "Sign In") : (lang === "ka" ? "რეგისტრაცია" : lang === "ru" ? "შექმნა" : "Create Account")}
          </button>
        </form>
      </div>
    </>
  );
}

function generateOrderNumber() {
  const d = new Date();
  const datePart = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,"0")}${String(d.getDate()).padStart(2,"0")}`;
  const rand = String(Math.floor(1000 + Math.random() * 9000));
  return `#MGP-${datePart}-${rand}`;
}

function CheckoutModal({ t, lang, cart, cartTotal, onClose, onSuccess, onTrackSales, currentUser }) {
  const [form, setForm] = useState({
    firstName: currentUser?.firstName || "", lastName: currentUser?.lastName || "",
    idNumber: "", phone: currentUser?.phone || "", email: currentUser?.email || "",
    address: currentUser?.address || "", paymentMethod: "cash"
  });
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [webhookError, setWebhookError] = useState(false);
  const [orderNumber, setOrderNumber] = useState("");
  const inp = { width: "100%", padding: "10px 12px", border: "1.5px solid #ddd", borderRadius: 9, fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: "inherit" };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setWebhookError(false);
    const oNum = generateOrderNumber();
    const payload = {
      order_number: oNum,
      customer_name: `${form.firstName} ${form.lastName}`.trim(),
      phone: form.phone,
      email: form.email,
      address: form.address,
      ordered_products: cart.map(i => lang === "en" ? (i.en || i.name) : i.name),
      quantities: cart.map(i => i.qty),
      total_price: parseFloat(cartTotal.toFixed(2)),
      payment_method: form.paymentMethod,
      order_date: new Date().toISOString(),
    };
    try {
      await fetch(WEBHOOK_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      onTrackSales && onTrackSales(cart);
      saveOrder({
        orderNumber: oNum,
        customerId: currentUser?.id || null,
        customerName: payload.customer_name,
        phone: form.phone,
        email: form.email,
        address: form.address,
        items: cart.map(i => ({ id: i.id, name: i.name, en: i.en, qty: i.qty, price: i.price })),
        total: parseFloat(cartTotal.toFixed(2)),
        paymentMethod: form.paymentMethod,
        date: new Date().toISOString(),
      });
      setOrderNumber(oNum);
      setSuccess(true);
      onSuccess();
    } catch {
      setWebhookError(true);
    } finally {
      setLoading(false);
    }
  };

  const payLabels = { ka: { cash: "ნაღდი ანგარიშსწორება", card: "ბარათით გადახდა", transfer: "საბანკო გადარიცხვა" }, en: { cash: "Cash on Delivery", card: "Card Payment", transfer: "Bank Transfer" }, ru: { cash: "Наличными", card: "Картой", transfer: "Банковский перевод" } };
  const pl = payLabels[lang] || payLabels.en;

  return (
    <>
      <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 300 }} onClick={!loading ? onClose : undefined} />
      <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", background: "#fff", borderRadius: 16, padding: "2rem", width: "min(460px, 92vw)", zIndex: 301, maxHeight: "92vh", overflowY: "auto" }}>
        {success ? (
          <div style={{ textAlign: "center", padding: "2rem 0" }}>
            <div style={{ fontSize: 52, marginBottom: 12 }}>✅</div>
            <h3 style={{ fontSize: 20, fontWeight: 700, color: "#1a1a1a", marginBottom: 8 }}>{t.orderSuccess}</h3>
            {orderNumber && (
              <div style={{ background: "#FFF0E6", border: "1.5px solid #E65C00", borderRadius: 10, display: "inline-block", padding: "8px 20px", marginBottom: 12 }}>
                <span style={{ fontSize: 12, color: "#888", fontWeight: 600 }}>{lang === "ka" ? "შეკვეთის ნომერი" : lang === "ru" ? "Номер заказа" : "Order Number"}: </span>
                <span style={{ fontSize: 16, fontWeight: 800, color: "#E65C00", letterSpacing: 0.5 }}>{orderNumber}</span>
              </div>
            )}
            <p style={{ color: "#666", fontSize: 14, lineHeight: 1.6 }}>{t.orderSuccessMsg}</p>
            <button onClick={onClose} style={{ marginTop: 20, background: "#E65C00", color: "#fff", border: "none", borderRadius: 9, padding: "11px 32px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>OK</button>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: "#1a1a1a", margin: 0 }}>{t.orderForm}</h3>
              <button onClick={onClose} disabled={loading} style={{ background: "#f0f0f0", border: "none", borderRadius: 8, width: 32, height: 32, fontSize: 18, cursor: "pointer", color: "#555" }}>×</button>
            </div>
            <div style={{ background: "#FFF0E6", borderRadius: 10, padding: "10px 14px", marginBottom: "1.25rem" }}>
              <div style={{ fontSize: 13, color: "#E65C00", fontWeight: 700 }}>{t.total}: ₾{cartTotal.toFixed(2)}</div>
              <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>{cart.length} {lang === "ka" ? "პოზიცია" : lang === "ru" ? "позиций" : "items"}</div>
            </div>
            {webhookError && (
              <div style={{ background: "#FEF2F2", border: "1.5px solid #FEE2E2", borderRadius: 9, padding: "10px 14px", marginBottom: "1rem", fontSize: 13, color: "#dc2626" }}>
                {lang === "ka" ? "კავშირის შეცდომა. სცადეთ ხელახლა." : lang === "ru" ? "Ошибка соединения. Попробуйте снова." : "Connection error. Please try again."}
              </div>
            )}
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {[[t.firstName, "firstName", "text"], [t.lastName, "lastName", "text"]].map(([label, key, type]) => (
                  <div key={key}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "#555", marginBottom: 5, display: "block" }}>{label}</label>
                    <input required type={type} value={form[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} style={inp} />
                  </div>
                ))}
              </div>
              {[[t.phone2, "phone", "tel"], ["Email", "email", "email"], [t.idNumber, "idNumber", "text"]].map(([label, key, type]) => (
                <div key={key}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#555", marginBottom: 5, display: "block" }}>{label}</label>
                  <input required={key !== "idNumber"} type={type} value={form[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} style={inp} />
                </div>
              ))}
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#555", marginBottom: 5, display: "block" }}>{lang === "ka" ? "მიწოდების მისამართი" : lang === "ru" ? "Адрес доставки" : "Delivery Address"}</label>
                <input required type="text" value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} style={inp} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#555", marginBottom: 5, display: "block" }}>{lang === "ka" ? "გადახდის მეთოდი" : lang === "ru" ? "Способ оплаты" : "Payment Method"}</label>
                <div style={{ display: "flex", gap: 8 }}>
                  {["cash", "card", "transfer"].map(method => (
                    <label key={method} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "9px 8px", border: `1.5px solid ${form.paymentMethod === method ? "#E65C00" : "#ddd"}`, borderRadius: 9, cursor: "pointer", fontSize: 12, fontWeight: 600, color: form.paymentMethod === method ? "#E65C00" : "#555", background: form.paymentMethod === method ? "#FFF0E6" : "#fff" }}>
                      <input type="radio" name="payment" value={method} checked={form.paymentMethod === method} onChange={() => setForm(p => ({ ...p, paymentMethod: method }))} style={{ display: "none" }} />
                      {pl[method]}
                    </label>
                  ))}
                </div>
              </div>
              <button type="submit" disabled={loading}
                style={{ background: loading ? "#e0a070" : "#E65C00", color: "#fff", border: "none", borderRadius: 10, padding: "13px 0", fontSize: 15, fontWeight: 700, cursor: loading ? "default" : "pointer", marginTop: 4 }}>
                {loading ? (lang === "ka" ? "იგზავნება..." : lang === "ru" ? "Отправка..." : "Submitting...") : t.submitOrder}
              </button>
            </form>
          </>
        )}
      </div>
    </>
  );
}

const MGPLogo = () => (
  <svg width="42" height="42" viewBox="0 0 42 42" fill="none">
    <rect width="42" height="42" rx="7" fill="white" fillOpacity="0.2" />
    <text x="21" y="27" textAnchor="middle" fill="white" fontSize="15" fontWeight="800" fontFamily="sans-serif">MGP</text>
  </svg>
);

function BrandsSlider({ logos }) {
  if (!logos || logos.length === 0) return null;
  const all = [...logos, ...logos, ...logos, ...logos];
  return (
    <div style={{ background: "#fff", borderTop: "1px solid #f0f0f0", borderBottom: "1px solid #f0f0f0", padding: "1.25rem 0", overflow: "hidden" }}>
      <div style={{ display: "flex", animation: "brandScroll 14s linear infinite", width: "max-content" }}>
        {all.map((b, i) => (
          <div key={i} style={{ padding: "0 52px", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <img src={b.src} alt={b.name} style={{ height: 34, objectFit: "contain", mixBlendMode: "multiply", opacity: 0.72, filter: "grayscale(15%)" }} />
          </div>
        ))}
      </div>
    </div>
  );
}

function AnnouncementBar({ banners }) {
  const active = banners.filter(b => b.enabled);
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (active.length <= 1) return;
    const t = setInterval(() => setIdx(i => (i + 1) % active.length), 3500);
    return () => clearInterval(t);
  }, [active.length]);
  if (!active.length) return null;
  const b = active[idx % active.length];
  return (
    <div style={{ background: b.bgColor || "#1a1a1a", color: b.textColor || "#fff", textAlign: "center", padding: "8px 16px", fontSize: 13, fontWeight: 500, letterSpacing: 0.2 }}>
      {b.text}
    </div>
  );
}

export default function App() {
  const [lang, setLang] = useState("ka");
  const [page, setPage] = useState(() => {
    const path = window.location.pathname;
    return path === "/admin" || path.startsWith("/admin/") ? "admin" : "home";
  });
  const [prevPage, setPrevPage] = useState("home");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedCat, setSelectedCat] = useState("all");
  const [sort, setSort] = useState("default");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [notification, setNotification] = useState("");
  const [products, setProducts] = useState(getStoredProducts);
  const [sliderConfig, setSliderConfig] = useState(() => getSliderConfig());
  const [headerBanners, setHeaderBanners] = useState(() => getHeaderBanners());
  const [customCategories, setCustomCategories] = useState(() => getCustomCategories());
  const [subcategories, setSubcategories] = useState(() => getSubcategories());
  const [selectedSubcat, setSelectedSubcat] = useState(null);
  const [brandLogos, setBrandLogos] = useState(() => getBrandLogos());
  const [catOverrides, setCatOverrides] = useState(() => getCategoryOverrides());
  const [hoveredCat, setHoveredCat] = useState(null);
  const [flyoutTop, setFlyoutTop] = useState(0);
  const flyTimer = useRef(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef(null);
  const [currentUser, setCurrentUser] = useState(() => getCurrentCustomer());
  const [authOpen, setAuthOpen] = useState(false);
  const [pendingCheckout, setPendingCheckout] = useState(false);
  const [wishlist, setWishlist] = useState(() => { const u = getCurrentCustomer(); return u ? getWishlist(u.id) : []; });
  const [recentlyViewed, setRecentlyViewed] = useState(() => getRecentlyViewed());

  const allCategories = [
    ...categories
      .filter(c => !catOverrides[c.name]?.hidden)
      .map(c => ({ ...c, ...(catOverrides[c.name] || {}) })),
    ...customCategories,
  ];
  const t = translations[lang];

  // Apply SEO meta tags on mount
  useEffect(() => {
    const seo = getSEOSettings();
    if (seo.title) document.title = seo.title;
    const setMeta = (name, content) => {
      if (!content) return;
      let el = document.querySelector(`meta[name="${name}"]`);
      if (!el) { el = document.createElement("meta"); el.name = name; document.head.appendChild(el); }
      el.content = content;
    };
    setMeta("description", seo.description);
    setMeta("keywords", seo.keywords);
  }, []);

  // Handle browser back button
  useEffect(() => {
    const onPop = () => {
      const path = window.location.pathname;
      setPage(path === "/admin" || path.startsWith("/admin/") ? "admin" : "home");
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // Close search dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) setSearchOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Refresh admin-controlled config when leaving admin page
  const refreshAdminConfig = () => {
    setSliderConfig(getSliderConfig());
    setHeaderBanners(getHeaderBanners());
    setCustomCategories(getCustomCategories());
    setSubcategories(getSubcategories());
    setBrandLogos(getBrandLogos());
    setCatOverrides(getCategoryOverrides());
  };

  const addToCart = (product, qty = 1) => {
    setCart(prev => {
      const ex = prev.find(i => i.id === product.id);
      if (ex) return prev.map(i => i.id === product.id ? { ...i, qty: i.qty + qty } : i);
      return [...prev, { ...product, qty }];
    });
    setNotification(lang === "en" ? (product.en || product.name) : product.name);
    setTimeout(() => setNotification(""), 2200);
  };

  const removeFromCart = (id) => setCart(prev => prev.filter(i => i.id !== id));
  const updateQty = (id, d) => setCart(prev => prev.map(i => i.id === id ? { ...i, qty: Math.max(1, i.qty + d) } : i));

  const toggleWishlist = (productId) => {
    if (!currentUser) { setAuthOpen(true); return; }
    const newList = wishlist.includes(productId) ? wishlist.filter(id => id !== productId) : [...wishlist, productId];
    setWishlist(newList);
    saveWishlist(currentUser.id, newList);
    const isNowIn = newList.includes(productId);
    const prod = products.find(p => p.id === productId);
    const name = prod ? (lang === "en" ? (prod.en || prod.name) : prod.name) : "";
    setNotification((isNowIn ? "♥ " : "♡ ") + name);
    setTimeout(() => setNotification(""), 2000);
  };
  const cartCount = cart.reduce((s, i) => s + i.qty, 0);
  const cartTotal = cart.reduce((s, i) => s + i.qty * i.price, 0);

  const goHome = () => {
    if (window.location.pathname !== "/") window.history.pushState({}, "", "/");
    setPage("home"); setSelectedCat("all"); setSearch(""); setSelectedProduct(null); window.scrollTo(0, 0);
    refreshAdminConfig();
  };
  const goSeeAll = (catName) => { setSelectedCat(catName); setSelectedSubcat(null); setPage("catalog"); setSelectedProduct(null); window.scrollTo(0, 0); };
  const goToProduct = (p) => { setPrevPage(page); setSelectedProduct(p); setPage("product"); trackProductView(p.id); addToRecentlyViewed(p.id); setRecentlyViewed(getRecentlyViewed()); };
  const goBack = () => { setPage(prevPage); setSelectedProduct(null); window.scrollTo(0, 0); };

  const pMin = priceMin !== "" ? parseFloat(priceMin) : null;
  const pMax = priceMax !== "" ? parseFloat(priceMax) : null;

  let filtered = products.filter(p => {
    const matchCat = selectedCat === "all" || p.cat === selectedCat;
    const matchSubcat = !selectedSubcat || p.subcat === selectedSubcat;
    const q = search.toLowerCase();
    const matchSearch = p.name.toLowerCase().includes(q) || (p.en && p.en.toLowerCase().includes(q)) || p.cat.toLowerCase().includes(q);
    const matchPrice = p.price === 0 || ((pMin === null || p.price >= pMin) && (pMax === null || p.price <= pMax));
    const matchStock = !inStockOnly || (p.stock && (p.stockQty == null || p.stockQty > 0));
    return matchCat && matchSubcat && matchSearch && matchPrice && matchStock;
  });
  if (sort === "priceAsc") filtered = [...filtered].sort((a, b) => a.price - b.price);
  if (sort === "priceDesc") filtered = [...filtered].sort((a, b) => b.price - a.price);
  if (sort === "nameAsc") filtered = [...filtered].sort((a, b) => a.name.localeCompare(b.name));

  const allPrices = products.filter(p => p.price > 0).map(p => p.price);
  const globalMin = allPrices.length ? Math.floor(Math.min(...allPrices)) : 0;
  const globalMax = allPrices.length ? Math.ceil(Math.max(...allPrices)) : 1000;
  const activeFilterCount = (pMin !== null ? 1 : 0) + (pMax !== null ? 1 : 0) + (inStockOnly ? 1 : 0);

  const activeCat = allCategories.find(c => c.name === selectedCat);
  const catalogTitle = activeCat ? (lang === "en" ? activeCat.en : lang === "ru" ? activeCat.ru : activeCat.name) : t.catalog;
  const navActivePage = page === "product" ? prevPage : page;

  return (
    <div style={{ fontFamily: "'Segoe UI', sans-serif", minHeight: "100vh", background: "#F4F4F4" }}>
      <AnnouncementBar banners={headerBanners} />
      <style>{`
        .prod-card:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0,0,0,0.10); }
        .prod-card { transition: transform 0.18s, box-shadow 0.18s; }
        div::-webkit-scrollbar { display: none; }
        @keyframes brandScroll { 0% { transform: translateX(0); } 100% { transform: translateX(-25%); } }
        .cat-card:hover .cat-card-img { transform: scale(1.07); }
        .cat-card:hover { transform: translateY(-4px) !important; box-shadow: 0 8px 0 var(--cat-accent, #ccc), 0 12px 28px rgba(0,0,0,0.22) !important; }
        @media (max-width: 700px) { .nav-links { display: none !important; } }
        @media (max-width: 520px) {
          .nav-lang { display: none !important; }
          .nav-root { padding: 0 1rem !important; }
          .home-grid { grid-template-columns: 1fr !important; }
          .sidebar-col { display: none !important; }
          .product-main { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 480px) { .promo-img-col { display: none !important; } }
      `}</style>

      {notification && (
        <div style={{ position: "fixed", bottom: 100, left: "50%", transform: "translateX(-50%)", background: "#1D9E75", color: "#fff", borderRadius: 10, padding: "11px 22px", fontSize: 13, zIndex: 400, whiteSpace: "nowrap", fontWeight: 600 }}>
          ✓ {notification}
        </div>
      )}

      {authOpen && (
        <AuthModal lang={lang} onClose={() => { setAuthOpen(false); setPendingCheckout(false); }}
          onAuth={customer => {
            setCurrentUser(customer);
            setWishlist(getWishlist(customer.id));
            setAuthOpen(false);
            if (pendingCheckout) { setPendingCheckout(false); setCheckoutOpen(true); }
          }} />
      )}

      {checkoutOpen && (
        <CheckoutModal t={t} lang={lang} cart={cart} cartTotal={cartTotal}
          onClose={() => setCheckoutOpen(false)}
          onTrackSales={trackProductSales}
          currentUser={currentUser}
          onSuccess={() => { const updated = decrementProductStock(cart); setProducts(updated); setCart([]); setCartOpen(false); }} />
      )}

      {cartOpen && <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 150 }} onClick={() => setCartOpen(false)} />}
      {cartOpen && (
        <div style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: 340, background: "#fff", zIndex: 200, display: "flex", flexDirection: "column", padding: "1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
            <span style={{ fontSize: 18, fontWeight: 700, color: "#1a1a1a" }}>{t.cart} {cartCount > 0 && <span style={{ background: "#E65C00", color: "#fff", borderRadius: "50%", width: 22, height: 22, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 12, marginLeft: 6 }}>{cartCount}</span>}</span>
            <button onClick={() => setCartOpen(false)} style={{ background: "#f0f0f0", border: "none", borderRadius: 8, width: 32, height: 32, fontSize: 18, cursor: "pointer", color: "#555" }}>×</button>
          </div>
          <div style={{ flex: 1, overflowY: "auto" }}>
            {cart.length === 0
              ? <div style={{ textAlign: "center", marginTop: 60 }}><div style={{ fontSize: 48, marginBottom: 12 }}>🛒</div><p style={{ color: "#999", fontSize: 14 }}>{t.emptyCart}</p></div>
              : cart.map(item => {
                const cat = categories.find(c => c.name === item.cat);
                return (
                  <div key={item.id} style={{ display: "flex", gap: 12, padding: "12px 0", borderBottom: "1px solid #f0f0f0", alignItems: "center" }}>
                    <div style={{ width: 52, height: 52, borderRadius: 9, overflow: "hidden", flexShrink: 0, background: cat ? cat.bg : "#f5f5f5", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {getProductImg(item) ? <img src={getProductImg(item)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => e.target.style.display = "none"} /> : <span style={{ fontSize: 24 }}>{cat ? cat.icon : "📦"}</span>}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 500, color: "#1a1a1a", lineHeight: 1.3 }}>{lang === "en" ? (item.en || item.name) : item.name}</div>
                      <div style={{ fontSize: 12, color: "#E65C00", fontWeight: 700, marginTop: 3 }}>{item.price > 0 ? `₾${(item.qty * item.price).toFixed(2)}` : "—"}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
                        <button onClick={() => updateQty(item.id, -1)} style={{ width: 24, height: 24, border: "1px solid #ddd", borderRadius: 6, background: "#fff", cursor: "pointer", fontSize: 14 }}>−</button>
                        <span style={{ fontSize: 13, fontWeight: 600 }}>{item.qty}</span>
                        <button onClick={() => updateQty(item.id, 1)} style={{ width: 24, height: 24, border: "1px solid #ddd", borderRadius: 6, background: "#fff", cursor: "pointer", fontSize: 14 }}>+</button>
                      </div>
                    </div>
                    <button onClick={() => removeFromCart(item.id)} style={{ background: "none", border: "none", color: "#ccc", cursor: "pointer", fontSize: 18 }}>×</button>
                  </div>
                );
              })}
          </div>
          {cart.length > 0 && (
            <div style={{ borderTop: "2px solid #f0f0f0", paddingTop: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14, fontSize: 16, fontWeight: 700 }}>
                <span>{t.total}</span><span style={{ color: "#E65C00" }}>₾{cartTotal.toFixed(2)}</span>
              </div>
              <button onClick={() => { if (!currentUser) { setPendingCheckout(true); setAuthOpen(true); } else { setCheckoutOpen(true); } }} style={{ background: "#E65C00", color: "#fff", border: "none", borderRadius: 10, padding: "13px 0", width: "100%", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>{t.checkout}</button>
              {!currentUser && <div style={{ textAlign: "center", fontSize: 11, color: "#aaa", marginTop: 7 }}>{t.loginRequired}</div>}
            </div>
          )}
        </div>
      )}

      <nav className="nav-root" style={{ background: "#E65C00", padding: "0 2rem", display: "flex", alignItems: "center", height: 62, position: "sticky", top: 0, zIndex: 100, boxShadow: "0 2px 12px rgba(0,0,0,0.18)", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer", flexShrink: 0 }} onClick={goHome}>
          <MGPLogo />
          <div>
            <div style={{ color: "#fff", fontSize: 15, fontWeight: 800, lineHeight: 1.1 }}>{t.storeName}</div>
            <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 9, letterSpacing: 3, fontWeight: 600 }}>BUILDING MATERIALS</div>
          </div>
        </div>
        <div className="nav-links" style={{ display: "flex", gap: 22, alignItems: "center", flexShrink: 0 }}>
          {[["home", t.home], ["catalog", t.catalog], ["contact", t.contact]].map(([p, label]) => (
            <span key={p} style={{ color: "#fff", fontSize: 13, cursor: "pointer", fontWeight: navActivePage === p ? 700 : 400, borderBottom: navActivePage === p ? "2px solid #fff" : "2px solid transparent", paddingBottom: 2, opacity: navActivePage === p ? 1 : 0.82 }}
              onClick={() => { if (p === "home") goHome(); else { setPage(p); setSelectedProduct(null); window.scrollTo(0, 0); } }}>{label}</span>
          ))}
        </div>

        {/* Search bar */}
        <form ref={searchRef} style={{ flex: 1, maxWidth: 440, display: "flex", alignItems: "center", background: "#fff", borderRadius: 9, overflow: "visible", position: "relative", boxShadow: "0 1px 4px rgba(0,0,0,0.12)" }}
          onSubmit={e => { e.preventDefault(); if (search.trim()) { setSearchOpen(false); setPage("catalog"); setSelectedProduct(null); window.scrollTo(0, 0); } }}>
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setSearchOpen(true); }}
            onFocus={() => setSearchOpen(true)}
            placeholder={t.searchPlaceholder}
            style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: "#1a1a1a", fontSize: 13, padding: "9px 14px", fontFamily: "inherit", minWidth: 0 }}
          />
          <button type="submit" style={{ background: "#c44d00", border: "none", color: "#fff", padding: "0 15px", height: 40, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "0 7px 7px 0", flexShrink: 0 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
          </button>
        </form>

        <div style={{ display: "flex", gap: 7, alignItems: "center", flexShrink: 0, marginLeft: "auto" }}>
          <div className="nav-lang" style={{ display: "flex", gap: 6 }}>
            {["ka", "en", "ru"].map(l => (
              <button key={l} style={{ background: lang === l ? "rgba(255,255,255,0.28)" : "rgba(0,0,0,0.14)", border: "1.5px solid rgba(255,255,255,0.3)", color: "#fff", borderRadius: 6, padding: "4px 9px", fontSize: 11, cursor: "pointer", fontWeight: lang === l ? 700 : 400 }} onClick={() => setLang(l)}>{l.toUpperCase()}</button>
            ))}
          </div>
          {currentUser ? (
            <div onClick={() => setPage("profile")} style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.12)", borderRadius: 9, padding: "5px 11px", marginLeft: 4, cursor: "pointer" }}>
              <div style={{ width: 26, height: 26, borderRadius: "50%", background: "#E65C00", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: "#fff", flexShrink: 0 }}>
                {currentUser.firstName[0].toUpperCase()}
              </div>
              <span style={{ fontSize: 12, color: "#fff", fontWeight: 600, maxWidth: 90, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{currentUser.firstName}</span>
            </div>
          ) : (
            <button onClick={() => setAuthOpen(true)} style={{ background: "rgba(255,255,255,0.12)", border: "1.5px solid rgba(255,255,255,0.25)", color: "#fff", borderRadius: 9, padding: "6px 13px", fontSize: 12, fontWeight: 600, cursor: "pointer", marginLeft: 4 }}>
              {lang === "ka" ? "შესვლა" : lang === "ru" ? "Войти" : "Sign In"}
            </button>
          )}
          <button onClick={() => setCartOpen(true)} style={{ background: "#fff", border: "none", color: "#E65C00", borderRadius: 9, padding: "7px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 7 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#E65C00" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" /><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" /></svg>
            {t.cart}
            {cartCount > 0 && <span style={{ background: "#E65C00", color: "#fff", borderRadius: "50%", width: 20, height: 20, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800 }}>{cartCount}</span>}
          </button>
        </div>
      </nav>

      {/* Live search dropdown */}
      {searchOpen && search.trim().length >= 1 && (() => {
        const hits = products.filter(p => {
          const q = search.toLowerCase();
          return p.name.toLowerCase().includes(q) || (p.en && p.en.toLowerCase().includes(q)) || p.cat.toLowerCase().includes(q);
        }).slice(0, 7);
        if (!hits.length) return null;
        const rect = searchRef.current?.getBoundingClientRect();
        if (!rect) return null;
        return (
          <div style={{ position: "fixed", left: rect.left, top: rect.bottom + 6, width: rect.width, zIndex: 500, background: "#fff", borderRadius: 12, boxShadow: "0 8px 32px rgba(0,0,0,0.18)", border: "1px solid #ececec", overflow: "hidden" }}>
            {hits.map((p, idx) => {
              const img = getProductImg(p);
              const cat = allCategories.find(c => c.name === p.cat);
              const name = lang === "en" ? (p.en || p.name) : p.name;
              return (
                <div key={p.id}
                  onClick={() => { goToProduct(p); setSearchOpen(false); }}
                  style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 14px", cursor: "pointer", borderBottom: idx < hits.length - 1 ? "1px solid #f5f5f5" : "none", background: "#fff" }}
                  onMouseEnter={e => e.currentTarget.style.background = "#FFF8F5"}
                  onMouseLeave={e => e.currentTarget.style.background = "#fff"}>
                  <div style={{ width: 46, height: 46, borderRadius: 8, flexShrink: 0, background: cat ? cat.bg : "#f5f5f5", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                    {img ? <img src={img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => { e.target.style.display = "none"; }} />
                         : <span style={{ fontSize: 22 }}>{cat ? cat.icon : "📦"}</span>}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#1a1a1a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</div>
                    <div style={{ fontSize: 11, color: "#aaa", marginTop: 1 }}>{cat ? (lang === "en" ? cat.en : cat.name) : p.cat}</div>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#E65C00", flexShrink: 0 }}>{p.price > 0 ? `₾${p.price.toFixed(2)}` : "—"}</div>
                </div>
              );
            })}
            <div onClick={() => { setSearchOpen(false); setPage("catalog"); setSelectedProduct(null); window.scrollTo(0, 0); }}
              style={{ padding: "9px 14px", fontSize: 12, color: "#E65C00", fontWeight: 700, cursor: "pointer", textAlign: "center", background: "#FFF8F5" }}>
              {lang === "ka" ? `"${search}" — ყველა შედეგი →` : lang === "ru" ? `Все результаты для "${search}" →` : `See all results for "${search}" →`}
            </div>
          </div>
        );
      })()}

      {page === "home" && (
        <>

          {/* Sidebar + category grid */}
          <div style={{ display: "grid", gridTemplateColumns: "246px 1fr", background: "#fff", position: "relative" }}>
            {/* Dark sidebar */}
            <div className="sidebar-col" style={{ background: "#1a1a1a", padding: "1.25rem 0.875rem", overflowY: "auto", overflowX: "hidden", maxHeight: 480, minWidth: 0 }}>
              <div style={{ fontSize: 10, color: "#E65C00", fontWeight: 700, letterSpacing: 1.5, marginBottom: "0.875rem", paddingLeft: 4 }}>BROWSE PRODUCTS</div>
              {allCategories.map(cat => {
                const catSubcats = subcategories.filter(s => s.parentName === cat.name);
                const catLabel = lang === "en" ? cat.en : lang === "ru" ? (cat.ru || cat.en) : cat.name;
                const isHovered = hoveredCat === cat.name;
                return (
                  <div key={cat.name}
                    onMouseEnter={e => {
                      clearTimeout(flyTimer.current);
                      if (catSubcats.length > 0) {
                        const rect = e.currentTarget.getBoundingClientRect();
                        setFlyoutTop(rect.top);
                        setHoveredCat(cat.name);
                      }
                    }}
                    onMouseLeave={() => { flyTimer.current = setTimeout(() => setHoveredCat(null), 160); }}>
                    <div onClick={() => goSeeAll(cat.name)}
                      style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", borderRadius: 7, cursor: "pointer", marginBottom: 1, background: isHovered ? "rgba(230,92,0,0.18)" : "transparent", transition: "background 0.15s" }}>
                      {cat.icon
                        ? <span style={{ fontSize: 15, flexShrink: 0 }}>{cat.icon}</span>
                        : <img src="/hoger.png" alt="" style={{ height: 13, objectFit: "contain", flexShrink: 0, filter: "brightness(0) invert(0.6)", opacity: 0.8 }} />}
                      <span style={{ fontSize: 11, color: "#ccc", fontWeight: 400, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>{catLabel}</span>
                      {catSubcats.length > 0 && <span style={{ color: "#555", fontSize: 10, flexShrink: 0 }}>›</span>}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Large image category cards — m2m.ge style */}
            <div style={{ padding: "1.25rem 1.5rem", background: "#f4f4f4" }}>
              <div style={{ fontSize: 10, color: "#888", fontWeight: 700, letterSpacing: 1.5, marginBottom: "1rem" }}>{t.featured.toUpperCase()}</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 14 }}>
                {allCategories.map(cat => {
                  const catLabel = lang === "en" ? cat.en : lang === "ru" ? (cat.ru || cat.en) : cat.name;
                  return (
                    <div key={cat.name} onClick={() => goSeeAll(cat.name)}
                      className="cat-card"
                      style={{
                        position: "relative", borderRadius: 12, overflow: "hidden", cursor: "pointer", height: 166,
                        background: cat.bg || "#2a2a2a",
                        border: `2px solid ${cat.color || "#ddd"}33`,
                        boxShadow: `0 4px 0 ${cat.color || "#ccc"}55, 0 6px 18px rgba(0,0,0,0.14)`,
                        transform: "translateY(0)",
                        transition: "transform 0.18s, box-shadow 0.18s",
                      }}>
                      {cat.img
                        ? <img src={cat.img} alt={cat.en} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.35s" }} className="cat-card-img" onError={e => { e.target.style.display = "none"; }} />
                        : <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 52, background: cat.bg || "#f0f0f0" }}>{cat.icon || "📦"}</div>}
                      {/* Top-left accent stripe */}
                      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: cat.color || "#E65C00", opacity: 0.85 }} />
                      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.15) 55%, transparent 100%)" }} />
                      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "12px 13px 14px" }}>
                        {cat.icon && <div style={{ fontSize: 14, marginBottom: 3 }}>{cat.icon}</div>}
                        <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", lineHeight: 1.25, textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}>{catLabel}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Hover flyout for sub-categories — image card grid */}
          {hoveredCat && (() => {
            const catSubs = subcategories.filter(s => s.parentName === hoveredCat);
            if (!catSubs.length) return null;
            return (
              <div
                onMouseEnter={() => clearTimeout(flyTimer.current)}
                onMouseLeave={() => { flyTimer.current = setTimeout(() => setHoveredCat(null), 160); }}
                style={{ position: "fixed", left: 246, top: flyoutTop, zIndex: 250, background: "#fff", borderRadius: 12, boxShadow: "0 8px 32px rgba(0,0,0,0.18)", border: "1px solid #e8e8e8", padding: 14, maxWidth: 380 }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(88px, 1fr))", gap: 10 }}>
                  {catSubs.map(sub => (
                    <div key={sub.id}
                      onClick={() => { setSelectedSubcat(sub.id); goSeeAll(hoveredCat); setHoveredCat(null); }}
                      style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "8px 6px", borderRadius: 9, cursor: "pointer", border: "1.5px solid #f0f0f0", background: "#fafafa", transition: "all 0.15s" }}
                      onMouseEnter={e => { e.currentTarget.style.background = "#FFF0E6"; e.currentTarget.style.borderColor = "#E65C00"; }}
                      onMouseLeave={e => { e.currentTarget.style.background = "#fafafa"; e.currentTarget.style.borderColor = "#f0f0f0"; }}>
                      <div style={{ width: 56, height: 56, borderRadius: 8, overflow: "hidden", background: "#f0f0f0", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        {sub.img
                          ? <img src={sub.img} alt={sub.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => { e.target.style.display = "none"; }} />
                          : <span style={{ fontSize: 26 }}>{sub.icon || "📦"}</span>}
                      </div>
                      <span style={{ fontSize: 10, fontWeight: 600, color: "#333", textAlign: "center", lineHeight: 1.3, wordBreak: "break-word" }}>
                        {lang === "en" ? (sub.en || sub.name) : sub.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Hero slider below categories */}
          <PromoSlider t={t} lang={lang} onShop={() => setPage("catalog")} onView={goToProduct} products={products} sliderConfig={sliderConfig} />
          <BrandsSlider logos={brandLogos} />
          <div style={{ paddingTop: "1.5rem", paddingBottom: "1rem" }}>
            {/* Recently Viewed */}
            {(() => {
              const recentProds = recentlyViewed.map(id => products.find(p => p.id === id)).filter(Boolean);
              if (!recentProds.length) return null;
              return (
                <div style={{ margin: "0 2rem 2rem", background: "#fff", borderRadius: 16, border: "1.5px solid #ebebeb", boxShadow: "0 2px 16px rgba(0,0,0,0.06)", overflow: "hidden" }}>
                  <div style={{ height: 4, background: "linear-gradient(90deg, #1a1a1a 0%, #555 100%)" }} />
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1rem 1.25rem 0.75rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                      <div style={{ width: 42, height: 42, borderRadius: 10, background: "#f5f5f5", border: "1.5px solid #33333333", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>🕐</div>
                      <div>
                        <div style={{ fontSize: 16, fontWeight: 800, color: "#1a1a1a" }}>{t.recentlyViewed}</div>
                        <div style={{ fontSize: 11, color: "#aaa", marginTop: 1 }}>{recentProds.length} {lang === "ka" ? "პროდუქტი" : lang === "ru" ? "товаров" : "products"}</div>
                      </div>
                    </div>
                  </div>
                  <div style={{ height: 1, background: "#f3f3f3", margin: "0 1.25rem" }} />
                  <div style={{ display: "flex", gap: 14, overflowX: "auto", padding: "1rem 1.25rem 1.25rem", scrollBehavior: "smooth", scrollbarWidth: "none" }}>
                    {recentProds.map(p => <ProductCard key={p.id} p={p} t={t} onAdd={addToCart} onView={goToProduct} lang={lang} cats={allCategories} wishlist={wishlist} onToggleWishlist={toggleWishlist} />)}
                  </div>
                </div>
              );
            })()}
            {allCategories.map(cat => (
              <CategorySlider key={cat.name} cat={cat} allProducts={products} t={t} onAdd={addToCart} onSeeAll={goSeeAll} onView={goToProduct} lang={lang} cats={allCategories} wishlist={wishlist} onToggleWishlist={toggleWishlist} />
            ))}
          </div>
        </>
      )}

      {page === "catalog" && (
        <div>
          {/* HOEGERT brand banner */}
          {selectedCat === HOEGERT_CAT && (
            <div style={{ background: "linear-gradient(135deg, #0a2a4a 0%, #0066B3 60%, #0088cc 100%)", padding: "2rem 2.5rem", display: "flex", alignItems: "center", gap: 28, position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", inset: 0, opacity: 0.06, backgroundImage: "repeating-linear-gradient(45deg, #fff 0px, #fff 1px, transparent 1px, transparent 12px)", backgroundSize: "16px 16px" }} />
              <img src="/hoger.png" alt="HOEGERT" style={{ height: 64, objectFit: "contain", flexShrink: 0, position: "relative", zIndex: 1, filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.3))", background: "rgba(255,255,255,0.92)", borderRadius: 10, padding: "6px 14px" }} />
              <div style={{ position: "relative", zIndex: 1 }}>
                <div style={{ color: "#fff", fontSize: 26, fontWeight: 900, letterSpacing: 2, marginBottom: 4 }}>HOEGERT</div>
                <div style={{ color: "rgba(255,255,255,0.72)", fontSize: 13, fontWeight: 500, letterSpacing: 1 }}>PROFESSIONAL TOOLS & CONSUMABLES</div>
                <div style={{ marginTop: 10, display: "flex", gap: 6 }}>
                  <div style={{ width: 28, height: 5, borderRadius: 3, background: "#00A3FF" }} />
                  <div style={{ width: 18, height: 5, borderRadius: 3, background: "rgba(255,255,255,0.4)" }} />
                  <div style={{ width: 10, height: 5, borderRadius: 3, background: "rgba(255,255,255,0.2)" }} />
                </div>
              </div>
            </div>
          )}
          <div style={{ padding: "1.5rem 2rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: "1.25rem" }}>
            <button onClick={goHome} style={{ background: "#fff", border: "1.5px solid #ddd", borderRadius: 8, padding: "6px 14px", fontSize: 13, cursor: "pointer", color: "#555", fontWeight: 600, flexShrink: 0 }}>{t.back}</button>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: "#1a1a1a" }}>{catalogTitle}</h2>
          </div>
          {/* Main controls row */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
            <input style={{ flex: 1, minWidth: 160, padding: "10px 14px", border: "1.5px solid #ddd", borderRadius: 9, fontSize: 14, background: "#fff", outline: "none" }} placeholder={t.searchPlaceholder} value={search} onChange={e => setSearch(e.target.value)} />
            <select style={{ padding: "9px 12px", border: "1.5px solid #ddd", borderRadius: 9, fontSize: 13, background: "#fff", cursor: "pointer" }} value={selectedCat} onChange={e => { setSelectedCat(e.target.value); setSelectedSubcat(null); }}>
              <option value="all">{t.allCategories}</option>
              {allCategories.map(c => <option key={c.name} value={c.name}>{lang === "en" ? c.en : lang === "ru" ? (c.ru || c.en) : c.name}</option>)}
            </select>
            <select style={{ padding: "9px 12px", border: "1.5px solid #ddd", borderRadius: 9, fontSize: 13, background: "#fff", cursor: "pointer" }} value={sort} onChange={e => setSort(e.target.value)}>
              <option value="default">{t.sortBy}</option>
              <option value="priceAsc">{t.priceAsc}</option>
              <option value="priceDesc">{t.priceDesc}</option>
              <option value="nameAsc">{t.nameAsc}</option>
            </select>
          </div>
          {/* Price range + in-stock filter row */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: "1rem", padding: "10px 14px", background: "#fff", borderRadius: 10, border: "1.5px solid #ebebeb" }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#555", flexShrink: 0 }}>{t.priceRange}:</span>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 12, color: "#888" }}>₾</span>
              <input type="number" min={0} placeholder={`${t.minPrice} (${globalMin})`} value={priceMin} onChange={e => setPriceMin(e.target.value)}
                style={{ width: 90, padding: "6px 8px", border: "1.5px solid #ddd", borderRadius: 7, fontSize: 13, outline: "none", background: priceMin !== "" ? "#FFF8F5" : "#fff", borderColor: priceMin !== "" ? "#E65C00" : "#ddd" }} />
              <span style={{ color: "#bbb", fontSize: 13 }}>–</span>
              <span style={{ fontSize: 12, color: "#888" }}>₾</span>
              <input type="number" min={0} placeholder={`${t.maxPrice} (${globalMax})`} value={priceMax} onChange={e => setPriceMax(e.target.value)}
                style={{ width: 90, padding: "6px 8px", border: "1.5px solid #ddd", borderRadius: 7, fontSize: 13, outline: "none", background: priceMax !== "" ? "#FFF8F5" : "#fff", borderColor: priceMax !== "" ? "#E65C00" : "#ddd" }} />
            </div>
            <button onClick={() => setInStockOnly(v => !v)}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 13px", borderRadius: 20, border: `1.5px solid ${inStockOnly ? "#22C55E" : "#ddd"}`, background: inStockOnly ? "#E1F5EE" : "#fff", color: inStockOnly ? "#065F46" : "#555", fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.15s" }}>
              <span style={{ width: 14, height: 14, borderRadius: 3, border: `2px solid ${inStockOnly ? "#22C55E" : "#bbb"}`, background: inStockOnly ? "#22C55E" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {inStockOnly && <span style={{ color: "#fff", fontSize: 9, fontWeight: 900, lineHeight: 1 }}>✓</span>}
              </span>
              {t.inStockOnly}
            </button>
            {activeFilterCount > 0 && (
              <button onClick={() => { setPriceMin(""); setPriceMax(""); setInStockOnly(false); }}
                style={{ padding: "6px 12px", borderRadius: 20, border: "1.5px solid #E65C00", background: "#FFF0E6", color: "#E65C00", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                {t.clearFilters} {activeFilterCount > 0 && `(${activeFilterCount})`}
              </button>
            )}
            <span style={{ marginLeft: "auto", fontSize: 12, color: "#aaa" }}>{filtered.length} {lang === "ka" ? "შედეგი" : lang === "ru" ? "результатов" : "results"}</span>
          </div>
          {selectedCat !== "all" && (() => {
            const catSubs = subcategories.filter(s => s.parentName === selectedCat);
            if (!catSubs.length) return null;
            return (
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: "1.25rem", alignItems: "stretch" }}>
                <div onClick={() => setSelectedSubcat(null)}
                  style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "10px 14px", borderRadius: 10, cursor: "pointer", minWidth: 90, border: `2px solid ${!selectedSubcat ? "#E65C00" : "#e8e8e8"}`, background: !selectedSubcat ? "#FFF0E6" : "#fff", transition: "all 0.15s" }}>
                  <div style={{ width: 52, height: 52, borderRadius: 8, background: "#f0f0f0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>
                    🔍
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: !selectedSubcat ? "#E65C00" : "#555", textAlign: "center" }}>
                    {lang === "ka" ? "ყველა" : lang === "ru" ? "Все" : "All"}
                  </span>
                </div>
                {catSubs.map(sub => (
                  <div key={sub.id} onClick={() => setSelectedSubcat(selectedSubcat === sub.id ? null : sub.id)}
                    style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "10px 14px", borderRadius: 10, cursor: "pointer", minWidth: 90, maxWidth: 120, border: `2px solid ${selectedSubcat === sub.id ? "#E65C00" : "#e8e8e8"}`, background: selectedSubcat === sub.id ? "#FFF0E6" : "#fff", transition: "all 0.15s" }}>
                    <div style={{ width: 52, height: 52, borderRadius: 8, overflow: "hidden", background: "#f0f0f0", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {sub.img
                        ? <img src={sub.img} alt={sub.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => { e.target.style.display = "none"; }} />
                        : <span style={{ fontSize: 24 }}>{sub.icon || "📦"}</span>}
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 600, color: selectedSubcat === sub.id ? "#E65C00" : "#555", textAlign: "center", lineHeight: 1.3 }}>
                      {lang === "en" ? (sub.en || sub.name) : sub.name}
                    </span>
                  </div>
                ))}
              </div>
            );
          })()}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(185px, 1fr))", gap: 16 }}>
            {filtered.map(p => <ProductCard key={p.id} p={p} t={t} onAdd={addToCart} onView={goToProduct} lang={lang} cats={allCategories} wishlist={wishlist} onToggleWishlist={toggleWishlist} />)}
          </div>
          {filtered.length === 0 && <p style={{ textAlign: "center", color: "#999", marginTop: 50 }}>No products found.</p>}
          </div>
        </div>
      )}

      {page === "product" && selectedProduct && (
        <ProductPage p={selectedProduct} t={t} lang={lang} onAdd={addToCart} onBack={goBack} onView={goToProduct} allProducts={products} cats={allCategories} onGoCategory={goSeeAll} subcategories={subcategories} wishlist={wishlist} onToggleWishlist={toggleWishlist} />
      )}

      {page === "contact" && (
        <div style={{ padding: "2.5rem 2rem" }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 1.5rem", color: "#1a1a1a" }}>{t.contactTitle}</h2>
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "stretch" }}>
            {/* Left: contact info */}
            <div style={{ background: "#fff", border: "1.5px solid #e8e8e8", borderRadius: 16, padding: "2rem", flex: "1 1 300px", minWidth: 280, maxWidth: 440 }}>
              <p style={{ color: "#666", fontSize: 14, marginBottom: "1.5rem", lineHeight: 1.65 }}>{t.contactInfo}</p>
              {[
                { icon: "📍", content: <span style={{ color: "#1a1a1a" }}>{t.address}</span> },
                { icon: "📞", content: <div><div>{t.phone}</div><div style={{ marginTop: 4 }}>+995 599 05 95 71</div></div> },
                { icon: "✉️", content: t.email },
              ].map((r, i) => (
                <div key={i} style={{ display: "flex", gap: 14, alignItems: "flex-start", marginBottom: "1.1rem" }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: "#FFF0E6", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{r.icon}</div>
                  <div style={{ fontSize: 14, color: "#1a1a1a", paddingTop: 10, lineHeight: 1.5 }}>{r.content}</div>
                </div>
              ))}
              <a href="https://maps.app.goo.gl/55y6ZAwJnH3XKvr47" target="_blank" rel="noopener noreferrer"
                style={{ display: "inline-flex", alignItems: "center", gap: 7, marginTop: 8, background: "#E65C00", color: "#fff", borderRadius: 9, padding: "9px 18px", fontSize: 13, fontWeight: 700, textDecoration: "none" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                {lang === "ka" ? "გახსენი Google Maps-ში" : lang === "ru" ? "Открыть в Google Maps" : "Open in Google Maps"}
              </a>
            </div>
            {/* Right: embedded Google Map */}
            <div style={{ flex: "1 1 340px", minWidth: 300, borderRadius: 16, overflow: "hidden", border: "1.5px solid #e8e8e8", boxShadow: "0 4px 20px rgba(0,0,0,0.08)", minHeight: 340 }}>
              <iframe
                title="Store Location"
                src="https://maps.google.com/maps?q=Rafael+Agladze+Street+15+Tbilisi+Georgia&t=&z=16&ie=UTF8&iwloc=&output=embed"
                width="100%"
                height="100%"
                style={{ border: 0, display: "block", minHeight: 340 }}
                allowFullScreen=""
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>
        </div>
      )}

      {page === "profile" && currentUser && (
        <ProfilePage
          currentUser={currentUser}
          t={t}
          lang={lang}
          onLogout={() => { logoutCustomer(); setCurrentUser(null); setWishlist([]); setPage("home"); }}
          onView={goToProduct}
          products={products}
          wishlist={wishlist}
          onToggleWishlist={toggleWishlist}
          onGoHome={goHome}
        />
      )}

      {page === "admin" && (
        <AdminPanel products={products} setProducts={setProducts} onConfigChange={refreshAdminConfig} />
      )}

      <a href="tel:+995322200000" style={{ position: "fixed", bottom: 28, right: 24, background: "#E65C00", color: "#fff", borderRadius: "50%", width: 58, height: 58, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300, textDecoration: "none", boxShadow: "0 4px 16px rgba(230,92,0,0.45)" }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.35 2 2 0 0 1 3.58 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.56a16 16 0 0 0 6.29 6.29l1.62-1.62a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
      </a>

      <div style={{ background: "#111", color: "#666", padding: "2.5rem 2rem 1.5rem" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          {/* Join Us row */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "2rem" }}>
            <div style={{ fontSize: 11, color: "#E65C00", fontWeight: 700, letterSpacing: 2, marginBottom: 10 }}>JOIN US</div>
            <div style={{ display: "flex", gap: 14 }}>
              <a href="https://www.facebook.com/MGPCompany/" target="_blank" rel="noopener noreferrer"
                style={{ display: "flex", alignItems: "center", gap: 8, background: "#1877F2", color: "#fff", borderRadius: 9, padding: "9px 18px", textDecoration: "none", fontSize: 13, fontWeight: 700 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="#fff"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                Facebook
              </a>
              <a href="https://www.instagram.com/mastergroup_hogert/" target="_blank" rel="noopener noreferrer"
                style={{ display: "flex", alignItems: "center", gap: 8, background: "linear-gradient(135deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)", color: "#fff", borderRadius: 9, padding: "9px 18px", textDecoration: "none", fontSize: 13, fontWeight: 700 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="#fff"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                Instagram
              </a>
            </div>
          </div>
          <div style={{ height: 1, background: "#222", marginBottom: "1.25rem" }} />
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 8, fontSize: 12 }}>
            <div>© 2025 Master Group (MGP) · All rights reserved</div>
            <div>📍 {t.address} · 📞 {t.phone} · ✉️ {t.email}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

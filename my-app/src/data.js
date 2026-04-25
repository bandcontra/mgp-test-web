import supabase from './supabase';

export const BASE = "https://mgp.ge/timthumb/thumb.php?src=/upload/";
export const SZ = "&w=280&h=210&zc=1&q=75";
export const SZ_LG = "&w=600&h=500&zc=1&q=75";

export const HOEGERT_NAME = "HOEGERT";
export const OLD_HOGERT_CATS = ["HOGERT სახარჯი მასალები", "HOGERT GERMAN ხელსაწყოები"];

// ── Supabase row ↔ JS product mappers ─────────────────────────────────────────
function fixStorageUrl(url) {
  if (!url || typeof url !== 'string') return url;
  // Insert missing /public/ segment in Supabase storage URLs
  return url.replace(/(\/storage\/v1\/object\/)(product-images\/)/, '$1public/$2');
}

function rowToProduct(row) {
  return {
    id: row.id, name: row.name, en: row.en || null,
    desc: row.description || null, details: row.details || null,
    specs: row.specs || [], sku: row.sku || null, barcode: row.barcode || null,
    price: parseFloat(row.price) || 0,
    oldPrice: row.old_price ? parseFloat(row.old_price) : null,
    stock: row.stock !== false,
    stockQty: row.stock_qty != null ? row.stock_qty : null,
    images: (row.images || []).map(fixStorageUrl), img: fixStorageUrl(row.img) || null,
    cat: row.cat || null, tag: row.tag || null,
    disc: row.disc || null, subcat: row.subcat || null,
    packSize: row.pack_size ? parseInt(row.pack_size) : null,
  };
}

function productToRow(p) {
  return {
    id: p.id, name: p.name, en: p.en || null,
    description: p.desc || null, details: p.details || null,
    specs: p.specs || [], sku: p.sku || null, barcode: p.barcode || null,
    price: p.price || 0, old_price: p.oldPrice || null,
    stock: p.stock !== false,
    stock_qty: p.stockQty != null ? p.stockQty : null,
    images: p.images || [],
    img: p.img || null, cat: p.cat || null, tag: p.tag || null,
    disc: p.disc || null, subcat: p.subcat || null,
    ...(p.packSize != null ? { pack_size: p.packSize } : {}),
  };
}

async function uploadImageToStorage(src, productId, index) {
  if (!src || !src.startsWith('data:')) return src;
  if (!supabase) return null;
  try {
    const mime = src.match(/data:(.*?);base64,/)[1];
    const ext = mime.split('/')[1].replace('jpeg', 'jpg') || 'jpg';
    const base64Data = src.split(',')[1];
    const byteChars = atob(base64Data);
    const byteArray = new Uint8Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i++) byteArray[i] = byteChars.charCodeAt(i);
    const blob = new Blob([byteArray], { type: mime });
    // Use timestamp in path so re-used product IDs never serve a stale old image
    const path = `products/${productId}/${index}_${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('product-images').upload(path, blob, { upsert: true, contentType: mime });
    if (error) return null;
    const { data } = supabase.storage.from('product-images').getPublicUrl(path);
    return data.publicUrl;
  } catch { return null; }
}

async function saveSetting(key, value) {
  if (!supabase) return;
  try { await supabase.from('site_settings').upsert({ key, value, updated_at: new Date().toISOString() }); } catch {}
}

export async function fetchAllSettings() {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.from('site_settings').select('*');
    if (error || !data) return null;
    return Object.fromEntries(data.map(r => [r.key, r.value]));
  } catch { return null; }
}

export async function fetchProductsFromDB() {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.from('products').select('*').order('id', { ascending: false });
    if (error) return null;
    return data.map(rowToProduct);
  } catch { return null; }
}

export async function saveProductsToDB(prods) {
  if (!supabase) return false;
  try {
    const processed = await Promise.all(prods.map(async p => {
      if (!p.images || !p.images.some(s => s && s.startsWith('data:'))) return p;
      const uploaded = await Promise.all(p.images.map((src, i) => uploadImageToStorage(src, p.id, i)));
      return { ...p, images: uploaded.filter(Boolean) };
    }));
    const rows = processed.map(productToRow);
    let { error } = await supabase.from('products').upsert(rows, { onConflict: 'id' });
    if (error) {
      // Retry without pack_size in case the column doesn't exist in DB yet
      const rowsCompat = rows.map(({ pack_size, ...rest }) => rest);
      const result = await supabase.from('products').upsert(rowsCompat, { onConflict: 'id' });
      error = result.error;
    }
    if (!error) {
      localStorage.setItem('mgp_products', JSON.stringify(processed));
    }
    return !error;
  } catch { return false; }
}

export async function deleteProductFromDB(id) {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('products').delete().eq('id', id);
    return !error;
  } catch { return false; }
}

export async function fetchOrdersFromDB() {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.from('orders').select('*').order('date', { ascending: false });
    if (error) return null;
    return data.map(o => ({
      orderNumber: o.order_number, customerId: o.customer_id,
      customerName: o.customer_name, phone: o.phone, email: o.email,
      address: o.address, items: o.items || [],
      total: parseFloat(o.total) || 0, paymentMethod: o.payment_method,
      status: o.status || 'pending', statusHistory: o.status_history || [],
      date: o.date,
    }));
  } catch { return null; }
}

export const defaultCategories = [
  { name: "სამაგრი საშუალებები", en: "Fasteners", ru: "Крепежи", icon: "🔩", color: "#1E3A5F", bg: "#EFF6FF", img: "https://mgp.ge/upload/e59kjlsFKcfS52ICLiPEEuEiDYIJw5.jpg" },
  { name: HOEGERT_NAME, en: "HOEGERT", ru: "HOEGERT", icon: "", color: "#0066B3", bg: "#EEF5FF", img: "/hoger.png" },
  { name: "სამშენებლო ელექტრო სისტემა", en: "Electrical Systems", ru: "Электросистемы", icon: "⚡", color: "#7C3AED", bg: "#F5F3FF", img: "https://mgp.ge/upload/txguvEOu4foDFCZDk04c0hz0EpMezn.jpg" },
  { name: "სამშენებლო უსაფრთხოება", en: "Safety Equipment", ru: "Защитное оборудование", icon: "🦺", color: "#065F46", bg: "#ECFDF5", img: "https://mgp.ge/upload/As7RYkXLqF0tPUb3pclkKqZmDRrx3n.jpg" },
  { name: "საიზოლაციო მასალები", en: "Insulation", ru: "Изоляция", icon: "🏠", color: "#0369A1", bg: "#F0F9FF", img: "https://mgp.ge/upload/bi0T5Qe9zdWErFLeauPgfzZ11DXCBE.jpg" },
  { name: "საღებავები", en: "Paints & Coatings", ru: "Краски", icon: "🎨", color: "#9333EA", bg: "#FAF5FF", img: "https://mgp.ge/upload/v2BK1snvjjYpeAXJBFW3nC8jQYaV36.jpg" },
  { name: "სანტექნიკა", en: "Plumbing", ru: "Сантехника", icon: "💧", color: "#0284C7", bg: "#E0F2FE", img: "https://mgp.ge/upload/tJcdDJBarn4EvcmJibHxPD6BlyKaYH.jpg" },
  { name: "იატაკი", en: "Flooring", ru: "Напольные покრытия", icon: "🏗️", color: "#78716C", bg: "#FAFAF9", img: "https://mgp.ge/upload/fsO3A7BqczKVxFCVCvklwMrW6h7Jk1.jpg" },
  { name: "კარ-ფანჯარა", en: "Doors & Windows", ru: "Двери и окна", icon: "🚪", color: "#B45309", bg: "#FEF3C7", img: "https://mgp.ge/upload/idM27nI2kghRsxMciSEOffet5TXZfk.jpg" },
  { name: "ცემენტი", en: "Cement & Mortar", ru: "Цемент", icon: "🧱", color: "#57534E", bg: "#F5F5F4", img: "https://mgp.ge/upload/eJDIyk9F7L9BDHHs3jZackSg1QdVGn.jpg" },
  { name: "სახურავი", en: "Roofing", ru: "Кровля", icon: "⛺", color: "#B91C1C", bg: "#FEF2F2", img: "https://mgp.ge/upload/1kQNHL9xyVUfDZfBwTkCdqrPXDDxF4.jpg" },
];

export const defaultProducts = [
  { id: 1, name: "ანკერი ჭანჭიკი", en: "Anchor Bolt", desc: "Expansion anchor bolt for concrete and masonry. Zinc-plated high-strength steel.", price: 0.32, stock: true, img: BASE+"VGIj9dKIiDJyYAv4SeRrpIl47EO49z.jpg"+SZ, cat: "სამაგრი საშუალებები", tag: "new", disc: null },
  { id: 2, name: "სახურავის სამაგრები", en: "Roof Fasteners", desc: "Self-drilling fasteners for metal roofing. Suitable for all weather conditions.", price: 0.05, stock: true, img: BASE+"IbllnIqoGtUYozBrtOrGVAPQDvfTma.jpg"+SZ, cat: "სამაგრი საშუალებები", tag: null, disc: null },
  { id: 3, name: "სენდვიჩ-პანელის სამაგრები", en: "Sandwich Panel Fasteners", desc: "Specialized screws for sandwich panel installation. Includes EPDM sealing washer.", price: 0.25, stock: true, img: BASE+"1kQNHL9xyVUfDZfBwTkCdqrPXDDxF4.jpg"+SZ, cat: "სამაგრი საშუალებები", tag: null, disc: null },
  { id: 4, name: "სახურავის შურუპი 4.8/5.5", en: "Roof Screw 4.8/5.5mm", desc: "Self-tapping hex head screws for metal roofing. With rubber sealing washer.", price: 0.05, oldPrice: 0.07, stock: true, img: BASE+"Y3vfFJlDrcghphmFBOB7DimDviKjRA.jpg"+SZ, cat: "სამაგრი საშუალებები", tag: "discount", disc: 28 },
  { id: 5, name: "მინი საზეინკლო ხერხი 300მმ", en: "Mini Hacksaw 300mm", desc: "Compact hacksaw with bi-metal blade. Ideal for tight spaces and precision cuts.", price: 18.00, stock: true, img: BASE+"uyXMjUaM4twpf4EPpFsGxlNvDGAgMC.jpg"+SZ, cat: HOEGERT_NAME, tag: "hot", disc: null },
  { id: 6, name: "საჭრელი დისკი მეტალის inox 125mm", en: "Metal Cutting Disc 125mm", desc: "Premium inox cutting disc. Ultra-thin for fast, clean cuts on stainless steel.", price: 8.50, stock: true, img: BASE+"maGq3dI0pEA2k1v6J1ivy1ejrto306.jpg"+SZ, cat: HOEGERT_NAME, tag: null, disc: null },
  { id: 7, name: "ბეტონის ამოსაჭრელი ბურღი 400-22", en: "Concrete Core Drill 400-22", desc: "Professional SDS core drill for concrete. 22mm diameter, 400mm depth capacity.", price: 0.00, stock: true, img: BASE+"yQDr6iHQSCVvnHiDKZv5SeU3atqqKl.jpg"+SZ, cat: HOEGERT_NAME, tag: null, disc: null },
  { id: 8, name: "ხის ბურღი 14×600მმ", en: "Wood Drill 14×600mm", desc: "Long wood auger bit for deep drilling. Perfect for electrical and plumbing runs.", price: 12.00, stock: true, img: BASE+"SpHQT5UsxlKt9QDeN2cHpdTakj1F0q.jpg"+SZ, cat: HOEGERT_NAME, tag: "new", disc: null },
  { id: 9, name: "ხის სახვრეტი (პერო) 22მმ", en: "Wood Spade Bit 22mm", desc: "Flat spade bit for fast wood boring. 22mm diameter for pipe and cable runs.", price: 4.50, stock: true, img: BASE+"4BBKCn9aI6NxtYsqTbU7y05MRLvFic.jpg"+SZ, cat: HOEGERT_NAME, tag: null, disc: null },
  { id: 10, name: "ბურღი SDS PLUS 22×600მმ", en: "SDS PLUS Drill 22×600mm", desc: "Long SDS Plus bit for deep concrete drilling. Reinforced carbide tip.", price: 22.00, oldPrice: 28.00, stock: true, img: BASE+"CEMSdj9RV9N61D70rZSStbSv7dvYLY.jpg"+SZ, cat: HOEGERT_NAME, tag: "discount", disc: 21 },
  { id: 11, name: "ბურღი SDS MAX 25×400მმ", en: "SDS MAX Drill 25×400mm", desc: "Heavy-duty SDS Max chisel bit for demolition work. Tungsten carbide tip.", price: 35.00, stock: true, img: BASE+"cZfxezsy9v3g3xIlG8t8xxpSZDi3eh.jpg"+SZ, cat: HOEGERT_NAME, tag: "hot", disc: null },
  { id: 12, name: "ბეტონის ბურღი 8×120მმ", en: "Masonry Drill 8×120mm", desc: "Standard masonry drill bit for brick and concrete. Double-flute carbide tip.", price: 3.50, stock: true, img: BASE+"JJ1cldN1tlPYHKtOuGcKwwQD5VyYSS.jpg"+SZ, cat: HOEGERT_NAME, tag: null, disc: null },
  { id: 13, name: "HT2E231-0AG უნახშირო კუთხსახეხი", en: "Cordless Angle Grinder HT2E231", desc: "18V brushless angle grinder. Tool-free guard adjustment, electronic brake.", price: 0.00, stock: true, img: BASE+"eJDIyk9F7L9BDHHs3jZackSg1QdVGn.jpg"+SZ, cat: HOEGERT_NAME, tag: "hot", disc: null },
  { id: 14, name: "T2E230-0MT მულტიფუნქციური 18V", en: "Multitool 18V T2E230", desc: "Versatile 18V oscillating multitool. Variable speed 10,000–20,000 OPM.", price: 331.00, oldPrice: 445.00, stock: true, img: BASE+"tJcdDJBarn4EvcmJibHxPD6BlyKaYH.jpg"+SZ, cat: HOEGERT_NAME, tag: "discount", disc: 26 },
  { id: 15, name: "უსადენო წრიული ხერხი 18V HT2E235", en: "Cordless Circular Saw 18V", desc: "18V brushless circular saw with laser guide. Bevel cuts up to 45 degrees.", price: 484.00, oldPrice: 625.00, stock: true, img: BASE+"v2BK1snvjjYpeAXJBFW3nC8jQYaV36.jpg"+SZ, cat: HOEGERT_NAME, tag: "discount", disc: 23 },
  { id: 16, name: "HT2E223-0PD Brushless სახრახნისი 18V", en: "Brushless Impact Driver 18V", desc: "3-speed brushless impact driver. 200Nm max torque for heavy fastening tasks.", price: 415.00, oldPrice: 585.00, stock: true, img: BASE+"idM27nI2kghRsxMciSEOffet5TXZfk.jpg"+SZ, cat: HOEGERT_NAME, tag: "discount", disc: 29 },
  { id: 17, name: "HT2E232-0AG კუთხსახეხი 125მმ 18V", en: "Angle Grinder 125mm 18V", desc: "18V cordless angle grinder. Soft-start and electronic overload protection.", price: 449.00, oldPrice: 650.00, stock: true, img: BASE+"WDbXMxkOFIXGOYWwXHvtWzTamtZDlC.jpg"+SZ, cat: HOEGERT_NAME, tag: "discount", disc: 31 },
  { id: 18, name: "HT2E229 უსადენო სანგრევი ჩაქუჩი", en: "Cordless Demolition Hammer", desc: "18V SDS Max demolition hammer with anti-vibration system. 3-mode selector.", price: 374.00, oldPrice: 545.00, stock: true, img: BASE+"bi0T5Qe9zdWErFLeauPgfzZ11DXCBE.jpg"+SZ, cat: HOEGERT_NAME, tag: "discount", disc: 31 },
  { id: 19, name: "მექანიკოსის დანა 210მმ HT4C651", en: "Mechanic Knife 210mm", desc: "Folding lock-back utility knife with stainless blade and rubber grip handle.", price: 16.00, stock: true, img: BASE+"aUAG6mkNFvBtcuYRdOsBEdeoKCstwu.jpg"+SZ, cat: HOEGERT_NAME, tag: "hot", disc: null },
  { id: 20, name: "ქანჩგასაღები ორმხრივი 17მმ", en: "Ratchet Spanner 17mm", desc: "Double-ended ratchet spanner with 72-tooth mechanism for tight spaces.", price: 28.00, stock: true, img: BASE+"QlCBFQS9hAnKJ9F9O2UN2Gq80TZbvv.jpg"+SZ, cat: HOEGERT_NAME, tag: null, disc: null },
  { id: 21, name: "საკანცელარიო დანის 10 პირი 18მმ", en: "Snap-off Blades 18mm 10pcs", desc: "Pack of 10 snap-off replacement blades. 18mm wide for heavy-duty cutting.", price: 5.50, stock: true, img: BASE+"EMozRHbEK0jFJB62IlAyeMpfecgurp.jpg"+SZ, cat: HOEGERT_NAME, tag: null, disc: null },
  { id: 22, name: "კუთხოვანა ალუმინის 350×190მმ", en: "Aluminium Carpenter Square 350mm", desc: "Precision aluminium carpenter's square. Anodized finish, corrosion-resistant.", price: 18.00, stock: true, img: BASE+"pkxMFANabakIhdhqMKxsajSRzUJr16.jpg"+SZ, cat: HOEGERT_NAME, tag: "new", disc: null },
  { id: 23, name: "სილიკონის საფრთვევი იარაღი", en: "Caulking Gun", desc: "Heavy-duty skeleton caulking gun for standard 300ml cartridges. Smooth rod.", price: 22.00, stock: true, img: BASE+"mmFDGnVH3T6GvgZ4LD2iYJoQY7G6Tc.jpg"+SZ, cat: HOEGERT_NAME, tag: null, disc: null },
  { id: 24, name: "ხელის ხერხი 450მმ 7TPI", en: "Hand Saw 450mm 7TPI", desc: "Professional hand saw with hardpoint teeth. 7 TPI for fast timber cutting.", price: 32.00, stock: true, img: BASE+"tjGxaxvgRqWVPyWLmlTR1o79AxBnQL.jpg"+SZ, cat: HOEGERT_NAME, tag: "new", disc: null },
  { id: 25, name: "მავთულის ჯაგრისი 4-რიგი 250მმ", en: "Wire Brush 4-row 250mm", desc: "4-row wire brush for rust removal and surface preparation. Steel bristles.", price: 14.00, stock: true, img: BASE+"jfO2Bq08BrPfrNTU8t5bqtmEZkDT4V.jpg"+SZ, cat: HOEGERT_NAME, tag: null, disc: null },
  { id: 26, name: "ცული ხის ტარით 800გრ", en: "Axe with Wood Handle 800g", desc: "General purpose splitting axe with lacquered hickory handle. 800g head.", price: 38.00, stock: true, img: BASE+"v4Ffw3GAuo8BJ4H3tByVFErgQxcGD5.jpg"+SZ, cat: HOEGERT_NAME, tag: null, disc: null },
  { id: 27, name: "შემამჭიდროვებელი 300×63მმ", en: "Ratchet Bar Clamp 300×63mm", desc: "One-handed trigger-action bar clamp. 300mm jaw opening, 63mm throat depth.", price: 25.00, stock: true, img: BASE+"Gz4YKCQSICao2mI2XATKwcg3f3XBkI.jpg"+SZ, cat: HOEGERT_NAME, tag: null, disc: null },
  { id: 28, name: "იარაღების ნაკრები 222 ც.", en: "Tool Set 222 pcs", desc: "Complete professional tool set with sockets, bits, spanners and pliers in case.", price: 285.00, stock: true, img: BASE+"fsO3A7BqczKVxFCVCvklwMrW6h7Jk1.jpg"+SZ, cat: HOEGERT_NAME, tag: "hot", disc: null },
  { id: 29, name: "იარაღების ნაკრები 131 ც.", en: "Tool Set 131 pcs", desc: "Comprehensive home and workshop tool kit in blow-mould carry case.", price: 175.00, stock: true, img: BASE+"tVo7xxqu6K3vwTBLc97CbYwFly0EIa.jpg"+SZ, cat: HOEGERT_NAME, tag: null, disc: null },
  { id: 30, name: "ნასადკა PZ2×65მმ", en: "Bit PZ2×65mm", desc: "PZ2 double-torsion screwdriver bit. 65mm length, chrome-vanadium steel.", price: 2.50, stock: true, img: BASE+"Gj9BTeTN3TiuCb9z5wJFHrABOSTETD.jpg"+SZ, cat: HOEGERT_NAME, tag: null, disc: null },
  { id: 31, name: "ლენტი საიზოლაციო ლურჯი 19მმ", en: "Insulation Tape Blue 19mm", desc: "Blue PVC electrical insulation tape. Self-adhesive, 10m length per roll.", price: 3.20, stock: true, img: BASE+"VtzTNk3ZfVz3Jcyeawv417jfjQwhgG.jpg"+SZ, cat: "სამშენებლო ელექტრო სისტემა", tag: "new", disc: null },
  { id: 32, name: "ლენტი საიზოლაციო შავი 19მმ", en: "Insulation Tape Black 19mm", desc: "Standard black PVC electrical tape. UV-resistant, self-adhesive, 10m roll.", price: 3.20, stock: true, img: BASE+"nuYYZGl7Rj4cN0P7CFDXDjKHKWGVXg.jpg"+SZ, cat: "სამშენებლო ელექტრო სისტემა", tag: null, disc: null },
  { id: 33, name: "ლენტი საიზოლაციო ყვითელ-მწვანე", en: "Insulation Tape Yellow-Green", desc: "Yellow/green earth continuity tape. IEC compliant, self-adhesive, 10m roll.", price: 3.20, stock: true, img: BASE+"23Xb0mQ4XKNCjLI4RitbMkSp180uut.jpg"+SZ, cat: "სამშენებლო ელექტრო სისტემა", tag: null, disc: null },
  { id: 34, name: "ხელთათმანები სამშენებლო", en: "Construction Gloves", desc: "Cut-resistant work gloves with padded palm and breathable back material.", price: 4.50, stock: true, img: "https://mgp.ge/upload/As7RYkXLqF0tPUb3pclkKqZmDRrx3n.jpg", cat: "სამშენებლო უსაფრთხოება", tag: "new", disc: null },
  { id: 35, name: "HT3S274-D მინი ხერხი 300მმ", en: "Mini Saw HT3S274-D 300mm", desc: "Compact folding saw with hardpoint teeth. 300mm blade, cushioned grip handle.", price: 18.00, stock: true, img: BASE+"uyXMjUaM4twpf4EPpFsGxlNvDGAgMC.jpg"+SZ, cat: HOEGERT_NAME, tag: "hot", disc: null },
  { id: 36, name: "SDS PLUS ბურღი 10×200მმ", en: "SDS PLUS Drill 10×200mm", desc: "Standard SDS Plus masonry bit. 10mm diameter, 200mm length, carbide tip.", price: 8.00, stock: true, img: BASE+"CEMSdj9RV9N61D70rZSStbSv7dvYLY.jpg"+SZ, cat: HOEGERT_NAME, tag: null, disc: null },
  { id: 37, name: "ლენტი საიზოლაციო წითელი", en: "Insulation Tape Red", desc: "Red PVC phase identification tape. Self-adhesive, 10m roll, 19mm wide.", price: 3.20, stock: true, img: BASE+"VtzTNk3ZfVz3Jcyeawv417jfjQwhgG.jpg"+SZ, cat: "სამშენებლო ელექტრო სისტემა", tag: null, disc: null },
  { id: 38, name: "HT2E232 კუთხსახეხი Paddle 18V", en: "Angle Grinder Paddle 18V", desc: "18V brushless paddle grinder. Burst-fire safety switch, soft-start protection.", price: 449.00, oldPrice: 600.00, stock: true, img: BASE+"WDbXMxkOFIXGOYWwXHvtWzTamtZDlC.jpg"+SZ, cat: HOEGERT_NAME, tag: "discount", disc: 25 },
  { id: 39, name: "მეტალის საჭრელი დისკი 115მმ", en: "Metal Cutting Disc 115mm", desc: "115mm cutting disc for metal and steel. Low-profile design for angle grinders.", price: 6.50, stock: true, img: BASE+"maGq3dI0pEA2k1v6J1ivy1ejrto306.jpg"+SZ, cat: HOEGERT_NAME, tag: null, disc: null },
  { id: 40, name: "სენდვიჩ-პანელის სამაგრი 5.5×35", en: "Sandwich Panel Screw 5.5×35", desc: "Stainless 5.5×35mm screw for sandwich panels. Hex head with EPDM washer.", price: 0.18, oldPrice: 0.25, stock: true, img: BASE+"1kQNHL9xyVUfDZfBwTkCdqrPXDDxF4.jpg"+SZ, cat: "სამაგრი საშუალებები", tag: "discount", disc: 28 },
  { id: 41, name: "მინის მატყლი 50მმ", en: "Glass Wool 50mm", desc: "50mm thermal glass wool roll. Excellent fire and sound insulation properties.", price: 24.00, stock: true, img: null, cat: "საიზოლაციო მასალები", tag: "new", disc: null },
  { id: 42, name: "პენოპლასტი EPS100", en: "EPS Polystyrene Board", desc: "EPS100 expanded polystyrene insulation board. 50mm thick, 1200×600mm sheet.", price: 18.50, oldPrice: 22.00, stock: true, img: null, cat: "საიზოლაციო მასალები", tag: "discount", disc: 16 },
  { id: 43, name: "ორთქლსაცობი ფირი", en: "Vapour Barrier Film", desc: "Heavy-duty polythene vapour barrier. 200 micron, 4m×25m roll, 100m² coverage.", price: 32.00, stock: true, img: null, cat: "საიზოლაციო მასალები", tag: null, disc: null },
  { id: 44, name: "ფასადის საღებავი 15ლ", en: "Facade Paint White 15L", desc: "Weather-resistant exterior facade paint. White base, covers approx. 90m².", price: 68.00, stock: true, img: null, cat: "საღებავები", tag: "hot", disc: null },
  { id: 45, name: "ინტერიერის საღებავი 10ლ", en: "Interior Wall Paint 10L", desc: "Washable matte finish interior wall paint. Low VOC, white base, 10 litres.", price: 42.00, oldPrice: 52.00, stock: true, img: null, cat: "საღებავები", tag: "discount", disc: 19 },
  { id: 46, name: "პრაიმერი ბეტონზე 5ლ", en: "Concrete Primer 5L", desc: "Deep-penetrating primer for concrete, brick and plaster surfaces. 5 litres.", price: 28.00, stock: true, img: null, cat: "საღებავები", tag: null, disc: null },
  { id: 47, name: "სპილენძის მილი 15მმ 3მ", en: "Copper Pipe 15mm 3m", desc: "15mm soft copper tube for water supply systems. 3m length, R220 half-hard.", price: 22.00, stock: true, img: null, cat: "სანტექნიკა", tag: "new", disc: null },
  { id: 48, name: "ბოილერი 80ლ ვერტიკალური", en: "Water Heater 80L", desc: "80L vertical electric water heater. Energy class B, 2kW heating element.", price: 320.00, stock: true, img: null, cat: "სანტექნიკა", tag: "hot", disc: null },
  { id: 49, name: "სანტექნიკის ლენტი PTFE", en: "PTFE Thread Seal Tape", desc: "Plumber's PTFE thread seal tape. 12mm wide, 10m length, high-density grade.", price: 1.80, stock: true, img: null, cat: "სანტექნიკა", tag: null, disc: null },
  { id: 50, name: "ლამინატი 8მმ AC4", en: "Laminate Flooring 8mm", desc: "8mm AC4 laminate flooring with click system. 2.131m² per pack, oak finish.", price: 38.00, stock: true, img: null, cat: "იატაკი", tag: "new", disc: null },
  { id: 51, name: "ფილის წებო 25კგ", en: "Tile Adhesive 25kg", desc: "Standard grey ceramic tile adhesive. 25kg bag, covers 5–6m² at 6mm bed.", price: 14.00, oldPrice: 17.00, stock: true, img: null, cat: "იატაკი", tag: "discount", disc: 18 },
  { id: 52, name: "სართულის პლინტუსი 2.4მ", en: "Skirting Board 2.4m", desc: "MDF skirting board with PVC edge strip. 2.4m length, white gloss finish.", price: 8.50, stock: true, img: null, cat: "იატაკი", tag: null, disc: null },
  { id: 53, name: "კარის სახელური (ნაკრები)", en: "Door Handle Set", desc: "Stainless steel lever door handle set. Includes latch, strike plate and fixings.", price: 35.00, stock: true, img: null, cat: "კარ-ფანჯარა", tag: "new", disc: null },
  { id: 54, name: "ფანჯრის სახელური PVC", en: "Window Handle PVC", desc: "PVC window turn handle for tilt-and-turn mechanisms. White, screw-fix mount.", price: 12.00, oldPrice: 15.00, stock: true, img: null, cat: "კარ-ფანჯარა", tag: "discount", disc: 20 },
  { id: 55, name: "კარის მილი 100მმ (3 ც.)", en: "Door Hinge 100mm 3pcs", desc: "Heavy-duty steel door hinge. 100mm, zinc-plated finish, pack of 3 with screws.", price: 9.00, stock: true, img: null, cat: "კარ-ფანჯარა", tag: null, disc: null },
  { id: 56, name: "პორტლანდ ცემენტი 25კგ", en: "Portland Cement 25kg", desc: "CEM I 42.5R Portland cement for general concrete and mortar work. 25kg bag.", price: 12.50, stock: true, img: null, cat: "ცემენტი", tag: null, disc: null },
  { id: 57, name: "შტუკატურის ნარევი 20კგ", en: "Plaster Mix 20kg", desc: "Gypsum-based interior plaster mix. 20kg bag, 10mm application thickness.", price: 9.00, oldPrice: 11.00, stock: true, img: null, cat: "ცემენტი", tag: "discount", disc: 18 },
  { id: 58, name: "ბლოკის წებო 25კგ", en: "Block Adhesive 25kg", desc: "Ready-mix adhesive mortar for AAC blocks. Thin-bed application, 25kg bag.", price: 11.00, stock: true, img: null, cat: "ცემენტი", tag: "hot", disc: null },
  { id: 59, name: "ლითონის კრამიტი", en: "Metal Roof Tile", desc: "Profiled steel roof tile, powder-coated. 1.2m×0.35m, 0.5mm thickness.", price: 18.00, stock: true, img: BASE+"1kQNHL9xyVUfDZfBwTkCdqrPXDDxF4.jpg"+SZ, cat: "სახურავი", tag: "new", disc: null },
  { id: 60, name: "სახურავის ჰიდროიზოლაცია", en: "Roof Waterproofing Membrane", desc: "Bitumen-modified waterproofing membrane. 4mm thick, 10m² per roll.", price: 45.00, oldPrice: 55.00, stock: true, img: BASE+"IbllnIqoGtUYozBrtOrGVAPQDvfTma.jpg"+SZ, cat: "სახურავი", tag: "discount", disc: 18 },
  { id: 61, name: "სახნავი რიდგი", en: "Ridge Cap 2m", desc: "Steel ridge capping strip for metal roofing. 2m length, colour-matched.", price: 12.00, stock: true, img: BASE+"Y3vfFJlDrcghphmFBOB7DimDviKjRA.jpg"+SZ, cat: "სახურავი", tag: null, disc: null },
];

function migrateOldCats(prods) {
  return prods.map(p => {
    if (OLD_HOGERT_CATS.includes(p.cat)) return { ...p, cat: HOEGERT_NAME };
    return p;
  });
}

export function getStoredProducts() {
  try {
    const s = localStorage.getItem('mgp_products');
    const prods = s ? JSON.parse(s) : defaultProducts;
    return migrateOldCats(prods).map(p => ({
      ...p,
      images: (p.images || []).map(fixStorageUrl),
      img: fixStorageUrl(p.img) || null,
    }));
  } catch { return defaultProducts; }
}

export function saveProducts(prods) {
  localStorage.setItem('mgp_products', JSON.stringify(prods));
  saveProductsToDB(prods).catch(() => {});
}

export function getCatSettings() {
  try { return JSON.parse(localStorage.getItem('mgp_cat_settings') || '{}'); }
  catch { return {}; }
}

export function saveCatSettings(s) {
  localStorage.setItem('mgp_cat_settings', JSON.stringify(s));
}

export function logActivity(user, action, details) {
  try {
    const log = JSON.parse(localStorage.getItem('mgp_activity') || '[]');
    log.unshift({ id: Date.now(), ts: new Date().toISOString(), user, action, details });
    localStorage.setItem('mgp_activity', JSON.stringify(log.slice(0, 500)));
  } catch {}
}

export function getActivity() {
  try { return JSON.parse(localStorage.getItem('mgp_activity') || '[]'); }
  catch { return []; }
}

export function getSEOSettings() {
  try { return JSON.parse(localStorage.getItem('mgp_seo') || '{}'); } catch { return {}; }
}
export function saveSEOSettings(s) { localStorage.setItem('mgp_seo', JSON.stringify(s)); saveSetting('mgp_seo', s).catch(() => {}); }

export function getSocialLinks() {
  try { return JSON.parse(localStorage.getItem('mgp_socials') || '{}'); } catch { return {}; }
}
export function saveSocialLinks(s) { localStorage.setItem('mgp_socials', JSON.stringify(s)); saveSetting('mgp_socials', s).catch(() => {}); }

export function getHomepageSliders() {
  try {
    const stored = localStorage.getItem('mgp_homepage_sliders');
    if (stored) return JSON.parse(stored);
  } catch {}
  return defaultCategories.slice(0, 6).map(c => c.name);
}
export function saveHomepageSliders(list) { localStorage.setItem('mgp_homepage_sliders', JSON.stringify(list)); saveSetting('mgp_homepage_sliders', list).catch(() => {}); }

export function getHeaderBanners() {
  try { return JSON.parse(localStorage.getItem('mgp_hbanners') || '[]'); } catch { return []; }
}
export function saveHeaderBanners(b) { localStorage.setItem('mgp_hbanners', JSON.stringify(b)); saveSetting('mgp_hbanners', b).catch(() => {}); }

export function getSliderConfig() {
  try { const s = localStorage.getItem('mgp_slider'); return s ? JSON.parse(s) : null; } catch { return null; }
}
export function saveSliderConfig(c) {
  if (!c || !c.length) localStorage.removeItem('mgp_slider');
  else localStorage.setItem('mgp_slider', JSON.stringify(c));
  saveSetting('mgp_slider', c && c.length ? c : null).catch(() => {});
}
export function getSliderDisabled() {
  return localStorage.getItem('mgp_slider_disabled') === '1';
}
export function setSliderDisabled(val) {
  if (val) localStorage.setItem('mgp_slider_disabled', '1');
  else localStorage.removeItem('mgp_slider_disabled');
  saveSetting('mgp_slider_disabled', val ? true : false).catch(() => {});
}

export function getCustomCategories() {
  try { return JSON.parse(localStorage.getItem('mgp_custom_cats') || '[]'); } catch { return []; }
}
export function saveCustomCategories(cats) { localStorage.setItem('mgp_custom_cats', JSON.stringify(cats)); saveSetting('mgp_custom_cats', cats).catch(() => {}); }

export function getSubcategories() {
  try { return JSON.parse(localStorage.getItem('mgp_subcats') || '[]'); } catch { return []; }
}
export function saveSubcategories(s) { localStorage.setItem('mgp_subcats', JSON.stringify(s)); saveSetting('mgp_subcats', s).catch(() => {}); }

const DEFAULT_BRAND_LOGOS = [
  { id: 1, src: '/crown.png', name: 'Crown' },
  { id: 2, src: '/gtv.png', name: 'GTV' },
  { id: 3, src: '/hoger.png', name: 'Hogert' },
];
export function getBrandLogos() {
  try {
    const stored = JSON.parse(localStorage.getItem('mgp_brand_logos') || 'null');
    return stored || DEFAULT_BRAND_LOGOS;
  } catch { return DEFAULT_BRAND_LOGOS; }
}
export function saveBrandLogos(logos) { localStorage.setItem('mgp_brand_logos', JSON.stringify(logos)); saveSetting('mgp_brand_logos', logos).catch(() => {}); }

export function getCategoryOverrides() {
  try { return JSON.parse(localStorage.getItem('mgp_cat_overrides') || '{}'); } catch { return {}; }
}
export function saveCategoryOverrides(o) { localStorage.setItem('mgp_cat_overrides', JSON.stringify(o)); saveSetting('mgp_cat_overrides', o).catch(() => {}); }

// Analytics: product views
export function trackProductView(id) {
  try {
    const views = JSON.parse(localStorage.getItem('mgp_views') || '{}');
    views[id] = (views[id] || 0) + 1;
    localStorage.setItem('mgp_views', JSON.stringify(views));
    saveSetting('mgp_views', views).catch(() => {});
  } catch {}
}
export function getProductViews() {
  try { return JSON.parse(localStorage.getItem('mgp_views') || '{}'); } catch { return {}; }
}

// Analytics: product sales
export function trackProductSales(cartItems) {
  try {
    const sales = JSON.parse(localStorage.getItem('mgp_sales') || '{}');
    cartItems.forEach(item => {
      sales[item.id] = (sales[item.id] || 0) + item.qty;
    });
    localStorage.setItem('mgp_sales', JSON.stringify(sales));
    saveSetting('mgp_sales', sales).catch(() => {});
  } catch {}
}
export function getProductSales() {
  try { return JSON.parse(localStorage.getItem('mgp_sales') || '{}'); } catch { return {}; }
}

// ── Customers ─────────────────────────────────────────────────────────────────
function getStoredCustomers() {
  try { return JSON.parse(localStorage.getItem('mgp_customers') || '[]'); } catch { return []; }
}
function saveCustomers(list) { localStorage.setItem('mgp_customers', JSON.stringify(list)); }

function authUserToCustomer(user) {
  const m = user.user_metadata || {};
  return { id: user.id, firstName: m.firstName || '', lastName: m.lastName || '', email: user.email, phone: m.phone || '', address: m.address || '', createdAt: user.created_at };
}

export async function registerCustomer({ firstName, lastName, email, phone, address, password }) {
  if (supabase) {
    const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { firstName, lastName, phone, address } } });
    if (error) return { error: error.message };
    if (!data.user) return { error: "Registration failed" };
    const { error: insertError } = await supabase.from('profiles').insert({ id: data.user.id, first_name: firstName, last_name: lastName, email, phone, address });
    if (insertError) return { error: `Profile save failed: ${insertError.message}` };
    const customer = authUserToCustomer(data.user);
    localStorage.setItem('mgp_current_customer', JSON.stringify(customer));
    return { customer };
  }
  const customers = getStoredCustomers();
  if (customers.find(c => c.email.toLowerCase() === email.toLowerCase())) return { error: "Email already registered" };
  const customer = { id: Date.now(), firstName, lastName, email, phone, address, password, createdAt: new Date().toISOString() };
  saveCustomers([...customers, customer]);
  localStorage.setItem('mgp_current_customer', JSON.stringify(customer));
  return { customer };
}

export async function loginCustomer(email, password) {
  if (supabase) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes('email not confirmed') || msg.includes('not confirmed')) {
        return { error: "Please confirm your email before signing in. Check your inbox for a confirmation link." };
      }
      return { error: error.message };
    }
    const customer = authUserToCustomer(data.user);
    localStorage.setItem('mgp_current_customer', JSON.stringify(customer));
    return { customer };
  }
  const customers = getStoredCustomers();
  const customer = customers.find(c => c.email.toLowerCase() === email.toLowerCase() && c.password === password);
  if (!customer) return { error: "Invalid email or password" };
  localStorage.setItem('mgp_current_customer', JSON.stringify(customer));
  return { customer };
}

export function getCurrentCustomer() {
  try {
    const raw = localStorage.getItem('mgp_current_customer');
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function logoutCustomer() {
  localStorage.removeItem('mgp_current_customer');
  if (supabase) supabase.auth.signOut();
}

export async function updateCustomer(updated) {
  localStorage.setItem('mgp_current_customer', JSON.stringify(updated));
  if (supabase) {
    await supabase.from('profiles').update({ first_name: updated.firstName, last_name: updated.lastName, phone: updated.phone || '', address: updated.address || '' }).eq('id', updated.id);
  } else {
    saveCustomers(getStoredCustomers().map(c => c.id === updated.id ? { ...c, ...updated } : c));
  }
}

export async function fetchCustomersFromDB() {
  if (supabase) {
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    return (data || []).map(r => ({ id: r.id, firstName: r.first_name, lastName: r.last_name, email: r.email, phone: r.phone, address: r.address, createdAt: r.created_at }));
  }
  return getStoredCustomers();
}

export async function deleteCustomer(id) {
  if (supabase) {
    await supabase.from('profiles').delete().eq('id', id);
    return;
  }
  saveCustomers(getStoredCustomers().filter(c => c.id !== id));
}

// ── Orders ────────────────────────────────────────────────────────────────────
export function getStoredOrders() {
  try { return JSON.parse(localStorage.getItem('mgp_orders') || '[]'); } catch { return []; }
}
export function saveOrder(order) {
  try {
    const orders = getStoredOrders();
    orders.unshift({ ...order, status: order.status || "pending" });
    localStorage.setItem('mgp_orders', JSON.stringify(orders.slice(0, 1000)));
  } catch {}
  if (supabase) supabase.from('orders').insert({
    order_number: order.orderNumber,
    customer_id: (order.customerId && /^\d+$/.test(String(order.customerId))) ? Number(order.customerId) : null,
    customer_name: order.customerName || null,
    phone: order.phone || null,
    email: order.email || null,
    address: order.address || null,
    items: order.items || [],
    total: order.total || 0,
    payment_method: order.paymentMethod || 'cash',
    status: order.status || 'pending',
    status_history: [],
    date: order.date || new Date().toISOString(),
  }).then(({ error }) => {
    if (error) console.error('[Supabase] Order insert failed:', JSON.stringify(error));
    else console.log('[Supabase] Order saved successfully');
  });
}

export function updateOrderStatus(orderNumber, status) {
  try {
    const orders = getStoredOrders();
    const updated = orders.map(o =>
      o.orderNumber === orderNumber
        ? { ...o, status, statusHistory: [...(o.statusHistory || []), { status, ts: new Date().toISOString() }] }
        : o
    );
    localStorage.setItem('mgp_orders', JSON.stringify(updated));
    if (supabase) supabase.from('orders').select('status_history').eq('order_number', orderNumber).single()
      .then(({ data }) => {
        const history = [...(data?.status_history || []), { status, ts: new Date().toISOString() }];
        return supabase.from('orders').update({ status, status_history: history }).eq('order_number', orderNumber);
      }).catch(() => {});
    return updated;
  } catch { return null; }
}

// ── Recently Viewed ───────────────────────────────────────────────────────────
export function getRecentlyViewed() {
  try { return JSON.parse(localStorage.getItem('mgp_recent_viewed') || '[]'); } catch { return []; }
}
export function addToRecentlyViewed(id) {
  try {
    const prev = getRecentlyViewed().filter(i => i !== id);
    localStorage.setItem('mgp_recent_viewed', JSON.stringify([id, ...prev].slice(0, 10)));
  } catch {}
}

// ── Wishlist ──────────────────────────────────────────────────────────────────
export function getWishlist(customerId) {
  try { return JSON.parse(localStorage.getItem(`mgp_wishlist_${customerId}`) || '[]'); } catch { return []; }
}
export function saveWishlist(customerId, ids) {
  localStorage.setItem(`mgp_wishlist_${customerId}`, JSON.stringify(ids));
}

// ── Stock decrement on order ──────────────────────────────────────────────────
export function decrementProductStock(cartItems) {
  const products = getStoredProducts();
  let changed = false;
  const updated = products.map(p => {
    const item = cartItems.find(i => i.id === p.id);
    if (!item || p.stockQty == null) return p;
    const newQty = Math.max(0, p.stockQty - item.qty);
    changed = true;
    return { ...p, stockQty: newQty, stock: newQty > 0 };
  });
  if (changed) saveProducts(updated);
  return updated;
}

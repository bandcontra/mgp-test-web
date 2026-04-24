import { useState, useRef, useEffect } from "react";
import supabase from "./supabase";
import {
  saveProducts, logActivity, getActivity, defaultCategories,
  getSEOSettings, saveSEOSettings,
  getHeaderBanners, saveHeaderBanners,
  getSliderConfig, saveSliderConfig, getSliderDisabled, setSliderDisabled,
  getCustomCategories, saveCustomCategories,
  getSubcategories, saveSubcategories,
  getBrandLogos, saveBrandLogos,
  getCategoryOverrides, saveCategoryOverrides,
  getProductViews, getProductSales,
  getStoredCustomers, saveCustomers,
  getStoredOrders, updateOrderStatus,
  getHomepageSliders, saveHomepageSliders,
  getSocialLinks, saveSocialLinks,
  deleteProductFromDB,
} from "./data";


// ─── Image resize ─────────────────────────────────────────────────────────────
// Resolution presets per context
const RES = {
  product:    { w: 800, h: 700, q: 0.82 },
  slider:     { w: 1200, h: 800, q: 0.85 },
  category:   { w: 600, h: 450, q: 0.80 },
  subcategory:{ w: 400, h: 400, q: 0.78 },
};
async function resizeImageFile(file, maxW = RES.product.w, maxH = RES.product.h, quality = 0.82) {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const ratio = Math.min(maxW / img.width, maxH / img.height, 1);
      const w = Math.round(img.width * ratio);
      const h = Math.round(img.height * ratio);
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      canvas.getContext("2d").drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      resolve({ dataUrl: canvas.toDataURL("image/jpeg", quality), w, h, origW: img.width, origH: img.height, resized: ratio < 1 });
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
    img.src = url;
  });
}

// ─── CatImageUploader (single image for category/subcategory) ─────────────────
function CatImageUploader({ img, onChange, compact }) {
  const fileRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [resizeInfo, setResizeInfo] = useState(null);

  const processFile = async (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    const res = compact ? RES.subcategory : RES.category;
    const result = await resizeImageFile(file, res.w, res.h, res.q);
    if (result) {
      onChange(result.dataUrl);
      setResizeInfo(result.resized ? `${result.origW}×${result.origH} → ${result.w}×${result.h}` : `${result.w}×${result.h} (no resize needed)`);
    }
  };

  if (img) {
    return (
      <div style={{ display: "inline-block" }}>
        <div style={{ position: "relative", display: "inline-block" }}>
          <img src={img} alt="" style={{ width: compact ? 52 : 80, height: compact ? 52 : 80, objectFit: "cover", borderRadius: 8, border: "1.5px solid #eee", display: "block" }} />
          <button onClick={() => { onChange(""); setResizeInfo(null); }}
            style={{ position: "absolute", top: -6, right: -6, width: 20, height: 20, borderRadius: "50%", background: "#E65C00", border: "none", color: "#fff", cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", padding: 0, lineHeight: 1, fontWeight: 700 }}>
            ×
          </button>
        </div>
        {resizeInfo && <div style={{ fontSize: 9, color: "#888", marginTop: 2, maxWidth: compact ? 52 : 80 }}>{resizeInfo}</div>}
      </div>
    );
  }

  return (
    <div>
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); processFile(e.dataTransfer.files[0]); }}
        onClick={() => fileRef.current?.click()}
        style={{ border: `2px dashed ${dragging ? "#E65C00" : "#ddd"}`, borderRadius: 8, padding: compact ? "8px 10px" : "14px 12px", textAlign: "center", cursor: "pointer", background: dragging ? "#FFF8F5" : "#fafafa", fontSize: 11, color: "#888" }}>
        {compact ? "Upload" : "Click or drop image"}
        <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => { processFile(e.target.files[0]); e.target.value = ""; }} />
      </div>
      {!compact && <div style={{ fontSize: 10, color: "#aaa", marginTop: 3 }}>Auto-resized to {RES.category.w}×{RES.category.h} px</div>}
    </div>
  );
}

// ─── ImageUploader ────────────────────────────────────────────────────────────
function ImageUploader({ images, onChange }) {
  const [dragging, setDragging] = useState(false);
  const [resizeLog, setResizeLog] = useState([]);
  const fileRef = useRef(null);

  const processFiles = async (files) => {
    const results = await Promise.all(
      Array.from(files).filter(f => f.type.startsWith("image/")).map(f => resizeImageFile(f, RES.product.w, RES.product.h, RES.product.q))
    );
    const valid = results.filter(Boolean);
    onChange([...images, ...valid.map(r => r.dataUrl)]);
    setResizeLog(valid.map(r => r.resized
      ? `${r.origW}×${r.origH} → auto-resized to ${r.w}×${r.h}`
      : `${r.w}×${r.h} (no resize needed)`
    ));
  };

  return (
    <div>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); processFiles(e.dataTransfer.files); }}
        onClick={() => fileRef.current?.click()}
        style={{
          border: `2px dashed ${dragging ? "#E65C00" : "#ddd"}`,
          borderRadius: 10, padding: "22px 16px", textAlign: "center",
          cursor: "pointer", background: dragging ? "#FFF8F5" : "#fafafa",
          transition: "all 0.2s", marginBottom: 4,
        }}
      >
        <div style={{ fontSize: 30, marginBottom: 6 }}>📁</div>
        <div style={{ fontSize: 13, color: "#555", fontWeight: 600 }}>Drag & drop images here</div>
        <div style={{ fontSize: 11, color: "#aaa", marginTop: 3 }}>or click to choose files · PNG, JPG, WebP</div>
        <div style={{ fontSize: 11, color: "#E65C00", marginTop: 2, fontWeight: 600 }}>
          Recommended: min 800×700 px — larger images are auto-resized to max {RES.product.w}×{RES.product.h}
        </div>
        <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: "none" }}
          onChange={(e) => { processFiles(e.target.files); e.target.value = ""; }} />
      </div>
      {resizeLog.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          {resizeLog.map((msg, i) => (
            <div key={i} style={{ fontSize: 10, color: "#888", padding: "1px 0" }}>Image {i + 1}: {msg}</div>
          ))}
        </div>
      )}
      {images.length > 0 && (
        <div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 6 }}>
            {images.map((src, i) => (
              <div key={i} style={{ position: "relative", width: 80, height: 80 }}>
                <img src={src} alt=""
                  style={{ width: 80, height: 80, objectFit: "cover", borderRadius: 8, border: i === 0 ? "2.5px solid #E65C00" : "1.5px solid #eee", cursor: i !== 0 ? "pointer" : "default", transition: "border 0.15s" }}
                  title={i !== 0 ? "Click to set as main image" : "Main image"}
                  onClick={() => {
                    if (i === 0) return;
                    const rest = images.filter((_, idx) => idx !== i);
                    onChange([src, ...rest]);
                  }} />
                <button
                  onClick={(e) => { e.stopPropagation(); onChange(images.filter((_, idx) => idx !== i)); }}
                  style={{ position: "absolute", top: -6, right: -6, width: 20, height: 20, borderRadius: "50%", background: "#E65C00", border: "none", color: "#fff", cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", padding: 0, lineHeight: 1 }}>
                  ×
                </button>
                {i === 0 ? (
                  <span style={{ position: "absolute", bottom: 2, left: 2, background: "rgba(230,92,0,0.85)", color: "#fff", fontSize: 8, padding: "1px 4px", borderRadius: 3, fontWeight: 700 }}>MAIN</span>
                ) : (
                  <span
                    onClick={(e) => { e.stopPropagation(); const rest = images.filter((_, idx) => idx !== i); onChange([src, ...rest]); }}
                    style={{ position: "absolute", bottom: 2, left: 2, background: "rgba(0,0,0,0.55)", color: "#fff", fontSize: 7, padding: "1px 3px", borderRadius: 3, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
                    SET MAIN
                  </span>
                )}
              </div>
            ))}
          </div>
          {images.length > 1 && (
            <div style={{ fontSize: 10, color: "#999" }}>Click a photo or "SET MAIN" to make it the main image.</div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── ProductModal ─────────────────────────────────────────────────────────────
const emptyProduct = { name: "", en: "", desc: "", details: "", specs: [], sku: "", barcode: "", price: "", stock: true, stockQty: null, packSize: null, images: [], cat: defaultCategories[0].name, tag: null, disc: null };
const inp = { width: "100%", padding: "8px 10px", border: "1.5px solid #ddd", borderRadius: 8, fontSize: 13, outline: "none", boxSizing: "border-box", fontFamily: "inherit" };

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#555", marginBottom: 4 }}>{label}</label>
      {children}
    </div>
  );
}

function ProductModal({ prod, onSave, onClose, nextId, allCategories, subcategories }) {
  const initImages = prod ? (prod.images || []) : [];
  const autoSku = `MGP-${String(nextId).padStart(4, "0")}`;
  const [form, setForm] = useState(prod
    ? { ...prod, images: initImages, price: String(prod.oldPrice != null ? prod.oldPrice : (prod.price ?? "")) }
    : { ...emptyProduct, id: nextId, sku: autoSku });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const catSubs = subcategories ? subcategories.filter(s => s.parentName === form.cat) : [];

  return (
    <>
      <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 400 }} onClick={onClose} />
      <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", background: "#fff", borderRadius: 14, padding: "1.75rem", width: "min(560px, 95vw)", zIndex: 401, maxHeight: "92vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>{prod ? "Edit Product" : "Add Product"}</h3>
          <button onClick={onClose} style={{ background: "#f0f0f0", border: "none", borderRadius: 8, width: 32, height: 32, fontSize: 18, cursor: "pointer" }}>×</button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="SKU / Article Code">
            <input style={inp} value={form.sku || ""} onChange={e => set("sku", e.target.value)} placeholder="e.g. MGP-0001" />
          </Field>
          <Field label="Barcode">
            <input style={inp} value={form.barcode || ""} onChange={e => set("barcode", e.target.value)} placeholder="e.g. 6594119544448" />
          </Field>
        </div>
        <Field label="Georgian Name *"><input style={inp} value={form.name} onChange={e => set("name", e.target.value)} /></Field>
        <Field label="English Name"><input style={inp} value={form.en || ""} onChange={e => set("en", e.target.value)} /></Field>
        <Field label="Short Description (shown on card hover)"><textarea style={{ ...inp, height: 60, resize: "vertical" }} value={form.desc || ""} onChange={e => set("desc", e.target.value)} /></Field>
        <Field label="Full Details (plain text, shown below specs on product page)"><textarea style={{ ...inp, height: 80, resize: "vertical" }} placeholder="Detailed product information..." value={form.details || ""} onChange={e => set("details", e.target.value)} /></Field>
        <Field label="Specifications (label + value rows, shown as table on product page)">
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {(form.specs || []).map((spec, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 6, alignItems: "center" }}>
                <input style={{ ...inp, fontSize: 12 }} placeholder="Label (e.g. Brand)" value={spec.label} onChange={e => { const s = [...(form.specs||[])]; s[i] = { ...s[i], label: e.target.value }; set("specs", s); }} />
                <input style={{ ...inp, fontSize: 12 }} placeholder="Value (e.g. HOEGERT)" value={spec.value} onChange={e => { const s = [...(form.specs||[])]; s[i] = { ...s[i], value: e.target.value }; set("specs", s); }} />
                <button onClick={() => set("specs", (form.specs||[]).filter((_, idx) => idx !== i))} style={{ width: 28, height: 28, border: "none", background: "#fee2e2", borderRadius: 6, cursor: "pointer", color: "#dc2626", fontSize: 16, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
              </div>
            ))}
            <button onClick={() => set("specs", [...(form.specs||[]), { label: "", value: "" }])} style={{ padding: "7px 0", border: "1.5px dashed #ddd", borderRadius: 8, background: "#fafafa", cursor: "pointer", fontSize: 12, color: "#E65C00", fontWeight: 600 }}>+ Add Specification Row</button>
          </div>
        </Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Base Price (₾)"><input style={inp} type="number" step="0.01" min="0" placeholder="0.00" value={form.price ?? ""} onChange={e => set("price", e.target.value)} /></Field>
          <Field label="Discount %"><input style={inp} type="number" min="0" max="99" placeholder="e.g. 20 (optional)" value={form.disc || ""} onChange={e => set("disc", e.target.value ? parseInt(e.target.value) : null)} /></Field>
        </div>
        {form.disc > 0 && parseFloat(form.price) > 0 && (
          <div style={{ marginBottom: 12, padding: "10px 14px", background: "#FFF7F0", border: "1.5px solid #E65C00", borderRadius: 8, display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 12, color: "#888" }}>Final price after {form.disc}% off:</span>
            <span style={{ fontSize: 15, fontWeight: 700, color: "#E65C00" }}>₾{(parseFloat(form.price) * (1 - form.disc / 100)).toFixed(2)}</span>
            <span style={{ fontSize: 12, color: "#bbb", textDecoration: "line-through" }}>₾{parseFloat(form.price).toFixed(2)}</span>
          </div>
        )}
        <Field label="Tag">
          <select style={{ ...inp, width: "50%" }} value={form.tag || ""} onChange={e => set("tag", e.target.value || null)}>
            <option value="">None</option>
            <option value="new">New</option>
            <option value="hot">Hot</option>
            <option value="discount">Discount</option>
          </select>
        </Field>
        <Field label="Category">
          <select style={inp} value={form.cat} onChange={e => { set("cat", e.target.value); set("subcat", null); }}>
            {(allCategories || defaultCategories).map(c => <option key={c.name} value={c.name}>{c.en} ({c.name})</option>)}
          </select>
        </Field>
        {catSubs.length > 0 && (
          <Field label="Sub-category">
            <select style={inp} value={form.subcat || ""} onChange={e => set("subcat", e.target.value || null)}>
              <option value="">None</option>
              {catSubs.map(s => <option key={s.id} value={s.id}>{s.icon ? s.icon + " " : ""}{s.name}{s.en ? ` (${s.en})` : ""}</option>)}
            </select>
          </Field>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="In Stock">
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", paddingTop: 6 }}>
              <input type="checkbox" checked={form.stock} onChange={e => set("stock", e.target.checked)} style={{ width: 16, height: 16 }} />
              <span style={{ fontSize: 13 }}>Available</span>
            </label>
          </Field>
          <Field label="Stock Quantity (blank = unlimited)">
            <input style={inp} type="number" min="0" placeholder="e.g. 50"
              value={form.stockQty ?? ""}
              onChange={e => set("stockQty", e.target.value === "" ? null : parseInt(e.target.value) || 0)} />
          </Field>
        </div>
        <Field label="Pack Size — pcs per box (blank = sold individually). Price above is per piece.">
          <input style={{ ...inp, width: "50%" }} type="number" min="1" placeholder="e.g. 300"
            value={form.packSize ?? ""}
            onChange={e => set("packSize", e.target.value === "" ? null : parseInt(e.target.value) || null)} />
        </Field>
        {form.packSize > 0 && parseFloat(form.price) > 0 && (
          <div style={{ marginBottom: 12, padding: "10px 14px", background: "#EFF6FF", border: "1.5px solid #BFDBFE", borderRadius: 8, display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 12, color: "#555" }}>Box price ({form.packSize} pcs × ₾{parseFloat(form.price) * (1 - (form.disc || 0) / 100)}):</span>
            <span style={{ fontSize: 15, fontWeight: 700, color: "#1E3A5F" }}>₾{(parseFloat(form.price) * (1 - (form.disc || 0) / 100) * form.packSize).toFixed(2)}</span>
          </div>
        )}
        <Field label="Product Images (drag & drop or click to upload — add as many as you want)">
          {prod && prod.img && !prod.img.startsWith("data:") && (form.images || []).length === 0 && (
            <div style={{ fontSize: 11, color: "#888", marginBottom: 8, padding: "6px 10px", background: "#f8f8f8", borderRadius: 6 }}>
              Existing image: URL-based. Upload new images below to replace.
            </div>
          )}
          <ImageUploader images={form.images || []} onChange={imgs => set("images", imgs)} />
        </Field>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
          <button onClick={onClose} style={{ padding: "9px 20px", border: "1.5px solid #ddd", borderRadius: 9, background: "#fff", cursor: "pointer", fontSize: 13 }}>Cancel</button>
          <button onClick={() => {
            if (!form.name.trim()) return;
            const base = parseFloat(form.price) || 0;
            const disc = form.disc ? parseInt(form.disc) : null;
            const finalPrice = disc ? parseFloat((base * (1 - disc / 100)).toFixed(2)) : base;
            onSave({ ...form, price: finalPrice, oldPrice: disc ? base : null });
          }} style={{ padding: "9px 24px", border: "none", borderRadius: 9, background: "#E65C00", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 700 }}>Save</button>
        </div>
      </div>
    </>
  );
}

// ─── CSV Import ───────────────────────────────────────────────────────────────
function parseCSV(text) {
  // Strip BOM and normalize line endings
  const clean = text.replace(/^\uFEFF/, "").trim();
  const lines = clean.split(/\r?\n/);
  if (lines.length < 2) return [];
  // Auto-detect delimiter: semicolon or comma
  const delim = lines[0].includes(";") ? ";" : ",";
  const headers = lines[0].split(delim).map(h => h.trim().toLowerCase().replace(/[^a-z0-9]/g, ""));
  return lines.slice(1).map(line => {
    const cols = [];
    let cur = "", inQ = false;
    for (let c of line) {
      if (c === '"') { inQ = !inQ; }
      else if (c === delim && !inQ) { cols.push(cur); cur = ""; }
      else cur += c;
    }
    cols.push(cur);
    const obj = {};
    headers.forEach((h, i) => { obj[h] = (cols[i] || "").trim().replace(/^"|"$/g, ""); });
    return obj;
  }).filter(r => r.name);
}

function CSVImportModal({ onClose, onImport, nextId, allCategories }) {
  const [csvText, setCsvText] = useState("");
  const [preview, setPreview] = useState([]);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef(null);

  const processText = (text) => {
    setCsvText(text);
    setError("");
    try {
      const rows = parseCSV(text);
      if (!rows.length) { setError("No valid rows found. Check your CSV format."); setPreview([]); return; }
      setPreview(rows.slice(0, 5));
    } catch { setError("Failed to parse CSV."); setPreview([]); }
  };

  const readFile = (f) => {
    if (!f) return;
    const reader = new FileReader();
    reader.onload = ev => processText(ev.target.result);
    reader.readAsText(f);
  };

  const handleFile = (e) => {
    readFile(e.target.files[0]);
    e.target.value = "";
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) readFile(f);
  };

  const handleImport = () => {
    const rows = parseCSV(csvText);
    if (!rows.length) { setError("Nothing to import."); return; }
    const catNames = (allCategories || []).map(c => c.name);
    const imported = rows.map((r, i) => ({
      id: nextId + i,
      name: r.name || "",
      en: r.en || "",
      desc: r.desc || r["description"] || "",
      details: r.details || "",
      specs: [],
      sku: r.sku || "",
      barcode: r.barcode || "",
      price: parseFloat(r.price) || 0,
      oldPrice: parseFloat(r.oldprice || r["old_price"]) || null,
      stock: r.stock !== "false" && r.stock !== "0",
      stockQty: (r.stockqty || r["stock_qty"]) ? parseInt(r.stockqty || r["stock_qty"]) || null : null,
      cat: catNames.includes(r.cat) ? r.cat : (allCategories?.[0]?.name || ""),
      tag: ["new","hot","discount"].includes(r.tag) ? r.tag : null,
      disc: parseInt(r.disc || r["discount"]) || null,
      packSize: parseInt(r.packsize || r["pack_size"]) || null,
      images: [],
      img: r.img || r.image || null,
    }));
    onImport(imported);
  };

  const sampleCSV = `BARCODE;NAME;SKU;CAT;PRICE;STOCKQTY
5468794587;პროდუქტი;ht5k505;hogert;2;5500`;

  return (
    <>
      <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 400 }} onClick={onClose} />
      <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", background: "#fff", borderRadius: 14, padding: "1.75rem", width: "min(640px, 95vw)", zIndex: 401, maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>CSV Bulk Import</h3>
          <button onClick={onClose} style={{ background: "#f0f0f0", border: "none", borderRadius: 8, width: 32, height: 32, fontSize: 18, cursor: "pointer" }}>×</button>
        </div>
        <div style={{ background: "#f8f8f8", borderRadius: 10, padding: "12px 14px", marginBottom: 14, fontSize: 12, color: "#555" }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Columns: <code>BARCODE;NAME;SKU;CAT;PRICE;STOCKQTY</code> — semicolon-separated. Column names are case-insensitive.</div>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>Sample CSV:</div>
          <pre style={{ margin: 0, fontSize: 11, overflowX: "auto", background: "#efefef", padding: "6px 8px", borderRadius: 6 }}>{sampleCSV}</pre>
        </div>
        <input ref={fileRef} type="file" accept=".csv,text/csv" style={{ display: "none" }} onChange={handleFile} />
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => !csvText && fileRef.current?.click()}
          style={{ border: `2px dashed ${dragOver ? "#E65C00" : "#ddd"}`, borderRadius: 10, background: dragOver ? "#fff5ef" : "#fafafa", padding: "18px 16px", marginBottom: 12, textAlign: "center", cursor: csvText ? "default" : "pointer", transition: "all 0.15s" }}
        >
          {csvText ? (
            <textarea
              value={csvText}
              onChange={e => processText(e.target.value)}
              onClick={e => e.stopPropagation()}
              style={{ width: "100%", height: 100, padding: "8px 10px", border: "1px solid #e0e0e0", borderRadius: 7, fontSize: 12, fontFamily: "monospace", resize: "vertical", boxSizing: "border-box", outline: "none", background: "#fff" }}
            />
          ) : (
            <>
              <div style={{ fontSize: 28, marginBottom: 6 }}>📂</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#444" }}>Drop CSV file here or click to browse</div>
              <div style={{ fontSize: 11, color: "#aaa", marginTop: 4 }}>Supports semicolon-separated CSV exported from Excel</div>
            </>
          )}
        </div>
        {csvText && (
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <button onClick={() => fileRef.current?.click()} style={{ padding: "6px 14px", background: "#E65C00", color: "#fff", border: "none", borderRadius: 7, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>📂 Change File</button>
            <button onClick={() => { setCsvText(""); setPreview([]); setError(""); }} style={{ padding: "6px 14px", background: "#f0f0f0", color: "#555", border: "none", borderRadius: 7, cursor: "pointer", fontSize: 12 }}>✕ Clear</button>
          </div>
        )}
        {error && <div style={{ color: "#dc2626", fontSize: 12, marginTop: 6 }}>{error}</div>}
        {preview.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#555", marginBottom: 6 }}>Preview (first {preview.length} rows):</div>
            <div style={{ background: "#f8f8f8", borderRadius: 8, overflow: "hidden", fontSize: 12 }}>
              {preview.map((r, i) => (
                <div key={i} style={{ display: "flex", gap: 10, padding: "6px 10px", borderBottom: i < preview.length - 1 ? "1px solid #eee" : "none" }}>
                  <span style={{ fontWeight: 700, minWidth: 130 }}>{r.name}</span>
                  <span style={{ color: "#888", minWidth: 130 }}>{r.en}</span>
                  <span style={{ color: "#E65C00", fontWeight: 700 }}>₾{r.price || "0"}</span>
                  <span style={{ color: "#888" }}>{r.cat}</span>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 12, color: "#888", marginTop: 6 }}>{parseCSV(csvText).length} total rows to import.</div>
          </div>
        )}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 16 }}>
          <button onClick={onClose} style={{ padding: "9px 20px", border: "1.5px solid #ddd", borderRadius: 9, background: "#fff", cursor: "pointer", fontSize: 13 }}>Cancel</button>
          <button onClick={handleImport} disabled={!preview.length} style={{ padding: "9px 24px", border: "none", borderRadius: 9, background: preview.length ? "#E65C00" : "#e0e0e0", color: preview.length ? "#fff" : "#aaa", cursor: preview.length ? "pointer" : "default", fontSize: 13, fontWeight: 700 }}>
            Import {parseCSV(csvText).length || 0} Products
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Products Tab ─────────────────────────────────────────────────────────────
function ProductsTab({ products, setProducts, allCategories, subcategories }) {
  const [editProd, setEditProd] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [csvOpen, setCsvOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const nextId = Math.max(0, ...products.map(p => p.id)) + 1;
  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.en && p.en.toLowerCase().includes(search.toLowerCase()))
  );

  const saveProd = (form) => {
    const updated = editProd
      ? products.map(p => p.id === form.id ? form : p)
      : [{ ...form, id: nextId }, ...products];
    setProducts(updated);
    saveProducts(updated);
    logActivity("admin", editProd ? "edit_product" : "add_product", form.name);
    setEditProd(null);
    setAddOpen(false);
  };

  const importCSV = (imported) => {
    const updated = [...imported, ...products];
    setProducts(updated);
    saveProducts(updated);
    logActivity("admin", "csv_import", `Imported ${imported.length} products`);
    setCsvOpen(false);
  };

  const exportCSV = () => {
    const header = "id,name,en,desc,price,oldPrice,cat,tag,disc,stock,stockQty,sku,barcode,packSize";
    const escape = (v) => {
      const s = v == null ? "" : String(v);
      return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const rows = products.map(p =>
      [p.id, p.name, p.en, p.desc, p.price, p.oldPrice ?? "", p.cat, p.tag ?? "", p.disc ?? "", p.stock, p.stockQty ?? "", p.sku ?? "", p.barcode ?? "", p.packSize ?? ""].map(escape).join(",")
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "products.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const deleteProd = (id) => {
    const updated = products.filter(p => p.id !== id);
    setProducts(updated);
    saveProducts(updated);
    deleteProductFromDB(id);
    logActivity("admin", "delete_product", products.find(p => p.id === id)?.name || id);
    setDeleteConfirm(null);
  };

  const getThumb = (p) => {
    if (p.images && p.images.length > 0) return p.images[0];
    return p.img || null;
  };

  return (
    <div>
      {(editProd || addOpen) && (
        <ProductModal prod={editProd} nextId={nextId} onSave={saveProd} onClose={() => { setEditProd(null); setAddOpen(false); }} allCategories={allCategories} subcategories={subcategories} />
      )}
      {csvOpen && (
        <CSVImportModal onClose={() => setCsvOpen(false)} onImport={importCSV} nextId={nextId} allCategories={allCategories} />
      )}
      {deleteConfirm && (
        <>
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 400 }} onClick={() => setDeleteConfirm(null)} />
          <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", background: "#fff", borderRadius: 14, padding: "1.75rem", zIndex: 401, width: 320, textAlign: "center" }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🗑️</div>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Delete product?</div>
            <div style={{ color: "#666", fontSize: 13, marginBottom: 20 }}>This cannot be undone.</div>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button onClick={() => setDeleteConfirm(null)} style={{ padding: "9px 20px", border: "1.5px solid #ddd", borderRadius: 9, background: "#fff", cursor: "pointer" }}>Cancel</button>
              <button onClick={() => deleteProd(deleteConfirm)} style={{ padding: "9px 20px", border: "none", borderRadius: 9, background: "#dc2626", color: "#fff", cursor: "pointer", fontWeight: 700 }}>Delete</button>
            </div>
          </div>
        </>
      )}
      <div style={{ display: "flex", gap: 12, marginBottom: "1.25rem", flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ background: "#fff", border: "1.5px solid #ececec", borderRadius: 10, padding: "10px 18px", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: "#FFF0E6", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#E65C00" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#1a1a1a", lineHeight: 1 }}>{products.length}</div>
            <div style={{ fontSize: 11, color: "#888", marginTop: 1 }}>Total Products</div>
          </div>
        </div>
        <input style={{ ...inp, flex: 1, minWidth: 200 }} placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)} />
        <button onClick={() => setAddOpen(true)} style={{ padding: "9px 20px", background: "#E65C00", color: "#fff", border: "none", borderRadius: 9, cursor: "pointer", fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
          + Add Product
        </button>
        <button onClick={() => setCsvOpen(true)} style={{ padding: "9px 16px", background: "#fff", color: "#E65C00", border: "1.5px solid #E65C00", borderRadius: 9, cursor: "pointer", fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
          📥 CSV Import
        </button>
        <button onClick={exportCSV} style={{ padding: "9px 16px", background: "#fff", color: "#555", border: "1.5px solid #ddd", borderRadius: 9, cursor: "pointer", fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
          📤 CSV Export
        </button>
      </div>
      <div style={{ background: "#fff", borderRadius: 12, border: "1.5px solid #ececec", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "#f8f8f8", borderBottom: "1.5px solid #ececec" }}>
              {["", "Name", "Category", "Price", "Stock", "Tag", "Actions"].map(h => (
                <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontWeight: 700, color: "#555", whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((p, i) => {
              const thumb = getThumb(p);
              const cat = defaultCategories.find(c => c.name === p.cat);
              return (
                <tr key={p.id} style={{ borderBottom: "1px solid #f5f5f5", background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                  <td style={{ padding: "8px 14px", width: 44 }}>
                    <div style={{ width: 42, height: 42, borderRadius: 8, overflow: "hidden", background: cat ? cat.bg : "#f0f0f0", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {thumb
                        ? <img src={thumb} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => { e.target.style.display = "none"; }} />
                        : <span style={{ fontSize: 18 }}>{cat ? cat.icon : "📦"}</span>}
                    </div>
                  </td>
                  <td style={{ padding: "8px 14px" }}>
                    <div style={{ fontWeight: 600, color: "#1a1a1a" }}>{p.name}</div>
                    {p.en && <div style={{ color: "#aaa", fontSize: 11 }}>{p.en}</div>}
                    {(p.images || []).length > 1 && <div style={{ fontSize: 10, color: "#E65C00", marginTop: 2 }}>{p.images.length} photos</div>}
                  </td>
                  <td style={{ padding: "8px 14px", color: "#666" }}>{cat ? cat.en : p.cat}</td>
                  <td style={{ padding: "8px 14px", fontWeight: 700, color: "#E65C00", whiteSpace: "nowrap" }}>
                    {p.price > 0 ? `₾${p.price.toFixed(2)}` : "—"}
                    {p.oldPrice && <div style={{ color: "#bbb", fontWeight: 400, fontSize: 11, textDecoration: "line-through" }}>₾{p.oldPrice.toFixed(2)}</div>}
                  </td>
                  <td style={{ padding: "8px 14px" }}>
                    <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 5, background: p.stock ? "#E1F5EE" : "#FEE2E2", color: p.stock ? "#065F46" : "#991B1B", fontWeight: 700 }}>
                      {p.stock ? "In Stock" : "Out"}
                    </span>
                    {p.stockQty != null && (
                      <div style={{ fontSize: 10, color: "#888", marginTop: 2 }}>{p.stockQty} units</div>
                    )}
                  </td>
                  <td style={{ padding: "8px 14px" }}>
                    {p.tag && <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 5, background: "#FEF3C7", color: "#92400E", fontWeight: 700 }}>{p.tag}</span>}
                    {p.disc && <span style={{ fontSize: 11, padding: "2px 6px", borderRadius: 5, background: "#FEE2E2", color: "#991B1B", fontWeight: 700, marginLeft: 4 }}>-{p.disc}%</span>}
                  </td>
                  <td style={{ padding: "8px 14px" }}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => setEditProd(p)} style={{ padding: "5px 12px", border: "1.5px solid #ddd", borderRadius: 7, background: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Edit</button>
                      <button onClick={() => setDeleteConfirm(p.id)} style={{ padding: "5px 12px", border: "1.5px solid #FEE2E2", borderRadius: 7, background: "#FEF2F2", color: "#dc2626", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Del</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && <div style={{ padding: "2rem", textAlign: "center", color: "#aaa" }}>No products found.</div>}
        <div style={{ padding: "8px 14px", fontSize: 11, color: "#aaa", borderTop: "1px solid #f5f5f5" }}>{filtered.length} products</div>
      </div>
    </div>
  );
}

// ─── Slider Tab ───────────────────────────────────────────────────────────────
function SliderTab({ products }) {
  const [config, setConfig] = useState(() => getSliderConfig() || []);
  const [disabled, setDisabledState] = useState(() => getSliderDisabled());
  const [productId, setProductId] = useState("");
  const [slideSearch, setSlideSearch] = useState("");
  const [slideDropOpen, setSlideDropOpen] = useState(false);
  const selStyle = { width: "100%", padding: "8px 10px", border: "1.5px solid #ddd", borderRadius: 8, fontSize: 13, outline: "none", background: "#fff" };

  const applyConfig = (next) => { setConfig(next); saveSliderConfig(next); };
  const toggleDisabled = () => { const next = !disabled; setDisabledState(next); setSliderDisabled(next); };
  const addSlide = () => { if (!productId) return; applyConfig([...config, { id: Date.now(), productId: parseInt(productId) }]); setProductId(""); setSlideSearch(""); setSlideDropOpen(false); };
  const slideMatches = slideSearch.trim().length > 0
    ? products.filter(p => p.name.toLowerCase().includes(slideSearch.toLowerCase()) || (p.en || "").toLowerCase().includes(slideSearch.toLowerCase()))
    : products;
  const removeSlide = (id) => applyConfig(config.filter(s => s.id !== id));

  const mode = disabled ? "disabled" : config.length > 0 ? "manual" : "empty";
  const modeColors = { empty: "#888", manual: "#16a34a", disabled: "#888" };
  const modeLabels = { empty: "Empty", manual: "Manual", disabled: "Disabled" };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700 }}>Homepage Slider</div>
          <div style={{ fontSize: 12, color: "#888", marginTop: 3 }}>Large banner shown at the top of the home page.</div>
        </div>
        <span style={{ padding: "4px 12px", borderRadius: 20, background: modeColors[mode] + "22", color: modeColors[mode], fontSize: 12, fontWeight: 700, border: `1.5px solid ${modeColors[mode]}55`, flexShrink: 0 }}>
          {modeLabels[mode]}
        </span>
      </div>

      {/* Mode explanation cards */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        {[
          { key: "manual", icon: "🎯", title: "Manual Mode", desc: "You choose exactly which products appear as slides. Add products below." },
          { key: "disabled", icon: "🚫", title: "Disable Slider", desc: "Hide the slider entirely from the home page." },
        ].map(m => (
          <div key={m.key} style={{ flex: "1 1 180px", border: `2px solid ${mode === m.key ? modeColors[m.key] : "#e8e8e8"}`, borderRadius: 10, padding: "12px 14px", background: mode === m.key ? modeColors[m.key] + "0d" : "#fafafa", cursor: "default" }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>{m.icon} {m.title}</div>
            <div style={{ fontSize: 12, color: "#666", lineHeight: 1.5 }}>{m.desc}</div>
          </div>
        ))}
      </div>

      {/* Disable toggle */}
      <div style={{ background: "#fff", borderRadius: 12, padding: "1rem 1.25rem", border: "1.5px solid #f0f0f0", marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>Disable Slider</div>
          <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>Hide the slider from the home page completely.</div>
        </div>
        <button onClick={toggleDisabled}
          style={{ padding: "7px 18px", background: disabled ? "#E65C00" : "#f0f0f0", border: "none", borderRadius: 8, color: disabled ? "#fff" : "#555", fontWeight: 700, cursor: "pointer", fontSize: 13, transition: "all 0.15s" }}>
          {disabled ? "Enable Slider" : "Disable Slider"}
        </button>
      </div>

      {!disabled && (
        <>
          <div style={{ background: "#fff", borderRadius: 12, padding: "1.25rem", border: "1.5px solid #f0f0f0", marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#333" }}>Manual Slides {config.length > 0 && <span style={{ color: "#888", fontWeight: 400 }}>({config.length} slide{config.length !== 1 ? "s" : ""})</span>}</div>
              {config.length > 0 && (
                <button onClick={() => applyConfig([])} style={{ padding: "5px 12px", border: "1.5px solid #ddd", borderRadius: 7, background: "#fff", cursor: "pointer", fontSize: 12, color: "#555" }}>Clear All</button>
              )}
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
              <div style={{ flex: 1, position: "relative" }}>
                <div style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>Add product as slide</div>
                <input
                  style={{ ...selStyle, cursor: "text" }}
                  placeholder="Search product by name..."
                  value={slideSearch}
                  onFocus={() => setSlideDropOpen(true)}
                  onBlur={() => setTimeout(() => setSlideDropOpen(false), 150)}
                  onChange={e => { setSlideSearch(e.target.value); setProductId(""); setSlideDropOpen(true); }}
                />
                {productId && (() => { const sel = products.find(p => p.id === parseInt(productId)); return sel ? (
                  <div style={{ marginTop: 4, padding: "5px 10px", background: "#FFF7F0", border: "1.5px solid #E65C00", borderRadius: 7, fontSize: 12, color: "#E65C00", fontWeight: 600 }}>
                    ✓ {sel.name}{sel.en ? ` (${sel.en})` : ""}
                  </div>
                ) : null; })()}
                {slideDropOpen && (
                  <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#fff", border: "1.5px solid #ddd", borderRadius: 8, zIndex: 300, maxHeight: 220, overflowY: "auto", boxShadow: "0 4px 16px rgba(0,0,0,0.12)", marginTop: 2 }}>
                    {slideMatches.length === 0 && (
                      <div style={{ padding: "10px 12px", fontSize: 12, color: "#aaa" }}>No products found</div>
                    )}
                    {slideMatches.map(p => (
                      <div key={p.id}
                        onMouseDown={() => { setProductId(String(p.id)); setSlideSearch(p.name + (p.en ? ` (${p.en})` : "")); setSlideDropOpen(false); }}
                        style={{ padding: "8px 12px", fontSize: 13, cursor: "pointer", borderBottom: "1px solid #f5f5f5", background: parseInt(productId) === p.id ? "#FFF7F0" : "#fff", color: parseInt(productId) === p.id ? "#E65C00" : "#222" }}
                        onMouseEnter={e => { e.currentTarget.style.background = "#FFF7F0"; }}
                        onMouseLeave={e => { e.currentTarget.style.background = parseInt(productId) === p.id ? "#FFF7F0" : "#fff"; }}>
                        <span style={{ fontWeight: 600 }}>{p.name}</span>
                        {p.en && <span style={{ color: "#888", fontSize: 12 }}> — {p.en}</span>}
                        {p.price > 0 && <span style={{ float: "right", color: "#E65C00", fontSize: 12, fontWeight: 700 }}>₾{p.price.toFixed(2)}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <button onClick={addSlide} disabled={!productId}
                style={{ padding: "9px 20px", background: productId ? "#E65C00" : "#e0e0e0", border: "none", borderRadius: 8, color: productId ? "#fff" : "#aaa", fontWeight: 700, cursor: productId ? "pointer" : "default", fontSize: 13, whiteSpace: "nowrap" }}>
                + Add Slide
              </button>
            </div>
          </div>

          {config.length === 0 ? (
            <div style={{ textAlign: "center", padding: "2rem", color: "#888", background: "#f8f8f8", borderRadius: 12, fontSize: 13, border: "1.5px dashed #ddd" }}>
              <div style={{ fontSize: 22, marginBottom: 8 }}>🖼️</div>
              <div style={{ fontWeight: 600, color: "#555", marginBottom: 4 }}>No slides configured</div>
              <div>Select a product above and click "+ Add Slide" to add it to the slider.</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {config.map((slide, i) => {
                const p = products.find(pr => pr.id === (slide.productId || slide.leftId));
                const thumb = p && ((p.images && p.images[0]) || p.img);
                return (
                  <div key={slide.id} style={{ background: "#fff", border: "1.5px solid #f0f0f0", borderRadius: 10, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ color: "#ccc", fontSize: 13, fontWeight: 700, width: 24, flexShrink: 0 }}>#{i + 1}</span>
                    <div style={{ width: 52, height: 52, borderRadius: 8, overflow: "hidden", flexShrink: 0, background: "#f0f0f0", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {thumb ? <img src={thumb} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => { e.target.style.display = "none"; }} /> : <span style={{ fontSize: 22, color: "#ccc" }}>?</span>}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p ? p.name : <span style={{ color: "#ccc" }}>Not found</span>}</div>
                      {p && p.price > 0 && <div style={{ fontSize: 11, color: "#E65C00" }}>₾{p.price.toFixed(2)}</div>}
                    </div>
                    <button onClick={() => removeSlide(slide.id)} style={{ padding: "5px 12px", border: "1.5px solid #FEE2E2", borderRadius: 7, background: "#FEF2F2", color: "#dc2626", cursor: "pointer", fontSize: 12, fontWeight: 600, flexShrink: 0 }}>Remove</button>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Banners Tab ──────────────────────────────────────────────────────────────
function BannersTab() {
  const [banners, setBanners] = useState(() => getHeaderBanners());

  const save = (next) => { setBanners(next); saveHeaderBanners(next); };
  const addBanner = () => save([...banners, { id: Date.now(), text: "🔥 Special offer — check our latest products!", bgColor: "#1a1a1a", textColor: "#ffffff", enabled: true }]);
  const remove = (id) => save(banners.filter(b => b.id !== id));
  const update = (id, key, val) => save(banners.map(b => b.id === id ? { ...b, [key]: val } : b));

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700 }}>Header Banners</div>
          <div style={{ fontSize: 12, color: "#888", marginTop: 3 }}>Announcement strips shown above the navigation bar. Multiple banners cycle automatically.</div>
        </div>
        <button onClick={addBanner} style={{ padding: "8px 16px", background: "#E65C00", border: "none", borderRadius: 8, color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 13, flexShrink: 0 }}>
          + Add Banner
        </button>
      </div>

      {banners.length === 0 ? (
        <div style={{ textAlign: "center", padding: "2.5rem", color: "#888", background: "#f8f8f8", borderRadius: 12, fontSize: 13 }}>
          No banners configured
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {banners.map(b => (
            <div key={b.id} style={{ background: "#fff", border: "1.5px solid #f0f0f0", borderRadius: 10, overflow: "hidden" }}>
              <div style={{ background: b.bgColor, color: b.textColor, textAlign: "center", padding: "9px 16px", fontSize: 13, fontWeight: 500, opacity: b.enabled ? 1 : 0.4 }}>
                {b.text || "(empty banner)"}
              </div>
              <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
                <div>
                  <div style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>Banner Text</div>
                  <input style={{ ...inp }} value={b.text} onChange={e => update(b.id, "text", e.target.value)} placeholder="e.g. Free delivery on orders over ₾200" />
                </div>
                <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>Background color</div>
                    <input type="color" value={b.bgColor} onChange={e => update(b.id, "bgColor", e.target.value)}
                      style={{ width: 44, height: 32, border: "1.5px solid #ddd", borderRadius: 6, cursor: "pointer", padding: 2 }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>Text color</div>
                    <input type="color" value={b.textColor} onChange={e => update(b.id, "textColor", e.target.value)}
                      style={{ width: 44, height: 32, border: "1.5px solid #ddd", borderRadius: 6, cursor: "pointer", padding: 2 }} />
                  </div>
                  <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 13, color: "#555", marginTop: 14 }}>
                    <input type="checkbox" checked={b.enabled} onChange={e => update(b.id, "enabled", e.target.checked)} />
                    Enabled
                  </label>
                  <button onClick={() => remove(b.id)} style={{ marginTop: 14, marginLeft: "auto", padding: "5px 12px", border: "1.5px solid #FEE2E2", borderRadius: 7, background: "#FEF2F2", color: "#dc2626", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Homepage Sliders Tab ─────────────────────────────────────────────────────
function HomepageSlidersTab({ allCategories }) {
  const [enabled, setEnabled] = useState(() => getHomepageSliders());
  const [saved, setSaved] = useState(false);

  const toggle = name => {
    setEnabled(prev =>
      prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
    );
    setSaved(false);
  };

  const handleSave = () => {
    saveHomepageSliders(enabled);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const inp = { width: "100%", padding: "9px 12px", border: "1.5px solid #ddd", borderRadius: 8, fontSize: 14, outline: "none", fontFamily: "inherit" };

  return (
    <div style={{ maxWidth: 560 }}>
      <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>Homepage Category Sliders</div>
      <div style={{ fontSize: 13, color: "#888", marginBottom: 20 }}>Choose which categories appear as product sliders on the home page. The browse sidebar and category grid are not affected.</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
        {allCategories.map(cat => {
          const on = enabled.includes(cat.name);
          return (
            <div key={cat.name} onClick={() => toggle(cat.name)}
              style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 16px", borderRadius: 10, border: `1.5px solid ${on ? "#E65C00" : "#e8e8e8"}`, background: on ? "#FFF8F5" : "#fff", cursor: "pointer", transition: "all 0.15s" }}>
              <div style={{ width: 20, height: 20, borderRadius: 5, border: `2px solid ${on ? "#E65C00" : "#ccc"}`, background: on ? "#E65C00" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {on && <span style={{ color: "#fff", fontSize: 12, fontWeight: 900, lineHeight: 1 }}>✓</span>}
              </div>
              <span style={{ fontSize: 18 }}>{cat.icon || "📦"}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#1a1a1a" }}>{cat.name}</div>
                <div style={{ fontSize: 11, color: "#aaa" }}>{cat.en}</div>
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: on ? "#E65C00" : "#bbb" }}>{on ? "SHOWN" : "HIDDEN"}</div>
            </div>
          );
        })}
      </div>
      <button onClick={handleSave} style={{ background: "#E65C00", color: "#fff", border: "none", borderRadius: 9, padding: "11px 28px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
        {saved ? "✓ Saved!" : "Save"}
      </button>
    </div>
  );
}

// ─── Socials Tab ──────────────────────────────────────────────────────────────
function SocialsTab() {
  const [s, setS] = useState(() => getSocialLinks());
  const [saved, setSaved] = useState(false);
  const inp = { width: "100%", padding: "9px 12px", border: "1.5px solid #ddd", borderRadius: 8, fontSize: 14, outline: "none", fontFamily: "inherit", boxSizing: "border-box" };
  const set = (k, v) => { setS(p => ({ ...p, [k]: v })); setSaved(false); };

  const handleSave = () => { saveSocialLinks(s); setSaved(true); setTimeout(() => setSaved(false), 2000); };

  return (
    <div style={{ maxWidth: 520 }}>
      <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Social Media Links</div>
      <div style={{ fontSize: 13, color: "#888", marginBottom: 24 }}>These appear in the site header and on the contact page.</div>
      {[
        { key: "facebook", label: "Facebook URL", placeholder: "https://www.facebook.com/yourpage", icon: "📘" },
        { key: "instagram", label: "Instagram URL", placeholder: "https://www.instagram.com/yourhandle", icon: "📸" },
        { key: "whatsapp", label: "WhatsApp Number", placeholder: "+995599000000", icon: "💬" },
      ].map(({ key, label, placeholder, icon }) => (
        <div key={key} style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#555", marginBottom: 6 }}>{icon} {label}</div>
          <input style={inp} value={s[key] || ""} onChange={e => set(key, e.target.value)} placeholder={placeholder} />
        </div>
      ))}
      <button onClick={handleSave} style={{ background: "#E65C00", color: "#fff", border: "none", borderRadius: 9, padding: "11px 28px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
        {saved ? "✓ Saved!" : "Save"}
      </button>
    </div>
  );
}

// ─── SEO Tab ──────────────────────────────────────────────────────────────────
function SEOTab() {
  const [seo, setSEO] = useState(() => getSEOSettings());
  const [saved, setSaved] = useState(false);

  const save = () => {
    saveSEOSettings(seo);
    if (seo.title) document.title = seo.title;
    const setMeta = (name, content) => {
      if (!content) return;
      let el = document.querySelector(`meta[name="${name}"]`);
      if (!el) { el = document.createElement("meta"); el.name = name; document.head.appendChild(el); }
      el.content = content;
    };
    setMeta("description", seo.description);
    setMeta("keywords", seo.keywords);
    setSaved(true);
    setTimeout(() => setSaved(false), 2200);
  };

  return (
    <div style={{ maxWidth: 580 }}>
      <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 20 }}>SEO Settings</div>
      <div style={{ background: "#fff", borderRadius: 12, padding: "1.5rem", border: "1.5px solid #f0f0f0", display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#555", marginBottom: 6 }}>Page Title</div>
          <input style={inp} value={seo.title || ""} onChange={e => setSEO(s => ({ ...s, title: e.target.value }))} placeholder="Master Group – Building Materials Tbilisi" />
          <div style={{ fontSize: 11, color: "#aaa", marginTop: 4 }}>Shown in browser tab and search results · 50–60 characters recommended</div>
        </div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#555", marginBottom: 6 }}>Meta Description</div>
          <textarea style={{ ...inp, height: 80, resize: "vertical" }} value={seo.description || ""}
            onChange={e => setSEO(s => ({ ...s, description: e.target.value }))}
            placeholder="High-quality building materials, tools, and supplies. Fasteners, paints, roofing, plumbing and more in Tbilisi." />
          <div style={{ fontSize: 11, color: "#aaa", marginTop: 4 }}>Shown in search results · 120–158 characters recommended</div>
        </div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#555", marginBottom: 6 }}>Keywords</div>
          <input style={inp} value={seo.keywords || ""} onChange={e => setSEO(s => ({ ...s, keywords: e.target.value }))}
            placeholder="building materials, tools, fasteners, cement, roofing, tbilisi, georgia" />
          <div style={{ fontSize: 11, color: "#aaa", marginTop: 4 }}>Comma-separated keywords for search engines</div>
        </div>
        <button onClick={save} style={{ alignSelf: "flex-start", padding: "10px 28px", background: saved ? "#10b981" : "#E65C00", border: "none", borderRadius: 9, color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 13, transition: "background 0.25s" }}>
          {saved ? "✓ Saved!" : "Save SEO Settings"}
        </button>
      </div>
    </div>
  );
}

// ─── Categories Tab ───────────────────────────────────────────────────────────
const CAT_ICONS = ["🔩","⚙️","🔧","⚡","🦺","🏠","🎨","💧","🏗️","🚪","🧱","⛺","🪛","🪚","🔨","🪝","🗜️","🔑","🪟","🛠️","📦","🏭","🔌","💡","🌡️"];

function CategoriesTab({ onConfigChange }) {
  const [customCats, setCustomCats] = useState(() => getCustomCategories());
  const [subcats, setSubcats] = useState(() => getSubcategories());
  const [catOverrides, setCatOverridesLocal] = useState(() => getCategoryOverrides());
  const [showAddCat, setShowAddCat] = useState(false);
  const [addSubFor, setAddSubFor] = useState(null);
  const [editingCat, setEditingCat] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [newCat, setNewCat] = useState({ name: "", en: "", ru: "", icon: "📦", color: "#555555", bg: "#f5f5f5", img: "" });
  const [newSub, setNewSub] = useState({ name: "", en: "", icon: "", img: "" });

  const saveOverrides = (next) => {
    setCatOverridesLocal(next);
    saveCategoryOverrides(next);
    onConfigChange?.();
  };

  const startEditCat = (cat) => {
    const ov = catOverrides[cat.name] || {};
    setEditForm({ name: ov.name || cat.name, en: ov.en || cat.en, ru: ov.ru || cat.ru || "", icon: ov.icon !== undefined ? ov.icon : cat.icon, color: ov.color || cat.color, bg: ov.bg || cat.bg, img: ov.img !== undefined ? ov.img : (cat.img || "") });
    setEditingCat(cat.name);
  };

  const saveEditCat = () => {
    saveOverrides({ ...catOverrides, [editingCat]: { ...(catOverrides[editingCat] || {}), ...editForm } });
    setEditingCat(null);
  };

  const toggleHideCat = (catName) => {
    const cur = catOverrides[catName] || {};
    saveOverrides({ ...catOverrides, [catName]: { ...cur, hidden: !cur.hidden } });
  };

  const deleteDefaultCat = (name) => {
    saveOverrides({ ...catOverrides, [name]: { ...(catOverrides[name] || {}), deleted: true, hidden: true } });
  };

  const allCats = [...customCats, ...defaultCategories.filter(d => !catOverrides[d.name]?.deleted)];

  const saveCat = () => {
    if (!newCat.name.trim() || !newCat.en.trim()) return;
    const updated = [{ ...newCat, id: Date.now() }, ...customCats];
    setCustomCats(updated);
    saveCustomCategories(updated);
    setNewCat({ name: "", en: "", ru: "", icon: "📦", color: "#555555", bg: "#f5f5f5", img: "" });
    setShowAddCat(false);
    onConfigChange?.();
  };

  const deleteCat = (id) => {
    const updated = customCats.filter(c => c.id !== id);
    setCustomCats(updated);
    saveCustomCategories(updated);
    const updatedSubs = subcats.filter(s => {
      const cat = customCats.find(c => c.id === id);
      return !cat || s.parentName !== cat.name;
    });
    setSubcats(updatedSubs);
    saveSubcategories(updatedSubs);
    onConfigChange?.();
  };

  const saveSub = (parentName) => {
    if (!newSub.name.trim()) return;
    const updated = [...subcats, { ...newSub, id: Date.now().toString(), parentName }];
    setSubcats(updated);
    saveSubcategories(updated);
    setNewSub({ name: "", en: "", icon: "", img: "" });
    setAddSubFor(null);
    onConfigChange?.();
  };

  const deleteSub = (id) => {
    const updated = subcats.filter(s => s.id !== id);
    setSubcats(updated);
    saveSubcategories(updated);
    onConfigChange?.();
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700 }}>Categories & Sub-categories</div>
          <div style={{ fontSize: 12, color: "#888", marginTop: 3 }}>Default categories cannot be deleted. Add custom categories and sub-categories to any.</div>
        </div>
        <button onClick={() => setShowAddCat(true)} style={{ padding: "8px 16px", background: "#E65C00", border: "none", borderRadius: 8, color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 13, flexShrink: 0 }}>
          + Add Category
        </button>
      </div>

      {showAddCat && (
        <div style={{ background: "#fff", border: "1.5px solid #f0f0f0", borderRadius: 12, padding: "1.25rem", marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>New Category</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>Georgian Name *</div>
              <input style={inp} value={newCat.name} onChange={e => setNewCat(c => ({ ...c, name: e.target.value }))} placeholder="e.g. ახალი კატეგორია" />
            </div>
            <div>
              <div style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>English Name *</div>
              <input style={inp} value={newCat.en} onChange={e => setNewCat(c => ({ ...c, en: e.target.value }))} placeholder="e.g. New Category" />
            </div>
            <div>
              <div style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>Russian Name</div>
              <input style={inp} value={newCat.ru} onChange={e => setNewCat(c => ({ ...c, ru: e.target.value }))} placeholder="Optional" />
            </div>
            <div>
              <div style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>Icon (emoji)</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {CAT_ICONS.map(ic => (
                  <span key={ic} onClick={() => setNewCat(c => ({ ...c, icon: ic }))}
                    style={{ width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, cursor: "pointer", borderRadius: 6, background: newCat.icon === ic ? "#FFF0E6" : "transparent", border: newCat.icon === ic ? "1.5px solid #E65C00" : "1.5px solid transparent" }}>
                    {ic}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 12, marginBottom: 10, alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>Color</div>
              <input type="color" value={newCat.color} onChange={e => setNewCat(c => ({ ...c, color: e.target.value }))} style={{ width: 44, height: 32, border: "1.5px solid #ddd", borderRadius: 6, cursor: "pointer", padding: 2 }} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>Background</div>
              <input type="color" value={newCat.bg} onChange={e => setNewCat(c => ({ ...c, bg: e.target.value }))} style={{ width: 44, height: 32, border: "1.5px solid #ddd", borderRadius: 6, cursor: "pointer", padding: 2 }} />
            </div>
            <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 22 }}>{newCat.icon}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: newCat.color }}>{newCat.en || "Preview"}</span>
            </div>
          </div>
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>Category Image (optional)</div>
            <CatImageUploader img={newCat.img || ""} onChange={img => setNewCat(c => ({ ...c, img }))} />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setShowAddCat(false)} style={{ padding: "8px 16px", border: "1.5px solid #ddd", borderRadius: 8, background: "#fff", cursor: "pointer", fontSize: 13 }}>Cancel</button>
            <button onClick={saveCat} style={{ padding: "8px 20px", background: "#E65C00", border: "none", borderRadius: 8, color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>Save Category</button>
          </div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {allCats.map(cat => {
          const isDefault = defaultCategories.some(d => d.name === cat.name);
          const catSubs = subcats.filter(s => s.parentName === cat.name);
          const ov = catOverrides[cat.name] || {};
          const isHidden = ov.hidden;
          const displayCat = { ...cat, ...ov };
          return (
            <div key={cat.name} style={{ background: "#fff", border: `1.5px solid ${isHidden ? "#f0f0f0" : "#ececec"}`, borderRadius: 10, overflow: "hidden", opacity: isHidden ? 0.55 : 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px" }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: displayCat.bg || "#f0f0f0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{displayCat.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{displayCat.en} <span style={{ color: "#aaa", fontWeight: 400, fontSize: 11 }}>({displayCat.name})</span></div>
                  {displayCat.ru && <div style={{ fontSize: 11, color: "#aaa" }}>{displayCat.ru}</div>}
                </div>
                {isDefault && <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 4, background: "#f0f0f0", color: "#888", fontWeight: 600 }}>default</span>}
                {isHidden && <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 4, background: "#FEE2E2", color: "#991B1B", fontWeight: 600 }}>hidden</span>}
                <button onClick={() => setAddSubFor(addSubFor === cat.name ? null : cat.name)} style={{ padding: "4px 10px", border: "1.5px solid #ddd", borderRadius: 6, background: "#fff", cursor: "pointer", fontSize: 11, fontWeight: 600 }}>+ Sub</button>
                <button onClick={() => startEditCat(cat)} style={{ padding: "4px 10px", border: "1.5px solid #ddd", borderRadius: 6, background: "#fff", cursor: "pointer", fontSize: 11, fontWeight: 600 }}>Edit</button>
                <button onClick={() => toggleHideCat(cat.name)} style={{ padding: "4px 10px", border: `1.5px solid ${isHidden ? "#E65C00" : "#ddd"}`, borderRadius: 6, background: isHidden ? "#FFF0E6" : "#fff", color: isHidden ? "#E65C00" : "#555", cursor: "pointer", fontSize: 11, fontWeight: 600 }}>{isHidden ? "Show" : "Hide"}</button>
                {!isDefault
                  ? <button onClick={() => deleteCat(cat.id)} style={{ padding: "4px 10px", border: "1.5px solid #FEE2E2", borderRadius: 6, background: "#FEF2F2", color: "#dc2626", cursor: "pointer", fontSize: 11, fontWeight: 600 }}>Delete</button>
                  : <button onClick={() => { if (window.confirm(`Delete "${cat.en}" permanently?`)) deleteDefaultCat(cat.name); }} style={{ padding: "4px 10px", border: "1.5px solid #FEE2E2", borderRadius: 6, background: "#FEF2F2", color: "#dc2626", cursor: "pointer", fontSize: 11, fontWeight: 600 }}>Delete</button>
                }
              </div>

              {/* Inline edit form for this category */}
              {editingCat === cat.name && (
                <div style={{ borderTop: "1px solid #f5f5f5", padding: "14px 14px", background: "#fafafa" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 10 }}>Edit "{cat.en}"</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 10 }}>
                    <div>
                      <div style={{ fontSize: 10, color: "#888", marginBottom: 3 }}>Georgian Name</div>
                      <input style={{ ...inp, fontSize: 12 }} value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: "#888", marginBottom: 3 }}>English Name</div>
                      <input style={{ ...inp, fontSize: 12 }} value={editForm.en} onChange={e => setEditForm(f => ({ ...f, en: e.target.value }))} />
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: "#888", marginBottom: 3 }}>Russian Name</div>
                      <input style={{ ...inp, fontSize: 12 }} value={editForm.ru} onChange={e => setEditForm(f => ({ ...f, ru: e.target.value }))} />
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <div style={{ fontSize: 10, color: "#888" }}>Icon (emoji)</div>
                    {editForm.icon && (
                      <button onClick={() => setEditForm(f => ({ ...f, icon: "" }))}
                        style={{ padding: "1px 7px", border: "1.5px solid #FEE2E2", borderRadius: 5, background: "#FEF2F2", color: "#dc2626", cursor: "pointer", fontSize: 10, fontWeight: 700 }}>
                        × Remove emoji
                      </button>
                    )}
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 10 }}>
                    {CAT_ICONS.map(ic => (
                      <span key={ic} onClick={() => setEditForm(f => ({ ...f, icon: ic }))}
                        style={{ width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, cursor: "pointer", borderRadius: 6, background: editForm.icon === ic ? "#FFF0E6" : "transparent", border: editForm.icon === ic ? "1.5px solid #E65C00" : "1.5px solid transparent" }}>
                        {ic}
                      </span>
                    ))}
                  </div>
                  <div style={{ fontSize: 10, color: "#888", marginBottom: 4 }}>Category Image (max 1)</div>
                  <CatImageUploader
                    img={editForm.img || ""}
                    onChange={img => setEditForm(f => ({ ...f, img }))}
                  />
                  <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 10, marginTop: 10 }}>
                    <div>
                      <div style={{ fontSize: 10, color: "#888", marginBottom: 3 }}>Color</div>
                      <input type="color" value={editForm.color} onChange={e => setEditForm(f => ({ ...f, color: e.target.value }))} style={{ width: 44, height: 32, border: "1.5px solid #ddd", borderRadius: 6, cursor: "pointer", padding: 2 }} />
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: "#888", marginBottom: 3 }}>Background</div>
                      <input type="color" value={editForm.bg} onChange={e => setEditForm(f => ({ ...f, bg: e.target.value }))} style={{ width: 44, height: 32, border: "1.5px solid #ddd", borderRadius: 6, cursor: "pointer", padding: 2 }} />
                    </div>
                    <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 22 }}>{editForm.icon || "—"}</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: editForm.color }}>{editForm.en || "Preview"}</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => setEditingCat(null)} style={{ padding: "7px 16px", border: "1.5px solid #ddd", borderRadius: 8, background: "#fff", cursor: "pointer", fontSize: 12 }}>Cancel</button>
                    <button onClick={saveEditCat} style={{ padding: "7px 18px", background: "#E65C00", border: "none", borderRadius: 8, color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 12 }}>Save Changes</button>
                  </div>
                </div>
              )}

              {catSubs.length > 0 && (
                <div style={{ borderTop: "1px solid #f5f5f5", padding: "12px 16px", display: "flex", flexWrap: "wrap", gap: 10 }}>
                  {catSubs.map(sub => (
                    <div key={sub.id} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "10px 12px", background: "#fff", border: "1.5px solid #e8e8e8", borderRadius: 10, fontSize: 13, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", minWidth: 90, maxWidth: 120, position: "relative" }}>
                      <div style={{ width: 56, height: 56, borderRadius: 8, overflow: "hidden", background: "#f0f0f0", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {sub.img
                          ? <img src={sub.img} alt={sub.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => { e.target.style.display = "none"; }} />
                          : <span style={{ fontSize: 26 }}>{sub.icon || "📦"}</span>}
                      </div>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontWeight: 600, color: "#1a1a1a", fontSize: 12 }}>{sub.name}</div>
                        {sub.en && <div style={{ fontSize: 10, color: "#aaa" }}>{sub.en}</div>}
                      </div>
                      <button onClick={() => deleteSub(sub.id)} style={{ position: "absolute", top: -6, right: -6, width: 20, height: 20, borderRadius: "50%", background: "#FEF2F2", border: "1.5px solid #FEE2E2", color: "#dc2626", cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, padding: 0, lineHeight: 1 }}>×</button>
                    </div>
                  ))}
                </div>
              )}

              {addSubFor === cat.name && (
                <div style={{ borderTop: "1px solid #f5f5f5", padding: "10px 14px", background: "#fafafa" }}>
                  <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Add Sub-category to "{cat.en}"</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
                    <div>
                      <div style={{ fontSize: 10, color: "#888", marginBottom: 3 }}>Georgian Name *</div>
                      <input style={{ ...inp, fontSize: 12 }} value={newSub.name} onChange={e => setNewSub(s => ({ ...s, name: e.target.value }))} placeholder="e.g. ანკერი" />
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: "#888", marginBottom: 3 }}>English Name</div>
                      <input style={{ ...inp, fontSize: 12 }} value={newSub.en} onChange={e => setNewSub(s => ({ ...s, en: e.target.value }))} placeholder="e.g. Anchors" />
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: "#888", marginBottom: 3 }}>Icon (emoji, optional)</div>
                      <input style={{ ...inp, fontSize: 16, textAlign: "center" }} value={newSub.icon} onChange={e => setNewSub(s => ({ ...s, icon: e.target.value }))} placeholder="🔩" maxLength={4} />
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: "#888", marginBottom: 3 }}>Image (max 1)</div>
                      <CatImageUploader img={newSub.img || ""} onChange={img => setNewSub(s => ({ ...s, img }))} compact />
                    </div>
                  </div>
                  <button onClick={() => saveSub(cat.name)} style={{ padding: "8px 18px", background: "#E65C00", border: "none", borderRadius: 8, color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 12 }}>Add Sub-category</button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Brands Tab ──────────────────────────────────────────────────────────────
function BrandsTab() {
  const [logos, setLogos] = useState(() => getBrandLogos());
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef(null);

  const processFiles = async (files) => {
    const results = await Promise.all(
      Array.from(files).filter(f => f.type.startsWith("image/")).map(async (file) => {
        const res = await resizeImageFile(file, 400, 200, 0.90);
        return res ? { id: Date.now() + Math.random(), src: res.dataUrl, name: file.name.replace(/\.[^.]+$/, "") } : null;
      })
    );
    const next = [...logos, ...results.filter(Boolean)];
    setLogos(next);
    saveBrandLogos(next);
  };

  const removeLogo = (id) => {
    const next = logos.filter(l => l.id !== id);
    setLogos(next);
    saveBrandLogos(next);
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700 }}>Brand Logos</div>
          <div style={{ fontSize: 12, color: "#888", marginTop: 3 }}>Logos displayed in the scrolling brands strip on the homepage. Drag & drop to add.</div>
        </div>
      </div>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); processFiles(e.dataTransfer.files); }}
        onClick={() => fileRef.current?.click()}
        style={{
          border: `2px dashed ${dragging ? "#E65C00" : "#ddd"}`,
          borderRadius: 10, padding: "22px 16px", textAlign: "center",
          cursor: "pointer", background: dragging ? "#FFF8F5" : "#fafafa",
          transition: "all 0.2s", marginBottom: 20,
        }}
      >
        <div style={{ fontSize: 30, marginBottom: 6 }}>🏷️</div>
        <div style={{ fontSize: 13, color: "#555", fontWeight: 600 }}>Drag & drop brand logos here</div>
        <div style={{ fontSize: 11, color: "#aaa", marginTop: 3 }}>or click to choose files · PNG, JPG, SVG · auto-resized to 400×200px</div>
        <div style={{ fontSize: 11, color: "#E65C00", marginTop: 6, fontWeight: 600 }}>💡 Best results: PNG with transparent background, at least 300×100px</div>
        <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: "none" }}
          onChange={(e) => { processFiles(e.target.files); e.target.value = ""; }} />
      </div>

      {logos.length === 0 ? (
        <div style={{ textAlign: "center", padding: "2rem", color: "#aaa", background: "#f8f8f8", borderRadius: 12, fontSize: 13 }}>No logos yet</div>
      ) : (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
          {logos.map(logo => (
            <div key={logo.id} style={{ background: "#fff", border: "1.5px solid #ececec", borderRadius: 12, padding: "16px 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: 10, minWidth: 130, position: "relative" }}>
              <div style={{ width: 100, height: 60, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <img src={logo.src} alt={logo.name} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", mixBlendMode: "multiply" }} />
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#555", textAlign: "center" }}>{logo.name}</div>
              <button onClick={() => removeLogo(logo.id)}
                style={{ position: "absolute", top: 6, right: 6, width: 22, height: 22, borderRadius: "50%", background: "#FEF2F2", border: "1.5px solid #FEE2E2", color: "#dc2626", cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", padding: 0, lineHeight: 1, fontWeight: 700 }}>
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Activity Tab ─────────────────────────────────────────────────────────────
function ActivityTab() {
  const activity = getActivity();
  return (
    <div style={{ background: "#fff", borderRadius: 12, border: "1.5px solid #ececec", overflow: "hidden" }}>
      {activity.length === 0 ? (
        <div style={{ padding: "2rem", textAlign: "center", color: "#aaa" }}>No activity recorded yet.</div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "#f8f8f8", borderBottom: "1.5px solid #ececec" }}>
              {["Time", "User", "Action", "Details"].map(h => (
                <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontWeight: 700, color: "#555" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {activity.slice(0, 100).map((a, i) => (
              <tr key={a.id} style={{ borderBottom: "1px solid #f5f5f5", background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                <td style={{ padding: "9px 14px", color: "#aaa", whiteSpace: "nowrap" }}>{new Date(a.ts).toLocaleString()}</td>
                <td style={{ padding: "9px 14px", color: "#555" }}>{a.user}</td>
                <td style={{ padding: "9px 14px" }}>
                  <span style={{ background: "#f0f0f0", padding: "2px 8px", borderRadius: 5, fontSize: 11, fontWeight: 700 }}>{a.action}</span>
                </td>
                <td style={{ padding: "9px 14px", color: "#666" }}>{String(a.details)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ─── Analytics Tab ────────────────────────────────────────────────────────────
function AnalyticsTab({ products }) {
  const views = getProductViews();
  const sales = getProductSales();

  const topViewed = Object.entries(views)
    .map(([id, count]) => ({ product: products.find(p => p.id === parseInt(id)), count }))
    .filter(x => x.product)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const topSold = Object.entries(sales)
    .map(([id, qty]) => ({ product: products.find(p => p.id === parseInt(id)), qty }))
    .filter(x => x.product)
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 10);

  const maxViews = topViewed[0]?.count || 1;
  const maxSold = topSold[0]?.qty || 1;

  const getThumb = (p) => {
    if (p.images && p.images.length > 0) return p.images[0];
    return p.img || null;
  };

  const Section = ({ title, icon, data, valueKey, valueLabel, color, accentBg }) => (
    <div style={{ background: "#fff", borderRadius: 14, border: "1.5px solid #ececec", overflow: "hidden", flex: 1, minWidth: 340 }}>
      {/* Header */}
      <div style={{ background: accentBg, padding: "18px 22px", display: "flex", alignItems: "center", gap: 12, borderBottom: `3px solid ${color}` }}>
        <div style={{ width: 42, height: 42, borderRadius: 10, background: color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, boxShadow: `0 4px 12px ${color}55` }}>{icon}</div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, color: "#1a1a1a" }}>{title}</div>
          <div style={{ fontSize: 11, color: "#888", marginTop: 1 }}>Top {data.length} products · browser tracked</div>
        </div>
        <div style={{ marginLeft: "auto", fontSize: 28, fontWeight: 900, color, lineHeight: 1 }}>{data.length}</div>
      </div>
      {data.length === 0 ? (
        <div style={{ padding: "3rem", textAlign: "center", color: "#bbb", fontSize: 13 }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>{icon}</div>
          No data yet — will populate as customers browse and order.
        </div>
      ) : (
        <div>
          {data.map((item, i) => {
            const p = item.product;
            const val = item[valueKey];
            const maxVal = valueKey === "count" ? maxViews : maxSold;
            const pct = Math.round((val / maxVal) * 100);
            const thumb = getThumb(p);
            const isTop3 = i < 3;
            const medals = ["🥇", "🥈", "🥉"];
            return (
              <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 18px", borderBottom: i < data.length - 1 ? "1px solid #f3f3f3" : "none", background: isTop3 ? accentBg : "#fff", transition: "background 0.15s" }}>
                {/* Rank */}
                <div style={{ width: 28, textAlign: "center", flexShrink: 0 }}>
                  {isTop3
                    ? <span style={{ fontSize: 18 }}>{medals[i]}</span>
                    : <span style={{ fontSize: 12, fontWeight: 800, color: "#bbb" }}>{i + 1}</span>}
                </div>
                {/* Thumbnail */}
                <div style={{ width: 46, height: 46, borderRadius: 9, overflow: "hidden", flexShrink: 0, background: "#f5f5f5", border: "1.5px solid #ececec", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {thumb
                    ? <img src={thumb} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => { e.target.style.display = "none"; }} />
                    : <span style={{ fontSize: 22 }}>📦</span>}
                </div>
                {/* Name + bar */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1a1a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 2 }}>{p.name}</div>
                  {p.en && <div style={{ fontSize: 10, color: "#aaa", marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.en}</div>}
                  <div style={{ height: 4, borderRadius: 2, background: "#f0f0f0", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: pct + "%", borderRadius: 2, background: `linear-gradient(90deg, ${color}, ${color}bb)`, transition: "width 0.5s" }} />
                  </div>
                </div>
                {/* Value badge */}
                <div style={{ flexShrink: 0, textAlign: "right" }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color }}>{val}</div>
                  <div style={{ fontSize: 9, color: "#aaa", fontWeight: 600, textTransform: "uppercase" }}>{valueLabel}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 6 }}>
        <div style={{ fontSize: 15, fontWeight: 700 }}>Analytics</div>
        <span style={{ fontSize: 11, color: "#888", background: "#f0f0f0", borderRadius: 20, padding: "2px 10px", fontWeight: 600 }}>Browser-local data</span>
      </div>
      <div style={{ fontSize: 12, color: "#aaa", marginBottom: 22 }}>Views count each time a product page opens · Sales count when an order is successfully placed.</div>
      <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
        <Section title="Most Viewed" icon="👁️" data={topViewed} valueKey="count" valueLabel="views" color="#0066B3" accentBg="#EEF5FF" />
        <Section title="Most Sold" icon="🏆" data={topSold} valueKey="qty" valueLabel="units" color="#E65C00" accentBg="#FFF8F5" />
      </div>
    </div>
  );
}

// ─── CustomersTab ─────────────────────────────────────────────────────────────
function CustomersTab() {
  const [customers, setCustomers] = useState(() => getStoredCustomers());
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(null);

  const filtered = customers.filter(c =>
    `${c.firstName} ${c.lastName} ${c.email} ${c.phone}`.toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = () => {
    const next = customers.map(c => c.id === editing.id ? editing : c);
    saveCustomers(next);
    setCustomers(next);
    setEditing(null);
  };

  const handleDelete = (id) => {
    const next = customers.filter(c => c.id !== id);
    saveCustomers(next);
    setCustomers(next);
    setConfirmDelete(null);
  };

  const fi = { width: "100%", padding: "8px 10px", border: "1.5px solid #ddd", borderRadius: 8, fontSize: 13, outline: "none", boxSizing: "border-box", fontFamily: "inherit" };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Customers</h2>
          <div style={{ fontSize: 12, color: "#aaa", marginTop: 2 }}>{customers.length} registered customers</div>
        </div>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, email, phone..." style={{ ...fi, width: 260 }} />
      </div>

      {editing && (
        <>
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 300 }} onClick={() => setEditing(null)} />
          <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", background: "#fff", borderRadius: 16, padding: "1.75rem", width: "min(440px, 92vw)", zIndex: 301, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 16px 48px rgba(0,0,0,0.18)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Edit Customer</h3>
              <button onClick={() => setEditing(null)} style={{ background: "#f0f0f0", border: "none", borderRadius: 8, width: 30, height: 30, cursor: "pointer", fontSize: 16 }}>×</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
              {[["First Name", "firstName"], ["Last Name", "lastName"]].map(([label, key]) => (
                <div key={key}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: "#555", display: "block", marginBottom: 3 }}>{label}</label>
                  <input value={editing[key] || ""} onChange={e => setEditing(p => ({ ...p, [key]: e.target.value }))} style={fi} />
                </div>
              ))}
            </div>
            {[["Email", "email", "email"], ["Phone", "phone", "tel"], ["Address", "address", "text"]].map(([label, key, type]) => (
              <div key={key} style={{ marginBottom: 10 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: "#555", display: "block", marginBottom: 3 }}>{label}</label>
                <input type={type} value={editing[key] || ""} onChange={e => setEditing(p => ({ ...p, [key]: e.target.value }))} style={fi} />
              </div>
            ))}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: "#555", display: "block", marginBottom: 3 }}>New Password (leave blank to keep)</label>
              <input type="password" placeholder="••••••••" onChange={e => setEditing(p => ({ ...p, password: e.target.value || p.password }))} style={fi} />
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={handleSave} style={{ flex: 1, background: "#E65C00", color: "#fff", border: "none", borderRadius: 9, padding: "10px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Save</button>
              <button onClick={() => setEditing(null)} style={{ flex: 1, background: "#f5f5f5", color: "#555", border: "1.5px solid #ddd", borderRadius: 9, padding: "10px", fontSize: 13, cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        </>
      )}

      {confirmDelete && (
        <>
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 300 }} onClick={() => setConfirmDelete(null)} />
          <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", background: "#fff", borderRadius: 14, padding: "1.75rem", width: "min(360px, 90vw)", zIndex: 301, textAlign: "center" }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>🗑️</div>
            <h3 style={{ margin: "0 0 8px", fontSize: 16 }}>Delete customer?</h3>
            <p style={{ color: "#666", fontSize: 13, marginBottom: 18 }}>This cannot be undone.</p>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => handleDelete(confirmDelete)} style={{ flex: 1, background: "#dc2626", color: "#fff", border: "none", borderRadius: 9, padding: "10px", fontWeight: 700, cursor: "pointer" }}>Delete</button>
              <button onClick={() => setConfirmDelete(null)} style={{ flex: 1, background: "#f5f5f5", border: "1.5px solid #ddd", borderRadius: 9, padding: "10px", cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        </>
      )}

      {filtered.length === 0
        ? <div style={{ textAlign: "center", padding: "3rem 0", color: "#aaa", fontSize: 14 }}>{search ? "No customers match your search." : "No customers yet."}</div>
        : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filtered.map(c => {
              const orders = getStoredOrders().filter(o => o.customerId === c.id);
              return (
                <div key={c.id} style={{ background: "#fff", border: "1.5px solid #ebebeb", borderRadius: 12, padding: "1rem 1.25rem", display: "flex", alignItems: "center", gap: 14, boxShadow: "0 1px 6px rgba(0,0,0,0.05)" }}>
                  <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#E65C00", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, fontWeight: 800, color: "#fff", flexShrink: 0 }}>
                    {c.firstName[0]?.toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#1a1a1a" }}>{c.firstName} {c.lastName}</div>
                    <div style={{ fontSize: 12, color: "#888", marginTop: 1 }}>{c.email} · {c.phone}</div>
                    {c.address && <div style={{ fontSize: 11, color: "#bbb", marginTop: 1 }}>{c.address}</div>}
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#E65C00" }}>{orders.length} order{orders.length !== 1 ? "s" : ""}</div>
                    <div style={{ fontSize: 10, color: "#bbb", marginTop: 1 }}>{new Date(c.createdAt).toLocaleDateString()}</div>
                  </div>
                  <div style={{ display: "flex", gap: 7, flexShrink: 0 }}>
                    <button onClick={() => setEditing({ ...c })} style={{ background: "#f5f5f5", border: "1.5px solid #ddd", borderRadius: 8, padding: "6px 13px", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>Edit</button>
                    <button onClick={() => setConfirmDelete(c.id)} style={{ background: "#FEF2F2", border: "1.5px solid #FEE2E2", color: "#dc2626", borderRadius: 8, padding: "6px 13px", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>Delete</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
    </div>
  );
}

// ─── Order status helpers ──────────────────────────────────────────────────────
const ORDER_STATUSES = ["pending", "confirmed", "shipped", "delivered", "cancelled"];
const STATUS_META = {
  pending:   { label: "Pending",   bg: "#FEF3C7", color: "#92400E", dot: "#F59E0B" },
  confirmed: { label: "Confirmed", bg: "#EEF5FF", color: "#0066B3", dot: "#0066B3" },
  shipped:   { label: "Shipped",   bg: "#F5F3FF", color: "#7C3AED", dot: "#7C3AED" },
  delivered: { label: "Delivered", bg: "#E1F5EE", color: "#065F46", dot: "#22C55E" },
  cancelled: { label: "Cancelled", bg: "#FEE2E2", color: "#991B1B", dot: "#DC2626" },
};

function StatusBadge({ status, small }) {
  const m = STATUS_META[status] || STATUS_META.pending;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: m.bg, color: m.color, fontWeight: 700, fontSize: small ? 10 : 11, padding: small ? "2px 7px" : "4px 10px", borderRadius: 20 }}>
      <span style={{ width: small ? 5 : 6, height: small ? 5 : 6, borderRadius: "50%", background: m.dot, flexShrink: 0 }} />
      {m.label}
    </span>
  );
}

// ─── OrdersTab ────────────────────────────────────────────────────────────────
function OrdersTab() {
  const [orders, setOrders] = useState(() => getStoredOrders());
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [expanded, setExpanded] = useState(null);

  const filtered = orders.filter(o => {
    const matchSearch = `${o.orderNumber} ${o.customerName} ${o.email} ${o.phone}`.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || (o.status || "pending") === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleStatusChange = (orderNumber, newStatus) => {
    const updated = updateOrderStatus(orderNumber, newStatus);
    if (updated) { setOrders(updated); logActivity("admin", "update_order_status", `${orderNumber} → ${newStatus}`); }
  };

  const statusCounts = ORDER_STATUSES.reduce((acc, s) => { acc[s] = orders.filter(o => (o.status || "pending") === s).length; return acc; }, {});

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Order Management</h2>
          <div style={{ fontSize: 12, color: "#aaa", marginTop: 2 }}>{orders.length} total · ₾{orders.reduce((s, o) => s + (o.total || 0), 0).toFixed(2)} revenue</div>
        </div>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search order #, name, email..." style={{ padding: "8px 10px", border: "1.5px solid #ddd", borderRadius: 8, fontSize: 13, outline: "none", width: 260, fontFamily: "inherit" }} />
      </div>

      {/* Status filter tabs */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 18 }}>
        <button onClick={() => setStatusFilter("all")} style={{ padding: "6px 14px", borderRadius: 20, border: `1.5px solid ${statusFilter === "all" ? "#E65C00" : "#e0e0e0"}`, background: statusFilter === "all" ? "#FFF0E6" : "#fff", color: statusFilter === "all" ? "#E65C00" : "#555", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
          All ({orders.length})
        </button>
        {ORDER_STATUSES.map(s => {
          const m = STATUS_META[s];
          const active = statusFilter === s;
          return (
            <button key={s} onClick={() => setStatusFilter(s)} style={{ padding: "6px 14px", borderRadius: 20, border: `1.5px solid ${active ? m.dot : "#e0e0e0"}`, background: active ? m.bg : "#fff", color: active ? m.color : "#555", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
              {m.label} ({statusCounts[s] || 0})
            </button>
          );
        })}
      </div>

      {filtered.length === 0
        ? <div style={{ textAlign: "center", padding: "3rem 0", color: "#aaa", fontSize: 14 }}>{search ? "No orders match your search." : "No orders yet."}</div>
        : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filtered.map(o => {
              const isOpen = expanded === o.orderNumber;
              const pmColors = { cash: "#065F46", card: "#0066B3", transfer: "#7C3AED" };
              const pmLabels = { cash: "Cash", card: "Card", transfer: "Transfer" };
              const currentStatus = o.status || "pending";
              return (
                <div key={o.orderNumber} style={{ background: "#fff", border: "1.5px solid #ebebeb", borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 6px rgba(0,0,0,0.05)" }}>
                  <div onClick={() => setExpanded(isOpen ? null : o.orderNumber)} style={{ display: "flex", alignItems: "center", gap: 14, padding: "0.875rem 1.25rem", cursor: "pointer" }}>
                    <div style={{ flexShrink: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 800, color: "#E65C00", letterSpacing: 0.3 }}>{o.orderNumber}</div>
                      <div style={{ fontSize: 10, color: "#bbb", marginTop: 1 }}>{new Date(o.date).toLocaleString()}</div>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1a1a" }}>{o.customerName}</div>
                      <div style={{ fontSize: 11, color: "#888" }}>{o.phone}{o.email ? ` · ${o.email}` : ""}</div>
                    </div>
                    <StatusBadge status={currentStatus} />
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 800, color: "#1a1a1a" }}>₾{(o.total || 0).toFixed(2)}</div>
                      <div style={{ fontSize: 10, padding: "2px 7px", borderRadius: 10, background: `${pmColors[o.paymentMethod] || "#555"}18`, color: pmColors[o.paymentMethod] || "#555", fontWeight: 700, display: "inline-block", marginTop: 3 }}>
                        {pmLabels[o.paymentMethod] || o.paymentMethod}
                      </div>
                    </div>
                    <div style={{ fontSize: 14, color: "#bbb", flexShrink: 0 }}>{isOpen ? "▲" : "▼"}</div>
                  </div>
                  {isOpen && (
                    <div style={{ borderTop: "1.5px solid #f5f5f5", padding: "1rem 1.25rem", background: "#fafafa" }}>
                      {/* Status stepper */}
                      <div style={{ marginBottom: 16 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: "#888", marginBottom: 10, letterSpacing: 0.5 }}>UPDATE STATUS</div>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          {ORDER_STATUSES.map(s => {
                            const m = STATUS_META[s];
                            const active = currentStatus === s;
                            return (
                              <button key={s} onClick={e => { e.stopPropagation(); handleStatusChange(o.orderNumber, s); }}
                                style={{ padding: "7px 14px", borderRadius: 9, border: `1.5px solid ${active ? m.dot : "#ddd"}`, background: active ? m.bg : "#fff", color: active ? m.color : "#777", fontSize: 12, fontWeight: active ? 700 : 500, cursor: "pointer", transition: "all 0.15s" }}>
                                {active && "✓ "}{m.label}
                              </button>
                            );
                          })}
                        </div>
                        {o.statusHistory && o.statusHistory.length > 0 && (
                          <div style={{ marginTop: 10, fontSize: 11, color: "#aaa" }}>
                            Last updated: {new Date(o.statusHistory[o.statusHistory.length - 1].ts).toLocaleString()}
                          </div>
                        )}
                      </div>
                      {o.address && <div style={{ fontSize: 12, color: "#666", marginBottom: 10 }}>📍 {o.address}</div>}
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#888", marginBottom: 7, letterSpacing: 0.5 }}>ORDER ITEMS</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {(o.items || []).map((item, i) => (
                          <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "6px 10px", background: "#fff", borderRadius: 8, border: "1px solid #efefef" }}>
                            <span style={{ color: "#1a1a1a" }}>{item.name} <span style={{ color: "#bbb" }}>×{item.qty}</span></span>
                            <span style={{ fontWeight: 700, color: "#E65C00" }}>₾{((item.price || 0) * item.qty).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10, fontSize: 14, fontWeight: 800, color: "#1a1a1a" }}>
                        Total: <span style={{ color: "#E65C00", marginLeft: 6 }}>₾{(o.total || 0).toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
    </div>
  );
}

// ─── Main AdminPanel ──────────────────────────────────────────────────────────
export default function AdminPanel({ products, setProducts, onConfigChange }) {
  const allCategories = [...defaultCategories, ...getCustomCategories()];
  const subcategories = getSubcategories();
  const [authed, setAuthed] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [emailInput, setEmailInput] = useState("");
  const [passInput, setPassInput] = useState("");
  const [passErr, setPassErr] = useState("");
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [resetSent, setResetSent] = useState(false);
  const [tab, setTab] = useState(() => localStorage.getItem("adminTab") || "products");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setAuthed(!!data.session);
      setAuthLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      setAuthed(!!session);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const tryLogin = async () => {
    setPassErr("");
    const { error } = await supabase.auth.signInWithPassword({ email: emailInput, password: passInput });
    if (error) { setPassErr("Incorrect email or password"); setPassInput(""); }
  };

  const sendReset = async () => {
    setPassErr("");
    if (!forgotEmail) { setPassErr("Enter your email address"); return; }
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
      redirectTo: window.location.origin + "/admin",
    });
    if (error) { setPassErr(error.message); } else { setResetSent(true); }
  };

  const handleLogout = () => supabase.auth.signOut();

  if (authLoading) return null;

  if (!authed) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "65vh", padding: "2rem" }}>
        <div style={{ background: "#fff", borderRadius: 16, padding: "2.5rem", width: "min(380px, 90vw)", border: "1.5px solid #f0f0f0", boxShadow: "0 8px 32px rgba(0,0,0,0.08)" }}>
          <div style={{ textAlign: "center", marginBottom: "1.75rem" }}>
            <div style={{ fontSize: 42, marginBottom: 12 }}>🔐</div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>{forgotMode ? "Reset Password" : "Admin Panel"}</h2>
            <p style={{ color: "#888", fontSize: 12, margin: "6px 0 0" }}>mgp.ge/admin</p>
          </div>
          {forgotMode ? (
            resetSent ? (
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>📧</div>
                <p style={{ fontSize: 14, color: "#333", marginBottom: 20 }}>Reset link sent! Check your email and follow the link to set a new password.</p>
                <button onClick={() => { setForgotMode(false); setResetSent(false); setForgotEmail(""); setPassErr(""); }} style={{ width: "100%", background: "#E65C00", color: "#fff", border: "none", borderRadius: 10, padding: "12px", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
                  Back to Sign In
                </button>
              </div>
            ) : (
              <>
                <p style={{ fontSize: 13, color: "#666", marginBottom: 14 }}>Enter your admin email and we'll send you a reset link.</p>
                <input type="email" value={forgotEmail} onChange={e => { setForgotEmail(e.target.value); setPassErr(""); }}
                  onKeyDown={e => e.key === "Enter" && sendReset()} placeholder="Admin email" autoFocus
                  style={{ ...inp, marginBottom: passErr ? 8 : 14 }} />
                {passErr && <p style={{ color: "#dc2626", fontSize: 12, margin: "0 0 12px" }}>{passErr}</p>}
                <button onClick={sendReset} style={{ width: "100%", background: "#E65C00", color: "#fff", border: "none", borderRadius: 10, padding: "12px", fontSize: 15, fontWeight: 700, cursor: "pointer", marginBottom: 10 }}>
                  Send Reset Link
                </button>
                <button onClick={() => { setForgotMode(false); setPassErr(""); }} style={{ width: "100%", background: "transparent", color: "#666", border: "none", fontSize: 13, cursor: "pointer", padding: "6px" }}>
                  ← Back to Sign In
                </button>
              </>
            )
          ) : (
            <>
              <input type="email" value={emailInput} onChange={e => { setEmailInput(e.target.value); setPassErr(""); }}
                onKeyDown={e => e.key === "Enter" && tryLogin()} placeholder="Email" autoFocus
                style={{ ...inp, marginBottom: 10 }} />
              <input type="password" value={passInput} onChange={e => { setPassInput(e.target.value); setPassErr(""); }}
                onKeyDown={e => e.key === "Enter" && tryLogin()} placeholder="Password"
                style={{ ...inp, marginBottom: passErr ? 8 : 6, border: `1.5px solid ${passErr ? "#dc2626" : "#ddd"}` }} />
              {passErr && <p style={{ color: "#dc2626", fontSize: 12, margin: "0 0 8px" }}>{passErr}</p>}
              <div style={{ textAlign: "right", marginBottom: 14 }}>
                <button onClick={() => { setForgotMode(true); setForgotEmail(emailInput); setPassErr(""); }} style={{ background: "none", border: "none", color: "#E65C00", fontSize: 12, cursor: "pointer", padding: 0 }}>
                  Forgot password?
                </button>
              </div>
              <button onClick={tryLogin} style={{ width: "100%", background: "#E65C00", color: "#fff", border: "none", borderRadius: 10, padding: "12px", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
                Sign In
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  const tabs = [
    { id: "products", label: "Products" },
    { id: "orders", label: "Orders" },
    { id: "customers", label: "Customers" },
    { id: "categories", label: "Categories" },
    { id: "slider", label: "Slider" },
    { id: "banners", label: "Banners" },
    { id: "brands", label: "Brands" },
    { id: "seo", label: "SEO" },
    { id: "socials", label: "Socials" },
    { id: "homepage", label: "Homepage" },
    { id: "analytics", label: "Analytics" },
    { id: "activity", label: "Activity Log" },
  ];

  return (
    <div style={{ minHeight: "65vh", background: "#f8f8f8" }}>
      <div style={{ background: "#fff", borderBottom: "1.5px solid #eee", padding: "0 2rem", display: "flex", gap: 0, overflowX: "auto", alignItems: "center" }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => { setTab(t.id); localStorage.setItem("adminTab", t.id); }}
            style={{ padding: "13px 18px", border: "none", background: "none", cursor: "pointer", fontSize: 13, fontWeight: tab === t.id ? 700 : 400, color: tab === t.id ? "#E65C00" : "#666", borderBottom: tab === t.id ? "2px solid #E65C00" : "2px solid transparent", whiteSpace: "nowrap", flexShrink: 0 }}>
            {t.label}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <button onClick={handleLogout} style={{ padding: "6px 14px", background: "#f5f5f5", border: "1.5px solid #e0e0e0", color: "#555", borderRadius: 7, cursor: "pointer", fontSize: 12, flexShrink: 0, marginLeft: 8 }}>
          Logout
        </button>
      </div>
      <div style={{ padding: "1.75rem 2rem", maxWidth: 1100, margin: "0 auto" }}>
        {tab === "products" && <ProductsTab products={products} setProducts={setProducts} allCategories={allCategories} subcategories={subcategories} />}
        {tab === "orders" && <OrdersTab />}
        {tab === "customers" && <CustomersTab />}
        {tab === "categories" && <CategoriesTab onConfigChange={onConfigChange} />}
        {tab === "slider" && <SliderTab products={products} />}
        {tab === "banners" && <BannersTab />}
        {tab === "brands" && <BrandsTab />}
        {tab === "seo" && <SEOTab />}
        {tab === "socials" && <SocialsTab />}
        {tab === "homepage" && <HomepageSlidersTab allCategories={allCategories} />}
        {tab === "analytics" && <AnalyticsTab products={products} />}
        {tab === "activity" && <ActivityTab />}
      </div>
    </div>
  );
}

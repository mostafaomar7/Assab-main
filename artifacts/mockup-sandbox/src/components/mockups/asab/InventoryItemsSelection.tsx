import "./_group.css";
import { AppLayout } from "./_shared/AppLayout";
import { useState } from "react";
import { ArrowRight, Search, Save, RefreshCw, CheckCircle2, Bell, Plus, X } from "lucide-react";

interface InventoryItem {
  id: string;
  name: string;
  nameEn: string;
  category: string;
  unit: string;
  selected: boolean;
}

const allItems: InventoryItem[] = [
  { id: "I01", name: "خبز برجر", nameEn: "Burger Buns", category: "مخبوزات", unit: "قطعة", selected: false },
  { id: "I02", name: "دجاج طازج", nameEn: "Fresh Chicken", category: "بروتين", unit: "كجم", selected: true },
  { id: "I03", name: "حليب طازج", nameEn: "Fresh Milk", category: "ألبان", unit: "لتر", selected: true },
  { id: "I04", name: "جبنة شيدر", nameEn: "Cheddar Cheese", category: "ألبان", unit: "كجم", selected: false },
  { id: "I05", name: "خس", nameEn: "Lettuce", category: "خضروات", unit: "كجم", selected: true },
  { id: "I06", name: "طماطم", nameEn: "Tomatoes", category: "خضروات", unit: "كجم", selected: true },
  { id: "I07", name: "بصل", nameEn: "Onions", category: "خضروات", unit: "كجم", selected: false },
  { id: "I08", name: "بطاطس", nameEn: "Potatoes", category: "خضروات", unit: "كجم", selected: true },
  { id: "I09", name: "زيت قلي", nameEn: "Frying Oil", category: "زيوت", unit: "لتر", selected: true },
  { id: "I10", name: "صوص خاص", nameEn: "Special Sauce", category: "صوصات", unit: "كجم", selected: false },
  { id: "I11", name: "كاتشب", nameEn: "Ketchup", category: "صوصات", unit: "كجم", selected: true },
  { id: "I12", name: "مايونيز", nameEn: "Mayonnaise", category: "صوصات", unit: "كجم", selected: true },
  { id: "I13", name: "مشروبات غازية", nameEn: "Soft Drinks", category: "مشروبات", unit: "كرتون", selected: false },
  { id: "I14", name: "ماء معدني", nameEn: "Mineral Water", category: "مشروبات", unit: "كرتون", selected: true },
  { id: "I15", name: "عصائر", nameEn: "Juices", category: "مشروبات", unit: "كرتون", selected: true },
];

const categoryColors: Record<string, string> = {
  "بروتين": "bg-red-50 text-red-600",
  "خضروات": "bg-green-50 text-green-600",
  "مخبوزات": "bg-amber-50 text-amber-600",
  "ألبان": "bg-blue-50 text-blue-600",
  "زيوت": "bg-yellow-50 text-yellow-600",
  "صوصات": "bg-pink-50 text-pink-600",
  "مشروبات": "bg-cyan-50 text-cyan-600",
};

export function InventoryItemsSelection() {
  const [items, setItems] = useState(allItems);
  const [search, setSearch] = useState("");
  const [branch, setBranch] = useState("فرع الرياض - العليا");
  const [saved, setSaved] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("الكل");

  const categories = ["الكل", ...Array.from(new Set(allItems.map((i) => i.category)))];
  const selected = items.filter((i) => i.selected);

  const filteredItems = items.filter((item) => {
    const matchSearch = item.name.includes(search) || item.nameEn.toLowerCase().includes(search.toLowerCase());
    const matchCat = categoryFilter === "الكل" || item.category === categoryFilter;
    return matchSearch && matchCat;
  });

  const toggle = (id: string) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, selected: !i.selected } : i)));
    setSaved(false);
  };

  const handleSave = () => {
    setSaved(true);
  };

  return (
    <AppLayout role="accountant" userName="أحمد محمد" activeSection="inventory" notificationsCount={12}>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
              <span className="text-purple-600 cursor-pointer hover:underline">الرئيسية</span>
              <ArrowRight size={12} className="rotate-180" />
              <span className="text-purple-600 cursor-pointer hover:underline">المخزون</span>
              <ArrowRight size={12} className="rotate-180" />
              <span className="text-gray-700 font-semibold">تحديد أصناف الجرد اليومي</span>
            </div>
            <h2 className="font-bold text-gray-800 text-xl">📋 تحديد أصناف الجرد اليومي</h2>
            <p className="text-gray-400 text-sm">حدد الأصناف التي يجب على مدير الفرع جردها يومياً — يتم التزامن فوراً مع تطبيق الموبايل</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${saved ? "bg-emerald-600 text-white" : "bg-purple-600 text-white hover:bg-purple-700"}`}
            >
              {saved ? <CheckCircle2 size={16} /> : <Save size={16} />}
              {saved ? "تم الحفظ والتزامن" : "حفظ وتحديث التطبيق فوراً"}
            </button>
          </div>
        </div>

        {saved && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-5 py-3.5 flex items-center gap-3">
            <CheckCircle2 size={18} className="text-emerald-600 flex-shrink-0" />
            <div>
              <p className="text-emerald-800 font-semibold text-sm">✓ تم الحفظ وإرسال إشعار لمدير الفرع</p>
              <p className="text-emerald-600 text-xs">تم تحديث قائمة الجرد اليومي في تطبيق الموبايل الخاص بـ «{branch}» — {selected.length} أصناف</p>
            </div>
          </div>
        )}

        {/* Branch selector */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1.5">🏪 الفرع المستهدف</label>
              <select
                value={branch}
                onChange={(e) => { setBranch(e.target.value); setSaved(false); }}
                className="text-sm border border-gray-200 rounded-lg px-4 py-2 text-gray-700 min-w-[240px]"
              >
                <option>فرع الرياض - العليا</option>
                <option>فرع جدة - الحمراء</option>
                <option>فرع مكة - المعابدة</option>
                <option>فرع الدمام - الكورنيش</option>
              </select>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 flex items-center gap-2">
              <Bell size={14} className="text-amber-600" />
              <div>
                <p className="text-xs text-amber-700 font-semibold">التزامن مع الموبايل</p>
                <p className="text-xs text-amber-600">أي تغيير يُحدَّث فوراً في تطبيق مدير الفرع</p>
              </div>
            </div>
            <div className="bg-purple-50 rounded-xl px-4 py-2.5">
              <p className="text-xs text-purple-600">المحدد حالياً</p>
              <p className="font-bold text-purple-700 text-lg">{selected.length} صنف</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-5">
          {/* All Items */}
          <div className="col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-lg px-3 py-1.5 flex-1 min-w-[200px]">
                  <Search size={13} className="text-gray-400" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="text-sm text-gray-600 bg-transparent outline-none w-full"
                    placeholder="بحث عن صنف..."
                  />
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setCategoryFilter(cat)}
                      className={`text-xs px-2.5 py-1.5 rounded-lg font-medium transition-all ${categoryFilter === cat ? "bg-purple-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-4 grid grid-cols-2 gap-2 max-h-[480px] overflow-y-auto">
              {filteredItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => toggle(item.id)}
                  className={`flex items-center gap-3 p-3 rounded-xl border-2 text-right transition-all ${item.selected ? "border-purple-400 bg-purple-50" : "border-gray-100 hover:border-gray-200 bg-white"}`}
                >
                  <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 border-2 transition-all ${item.selected ? "bg-purple-600 border-purple-600" : "border-gray-300"}`}>
                    {item.selected && <span className="text-white text-[10px] font-bold">✓</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold ${item.selected ? "text-purple-800" : "text-gray-800"}`}>{item.name}</p>
                    <p className="text-[10px] text-gray-400">{item.nameEn} · {item.unit}</p>
                  </div>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium flex-shrink-0 ${categoryColors[item.category] || "bg-gray-50 text-gray-500"}`}>
                    {item.category}
                  </span>
                </button>
              ))}
            </div>
            <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
              <span className="text-xs text-gray-400">{filteredItems.length} صنف معروض</span>
              <div className="flex gap-2">
                <button onClick={() => { setItems((prev) => prev.map((i) => ({ ...i, selected: true }))); setSaved(false); }} className="text-xs px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200">
                  تحديد الكل
                </button>
                <button onClick={() => { setItems((prev) => prev.map((i) => ({ ...i, selected: false }))); setSaved(false); }} className="text-xs px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200">
                  إلغاء الكل
                </button>
              </div>
            </div>
          </div>

          {/* Selected Items Panel */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
            <div className="px-4 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-gray-800 text-sm">الأصناف المحددة للجرد</h3>
                <p className="text-xs text-gray-400 mt-0.5">{selected.length} صنف</p>
              </div>
              <span className="w-7 h-7 rounded-full bg-purple-600 text-white text-xs font-bold flex items-center justify-center">
                {selected.length}
              </span>
            </div>
            <div className="p-3 space-y-1.5 max-h-[400px] overflow-y-auto">
              {selected.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-gray-300">
                  <span className="text-3xl">📋</span>
                  <p className="text-xs mt-2">لم يتم تحديد أي صنف</p>
                </div>
              ) : (
                selected.map((item, idx) => (
                  <div key={item.id} className="flex items-center gap-2 p-2.5 bg-purple-50 rounded-lg border border-purple-100">
                    <span className="text-xs text-purple-400 font-bold w-5 flex-shrink-0">{idx + 1}.</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-purple-800 truncate">{item.name}</p>
                      <p className="text-[10px] text-purple-400">{item.unit}</p>
                    </div>
                    <button onClick={() => toggle(item.id)} className="flex-shrink-0 w-5 h-5 rounded-full bg-purple-200 flex items-center justify-center hover:bg-red-200 hover:text-red-600 text-purple-600 transition-colors">
                      <X size={10} />
                    </button>
                  </div>
                ))
              )}
            </div>
            {selected.length > 0 && (
              <div className="p-3 border-t border-gray-100">
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-3">
                  <p className="text-amber-700 text-xs font-semibold">⚠ ملاحظة مهمة</p>
                  <p className="text-amber-600 text-xs mt-1">عند الضغط على «حفظ وتحديث التطبيق»، ستُرسل هذه القائمة فوراً لمدير الفرع عبر إشعار في التطبيق.</p>
                </div>
                <button
                  onClick={handleSave}
                  className="w-full py-2.5 rounded-xl bg-purple-600 text-white text-sm font-semibold hover:bg-purple-700 flex items-center justify-center gap-2"
                >
                  <RefreshCw size={14} />
                  تحديث التطبيق فوراً
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

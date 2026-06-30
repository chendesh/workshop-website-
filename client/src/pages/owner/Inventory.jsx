import React, { useState, useEffect, useMemo } from 'react';
import {
  collection, addDoc, deleteDoc, doc, onSnapshot,
  serverTimestamp, query, orderBy
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import toast from 'react-hot-toast';
import {
  TrendingUp, Package, Tag, IndianRupee,
  Search, X, ChevronLeft, ChevronRight, Trash2
} from 'lucide-react';

// ── Constants ─────────────────────────────────────────────────
const CATEGORIES = [
  'Raw Materials',
  'Spare Parts',
  'Tools & Equipment',
  'Fuel & Lubricants',
  'Safety Equipment',
  'Other',
];

const UNITS = ['Kg', 'Litres', 'Pieces', 'Metres', 'Bags', 'Tons', 'Boxes'];

const CATEGORY_BADGE = {
  'Raw Materials':     'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  'Spare Parts':       'bg-purple-500/10 text-purple-400 border border-purple-500/20',
  'Tools & Equipment': 'bg-green-500/10 text-green-400 border border-green-500/20',
  'Fuel & Lubricants': 'bg-orange-500/10 text-orange-400 border border-orange-500/20',
  'Safety Equipment':  'bg-red-500/10 text-red-400 border border-red-500/20',
  'Other':             'bg-slate-500/10 text-slate-400 border border-slate-500/20',
};

const TODAY = new Date().toISOString().split('T')[0];

const ITEMS_PER_PAGE = 10;

// ── Helper ────────────────────────────────────────────────────
const fmtRupees = (n) =>
  `₹${Number(n || 0).toLocaleString('en-IN')}`;

const fmtDate = (dateStr) => {
  if (!dateStr) return '—';
  // dateStr is 'YYYY-MM-DD'
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
};

const getMonthKey = (dateStr) => {
  if (!dateStr) return '';
  return dateStr.substring(0, 7); // 'YYYY-MM'
};

const currentMonthKey = TODAY.substring(0, 7);

// ── Summary Card ──────────────────────────────────────────────
function SummaryCard({ icon: Icon, title, value, sub, accent = false }) {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 flex items-start gap-4">
      <div className={`p-3 rounded-xl flex-shrink-0 ${accent ? 'bg-amber-500/20' : 'bg-slate-700'}`}>
        <Icon className={`w-5 h-5 ${accent ? 'text-amber-400' : 'text-slate-300'}`} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-slate-400 mb-1">{title}</p>
        <p className="text-xl font-bold text-amber-400 truncate">{value}</p>
        <p className="text-xs text-slate-500 mt-0.5">{sub}</p>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────
export default function Inventory() {
  // ── Firestore data ───────────────────────────────────────
  const [items, setItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'inventory'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoadingItems(false);
    }, () => setLoadingItems(false));
    return () => unsub();
  }, []);

  // ── Summary computations ─────────────────────────────────
  const { spendThisMonth, countThisMonth, topCategory, allTimeSpend } = useMemo(() => {
    let spendThisMonth = 0;
    let countThisMonth = 0;
    let allTimeSpend = 0;
    const catSpend = {};

    items.forEach((item) => {
      const amt = Number(item.totalAmount) || 0;
      allTimeSpend += amt;
      if (getMonthKey(item.purchaseDate) === currentMonthKey) {
        spendThisMonth += amt;
        countThisMonth++;
        catSpend[item.category] = (catSpend[item.category] || 0) + amt;
      }
    });

    let topCategory = '—';
    let maxSpend = 0;
    Object.entries(catSpend).forEach(([cat, val]) => {
      if (val > maxSpend) { maxSpend = val; topCategory = cat; }
    });

    return { spendThisMonth, countThisMonth, topCategory, allTimeSpend };
  }, [items]);

  // ── Form state ───────────────────────────────────────────
  const emptyForm = {
    materialName: '',
    category: CATEGORIES[0],
    quantity: '',
    unit: UNITS[0],
    unitPrice: '',
    supplierName: '',
    purchaseDate: TODAY,
    notes: '',
  };
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const totalAmount = useMemo(
    () => (Number(form.quantity) || 0) * (Number(form.unitPrice) || 0),
    [form.quantity, form.unitPrice]
  );

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.materialName.trim()) return toast.error('Material Name is required');
    if (!form.category) return toast.error('Category is required');
    if (!form.quantity || Number(form.quantity) <= 0) return toast.error('Quantity must be > 0');
    if (!form.unit) return toast.error('Unit is required');
    if (form.unitPrice === '' || Number(form.unitPrice) < 0) return toast.error('Unit Price is required');
    if (!form.purchaseDate) return toast.error('Purchase Date is required');

    setSubmitting(true);
    try {
      await addDoc(collection(db, 'inventory'), {
        materialName: form.materialName.trim(),
        category: form.category,
        quantity: Number(form.quantity),
        unit: form.unit,
        unitPrice: Number(form.unitPrice),
        totalAmount: Number(form.quantity) * Number(form.unitPrice),
        supplierName: form.supplierName.trim(),
        purchaseDate: form.purchaseDate,
        notes: form.notes.trim(),
        createdAt: serverTimestamp(),
      });
      toast.success('Material added successfully');
      setForm({ ...emptyForm, purchaseDate: TODAY });
    } catch (err) {
      console.error(err);
      toast.error('Failed to add material');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Filters ──────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const term = search.toLowerCase();
    return items.filter((item) => {
      if (term && !item.materialName?.toLowerCase().includes(term) && !item.supplierName?.toLowerCase().includes(term)) return false;
      if (filterCategory && item.category !== filterCategory) return false;
      if (filterFrom && item.purchaseDate < filterFrom) return false;
      if (filterTo && item.purchaseDate > filterTo) return false;
      return true;
    });
  }, [items, search, filterCategory, filterFrom, filterTo]);

  const filteredTotal = useMemo(
    () => filtered.reduce((sum, i) => sum + (Number(i.totalAmount) || 0), 0),
    [filtered]
  );

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = useMemo(() => {
    const start = (page - 1) * ITEMS_PER_PAGE;
    return filtered.slice(start, start + ITEMS_PER_PAGE);
  }, [filtered, page]);

  // Reset to page 1 when filters change
  useEffect(() => { setPage(1); }, [search, filterCategory, filterFrom, filterTo]);

  const clearFilters = () => {
    setSearch('');
    setFilterCategory('');
    setFilterFrom('');
    setFilterTo('');
  };

  // ── Delete ────────────────────────────────────────────────
  const handleDelete = async (item) => {
    if (!window.confirm('Are you sure you want to delete this material entry? This cannot be undone.')) return;
    try {
      await deleteDoc(doc(db, 'inventory', item.id));
      toast.success('Material deleted successfully');
    } catch (err) {
      toast.error('Failed to delete material');
    }
  };

  // ── Render ────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold font-outfit text-slate-100">Inventory</h1>
        <p className="text-slate-400">Track and manage material purchases.</p>
      </div>

      {/* ── Section A: Summary Cards ─────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          icon={TrendingUp}
          title="Total Spend This Month"
          value={fmtRupees(spendThisMonth)}
          sub="Materials purchased this month"
          accent
        />
        <SummaryCard
          icon={Package}
          title="Items This Month"
          value={countThisMonth.toString()}
          sub="Purchase entries this month"
        />
        <SummaryCard
          icon={Tag}
          title="Top Category This Month"
          value={topCategory}
          sub="Highest spend category"
        />
        <SummaryCard
          icon={IndianRupee}
          title="Total Spend All Time"
          value={fmtRupees(allTimeSpend)}
          sub="All time materials spend"
          accent
        />
      </div>

      {/* ── Section B: Add Material Form ─────────────────── */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-slate-100 mb-5">Add Material Purchase</h2>
        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Row 1 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Material Name <span className="text-red-400">*</span></label>
              <input
                type="text"
                name="materialName"
                value={form.materialName}
                onChange={handleFormChange}
                placeholder="e.g. Steel Rod, Cement, Engine Oil"
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Category <span className="text-red-400">*</span></label>
              <select
                name="category"
                value={form.category}
                onChange={handleFormChange}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
              >
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* Row 2 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Quantity <span className="text-red-400">*</span></label>
              <input
                type="number"
                name="quantity"
                value={form.quantity}
                onChange={handleFormChange}
                min="0.01"
                step="0.01"
                placeholder="e.g. 10"
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Unit <span className="text-red-400">*</span></label>
              <select
                name="unit"
                value={form.unit}
                onChange={handleFormChange}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
              >
                {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Unit Price (₹) <span className="text-red-400">*</span></label>
              <input
                type="number"
                name="unitPrice"
                value={form.unitPrice}
                onChange={handleFormChange}
                min="0"
                placeholder="e.g. 500"
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
              />
            </div>
          </div>

          {/* Row 3 — Total Amount display */}
          <div className="bg-slate-900/60 border border-slate-700 rounded-lg px-4 py-3 flex items-center justify-between">
            <span className="text-sm text-slate-400">Total Amount</span>
            <span className="text-2xl font-bold text-amber-400">{fmtRupees(totalAmount)}</span>
          </div>

          {/* Row 4 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Supplier Name</label>
              <input
                type="text"
                name="supplierName"
                value={form.supplierName}
                onChange={handleFormChange}
                placeholder="e.g. Raju Hardware Store, Nellore"
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Purchase Date <span className="text-red-400">*</span></label>
              <input
                type="date"
                name="purchaseDate"
                value={form.purchaseDate}
                onChange={handleFormChange}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
              />
            </div>
          </div>

          {/* Row 5 */}
          <div>
            <label className="block text-sm text-slate-400 mb-1">Notes (optional)</label>
            <textarea
              name="notes"
              value={form.notes}
              onChange={handleFormChange}
              rows={2}
              placeholder="Any additional details about this purchase"
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-60 disabled:cursor-not-allowed text-slate-900 font-semibold py-3 rounded-lg transition-colors text-sm"
          >
            {submitting ? 'Adding...' : '+ Add Material'}
          </button>
        </form>
      </div>

      {/* ── Section C: Search & Filters ──────────────────── */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
        <div className="flex flex-wrap gap-3 items-end">
          {/* Search */}
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by material or supplier..."
              className="w-full bg-slate-900 border border-slate-600 rounded-lg pl-9 pr-3 py-2 text-slate-100 text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
            />
          </div>

          {/* Category filter */}
          <div>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
            >
              <option value="">All Categories</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* From date */}
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-400">From</label>
            <input
              type="date"
              value={filterFrom}
              onChange={(e) => setFilterFrom(e.target.value)}
              className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
            />
          </div>

          {/* To date */}
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-400">To</label>
            <input
              type="date"
              value={filterTo}
              onChange={(e) => setFilterTo(e.target.value)}
              className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
            />
          </div>

          {/* Clear */}
          {(search || filterCategory || filterFrom || filterTo) && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 text-slate-400 hover:text-amber-400 text-sm transition-colors px-2 py-2"
            >
              <X className="w-4 h-4" /> Clear
            </button>
          )}
        </div>

        {/* Filter summary line */}
        <p className="mt-3 text-sm text-slate-400">
          Showing <span className="text-slate-200">{filtered.length}</span> item{filtered.length !== 1 ? 's' : ''}{' '}
          — Total Spend: <span className="text-amber-400 font-semibold">{fmtRupees(filteredTotal)}</span>
        </p>
      </div>

      {/* ── Section D: Materials Table ────────────────────── */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-700 border-b border-slate-600">
                {['Date', 'Material Name', 'Category', 'Quantity', 'Unit Price', 'Total Amount', 'Supplier', 'Notes', 'Actions'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-sm font-semibold text-slate-300 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {loadingItems ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-slate-400">Loading inventory...</td>
                </tr>
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-2 text-slate-500">
                      <Package className="w-10 h-10" />
                      <p className="text-sm">
                        {filtered.length === 0 && items.length > 0
                          ? 'No materials match your filters.'
                          : 'No materials added yet. Add your first material purchase above.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginated.map((item, idx) => (
                  <tr
                    key={item.id}
                    className={`transition-colors hover:bg-slate-700/30 ${idx % 2 === 0 ? 'bg-slate-800/20' : 'bg-slate-800/40'}`}
                  >
                    {/* Date */}
                    <td className="px-4 py-3 text-sm text-slate-300 whitespace-nowrap">
                      {fmtDate(item.purchaseDate)}
                    </td>
                    {/* Material Name */}
                    <td className="px-4 py-3 text-sm font-medium text-slate-100 whitespace-nowrap">
                      {item.materialName}
                    </td>
                    {/* Category Badge */}
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${CATEGORY_BADGE[item.category] || CATEGORY_BADGE['Other']}`}>
                        {item.category}
                      </span>
                    </td>
                    {/* Quantity */}
                    <td className="px-4 py-3 text-sm text-slate-300 whitespace-nowrap">
                      {item.quantity} {item.unit}
                    </td>
                    {/* Unit Price */}
                    <td className="px-4 py-3 text-sm text-slate-300 whitespace-nowrap">
                      {fmtRupees(item.unitPrice)}
                    </td>
                    {/* Total Amount */}
                    <td className="px-4 py-3 text-sm font-bold text-amber-400 whitespace-nowrap">
                      {fmtRupees(item.totalAmount)}
                    </td>
                    {/* Supplier */}
                    <td className="px-4 py-3 text-sm text-slate-300">
                      {item.supplierName || '—'}
                    </td>
                    {/* Notes */}
                    <td className="px-4 py-3 text-sm text-slate-400 max-w-[160px]">
                      <span title={item.notes}>
                        {item.notes
                          ? item.notes.length > 40
                            ? item.notes.substring(0, 40) + '…'
                            : item.notes
                          : '—'}
                      </span>
                    </td>
                    {/* Actions */}
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleDelete(item)}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white border border-red-500/20 rounded-lg text-xs font-medium transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loadingItems && filtered.length > 0 && (
          <div className="px-4 py-3 border-t border-slate-700/50 flex items-center justify-between gap-3">
            <p className="text-sm text-slate-400">
              Showing {Math.min((page - 1) * ITEMS_PER_PAGE + 1, filtered.length)}–{Math.min(page * ITEMS_PER_PAGE, filtered.length)} of {filtered.length} items
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pg;
                if (totalPages <= 5) pg = i + 1;
                else if (page <= 3) pg = i + 1;
                else if (page >= totalPages - 2) pg = totalPages - 4 + i;
                else pg = page - 2 + i;
                return (
                  <button
                    key={pg}
                    onClick={() => setPage(pg)}
                    className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                      page === pg
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
                    }`}
                  >
                    {pg}
                  </button>
                );
              })}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

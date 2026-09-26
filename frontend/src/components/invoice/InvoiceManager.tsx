import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { InvoiceCategory, InvoiceItem } from '../../types';
import { invoiceApi } from '../../services/api';
import { downloadScheduleImage, copyScheduleImageToClipboard, captureElementToBlob } from '../../utils/screenshot';
import { exportInvoiceToExcel } from '../../utils/exportInvoiceExcel';
import JSZip from 'jszip';
import {
  Camera,
  Copy,
  Receipt,
  ArrowLeft,
  Check,
  Plus,
  Trash2,
  Edit2,
  Sparkles,
  FileSpreadsheet,
  Database,
  Archive,
  Loader2,
} from 'lucide-react';
import { InvoiceScannerModal } from './InvoiceScannerModal';

// Initial fallback categories matching Image 1
const INITIAL_CATEGORIES: InvoiceCategory[] = [
  { id: 1, name: '야채 (Rau)', categoryType: 'Daily', isPaid: false, displayOrder: 1, fixedAmount: 0 },
  { id: 2, name: '가스 (Gas)', categoryType: 'Daily', isPaid: false, displayOrder: 2, fixedAmount: 0 },
  { id: 3, name: '삼겹살 - 쪽갈비 - KEYFOOD', categoryType: 'Supplier', isPaid: false, displayOrder: 3, fixedAmount: 0 },
  { id: 4, name: '삼겹살 - 쪽갈비 - 소갈비 - AN PHÁT', categoryType: 'Supplier', isPaid: false, displayOrder: 4, fixedAmount: 0 },
  { id: 5, name: '항정살 - 막창 (Khấu heo - Má heo)', categoryType: 'Supplier', isPaid: false, displayOrder: 5, fixedAmount: 0 },
  { id: 6, name: '과일 소주 (Rượu Soju hoa quả)', categoryType: 'Supplier', isPaid: false, displayOrder: 6, fixedAmount: 0 },
  { id: 7, name: '옥수수 (Ngô)', categoryType: 'Daily', isPaid: false, displayOrder: 7, fixedAmount: 0 },
  { id: 8, name: '고사리 - 고추 (Dương xỉ - Bột ớt)', categoryType: 'Daily', isPaid: false, displayOrder: 8, fixedAmount: 0 },
  { id: 9, name: '음료수 (Nước ngọt - Đồ uống)', categoryType: 'Supplier', isPaid: false, displayOrder: 9, fixedAmount: 0 },
  { id: 10, name: '원마켓 (One Market)', categoryType: 'Supplier', isPaid: false, displayOrder: 10, fixedAmount: 0 },
  { id: 11, name: '주방세제 - 바닥세정제 (Nước rửa bát - Nước lau sàn)', categoryType: 'Daily', isPaid: false, displayOrder: 11, fixedAmount: 0 },
  { id: 12, name: '베트남 술 (Rượu Việt)', categoryType: 'Supplier', isPaid: false, displayOrder: 12, fixedAmount: 0 },
];

const yearsList = [2024, 2025, 2026, 2027, 2028, 2029, 2030, 2031];

export const InvoiceManager: React.FC = () => {
  const [selectedMonth, setSelectedMonth] = useState<number>(() => {
    const saved = localStorage.getItem('tang2_invoice_selected_month');
    return saved ? Number(saved) : 9;
  });
  const [selectedYear, setSelectedYear] = useState<number>(() => {
    const saved = localStorage.getItem('tang2_invoice_selected_year');
    return saved ? Number(saved) : 2026;
  });
  const [isDbSynced, setIsDbSynced] = useState<boolean>(true);
  const [categories, setCategories] = useState<InvoiceCategory[]>(INITIAL_CATEGORIES);
  const [activeCategoryId, setActiveCategoryId] = useState<number | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState<boolean>(false);

  // Modal Thêm Mục Hóa Đơn Mới
  const [showAddCategoryModal, setShowAddCategoryModal] = useState<boolean>(false);
  const [newCatName, setNewCatName] = useState<string>('');
  const [newCatType, setNewCatType] = useState<'Daily' | 'Supplier'>('Daily');
  const [newCatFixedAmount, setNewCatFixedAmount] = useState<number>(0);

  // Modal Xóa / Làm Sạch Dữ Liệu
  const [showClearModal, setShowClearModal] = useState<boolean>(false);

  // Modal Xóa Hóa Đơn Theo Ngày
  const [showDeleteDateModal, setShowDeleteDateModal] = useState<boolean>(false);
  const [isDeletingDate, setIsDeletingDate] = useState<boolean>(false);

  // Xuất trọn bộ ảnh (.ZIP)
  const [isExportingZip, setIsExportingZip] = useState<boolean>(false);
  const [zipProgress, setZipProgress] = useState<{ current: number; total: number; name: string } | null>(null);

  useEffect(() => {
    localStorage.setItem('tang2_invoice_selected_month', String(selectedMonth));
  }, [selectedMonth]);

  useEffect(() => {
    localStorage.setItem('tang2_invoice_selected_year', String(selectedYear));
  }, [selectedYear]);

  // Items per category - Khởi tạo rỗng, hoàn toàn đọc từ Database SQL Server
  const [categoryItems, setCategoryItems] = useState<Record<number, InvoiceItem[]>>({});

  const summaryTableRef = useRef<HTMLDivElement>(null);
  const detailTableRef = useRef<HTMLDivElement>(null);

  const [toast, setToast] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  // Load from API on mount and when period changes
  useEffect(() => {
    // Reset cache các mặt hàng khi đổi tháng/năm để không bị dính dữ liệu cũ
    setCategoryItems({});
    const fetchData = async () => {
      try {
        const fetchedCats = await invoiceApi.getCategories(selectedMonth, selectedYear);
        if (fetchedCats && fetchedCats.length > 0) {
          setCategories(fetchedCats);
          setIsDbSynced(true);
        }
      } catch (err) {
        console.log('Using local fallback for invoices:', err);
        setIsDbSynced(false);
      }
    };
    fetchData();
  }, [selectedMonth, selectedYear]);

  // When active category changes, fetch items from API if available
  useEffect(() => {
    if (!activeCategoryId) return;
    const fetchItems = async () => {
      try {
        const items = await invoiceApi.getItemsByCategory(activeCategoryId, selectedMonth, selectedYear);
        setCategoryItems((prev) => ({ ...prev, [activeCategoryId]: items || [] }));
      } catch (err) {
        console.log('Using local fallback for items:', err);
      }
    };
    fetchItems();
  }, [activeCategoryId, selectedMonth, selectedYear]);

  const activeCategory = categories.find((c) => c.id === activeCategoryId);
  const currentItems = activeCategoryId ? categoryItems[activeCategoryId] || [] : [];

  // Toggle paid checkbox
  const handleTogglePaid = async (catId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    // Local optimistic update
    setCategories((prev) =>
      prev.map((c) => (c.id === catId ? { ...c, isPaid: !c.isPaid } : c))
    );
    try {
      await invoiceApi.togglePayment(catId, selectedMonth, selectedYear);
    } catch (err) {
      console.log('Payment toggled locally:', err);
    }
  };

  // Calculate total for each category
  const getCategoryTotal = (cat: InvoiceCategory) => {
    const items = categoryItems[cat.id];
    if (items !== undefined) {
      return items.reduce((sum, i) => sum + (i.totalPayment > 0 ? i.totalPayment : (i.amount - (i.depositFee || 0))), 0);
    }
    return cat.fixedAmount || cat.totalAmount || 0;
  };

  // Grand Total for Image 1
  const grandTotal = useMemo(() => {
    return categories.reduce((sum, c) => sum + getCategoryTotal(c), 0);
  }, [categories, categoryItems]);

  // Group items by Date for Daily view (Image 2)
  const groupedDailyItems = useMemo(() => {
    const groups: { dateStr: string; items: InvoiceItem[]; dayTotal: number }[] = [];
    const dateMap = new Map<string, InvoiceItem[]>();

    currentItems.forEach((item) => {
      const d = item.dateStr || 'Khác';
      if (!dateMap.has(d)) dateMap.set(d, []);
      dateMap.get(d)!.push(item);
    });

    dateMap.forEach((items, dateStr) => {
      const dayTotal = items.reduce((s, i) => s + (i.totalPayment > 0 ? i.totalPayment : i.amount), 0);
      groups.push({ dateStr, items, dayTotal });
    });

    return groups;
  }, [currentItems]);

  // Grand Total for Active Category detail
  const activeCategoryTotal = useMemo(() => {
    return currentItems.reduce((sum, i) => sum + (i.totalPayment > 0 ? i.totalPayment : i.amount), 0);
  }, [currentItems]);

  // Modal Item Editing State
  const [editingItem, setEditingItem] = useState<Partial<InvoiceItem> | null>(null);
  const [isNewItem, setIsNewItem] = useState(false);

  const handleOpenAddModal = () => {
    if (!activeCategoryId) return;
    setEditingItem({
      categoryId: activeCategoryId,
      dateStr: '1/9',
      itemName: '',
      unit: activeCategoryId === 12 || activeCategoryId === 11 || activeCategory?.name.includes('주방세제') || activeCategory?.name.includes('Nước rửa') ? 'Can' : (activeCategoryId === 2 ? 'Thùng' : (activeCategory?.categoryType === 'Supplier' ? 'kg' : '')),
      quantity: 1,
      unitPrice: 0,
      taxRate: activeCategoryId === 4 ? 5 : 0, // An Phát có thuế 5%
      depositFee: 0,
      shipFee: 0,
    });
    setIsNewItem(true);
  };

  const handleOpenEditModal = (item: InvoiceItem) => {
    setEditingItem({ ...item });
    setIsNewItem(false);
  };

  const handleSaveItemModal = async () => {
    if (!editingItem || !activeCategoryId || !editingItem.itemName) return;

    const qty = Number(editingItem.quantity) || 0;
    const price = Number(editingItem.unitPrice) || 0;
    const taxR = Number(editingItem.taxRate) || 0;
    const depositF = Number(editingItem.depositFee) || 0;
    const shipF = Number(editingItem.shipFee) || 0;
    const amount = qty * price;
    const taxAmount = taxR > 0 ? Math.round(amount * (taxR / 100)) : 0;
    let totalPayment = amount + taxAmount;
    if (depositF > 0) {
      totalPayment = amount - depositF;
    }
    if (shipF > 0) {
      totalPayment = amount + shipF;
    }

    const itemToSave: InvoiceItem = {
      id: isNewItem ? 0 : (editingItem.id || 0),
      categoryId: activeCategoryId,
      dateStr: editingItem.dateStr || '1/9',
      itemName: editingItem.itemName,
      unit: editingItem.unit || '',
      quantity: qty,
      unitPrice: price,
      taxRate: taxR,
      taxAmount,
      amount,
      totalPayment,
      depositFee: depositF,
      shipFee: shipF,
      displayOrder: editingItem.displayOrder || currentItems.length + 1,
      note: editingItem.note || '',
      month: selectedMonth,
      year: selectedYear,
    };

    if (isNewItem) {
      try {
        const saved = await invoiceApi.createItem({ ...itemToSave, id: 0 });
        const freshItems = await invoiceApi.getItemsByCategory(activeCategoryId, selectedMonth, selectedYear);
        setCategoryItems((prev) => ({
          ...prev,
          [activeCategoryId]: freshItems && freshItems.length > 0 ? freshItems : [...(prev[activeCategoryId] || []), saved || itemToSave],
        }));

        const updatedCats = await invoiceApi.getCategories(selectedMonth, selectedYear);
        if (updatedCats && updatedCats.length > 0) setCategories(updatedCats);

        showToast(`💾 Đã lưu mặt hàng [${itemToSave.itemName}] vào Database SQL Server!`);
      } catch (e) {
        console.error('Error saving item to DB:', e);
        setCategoryItems((prev) => ({
          ...prev,
          [activeCategoryId]: [...(prev[activeCategoryId] || []), itemToSave],
        }));
        showToast(`Đã thêm mặt hàng [${itemToSave.itemName}]!`);
      }
    } else {
      try {
        if (itemToSave.id) await invoiceApi.updateItem(itemToSave.id, itemToSave);
        const freshItems = await invoiceApi.getItemsByCategory(activeCategoryId, selectedMonth, selectedYear);
        setCategoryItems((prev) => ({
          ...prev,
          [activeCategoryId]: freshItems && freshItems.length > 0
            ? freshItems
            : (prev[activeCategoryId] || []).map((i) => (i.id === itemToSave.id ? itemToSave : i)),
        }));

        const updatedCats = await invoiceApi.getCategories(selectedMonth, selectedYear);
        if (updatedCats && updatedCats.length > 0) setCategories(updatedCats);

        showToast(`💾 Đã cập nhật [${itemToSave.itemName}] trong Database!`);
      } catch (e) {
        console.error('Error updating item in DB:', e);
        setCategoryItems((prev) => ({
          ...prev,
          [activeCategoryId]: (prev[activeCategoryId] || []).map((i) =>
            i.id === itemToSave.id ? itemToSave : i
          ),
        }));
        showToast(`Đã cập nhật [${itemToSave.itemName}]!`);
      }
    }

    setEditingItem(null);
  };

  const handleDeleteItem = async (itemId: number) => {
    if (!activeCategoryId) return;
    if (!window.confirm('Bạn có chắc chắn muốn xóa mặt hàng này khỏi hóa đơn?')) return;

    try {
      await invoiceApi.deleteItem(itemId);
      const freshItems = await invoiceApi.getItemsByCategory(activeCategoryId);
      setCategoryItems((prev) => ({
        ...prev,
        [activeCategoryId]: freshItems || (prev[activeCategoryId] || []).filter((i) => i.id !== itemId),
      }));

      const updatedCats = await invoiceApi.getCategories();
      if (updatedCats && updatedCats.length > 0) setCategories(updatedCats);

      showToast('🗑️ Đã xóa mặt hàng khỏi Database!');
    } catch (e) {
      console.error('Error deleting item from DB:', e);
      setCategoryItems((prev) => ({
        ...prev,
        [activeCategoryId]: (prev[activeCategoryId] || []).filter((i) => i.id !== itemId),
      }));
      showToast('Đã xóa mặt hàng!');
    }
  };

  // Distinct dates in current category with their item count and total money
  const availableDates = useMemo(() => {
    const map = new Map<string, { count: number; total: number }>();
    currentItems.forEach((it) => {
      const d = it.dateStr ? it.dateStr.trim() : 'Chưa đặt ngày';
      const amount = it.totalPayment > 0 ? it.totalPayment : (it.amount || 0);
      const existing = map.get(d) || { count: 0, total: 0 };
      map.set(d, { count: existing.count + 1, total: existing.total + amount });
    });
    return Array.from(map.entries()).map(([dateStr, stats]) => ({
      dateStr,
      count: stats.count,
      total: stats.total,
    }));
  }, [currentItems]);

  // Handler for deleting all items of a specific date in current category
  const handleDeleteByDate = async (dateStr: string, itemCount?: number, totalAmount?: number) => {
    if (!activeCategoryId) return;
    const countInfo = itemCount ? ` (gồm ${itemCount} mặt hàng${totalAmount ? `, tổng ${totalAmount.toLocaleString('vi-VN')} đ` : ''})` : '';
    const confirmMsg = `Bạn có chắc chắn muốn xóa toàn bộ hóa đơn của ngày "${dateStr}"${countInfo} không?\n\nToàn bộ các mặt hàng của ngày này sẽ bị xóa khỏi cơ sở dữ liệu!`;
    if (!window.confirm(confirmMsg)) return;

    try {
      setIsDeletingDate(true);
      await invoiceApi.deleteItemsByDate(activeCategoryId, dateStr, selectedMonth, selectedYear);
      const freshItems = await invoiceApi.getItemsByCategory(activeCategoryId, selectedMonth, selectedYear);
      setCategoryItems((prev) => ({
        ...prev,
        [activeCategoryId]: freshItems || (prev[activeCategoryId] || []).filter((i) => (i.dateStr || '').trim() !== dateStr.trim()),
      }));

      const updatedCats = await invoiceApi.getCategories(selectedMonth, selectedYear);
      if (updatedCats && updatedCats.length > 0) setCategories(updatedCats);

      setShowDeleteDateModal(false);
      showToast(`🗑️ Đã xóa toàn bộ hóa đơn ngày ${dateStr}!`);
    } catch (e) {
      console.error('Error deleting items by date:', e);
      setCategoryItems((prev) => ({
        ...prev,
        [activeCategoryId]: (prev[activeCategoryId] || []).filter((i) => (i.dateStr || '').trim() !== dateStr.trim()),
      }));
      setShowDeleteDateModal(false);
      showToast(`Đã xóa các mặt hàng ngày ${dateStr}!`);
    } finally {
      setIsDeletingDate(false);
    }
  };

  // Modal edit category fixed amount
  const [editingCategoryAmount, setEditingCategoryAmount] = useState<InvoiceCategory | null>(null);
  const [fixedAmountInput, setFixedAmountInput] = useState<number>(0);

  const handleSaveFixedAmount = async () => {
    if (!editingCategoryAmount) return;
    setCategories((prev) =>
      prev.map((c) =>
        c.id === editingCategoryAmount.id ? { ...c, fixedAmount: fixedAmountInput } : c
      )
    );
    try {
      await invoiceApi.updateCategory(
        editingCategoryAmount.id,
        {
          ...editingCategoryAmount,
          fixedAmount: fixedAmountInput,
        },
        selectedMonth,
        selectedYear
      );
      const updatedCats = await invoiceApi.getCategories(selectedMonth, selectedYear);
      if (updatedCats && updatedCats.length > 0) setCategories(updatedCats);
      showToast(`💾 Đã cập nhật số tiền [${editingCategoryAmount.name}] Tháng ${selectedMonth}/${selectedYear} vào Database!`);
    } catch (e) {
      console.error('Error updating category fixed amount:', e);
      showToast(`Đã cập nhật số tiền cho [${editingCategoryAmount.name}]!`);
    }
    setEditingCategoryAmount(null);
  };

  // Handler for saving items scanned by AI directly into SQL Server DB
  const handleSaveScannedItems = async (categoryId: number, items: Partial<InvoiceItem>[]) => {
    const existingCount = categoryItems[categoryId]?.length || 0;
    
    // Prepare items with id = 0 so SQL Server auto-generates primary key
    const itemsPayload = items.map((it, idx) => ({
      id: 0,
      categoryId,
      dateStr: it.dateStr || '20/9',
      itemName: it.itemName || '',
      unit: it.unit || 'kg',
      quantity: Number(it.quantity) || 1,
      unitPrice: Number(it.unitPrice) || 0,
      taxRate: Number(it.taxRate) || 0,
      taxAmount: Number(it.taxAmount) || 0,
      amount: Number(it.amount) || Math.round((Number(it.quantity) || 1) * (Number(it.unitPrice) || 0)),
      totalPayment: Number(it.totalPayment) || Number(it.amount) || 0,
      depositFee: Number(it.depositFee) || 0,
      shipFee: Number(it.shipFee) || 0,
      displayOrder: existingCount + idx + 1,
      note: it.note || '',
      month: selectedMonth,
      year: selectedYear,
    }));

    try {
      // 1. Save directly to SQL Server database via batch API
      const savedItems = await invoiceApi.createBatchItems(itemsPayload, selectedMonth, selectedYear);

      // 2. Fetch fresh items from database for this category
      const freshItems = await invoiceApi.getItemsByCategory(categoryId, selectedMonth, selectedYear);
      setCategoryItems((prev) => ({
        ...prev,
        [categoryId]: freshItems && freshItems.length > 0 
          ? freshItems 
          : (savedItems?.length ? [...(prev[categoryId] || []), ...savedItems] : itemsPayload),
      }));

      // 3. Switch view to this category
      setActiveCategoryId(categoryId);

      // 4. Update categories summary so total reflects database immediately
      const updatedCats = await invoiceApi.getCategories(selectedMonth, selectedYear);
      if (updatedCats && updatedCats.length > 0) {
        setCategories(updatedCats);
      }

      showToast(`💾 Đã lưu thành công ${itemsPayload.length} mặt hàng vào Database SQL Server!`);
    } catch (err) {
      console.error('Lỗi khi lưu vào database SQL Server:', err);
      // Fallback local update
      setCategoryItems((prev) => ({
        ...prev,
        [categoryId]: [
          ...(prev[categoryId] || []),
          ...itemsPayload.map((it, idx) => ({ ...it, id: Date.now() + idx })),
        ],
      }));
      setActiveCategoryId(categoryId);
      showToast('⚠️ Không kết nối được Database, đã lưu tạm vào bộ nhớ.');
    }
  };

  // Create new invoice category
  const handleCreateCategory = async () => {
    if (!newCatName.trim()) {
      alert('Vui lòng nhập tên mục hóa đơn!');
      return;
    }

    try {
      const created = await invoiceApi.createCategory({
        name: newCatName.trim(),
        categoryType: newCatType,
        fixedAmount: Number(newCatFixedAmount) || 0,
      });

      const freshCats = await invoiceApi.getCategories();
      if (freshCats && freshCats.length > 0) {
        setCategories(freshCats);
      } else if (created) {
        setCategories((prev) => [...prev, created]);
      }

      showToast(`💾 Đã thêm mục hóa đơn [${newCatName.trim()}] vào Database SQL Server!`);
      setShowAddCategoryModal(false);
      setNewCatName('');
      setNewCatFixedAmount(0);
    } catch (err) {
      console.error('Lỗi khi thêm hạng mục:', err);
      // Fallback local update
      const fallbackCat: InvoiceCategory = {
        id: Date.now(),
        name: newCatName.trim(),
        categoryType: newCatType,
        isPaid: false,
        displayOrder: categories.length + 1,
        fixedAmount: Number(newCatFixedAmount) || 0,
      };
      setCategories((prev) => [...prev, fallbackCat]);
      showToast(`Đã thêm mục [${newCatName.trim()}]!`);
      setShowAddCategoryModal(false);
      setNewCatName('');
      setNewCatFixedAmount(0);
    }
  };

  // Delete an invoice category from DB
  const handleDeleteCategory = async (catId: number, catName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`Bạn có chắc chắn muốn xóa mục [${catName}] cùng toàn bộ hóa đơn của mục này khỏi Database SQL Server?`)) return;

    try {
      await invoiceApi.deleteCategory(catId);
      setCategories((prev) => prev.filter((c) => c.id !== catId));
      setCategoryItems((prev) => {
        const copy = { ...prev };
        delete copy[catId];
        return copy;
      });
      showToast(`🗑️ Đã xóa mục [${catName}] khỏi Database SQL Server!`);
    } catch (err) {
      console.error('Lỗi khi xóa mục hóa đơn:', err);
      setCategories((prev) => prev.filter((c) => c.id !== catId));
      showToast(`Đã xóa mục [${catName}]!`);
    }
  };

  // Clear / Làm sạch tất cả dữ liệu hóa đơn trong DB cho đúng Tháng đang chọn
  const handleClearData = async () => {
    try {
      await invoiceApi.clearInvoiceData(selectedMonth, selectedYear, activeCategoryId || undefined);
      if (activeCategoryId) {
        setCategoryItems((prev) => ({ ...prev, [activeCategoryId]: [] }));
      } else {
        setCategoryItems({});
      }

      // Re-fetch fresh categories from DB immediately to update summary table
      const freshCats = await invoiceApi.getCategories(selectedMonth, selectedYear);
      if (freshCats && freshCats.length > 0) {
        setCategories(freshCats);
      } else {
        setCategories((prev) =>
          prev.map((c) =>
            !activeCategoryId || c.id === activeCategoryId
              ? { ...c, fixedAmount: 0, totalAmount: 0, itemCount: 0, isPaid: false }
              : c
          )
        );
      }

      if (activeCategoryId) {
        showToast(`🗑️ Đã làm sạch số tiền mục [${activeCategory?.name}] Tháng ${selectedMonth}/${selectedYear} trong Database (Giữ nguyên mục)!`);
      } else {
        showToast(`🗑️ Đã làm sạch toàn bộ số tiền hóa đơn Tháng ${selectedMonth}/${selectedYear} trong Database (Giữ nguyên toàn bộ danh mục)!`);
      }
    } catch (err) {
      console.error('Lỗi khi làm sạch dữ liệu hóa đơn:', err);
      // Optimistic local fallback
      if (activeCategoryId) {
        setCategoryItems((prev) => ({ ...prev, [activeCategoryId]: [] }));
        setCategories((prev) =>
          prev.map((c) =>
            c.id === activeCategoryId
              ? { ...c, fixedAmount: 0, totalAmount: 0, itemCount: 0, isPaid: false }
              : c
          )
        );
      } else {
        setCategoryItems({});
        setCategories((prev) =>
          prev.map((c) => ({ ...c, fixedAmount: 0, totalAmount: 0, itemCount: 0, isPaid: false }))
        );
      }
      showToast(`Đã làm sạch số tiền hóa đơn Tháng ${selectedMonth}/${selectedYear}!`);
    }
    setShowClearModal(false);
  };

  // Export Excel handler for boss
  const handleExportExcel = () => {
    exportInvoiceToExcel(
      selectedMonth,
      selectedYear,
      categories,
      categoryItems,
      activeCategoryId
    );
    const catName = activeCategory ? activeCategory.name : 'Tổng hợp 12 hạng mục';
    showToast(`📊 Đã xuất file Excel hóa đơn [${catName}] Tháng ${selectedMonth}/${selectedYear} gửi sếp!`);
  };

  // Screenshot & Copy handlers
  const handleDownload = async (ref: React.RefObject<HTMLDivElement | null>, name: string) => {
    if (!ref.current) return;
    await downloadScheduleImage(ref.current, name);
    showToast('📸 Đã tải ảnh Ultra HD về máy! Gửi dạng File vào Zalo để hình ảnh sắc nét 100%.');
  };

  const handleCopy = async (ref: React.RefObject<HTMLDivElement | null>) => {
    if (!ref.current) return;
    await copyScheduleImageToClipboard(ref.current);
    showToast('📋 Đã copy ảnh! Khi dán vào Zalo hãy tích chọn [HD] để ảnh nét 100%.');
  };

  // Tải toàn bộ ảnh hóa đơn (Bảng tổng hợp + Chi tiết từng mục) đóng gói vào 1 file ZIP
  const handleExportAllInvoiceImagesZip = async () => {
    if (isExportingZip) return;
    setIsExportingZip(true);
    const totalSteps = categories.length + 1;
    setZipProgress({ current: 0, total: totalSteps, name: 'Bắt đầu nén ảnh hóa đơn...' });

    const originalCategoryId = activeCategoryId;

    try {
      // 1. Tải trước toàn bộ dữ liệu mặt hàng của các mục chưa có trong state để tránh bảng trống
      setZipProgress({ current: 0, total: totalSteps, name: 'Đang chuẩn bị dữ liệu các mục...' });
      const updatedItems = { ...categoryItems };
      for (const cat of categories) {
        if (!updatedItems[cat.id]) {
          try {
            const items = await invoiceApi.getItemsByCategory(cat.id, selectedMonth, selectedYear);
            updatedItems[cat.id] = items || [];
          } catch {
            updatedItems[cat.id] = [];
          }
        }
      }
      setCategoryItems(updatedItems);

      const zip = new JSZip();

      // 2. Chụp Bảng Tổng Hợp Chi Phí Hóa Đơn & Nhập Hàng
      setZipProgress({ current: 1, total: totalSteps, name: '📸 Bảng Tổng Hợp Chi Phí Hóa Đơn' });
      setActiveCategoryId(null);
      await new Promise((r) => setTimeout(r, 250));

      if (summaryTableRef.current) {
        const summaryBlob = await captureElementToBlob(summaryTableRef.current, 2.5);
        if (summaryBlob) {
          zip.file(`00_Bang_Tong_Hop_Chi_Phi_Hoa_Don_Thang_${selectedMonth}_${selectedYear}.png`, summaryBlob);
        }
      }

      // 3. Lần lượt chụp bảng chi tiết của từng mục hóa đơn
      for (let i = 0; i < categories.length; i++) {
        const cat = categories[i];
        const idxStr = String(i + 1).padStart(2, '0');
        setZipProgress({
          current: i + 2,
          total: totalSteps,
          name: `📸 Hóa đơn [${cat.name}] (${i + 1}/${categories.length})`,
        });

        setActiveCategoryId(cat.id);
        await new Promise((r) => setTimeout(r, 250));

        if (detailTableRef.current) {
          const detailBlob = await captureElementToBlob(detailTableRef.current, 2.5);
          if (detailBlob) {
            const safeName = cat.name.replace(/[^a-zA-Z0-9\u00C0-\u1EF9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
            zip.file(`${idxStr}_Hoa_Don_${safeName}_Thang_${selectedMonth}_${selectedYear}.png`, detailBlob);
          }
        }
      }

      // 4. Nén file ZIP
      setZipProgress({
        current: totalSteps,
        total: totalSteps,
        name: '📦 Đang nén các ảnh vào file ZIP...',
      });

      const zipContent = await zip.generateAsync({ type: 'blob' });

      // 5. Kích hoạt tải về máy
      const url = URL.createObjectURL(zipContent);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `Tron_Bo_Hoa_Don_Nhap_Hang_Tang2_Thang_${selectedMonth}_${selectedYear}.zip`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        try {
          if (document.body.contains(a)) document.body.removeChild(a);
          URL.revokeObjectURL(url);
        } catch {}
      }, 3000);

      showToast('📦 Đã tải trọn bộ ảnh hóa đơn (.ZIP) thành công!');
    } catch (err) {
      console.error('Lỗi khi nén file ZIP hóa đơn:', err);
      showToast('⚠️ Có lỗi khi tạo file ZIP, vui lòng thử lại.');
    } finally {
      setActiveCategoryId(originalCategoryId);
      setIsExportingZip(false);
      setZipProgress(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 bg-emerald-800 text-white px-5 py-3 rounded-xl shadow-2xl font-bold animate-in slide-in-from-top-3 text-sm">
          <Check className="w-5 h-5" />
          <span>{toast}</span>
        </div>
      )}

      {/* Top Bar Navigation for Invoices - 2-Tier Modern Layout */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Tier 1: Header & Period Selector */}
        <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 bg-gradient-to-r from-slate-50/60 to-white">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#245839] to-teal-800 text-white flex items-center justify-center font-bold text-lg shadow-sm shrink-0">
              <Receipt className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="text-xl font-black text-slate-800 tracking-tight">
                  Quản Lý Hóa Đơn & Nhập Hàng
                </h2>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold">
                  <Database className={`w-3.5 h-3.5 ${isDbSynced ? 'text-emerald-600' : 'text-amber-500'}`} />
                  <span>{isDbSynced ? 'Đã lưu SQL Server' : 'Đang kết nối DB...'}</span>
                </div>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                {activeCategory
                  ? `Đang xem: Chi tiết hóa đơn [${activeCategory.name}] (${currentItems.length} mặt hàng)`
                  : `Bảng tổng hợp chi phí 12 hạng mục & NCC tháng ${selectedMonth}/${selectedYear}`}
              </p>
            </div>
          </div>

          {/* Period Selector (Kỳ hóa đơn) */}
          <div className="inline-flex items-center gap-2 bg-slate-100/90 p-1.5 rounded-xl border border-slate-200 shadow-2xs self-start md:self-auto">
            <span className="text-xs font-bold text-slate-600 pl-2">Kỳ hóa đơn:</span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="text-xs font-bold bg-white text-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 shadow-2xs hover:border-emerald-500 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden cursor-pointer"
            >
              {[...Array(12)].map((_, i) => (
                <option key={i + 1} value={i + 1}>
                  Tháng {i + 1}
                </option>
              ))}
            </select>
            <span className="text-slate-300 font-bold">/</span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="text-xs font-bold bg-white text-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 shadow-2xs hover:border-emerald-500 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden cursor-pointer"
            >
              {yearsList.map((y) => (
                <option key={y} value={y}>
                  Năm {y}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Tier 2: Action Controls & Quick Summary */}
        <div className="px-4 py-2.5 sm:px-5 flex flex-col xl:flex-row xl:items-center justify-between gap-3 bg-white border-t border-slate-100">
          <div className="flex items-center gap-2 shrink-0">
            {activeCategory ? (
              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => setActiveCategoryId(null)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition border border-slate-200 shadow-2xs cursor-pointer whitespace-nowrap"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>← Bảng Tổng</span>
                </button>
                <div className="flex items-center gap-1.5 text-xs bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-200 text-blue-900 font-bold whitespace-nowrap">
                  <span className="text-blue-700 font-medium">Tổng hóa đơn:</span>
                  <span className="text-sm font-black text-blue-950">{activeCategoryTotal.toLocaleString('vi-VN')} đ</span>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 whitespace-nowrap">
                <div className="flex items-center gap-1.5 text-xs bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 text-emerald-900 font-bold">
                  <span className="text-emerald-700 font-semibold">Tổng chi phí:</span>
                  <span className="text-sm font-black text-emerald-950">{grandTotal.toLocaleString('vi-VN')} đ</span>
                </div>
                <div className="flex items-center gap-1 text-[11px] bg-slate-100 px-2.5 py-1.5 rounded-xl border border-slate-200 text-slate-600 font-semibold">
                  <span className="text-slate-500">Đã thanh toán:</span>
                  <span className="font-bold text-slate-800">
                    {categories.filter((c) => c.isPaid).length}/{categories.length}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons: Unified, Clean, Professional */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Nhóm 1: Thao tác dữ liệu */}
            {!activeCategory ? (
              <button
                onClick={() => setShowAddCategoryModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs shadow-xs transition hover:scale-[1.01] active:scale-[0.99] cursor-pointer whitespace-nowrap"
                title="Thêm một hạng mục hóa đơn hoặc nhà cung cấp mới vào bảng tổng hợp"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Thêm Mục Mới</span>
              </button>
            ) : (
              <button
                onClick={handleOpenAddModal}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs shadow-xs transition hover:scale-[1.01] active:scale-[0.99] cursor-pointer whitespace-nowrap"
                title="Thêm mặt hàng mới vào hóa đơn này"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Thêm Mặt Hàng</span>
              </button>
            )}

            {/* Quét Hóa Đơn AI */}
            <button
              onClick={() => setIsScannerOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold rounded-xl text-xs shadow-xs transition hover:scale-[1.01] active:scale-[0.99] cursor-pointer whitespace-nowrap"
              title="Dùng Camera hoặc Tải ảnh hóa đơn để AI tự động nhận diện và điền vào bảng"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Quét Hóa Đơn (AI)</span>
            </button>

            {/* Xóa hóa đơn theo ngày */}
            {activeCategory && currentItems.length > 0 && (
              <button
                onClick={() => setShowDeleteDateModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs shadow-xs transition hover:scale-[1.01] active:scale-[0.99] cursor-pointer whitespace-nowrap"
                title="Xóa toàn bộ các mặt hàng của một ngày trong hóa đơn này nếu lỡ nhập nhầm"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Xóa Theo Ngày</span>
              </button>
            )}

            {/* Ngăn cách trực quan */}
            <div className="h-5 w-px bg-slate-200 mx-0.5 hidden sm:block"></div>

            {/* Nhóm 2: Xuất báo cáo & chia sẻ */}
            <button
              onClick={handleExportExcel}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 font-bold rounded-xl text-xs border border-slate-200 hover:border-emerald-300 shadow-2xs transition cursor-pointer whitespace-nowrap"
              title="Xuất bảng tổng hợp và chi tiết mặt hàng ra file Excel (.xlsx) gửi sếp"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Xuất Excel</span>
            </button>

            <button
              onClick={() =>
                activeCategory
                  ? handleCopy(detailTableRef)
                  : handleCopy(summaryTableRef)
              }
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 font-bold rounded-xl text-xs border border-slate-200 hover:border-blue-300 shadow-2xs transition cursor-pointer whitespace-nowrap"
              title="Copy ảnh hóa đơn độ nét cao để gửi nhanh qua Zalo"
            >
              <Copy className="w-3.5 h-3.5 text-blue-600" />
              <span>Copy Ảnh</span>
            </button>

            <button
              onClick={() =>
                activeCategory
                  ? handleDownload(
                      detailTableRef,
                      `Hoa_Don_${activeCategory.name.replace(/[^a-zA-Z0-9]/g, '_')}_Thang_${selectedMonth}_${selectedYear}.png`
                    )
                  : handleDownload(summaryTableRef, `Tong_Hop_Hoa_Don_Thang_${selectedMonth}_${selectedYear}.png`)
              }
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-xs border border-slate-200 shadow-2xs transition cursor-pointer whitespace-nowrap"
              title="Tải ảnh hóa đơn độ phân giải cao Ultra HD về máy"
            >
              <Camera className="w-3.5 h-3.5 text-slate-600" />
              <span>Tải Ảnh HD</span>
            </button>

            <button
              onClick={handleExportAllInvoiceImagesZip}
              disabled={isExportingZip}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-bold rounded-xl text-xs shadow-xs transition hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 cursor-pointer whitespace-nowrap"
              title="Tải trọn bộ ảnh bảng tổng hợp hóa đơn & chi tiết tất cả các mục nén trong 1 file ZIP gửi sếp"
            >
              {isExportingZip ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Archive className="w-3.5 h-3.5 text-amber-100" />
              )}
              <span>{isExportingZip ? 'Đang Nén ZIP...' : 'Tải File (.ZIP)'}</span>
            </button>

            {/* Ngăn cách trực quan */}
            <div className="h-5 w-px bg-slate-200 mx-0.5 hidden sm:block"></div>

            {/* Nhóm 3: Xóa / Làm sạch dữ liệu */}
            <button
              onClick={() => setShowClearModal(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 font-semibold rounded-xl text-xs border border-slate-200 hover:border-rose-200 transition cursor-pointer whitespace-nowrap"
              title={activeCategory ? 'Xóa toàn bộ mặt hàng của mục này' : 'Làm sạch toàn bộ hóa đơn của tất cả các mục'}
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-500" />
              <span>{activeCategory ? 'Xóa Mục' : 'Xóa Dữ Liệu'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VIEW 1: BẢNG TỔNG HỢP HÓA ĐƠN THÁNG (KHỚP 100% ẢNH 1 CỦA USER)           */}
      {/* ========================================================================= */}
      {!activeCategoryId && (
        <div className="space-y-4">
          <div className="w-full overflow-x-auto pb-4">
            <div
              ref={summaryTableRef}
              className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-300 select-none text-slate-800 mx-auto"
              style={{ width: '1150px', minWidth: '1150px' }}
            >
              {/* Header cho in ấn & chụp ảnh gửi sếp */}
              <div className="mb-4 pb-3 border-b-2 border-emerald-900/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-800 text-white font-black flex items-center justify-center text-sm shadow-sm shrink-0">
                    T2
                  </div>
                  <div>
                    <div className="text-[11px] font-black uppercase tracking-wider text-emerald-800">
                      NHÀ HÀNG TẦNG 2 • QUẢN LÝ TÀI CHÍNH
                    </div>
                    <h1 className="text-lg font-black text-slate-900 leading-tight">
                      BẢNG TỔNG HỢP CHI PHÍ HÓA ĐƠN & NHẬP HÀNG
                    </h1>
                    <p className="text-xs text-slate-500 font-medium">
                      Kỳ hạch toán: Tháng {selectedMonth}/{selectedYear} • Ngày xuất: {new Date().toLocaleDateString('vi-VN')}
                    </p>
                  </div>
                </div>
                <div className="text-left sm:text-right bg-slate-50 sm:bg-transparent p-2.5 sm:p-0 rounded-xl border sm:border-0 border-slate-200">
                  <div className="text-[11px] text-slate-500 font-semibold">Tình trạng thanh toán</div>
                  <div className="text-sm font-black text-emerald-700">
                    {categories.filter((c) => c.isPaid).length}/{categories.length} Hạng mục đã duyệt chi
                  </div>
                  <div className="text-xs font-bold text-slate-700">
                    Tổng chi phí: <span className="text-emerald-800 font-black">{grandTotal.toLocaleString('vi-VN')} đ</span>
                  </div>
                </div>
              </div>

              {/* Top Sheet Tab "T9_2026 ∨ 🧮" matching Image 1 */}
              <div className="flex items-center gap-2 mb-2">
                <div className="bg-[#245839] text-white px-4 py-1.5 text-xs font-bold rounded-t-md inline-flex items-center gap-2 shadow-2xs">
                  <span>T{selectedMonth}_{selectedYear}</span>
                  <span className="text-[10px] opacity-80">▼</span>
                  <span>🧮</span>
                </div>
              </div>

              {/* Main Table Matching Image 1 */}
              <table className="w-full border-collapse border-2 border-gray-600 text-sm">
                <thead>
                  <tr className="bg-[#245839] text-white font-extrabold select-none">
                    {/* 순번 (STT) */}
                    <th className="border border-gray-500 py-3 px-3 text-center w-16">
                      <div className="flex items-center justify-center gap-1">
                        <span>순번</span>
                        <span className="text-[10px] opacity-75">▼</span>
                      </div>
                    </th>

                    {/* 품목 (Hạng mục) */}
                    <th className="border border-gray-500 py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <span>품목</span>
                        <span className="text-[10px] opacity-75">▼</span>
                      </div>
                    </th>

                    {/* 금액 (Số tiền) */}
                    <th className="border border-gray-500 py-3 px-4 text-center w-60">
                      <div className="flex items-center justify-center gap-1">
                        <span>금액</span>
                        <span className="text-[10px] opacity-75">▼</span>
                      </div>
                    </th>

                    {/* 결제 (Thanh toán) */}
                    <th className="border border-gray-500 py-3 px-3 text-center w-36 min-w-[120px]">
                      <div className="flex items-center justify-center gap-1">
                        <span className="text-xs">☑</span>
                        <span>결제</span>
                        <span className="text-[10px] opacity-75">▼</span>
                      </div>
                    </th>
                  </tr>
                </thead>
              <tbody>
                {categories.map((cat, idx) => {
                  const total = getCategoryTotal(cat);
                  const isChecked = cat.isPaid;
                  return (
                    <tr
                      key={cat.id}
                      onClick={() => setActiveCategoryId(cat.id)}
                      className="hover:bg-emerald-50/60 cursor-pointer transition-colors"
                      title="Bấm để xem và sửa chi tiết hóa đơn của hạng mục này"
                    >
                      {/* 순번 (STT) */}
                      <td className="border border-gray-500 py-2.5 px-3 text-center font-bold text-gray-900 bg-white">
                        {idx + 1}
                      </td>

                      {/* 품목 (Hạng mục) */}
                      <td className="border border-gray-500 py-2.5 px-4 text-center font-bold text-gray-900 bg-white group">
                        <div className="flex items-center justify-between gap-1">
                          <span className="flex-1 text-center">{cat.name}</span>
                          <button
                            type="button"
                            onClick={(e) => handleDeleteCategory(cat.id, cat.name, e)}
                            className="p-1 text-slate-300 hover:text-rose-600 rounded opacity-0 group-hover:opacity-100 transition print:hidden screenshot-exclude shrink-0"
                            title={`Xóa mục [${cat.name}] khỏi danh sách`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>

                      {/* 금액 (Số tiền) */}
                      <td
                        className="border border-gray-500 py-2.5 px-4 text-center font-bold text-gray-900 bg-white"
                        onClick={(e) => {
                          // If category has no detail items, let user quickly enter fixed amount
                          if (!categoryItems[cat.id] || categoryItems[cat.id].length === 0) {
                            e.stopPropagation();
                            setEditingCategoryAmount(cat);
                            setFixedAmountInput(cat.fixedAmount || 0);
                          }
                        }}
                      >
                        {total > 0 ? (
                          total.toLocaleString('vi-VN')
                        ) : (
                          <span className="text-slate-400 text-xs italic font-normal hover:text-emerald-700">
                            (Bấm để xem / nhập tiền)
                          </span>
                        )}
                      </td>

                      {/* 결제 (Checkbox thanh toán - Khớp ô vuông checkbox trong ảnh 1) */}
                      <td
                        className="border border-gray-500 py-2.5 px-3 text-center bg-white w-36 min-w-[120px]"
                        onClick={(e) => handleTogglePaid(cat.id, e)}
                      >
                        <div className="flex items-center justify-center gap-1.5">
                          {isChecked ? (
                            <div className="w-5 h-5 bg-emerald-700 text-white rounded-sm flex items-center justify-center text-xs font-black shadow-xs">
                              ✓
                            </div>
                          ) : (
                            <div className="w-5 h-5 border-2 border-gray-700 rounded-sm hover:border-emerald-600 bg-white transition"></div>
                          )}
                          <span className={`text-[11px] font-bold ${isChecked ? 'text-emerald-700' : 'text-slate-400'}`}>
                            {isChecked ? 'Đã chi' : 'Chưa'}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {/* Hàng Tổng cuối bảng (Khớp 100% hàng đỏ chữ Tổng & ô vàng ở Ảnh 1) */}
                <tr className="bg-white font-black text-sm">
                  {/* Ô ĐỎ TƯƠI [Tổng] kéo dài cột 1 và 2 */}
                  <td
                    colSpan={2}
                    className="border border-gray-500 py-3 px-4 text-center bg-[#ff0000] text-black font-black text-base"
                  >
                    Tổng
                  </td>

                  {/* Ô VÀNG TƯƠI [Tổng số tiền] */}
                  <td className="border border-gray-500 py-3 px-4 text-center bg-[#ffff00] text-black font-black text-base">
                    {grandTotal.toLocaleString('vi-VN')}
                  </td>

                  {/* Cột 결제 cuối */}
                  <td className="border border-gray-500 py-3 px-3 text-center bg-white font-bold text-xs text-slate-600">
                    {categories.filter((c) => c.isPaid).length}/{categories.length} Đã chi
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Chữ ký xác nhận gửi sếp */}
            <div className="mt-8 pt-4 border-t border-slate-200 grid grid-cols-3 gap-4 text-center text-xs">
              <div>
                <div className="font-bold text-slate-700">Người lập biểu</div>
                <div className="text-[11px] text-slate-400 mt-0.5">(Ký & ghi rõ họ tên)</div>
                <div className="h-14"></div>
              </div>
              <div>
                <div className="font-bold text-slate-700">Quản lý thu mua / Bếp</div>
                <div className="text-[11px] text-slate-400 mt-0.5">(Ký & ghi rõ họ tên)</div>
                <div className="h-14"></div>
              </div>
              <div>
                <div className="font-bold text-slate-700">Ban Giám Đốc phê duyệt</div>
                <div className="text-[11px] text-slate-400 mt-0.5">(Ký & đóng dấu)</div>
                <div className="h-14"></div>
              </div>
            </div>
          </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-600 flex items-center justify-between max-w-5xl mx-auto">
            <div>
              💡 <b>Mẹo quản lý:</b> Nhấp chuột trực tiếp vào bất kỳ hạng mục nào để mở <b>Bảng chi tiết hóa đơn</b> (Rau củ theo ngày hoặc hóa đơn NPP An Phát, Keyfood). Tích chọn ô vuông để đánh dấu đã thanh toán.
            </div>
            <div className="font-semibold text-emerald-800">Tang2Manager Invoices</div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 2 & 3: BẢNG CHI TIẾT HÓA ĐƠN THEO HẠNG MỤC HOẶC NPP                 */}
      {/* ========================================================================= */}
      {activeCategoryId && activeCategory && (
        <div className="space-y-4">
          <div className="w-full overflow-x-auto pb-4">
            <div
              ref={detailTableRef}
              className="bg-white p-5 sm:p-7 rounded-2xl shadow-sm border border-slate-300 select-none text-slate-800 mx-auto"
              style={{ width: '1280px', minWidth: '1280px' }}
            >
              {/* Header cho in ấn & chụp ảnh gửi sếp */}
            <div className="mb-4 pb-3 border-b-2 border-blue-900/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-800 text-white font-black flex items-center justify-center text-sm shadow-sm shrink-0">
                  T2
                </div>
                <div>
                  <div className="text-[11px] font-black uppercase tracking-wider text-blue-800">
                    NHÀ HÀNG TẦNG 2 • HÓA ĐƠN CHI TIẾT
                  </div>
                  <h1 className="text-lg font-black text-slate-900 leading-tight">
                    {activeCategory.name.toUpperCase()}
                  </h1>
                  <p className="text-xs text-slate-500 font-medium">
                    Kỳ hạch toán: Tháng {selectedMonth}/{selectedYear} • {currentItems.length} mặt hàng đã ghi nhận
                  </p>
                </div>
              </div>
              <div className="text-left sm:text-right bg-slate-50 sm:bg-transparent p-2.5 sm:p-0 rounded-xl border sm:border-0 border-slate-200">
                <div className="text-[11px] text-slate-500 font-semibold">Tình trạng thanh toán</div>
                <div className={`text-sm font-black ${activeCategory.isPaid ? 'text-emerald-700' : 'text-amber-600'}`}>
                  {activeCategory.isPaid ? '✓ ĐÃ THANH TOÁN' : '⏳ CHƯA THANH TOÁN'}
                </div>
                <div className="text-xs font-bold text-slate-700">
                  Tổng chi phí: <span className="text-blue-900 font-black">{activeCategoryTotal.toLocaleString('vi-VN')} đ</span>
                </div>
              </div>
            </div>

            {/* Header Title Banner */}
            <div className="mb-3">
              {activeCategory.id === 4 ? (
                // Yellow NPP AN PHÁT Header Banner (Khớp Ảnh 4)
                <div className="inline-block bg-[#ffff00] text-black px-4 py-1 font-black text-sm border border-gray-400 mb-2">
                  NPP AN PHÁT
                </div>
              ) : activeCategory.id === 3 ? (
                // Yellow NNP KEYFOOD Header Banner (Khớp Ảnh 4)
                <div className="inline-block bg-[#ffff00] text-black px-4 py-1 font-black text-sm border border-gray-400 mb-2">
                  NNP KEYFOOD
                </div>
              ) : activeCategory.id === 12 || activeCategory.name.includes('베트남 술') ? (
                // Green Rượu Việt Header Tab (Khớp Ảnh 1 đợt 1)
                <div className="flex items-center gap-2 mb-2">
                  <div className="bg-[#245839] text-white px-4 py-1.5 text-xs font-bold rounded-t-md inline-flex items-center gap-2 shadow-2xs">
                    <span>Rượu Việt</span>
                    <span className="text-[10px] opacity-80">▼</span>
                    <span>🧮</span>
                  </div>
                </div>
              ) : activeCategory.id === 2 || activeCategory.name.includes('가스') ? (
                // Green Gas du lịch Header Tab (Khớp Ảnh 3 đợt 1)
                <div className="flex items-center gap-2 mb-2">
                  <div className="bg-[#245839] text-white px-4 py-1.5 text-xs font-bold rounded-t-md inline-flex items-center gap-2 shadow-2xs">
                    <span>Gas du lịch</span>
                    <span className="text-[10px] opacity-80">▼</span>
                    <span>🧮</span>
                  </div>
                </div>
              ) : activeCategory.id === 5 || activeCategory.name.includes('막창') ? (
                // Green Khấu_Má Header Tab (Khớp Ảnh 5 đợt 1)
                <div className="flex items-center gap-2 mb-2">
                  <div className="bg-[#245839] text-white px-4 py-1.5 text-xs font-bold rounded-t-md inline-flex items-center gap-2 shadow-2xs">
                    <span>Khấu_Má</span>
                    <span className="text-[10px] opacity-80">▼</span>
                    <span>🧮</span>
                  </div>
                </div>
              ) : activeCategory.id === 10 || activeCategory.name.includes('원마켓') ? (
                // Green One Market Header Tab (Khớp Ảnh 1 đợt 2)
                <div className="flex items-center gap-2 mb-2">
                  <div className="bg-[#245839] text-white px-4 py-1.5 text-xs font-bold rounded-t-md inline-flex items-center gap-2 shadow-2xs">
                    <span>One Market</span>
                    <span className="text-[10px] opacity-80">▼</span>
                    <span>🧮</span>
                  </div>
                </div>
              ) : activeCategory.id === 6 || activeCategory.name.includes('과일') ? (
                // Green Rượu Soju hoa quả Header Tab (Khớp Ảnh 2 đợt 2)
                <div className="flex items-center gap-2 mb-2">
                  <div className="bg-[#245839] text-white px-4 py-1.5 text-xs font-bold rounded-t-md inline-flex items-center gap-2 shadow-2xs">
                    <span>Rượu Soju hoa quả</span>
                    <span className="text-[10px] opacity-80">▼</span>
                    <span>🧮</span>
                  </div>
                </div>
              ) : activeCategory.id === 8 || activeCategory.name.includes('고사리') ? (
                // Green Dương sỉ _ Bột ớt Header Tab (Khớp Ảnh 3 đợt 2)
                <div className="flex items-center gap-2 mb-2">
                  <div className="bg-[#245839] text-white px-4 py-1.5 text-xs font-bold rounded-t-md inline-flex items-center gap-2 shadow-2xs">
                    <span>Dương sỉ _ Bột ớt</span>
                    <span className="text-[10px] opacity-80">▼</span>
                    <span>🧮</span>
                  </div>
                </div>
              ) : activeCategory.id === 7 || activeCategory.name.includes('옥수수') ? (
                // Green Ngô hộp Header Tab (Khớp Ảnh 4 đợt 2)
                <div className="flex items-center gap-2 mb-2">
                  <div className="bg-[#245839] text-white px-4 py-1.5 text-xs font-bold rounded-t-md inline-flex items-center gap-2 shadow-2xs">
                    <span>Ngô hộp</span>
                    <span className="text-[10px] opacity-80">▼</span>
                    <span>🧮</span>
                  </div>
                </div>
              ) : activeCategory.id === 9 || activeCategory.name.includes('음료수') ? (
                // Blue Đồ uống Banner (Khớp Ảnh 5 đợt 2)
                <div className="inline-block bg-[#3b82f6] text-white px-4 py-1 font-bold text-sm rounded-md mb-2">
                  HÓA ĐƠN: ĐỒ UỐNG & NƯỚC NGỌT (음료수)
                </div>
              ) : activeCategory.id === 11 || activeCategory.name.includes('주방세제') || activeCategory.name.includes('Nước rửa') || activeCategory.name.includes('lau sàn') ? (
                // Green Nước rửa bát_Nước lau sàn Header Tab (Khớp 100% Ảnh người dùng vừa gửi)
                <div className="flex items-center gap-2 mb-2">
                  <div className="bg-[#245839] text-white px-4 py-1.5 text-xs font-bold rounded-t-md inline-flex items-center gap-2 shadow-2xs">
                    <span>Nước rửa bát_Nước lau sàn</span>
                    <span className="text-[10px] opacity-80">▼</span>
                    <span>🧮</span>
                  </div>
                </div>
              ) : (
                <div className="inline-block bg-emerald-800 text-white px-4 py-1 font-bold text-sm rounded-md mb-2">
                  HÓA ĐƠN: {activeCategory.name.toUpperCase()}
                </div>
              )}
            </div>

            {/* CASE A: NPP AN PHÁT (Có thuế suất GTGT 5% & Tổng thanh toán - Khớp Ảnh 4) */}
            {activeCategory.id === 4 ? (
              <table className="w-full border-collapse border-2 border-gray-600 text-sm">
                <thead>
                  <tr className="bg-[#3b82f6] text-white font-extrabold select-none">
                    <th className="border border-gray-600 py-2.5 px-2 text-center w-12">STT</th>
                    <th className="border border-gray-600 py-2.5 px-3 text-center w-20">NGÀY</th>
                    <th className="border border-gray-600 py-2.5 px-4 text-center min-w-[220px]">TÊN HÀNG</th>
                    <th className="border border-gray-600 py-2.5 px-2 text-center w-16">ĐƠN VỊ</th>
                    <th className="border border-gray-600 py-2.5 px-3 text-center w-24">SỐ LƯỢNG</th>
                    <th className="border border-gray-600 py-2.5 px-3 text-center w-28">ĐƠN GIÁ</th>
                    <th className="border border-gray-600 py-2.5 px-2 text-center w-24">THUẾ SUẤT %</th>
                    <th className="border border-gray-600 py-2.5 px-3 text-center min-w-[120px]">TIỀN THUẾ GTGT</th>
                    <th className="border border-gray-600 py-2.5 px-3 text-center min-w-[130px]">THÀNH TIỀN</th>
                    <th className="border border-gray-600 py-2.5 px-3 text-center min-w-[140px]">TỔNG THANH TOÁN</th>
                    <th className="border border-gray-600 py-2.5 px-3 text-center bg-[#ff0000] text-white min-w-[120px]">
                      Tổng tháng
                    </th>
                    <th className="border border-gray-600 py-2.5 px-2 text-center w-14 bg-slate-700 text-white print:hidden screenshot-exclude">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {currentItems.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-blue-50/50 transition">
                      <td className="border border-gray-500 py-2 px-2 text-center font-bold">{idx + 1}</td>
                      <td className="border border-gray-500 py-2 px-2 text-center font-bold">{item.dateStr}</td>
                      <td className="border border-gray-500 py-2 px-4 text-left font-bold text-gray-900">{item.itemName}</td>
                      <td className="border border-gray-500 py-2 px-2 text-center font-semibold">{item.unit || 'kg'}</td>
                      <td className="border border-gray-500 py-2 px-3 text-center font-bold">
                        {String(item.quantity).replace('.', ',')}
                      </td>
                      <td className="border border-gray-500 py-2 px-3 text-center font-bold">
                        {item.unitPrice.toLocaleString('vi-VN')}
                      </td>
                      <td className="border border-gray-500 py-2 px-2 text-center font-bold">{item.taxRate}</td>
                      <td className="border border-gray-500 py-2 px-3 text-center font-bold">
                        {item.taxAmount > 0 ? item.taxAmount.toLocaleString('vi-VN') : ''}
                      </td>
                      <td className="border border-gray-500 py-2 px-3 text-center font-bold">
                        {item.amount.toLocaleString('vi-VN')}
                      </td>
                      <td className="border border-gray-500 py-2 px-3 text-center font-extrabold text-blue-900">
                        {item.totalPayment.toLocaleString('vi-VN')}
                      </td>
                      {/* Cột Tổng tháng hiển thị ở hàng đầu tiên */}
                      {idx === 0 ? (
                        <td
                          rowSpan={currentItems.length}
                          className="border border-gray-500 py-2 px-3 text-center font-black text-red-600 bg-red-50 text-base align-middle"
                        >
                          {activeCategoryTotal.toLocaleString('vi-VN')}
                        </td>
                      ) : null}
                      <td className="border border-gray-500 py-2 px-2 text-center print:hidden screenshot-exclude">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleOpenEditModal(item)}
                            className="p-1 hover:text-blue-600 rounded text-slate-500"
                            title="Sửa"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteItem(item.id)}
                            className="p-1 hover:text-red-600 rounded text-slate-500"
                            title="Xóa"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : activeCategory.id === 3 ? (
              // CASE B: NPP KEYFOOD (Không thuế GTGT, có tổng tháng - Khớp Ảnh 4)
              <table className="w-full border-collapse border-2 border-gray-600 text-sm">
                <thead>
                  <tr className="bg-[#3b82f6] text-white font-extrabold select-none">
                    <th className="border border-gray-600 py-2.5 px-2 text-center w-12">STT</th>
                    <th className="border border-gray-600 py-2.5 px-3 text-center w-20">NGÀY</th>
                    <th className="border border-gray-600 py-2.5 px-4 text-center min-w-[260px]">TÊN HÀNG</th>
                    <th className="border border-gray-600 py-2.5 px-2 text-center w-16">ĐƠN VỊ</th>
                    <th className="border border-gray-600 py-2.5 px-3 text-center w-24">SỐ LƯỢNG</th>
                    <th className="border border-gray-600 py-2.5 px-3 text-center w-28">ĐƠN GIÁ</th>
                    <th className="border border-gray-600 py-2.5 px-4 text-center min-w-[140px]">THÀNH TIỀN</th>
                    <th className="border border-gray-600 py-2.5 px-3 text-center bg-[#ff0000] text-white min-w-[120px]">
                      Tổng tháng
                    </th>
                    <th className="border border-gray-600 py-2.5 px-2 text-center w-14 bg-slate-700 text-white print:hidden screenshot-exclude">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {currentItems.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-blue-50/50 transition">
                      <td className="border border-gray-500 py-2 px-2 text-center font-bold">{idx + 1}</td>
                      <td className="border border-gray-500 py-2 px-2 text-center font-bold">{item.dateStr}</td>
                      <td className="border border-gray-500 py-2 px-4 text-left font-bold text-gray-900">{item.itemName}</td>
                      <td className="border border-gray-500 py-2 px-2 text-center font-semibold">{item.unit || 'kg'}</td>
                      <td className="border border-gray-500 py-2 px-3 text-center font-bold">
                        {String(item.quantity).replace('.', ',')}
                      </td>
                      <td className="border border-gray-500 py-2 px-3 text-center font-bold">
                        {item.unitPrice.toLocaleString('vi-VN')}
                      </td>
                      <td className="border border-gray-500 py-2 px-4 text-center font-extrabold text-blue-900">
                        {item.amount.toLocaleString('vi-VN')}
                      </td>
                      {idx === 0 ? (
                        <td
                          rowSpan={currentItems.length}
                          className="border border-gray-500 py-2 px-3 text-center font-black text-red-600 bg-red-50 text-base align-middle"
                        >
                          {activeCategoryTotal.toLocaleString('vi-VN')}
                        </td>
                      ) : null}
                      <td className="border border-gray-500 py-2 px-2 text-center print:hidden screenshot-exclude">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleOpenEditModal(item)}
                            className="p-1 hover:text-blue-600 rounded text-slate-500"
                            title="Sửa"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteItem(item.id)}
                            className="p-1 hover:text-red-600 rounded text-slate-500"
                            title="Xóa"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : activeCategory.id === 12 || activeCategory.name.includes('베트남 술') ? (
              // CASE C: RƯỢU VIỆT (Khớp 100% Ảnh 1)
              <table className="w-full border-collapse border-2 border-gray-600 text-sm">
                <thead>
                  <tr className="bg-[#245839] text-white font-extrabold select-none">
                    <th className="border border-gray-600 py-2.5 px-3 text-center w-14">
                      <div className="flex items-center justify-center gap-1">
                        <span>STT</span>
                        <span className="text-[10px] opacity-75">▼</span>
                      </div>
                    </th>
                    <th className="border border-gray-600 py-2.5 px-4 text-center min-w-[200px]">
                      <div className="flex items-center justify-center gap-1">
                        <span>Tên hàng</span>
                        <span className="text-[10px] opacity-75">▼</span>
                      </div>
                    </th>
                    <th className="border border-gray-600 py-2.5 px-3 text-center w-24">
                      <div className="flex items-center justify-center gap-1">
                        <span>Đơn vị</span>
                        <span className="text-[10px] opacity-75">▼</span>
                      </div>
                    </th>
                    <th className="border border-gray-600 py-2.5 px-3 text-center w-24">
                      <div className="flex items-center justify-center gap-1">
                        <span>Số lượng</span>
                        <span className="text-[10px] opacity-75">▼</span>
                      </div>
                    </th>
                    <th className="border border-gray-600 py-2.5 px-3 text-center w-28">
                      <div className="flex items-center justify-center gap-1">
                        <span>Giá đơn vị</span>
                        <span className="text-[10px] opacity-75">▼</span>
                      </div>
                    </th>
                    <th className="border border-gray-600 py-2.5 px-4 text-center min-w-[140px]">
                      <div className="flex items-center justify-center gap-1">
                        <span>Thành tiền</span>
                        <span className="text-[10px] opacity-75">▼</span>
                      </div>
                    </th>
                    <th className="border border-gray-600 py-2.5 px-2 text-center w-14 bg-slate-700 text-white print:hidden screenshot-exclude">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {currentItems.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="border border-gray-400 py-8 text-center text-slate-400 italic">
                        Chưa có dữ liệu rượu trong tháng. Bấm "Quét AI Hóa Đơn" hoặc "Thêm Mặt Hàng" để nhập.
                      </td>
                    </tr>
                  ) : (
                    currentItems.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-emerald-50/40 transition">
                        <td className="border border-gray-500 py-2 px-3 text-center font-bold">{idx + 1}</td>
                        <td className="border border-gray-500 py-2 px-4 text-left font-bold text-gray-900">{item.itemName}</td>
                        <td className="border border-gray-500 py-2 px-3 text-center font-semibold">{item.unit || 'Can'}</td>
                        <td className="border border-gray-500 py-2 px-3 text-center font-bold">
                          {String(item.quantity).replace('.', ',')}
                        </td>
                        <td className="border border-gray-500 py-2 px-3 text-center font-bold">
                          {item.note || (item.unitPrice ? item.unitPrice.toLocaleString('vi-VN') : '30L')}
                        </td>
                        <td className="border border-gray-500 py-2 px-4 text-center font-extrabold text-gray-900">
                          {item.amount.toLocaleString('vi-VN')}
                        </td>
                        <td className="border border-gray-500 py-2 px-2 text-center print:hidden screenshot-exclude">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleOpenEditModal(item)}
                              className="p-1 hover:text-blue-600 rounded text-slate-500"
                              title="Sửa"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteItem(item.id)}
                              className="p-1 hover:text-red-600 rounded text-slate-500"
                              title="Xóa"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}

                  {/* Hàng Tổng (Khớp Ô ĐỎ Tổng & Ô VÀNG Thành Tiền ở Ảnh 1) */}
                  <tr className="bg-white font-black text-sm">
                    <td colSpan={4} className="border-0 py-2"></td>
                    <td className="border border-gray-500 py-2 px-4 text-center bg-[#ff0000] text-black font-black text-base">
                      Tổng
                    </td>
                    <td className="border border-gray-500 py-2 px-4 text-center bg-[#ffff00] text-black font-black text-base">
                      {activeCategoryTotal.toLocaleString('vi-VN')}
                    </td>
                    <td className="border border-gray-500 py-2 px-2 text-center print:hidden screenshot-exclude"></td>
                  </tr>
                </tbody>
              </table>
            ) : activeCategory.id === 2 || activeCategory.name.includes('가스') ? (
              // CASE D: GAS DU LỊCH (Khớp 100% Ảnh 3)
              <table className="w-full border-collapse border-2 border-gray-600 text-sm">
                <thead>
                  <tr className="bg-[#245839] text-white font-extrabold select-none">
                    <th className="border border-gray-600 py-2.5 px-3 text-center w-14">
                      <div className="flex items-center justify-center gap-1">
                        <span>STT</span>
                        <span className="text-[10px] opacity-75">▼</span>
                      </div>
                    </th>
                    <th className="border border-gray-600 py-2.5 px-3 text-center w-20">
                      <div className="flex items-center justify-center gap-1">
                        <span>NGÀY</span>
                        <span className="text-[10px] opacity-75">▼</span>
                      </div>
                    </th>
                    <th className="border border-gray-600 py-2.5 px-4 text-center min-w-[200px]">
                      <div className="flex items-center justify-center gap-1">
                        <span>TÊN SẢN PHẨM</span>
                        <span className="text-[10px] opacity-75">▼</span>
                      </div>
                    </th>
                    <th className="border border-gray-600 py-2.5 px-3 text-center w-20">
                      <div className="flex items-center justify-center gap-1">
                        <span>ĐVT</span>
                        <span className="text-[10px] opacity-75">▼</span>
                      </div>
                    </th>
                    <th className="border border-gray-600 py-2.5 px-3 text-center w-24">
                      <div className="flex items-center justify-center gap-1">
                        <span>SỐ LƯỢNG</span>
                        <span className="text-[10px] opacity-75">▼</span>
                      </div>
                    </th>
                    <th className="border border-gray-600 py-2.5 px-3 text-center w-28">
                      <div className="flex items-center justify-center gap-1">
                        <span>ĐƠN GIÁ</span>
                        <span className="text-[10px] opacity-75">▼</span>
                      </div>
                    </th>
                    <th className="border border-gray-600 py-2.5 px-4 text-center min-w-[140px]">
                      <div className="flex items-center justify-center gap-1">
                        <span>THÀNH TIỀN</span>
                        <span className="text-[10px] opacity-75">▼</span>
                      </div>
                    </th>
                    <th className="border border-gray-600 py-2.5 px-4 text-center min-w-[130px]">
                      <div className="flex items-center justify-center gap-1">
                        <span>TIỀN TRẢ VỎ</span>
                        <span className="text-[10px] opacity-75">▼</span>
                      </div>
                    </th>
                    <th className="border border-gray-600 py-2.5 px-2 text-center w-14 bg-slate-700 text-white print:hidden screenshot-exclude">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {currentItems.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="border border-gray-400 py-8 text-center text-slate-400 italic">
                        Chưa có dữ liệu gas trong tháng. Bấm "Quét AI Hóa Đơn" hoặc "Thêm Mặt Hàng" để nhập.
                      </td>
                    </tr>
                  ) : (
                    currentItems.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-emerald-50/40 transition">
                        <td className="border border-gray-500 py-2 px-3 text-center font-bold">{idx + 1}</td>
                        <td className="border border-gray-500 py-2 px-3 text-center font-bold">{item.dateStr}</td>
                        <td className="border border-gray-500 py-2 px-4 text-left font-bold text-gray-900">{item.itemName}</td>
                        <td className="border border-gray-500 py-2 px-3 text-center font-semibold">{item.unit || 'Thùng'}</td>
                        <td className="border border-gray-500 py-2 px-3 text-center font-bold">
                          {String(item.quantity).replace('.', ',')}
                        </td>
                        <td className="border border-gray-500 py-2 px-3 text-center font-bold">
                          {item.unitPrice.toLocaleString('vi-VN')}
                        </td>
                        <td className="border border-gray-500 py-2 px-4 text-center font-extrabold text-gray-900">
                          {item.amount.toLocaleString('vi-VN')}
                        </td>
                        <td className="border border-gray-500 py-2 px-4 text-center font-bold text-slate-700">
                          {(item.depositFee || 0) > 0 ? (item.depositFee || 0).toLocaleString('vi-VN') : ''}
                        </td>
                        <td className="border border-gray-500 py-2 px-2 text-center print:hidden screenshot-exclude">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleOpenEditModal(item)}
                              className="p-1 hover:text-blue-600 rounded text-slate-500"
                              title="Sửa"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteItem(item.id)}
                              className="p-1 hover:text-red-600 rounded text-slate-500"
                              title="Xóa"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}

                  {/* Hàng Tổng (Khớp Ô ĐỎ Tổng ở Ảnh 3) */}
                  <tr className="bg-white font-black text-sm">
                    <td colSpan={6} className="border border-gray-500 py-2 px-4 text-center bg-[#ff0000] text-black font-black text-base">
                      Tổng
                    </td>
                    <td className="border border-gray-500 py-2 px-4 text-center bg-[#ffff00] text-black font-black text-base">
                      {activeCategoryTotal.toLocaleString('vi-VN')}
                    </td>
                    <td className="border border-gray-500 py-2 px-4 text-center font-bold text-slate-700 bg-white">
                      {currentItems.reduce((s, i) => s + (i.depositFee || 0), 0) > 0
                        ? currentItems.reduce((s, i) => s + (i.depositFee || 0), 0).toLocaleString('vi-VN')
                        : ''}
                    </td>
                    <td className="border border-gray-500 py-2 px-2 text-center print:hidden screenshot-exclude"></td>
                  </tr>
                </tbody>
              </table>
            ) : activeCategory.id === 5 || activeCategory.name.includes('막창') ? (
              // CASE E: KHẤU MÁ (Khớp 100% Ảnh 5)
              <table className="w-full border-collapse border-2 border-gray-600 text-sm">
                <thead>
                  <tr className="bg-[#245839] text-white font-extrabold select-none">
                    <th className="border border-gray-600 py-2.5 px-3 text-center w-14">
                      <div className="flex items-center justify-center gap-1">
                        <span>STT</span>
                        <span className="text-[10px] opacity-75">▼</span>
                      </div>
                    </th>
                    <th className="border border-gray-600 py-2.5 px-3 text-center w-20">
                      <div className="flex items-center justify-center gap-1">
                        <span>NGÀY</span>
                        <span className="text-[10px] opacity-75">▼</span>
                      </div>
                    </th>
                    <th className="border border-gray-600 py-2.5 px-4 text-center min-w-[200px]">
                      <div className="flex items-center justify-center gap-1">
                        <span>TÊN SẢN PHẨM</span>
                        <span className="text-[10px] opacity-75">▼</span>
                      </div>
                    </th>
                    <th className="border border-gray-600 py-2.5 px-3 text-center w-24">
                      <div className="flex items-center justify-center gap-1">
                        <span>SỐ LƯỢNG</span>
                        <span className="text-[10px] opacity-75">▼</span>
                      </div>
                    </th>
                    <th className="border border-gray-600 py-2.5 px-3 text-center w-28">
                      <div className="flex items-center justify-center gap-1">
                        <span>ĐƠN GIÁ</span>
                        <span className="text-[10px] opacity-75">▼</span>
                      </div>
                    </th>
                    <th className="border border-gray-600 py-2.5 px-3 text-center w-24">
                      <div className="flex items-center justify-center gap-1">
                        <span>SHIP</span>
                        <span className="text-[10px] opacity-75">▼</span>
                      </div>
                    </th>
                    <th className="border border-gray-600 py-2.5 px-4 text-center min-w-[140px]">
                      <div className="flex items-center justify-center gap-1">
                        <span>THÀNH TIỀN</span>
                        <span className="text-[10px] opacity-75">▼</span>
                      </div>
                    </th>
                    <th className="border border-gray-600 py-2.5 px-2 text-center w-14 bg-slate-700 text-white print:hidden screenshot-exclude">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {currentItems.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="border border-gray-400 py-8 text-center text-slate-400 italic">
                        Chưa có dữ liệu khấu - má trong tháng. Bấm "Quét AI Hóa Đơn" hoặc "Thêm Mặt Hàng" để nhập.
                      </td>
                    </tr>
                  ) : (
                    currentItems.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-emerald-50/40 transition">
                        <td className="border border-gray-500 py-2 px-3 text-center font-bold">{idx + 1}</td>
                        <td className="border border-gray-500 py-2 px-3 text-center font-bold">{item.dateStr}</td>
                        <td className="border border-gray-500 py-2 px-4 text-left font-bold text-gray-900">{item.itemName}</td>
                        <td className="border border-gray-500 py-2 px-3 text-center font-bold">
                          {String(item.quantity).replace('.', ',')}
                        </td>
                        <td className="border border-gray-500 py-2 px-3 text-center font-bold">
                          {item.unitPrice.toLocaleString('vi-VN')}
                        </td>
                        <td className="border border-gray-500 py-2 px-3 text-center font-bold text-slate-700">
                          {(item.shipFee || 0) > 0 ? (item.shipFee || 0).toLocaleString('vi-VN') : ''}
                        </td>
                        <td className="border border-gray-500 py-2 px-4 text-center font-extrabold text-gray-900">
                          {item.amount.toLocaleString('vi-VN')}
                        </td>
                        <td className="border border-gray-500 py-2 px-2 text-center print:hidden screenshot-exclude">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleOpenEditModal(item)}
                              className="p-1 hover:text-blue-600 rounded text-slate-500"
                              title="Sửa"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteItem(item.id)}
                              className="p-1 hover:text-red-600 rounded text-slate-500"
                              title="Xóa"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}

                  {/* Hàng Tổng (Khớp Ô ĐỎ Tổng & Ô VÀNG 3.672.000 ở Ảnh 5) */}
                  <tr className="bg-white font-black text-sm">
                    <td colSpan={4} className="border-0 py-2"></td>
                    <td colSpan={2} className="border border-gray-500 py-2 px-4 text-center bg-[#ff0000] text-black font-black text-base">
                      Tổng
                    </td>
                    <td className="border border-gray-500 py-2 px-4 text-center bg-[#ffff00] text-black font-black text-base">
                      {activeCategoryTotal.toLocaleString('vi-VN')}
                    </td>
                    <td className="border border-gray-500 py-2 px-2 text-center print:hidden screenshot-exclude"></td>
                  </tr>
                </tbody>
              </table>
            ) : activeCategory.id === 10 || activeCategory.name.includes('원마켓') ? (
              // CASE F: ONE MARKET (Khớp 100% Ảnh 1 đợt 2)
              <table className="w-full border-collapse border-2 border-gray-600 text-sm">
                <thead>
                  <tr className="bg-[#245839] text-white font-extrabold select-none">
                    <th className="border border-gray-600 py-2.5 px-3 text-center w-20">
                      <div className="flex items-center justify-center gap-1">
                        <span>Ngày (일자)</span>
                        <span className="text-[10px] opacity-75">▼</span>
                      </div>
                    </th>
                    <th className="border border-gray-600 py-2.5 px-4 text-center min-w-[280px]">
                      <div className="flex items-center justify-center gap-1">
                        <span>Mã vạch / Tên hàng hóa (품목 (규격))</span>
                        <span className="text-[10px] opacity-75">▼</span>
                      </div>
                    </th>
                    <th className="border border-gray-600 py-2.5 px-3 text-center w-24">
                      <div className="flex items-center justify-center gap-1">
                        <span>Số lượng (수량)</span>
                        <span className="text-[10px] opacity-75">▼</span>
                      </div>
                    </th>
                    <th className="border border-gray-600 py-2.5 px-3 text-center w-28">
                      <div className="flex items-center justify-center gap-1">
                        <span>Đơn giá (단가)</span>
                        <span className="text-[10px] opacity-75">▼</span>
                      </div>
                    </th>
                    <th className="border border-gray-600 py-2.5 px-4 text-center min-w-[140px]">
                      <div className="flex items-center justify-center gap-1">
                        <span>Thành tiền (금액)</span>
                        <span className="text-[10px] opacity-75">▼</span>
                      </div>
                    </th>
                    <th className="border border-gray-600 py-2.5 px-2 text-center w-20">
                      <div className="flex items-center justify-center gap-1">
                        <span>Thuế (세액)</span>
                        <span className="text-[10px] opacity-75">▼</span>
                      </div>
                    </th>
                    <th className="border border-gray-600 py-2.5 px-4 text-center bg-[#ffff00] text-black font-black min-w-[130px]">
                      Tổng cộng (합계)
                    </th>
                    <th className="border border-gray-600 py-2.5 px-4 text-center bg-[#ff0000] text-white font-black min-w-[130px]">
                      Tổng tháng
                    </th>
                    <th className="border border-gray-600 py-2.5 px-2 text-center w-14 bg-slate-700 text-white print:hidden screenshot-exclude">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {groupedDailyItems.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="border border-gray-400 py-8 text-center text-slate-400 italic">
                        Chưa có dữ liệu One Market trong tháng. Bấm "Quét AI Hóa Đơn" hoặc "Thêm Mặt Hàng" để nhập.
                      </td>
                    </tr>
                  ) : (
                    groupedDailyItems.map((group, groupIdx) => (
                      <React.Fragment key={group.dateStr || groupIdx}>
                        {group.items.map((item, itemIdx) => (
                          <tr key={item.id} className="hover:bg-emerald-50/40 transition">
                            <td className="border border-gray-500 py-2 px-3 text-center font-bold text-gray-900">
                              {itemIdx === 0 && (
                                <div className="flex items-center justify-center gap-1.5">
                                  <span>{item.dateStr}</span>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteByDate(group.dateStr, group.items.length, group.dayTotal)}
                                    className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 p-1 rounded-md transition print:hidden screenshot-exclude cursor-pointer"
                                    title={`Xóa toàn bộ hóa đơn ngày ${item.dateStr} (${group.items.length} mặt hàng)`}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}
                            </td>
                            <td className="border border-gray-500 py-2 px-4 text-left font-bold text-gray-900">
                              {item.itemName}
                            </td>
                            <td className="border border-gray-500 py-2 px-3 text-center font-bold">
                              {String(item.quantity).replace('.', ',')}
                            </td>
                            <td className="border border-gray-500 py-2 px-3 text-center font-bold">
                              {item.unitPrice.toLocaleString('vi-VN')}
                            </td>
                            <td className="border border-gray-500 py-2 px-4 text-center font-extrabold text-gray-900">
                              {item.amount.toLocaleString('vi-VN')}
                            </td>
                            <td className="border border-gray-500 py-2 px-2 text-center font-bold">
                              {item.taxAmount > 0 ? item.taxAmount.toLocaleString('vi-VN') : 0}
                            </td>
                            {/* Cột Tổng cộng (합계) của ngày hiển thị ở hàng cuối cùng của ngày */}
                            {itemIdx === group.items.length - 1 ? (
                              <td className="border border-gray-500 py-2 px-4 text-center font-black text-gray-900 bg-[#ffff00]/30">
                                {group.dayTotal.toLocaleString('vi-VN')}
                              </td>
                            ) : (
                              <td className="border border-gray-500 py-2 px-4 text-center bg-white"></td>
                            )}
                            {/* Cột Tổng tháng hiển thị rowSpan ở hàng đầu tiên của bảng */}
                            {groupIdx === 0 && itemIdx === 0 ? (
                              <td
                                rowSpan={currentItems.length}
                                className="border border-gray-500 py-2 px-4 text-center font-black text-black bg-[#ffff00] text-base align-middle"
                              >
                                {activeCategoryTotal.toLocaleString('vi-VN')}
                              </td>
                            ) : null}
                            <td className="border border-gray-500 py-2 px-2 text-center print:hidden screenshot-exclude">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  onClick={() => handleOpenEditModal(item)}
                                  className="p-1 hover:text-blue-600 rounded text-slate-500"
                                  title="Sửa"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteItem(item.id)}
                                  className="p-1 hover:text-red-600 rounded text-slate-500"
                                  title="Xóa"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    ))
                  )}
                </tbody>
              </table>
            ) : activeCategory.id === 6 || activeCategory.name.includes('과일') ? (
              // CASE G: RƯỢU SOJU HOA QUẢ (Khớp 100% Ảnh 2 đợt 2)
              <table className="w-full border-collapse border-2 border-gray-600 text-sm">
                <thead>
                  <tr className="bg-[#245839] text-white font-extrabold select-none">
                    <th className="border border-gray-600 py-2.5 px-3 text-center w-14">
                      <div className="flex items-center justify-center gap-1">
                        <span>STT</span>
                        <span className="text-[10px] opacity-75">▼</span>
                      </div>
                    </th>
                    <th className="border border-gray-600 py-2.5 px-4 text-center min-w-[180px]">
                      <div className="flex items-center justify-center gap-1">
                        <span>Danh mục sản phẩm</span>
                        <span className="text-[10px] opacity-75">▼</span>
                      </div>
                    </th>
                    <th className="border border-gray-600 py-2.5 px-4 text-center min-w-[200px]">
                      <div className="flex items-center justify-center gap-1">
                        <span>Sản phẩm</span>
                        <span className="text-[10px] opacity-75">▼</span>
                      </div>
                    </th>
                    <th className="border border-gray-600 py-2.5 px-3 text-center w-20">
                      <div className="flex items-center justify-center gap-1">
                        <span>ĐVT</span>
                        <span className="text-[10px] opacity-75">▼</span>
                      </div>
                    </th>
                    <th className="border border-gray-600 py-2.5 px-3 text-center w-24">
                      <div className="flex items-center justify-center gap-1">
                        <span>Số lượng</span>
                        <span className="text-[10px] opacity-75">▼</span>
                      </div>
                    </th>
                    <th className="border border-gray-600 py-2.5 px-3 text-center w-28">
                      <div className="flex items-center justify-center gap-1">
                        <span>Đơn giá</span>
                        <span className="text-[10px] opacity-75">▼</span>
                      </div>
                    </th>
                    <th className="border border-gray-600 py-2.5 px-4 text-center min-w-[140px]">
                      <div className="flex items-center justify-center gap-1">
                        <span>Tổng thành tiền</span>
                        <span className="text-[10px] opacity-75">▼</span>
                      </div>
                    </th>
                    <th className="border border-gray-600 py-2.5 px-2 text-center w-14 bg-slate-700 text-white print:hidden screenshot-exclude">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {currentItems.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="border border-gray-400 py-8 text-center text-slate-400 italic">
                        Chưa có dữ liệu Soju hoa quả trong tháng. Bấm "Quét AI Hóa Đơn" hoặc "Thêm Mặt Hàng" để nhập.
                      </td>
                    </tr>
                  ) : (
                    currentItems.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-emerald-50/40 transition">
                        <td className="border border-gray-500 py-2 px-3 text-center font-bold">{idx + 1}</td>
                        <td className="border border-gray-500 py-2 px-4 text-left font-semibold text-gray-700">{item.note || 'Soju hoa quả'}</td>
                        <td className="border border-gray-500 py-2 px-4 text-left font-bold text-gray-900">{item.itemName}</td>
                        <td className="border border-gray-500 py-2 px-3 text-center font-semibold">{item.unit || 'Chai'}</td>
                        <td className="border border-gray-500 py-2 px-3 text-center font-bold">
                          {String(item.quantity).replace('.', ',')}
                        </td>
                        <td className="border border-gray-500 py-2 px-3 text-center font-bold">
                          {item.unitPrice.toLocaleString('vi-VN')}
                        </td>
                        <td className="border border-gray-500 py-2 px-4 text-center font-extrabold text-gray-900">
                          {item.amount.toLocaleString('vi-VN')}
                        </td>
                        <td className="border border-gray-500 py-2 px-2 text-center print:hidden screenshot-exclude">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleOpenEditModal(item)}
                              className="p-1 hover:text-blue-600 rounded text-slate-500"
                              title="Sửa"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteItem(item.id)}
                              className="p-1 hover:text-red-600 rounded text-slate-500"
                              title="Xóa"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}

                  {/* Hàng Tổng (Khớp Ô ĐỎ Tổng & Ô VÀNG ở Ảnh 2) */}
                  <tr className="bg-white font-black text-sm">
                    <td colSpan={5} className="border-0 py-2"></td>
                    <td className="border border-gray-500 py-2 px-4 text-center bg-[#ff0000] text-black font-black text-base">
                      Tổng
                    </td>
                    <td className="border border-gray-500 py-2 px-4 text-center bg-[#ffff00] text-black font-black text-base">
                      {activeCategoryTotal.toLocaleString('vi-VN')}
                    </td>
                    <td className="border border-gray-500 py-2 px-2 text-center print:hidden screenshot-exclude"></td>
                  </tr>
                </tbody>
              </table>
            ) : activeCategory.id === 8 || activeCategory.name.includes('고사리') ? (
              // CASE H: DƯƠNG SỈ _ BỘT ỚT (Khớp 100% Ảnh 3 đợt 2)
              <table className="w-full border-collapse border-2 border-gray-600 text-sm">
                <thead>
                  <tr className="bg-[#245839] text-white font-extrabold select-none">
                    <th className="border border-gray-600 py-2.5 px-3 text-center w-24">
                      <div className="flex items-center justify-center gap-1">
                        <span>NGÀY</span>
                        <span className="text-[10px] opacity-75">▼</span>
                      </div>
                    </th>
                    <th className="border border-gray-600 py-2.5 px-4 text-center min-w-[240px]">
                      <div className="flex items-center justify-center gap-1">
                        <span>TÊN MẶT HÀNG</span>
                        <span className="text-[10px] opacity-75">▼</span>
                      </div>
                    </th>
                    <th className="border border-gray-600 py-2.5 px-3 text-center w-24">
                      <div className="flex items-center justify-center gap-1">
                        <span>SỐ LƯỢNG</span>
                        <span className="text-[10px] opacity-75">▼</span>
                      </div>
                    </th>
                    <th className="border border-gray-600 py-2.5 px-3 text-center w-28">
                      <div className="flex items-center justify-center gap-1">
                        <span>ĐƠN GIÁ</span>
                        <span className="text-[10px] opacity-75">▼</span>
                      </div>
                    </th>
                    <th className="border border-gray-600 py-2.5 px-4 text-center min-w-[140px]">
                      <div className="flex items-center justify-center gap-1">
                        <span>THÀNH TIỀN</span>
                        <span className="text-[10px] opacity-75">▼</span>
                      </div>
                    </th>
                    <th className="border border-gray-600 py-2.5 px-2 text-center w-14 bg-slate-700 text-white print:hidden screenshot-exclude">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {currentItems.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="border border-gray-400 py-8 text-center text-slate-400 italic">
                        Chưa có dữ liệu Dương sỉ _ Bột ớt trong tháng. Bấm "Quét AI Hóa Đơn" hoặc "Thêm Mặt Hàng" để nhập.
                      </td>
                    </tr>
                  ) : (
                    currentItems.map((item) => (
                      <tr key={item.id} className="hover:bg-emerald-50/40 transition">
                        <td className="border border-gray-500 py-2 px-3 text-center font-bold text-gray-900">{item.dateStr}</td>
                        <td className="border border-gray-500 py-2 px-4 text-left font-bold text-gray-900">{item.itemName}</td>
                        <td className="border border-gray-500 py-2 px-3 text-center font-bold">
                          {String(item.quantity).replace('.', ',')}
                        </td>
                        <td className="border border-gray-500 py-2 px-3 text-center font-bold">
                          {item.unitPrice.toLocaleString('vi-VN')}
                        </td>
                        <td className="border border-gray-500 py-2 px-4 text-center font-extrabold text-gray-900">
                          {item.amount.toLocaleString('vi-VN')}
                        </td>
                        <td className="border border-gray-500 py-2 px-2 text-center print:hidden screenshot-exclude">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleOpenEditModal(item)}
                              className="p-1 hover:text-blue-600 rounded text-slate-500"
                              title="Sửa"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteItem(item.id)}
                              className="p-1 hover:text-red-600 rounded text-slate-500"
                              title="Xóa"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}

                  {/* Hàng Tổng (Khớp Ô ĐỎ Tổng & Ô VÀNG ở Ảnh 3) */}
                  <tr className="bg-white font-black text-sm">
                    <td colSpan={3} className="border-0 py-2"></td>
                    <td className="border border-gray-500 py-2 px-4 text-center bg-[#ff0000] text-black font-black text-base">
                      Tổng
                    </td>
                    <td className="border border-gray-500 py-2 px-4 text-center bg-[#ffff00] text-black font-black text-base">
                      {activeCategoryTotal.toLocaleString('vi-VN')}
                    </td>
                    <td className="border border-gray-500 py-2 px-2 text-center print:hidden screenshot-exclude"></td>
                  </tr>
                </tbody>
              </table>
            ) : activeCategory.id === 7 || activeCategory.name.includes('옥수수') ? (
              // CASE I: NGÔ HỘP (Khớp 100% Ảnh 4 đợt 2)
              <table className="w-full border-collapse border-2 border-gray-600 text-sm">
                <thead>
                  <tr className="bg-[#245839] text-white font-extrabold select-none">
                    <th className="border border-gray-600 py-2.5 px-3 text-center w-14">
                      <div className="flex items-center justify-center gap-1">
                        <span>STT</span>
                        <span className="text-[10px] opacity-75">▼</span>
                      </div>
                    </th>
                    <th className="border border-gray-600 py-2.5 px-3 text-center w-20">
                      <div className="flex items-center justify-center gap-1">
                        <span>NGÀY</span>
                        <span className="text-[10px] opacity-75">▼</span>
                      </div>
                    </th>
                    <th className="border border-gray-600 py-2.5 px-3 text-center w-24">
                      <div className="flex items-center justify-center gap-1">
                        <span>MÃ HÀNG</span>
                        <span className="text-[10px] opacity-75">▼</span>
                      </div>
                    </th>
                    <th className="border border-gray-600 py-2.5 px-4 text-center min-w-[200px]">
                      <div className="flex items-center justify-center gap-1">
                        <span>TÊN HÀNG</span>
                        <span className="text-[10px] opacity-75">▼</span>
                      </div>
                    </th>
                    <th className="border border-gray-600 py-2.5 px-3 text-center w-20">
                      <div className="flex items-center justify-center gap-1">
                        <span>ĐƠN VỊ</span>
                        <span className="text-[10px] opacity-75">▼</span>
                      </div>
                    </th>
                    <th className="border border-gray-600 py-2.5 px-3 text-center w-24">
                      <div className="flex items-center justify-center gap-1">
                        <span>SỐ LƯỢNG</span>
                        <span className="text-[10px] opacity-75">▼</span>
                      </div>
                    </th>
                    <th className="border border-gray-600 py-2.5 px-3 text-center w-28">
                      <div className="flex items-center justify-center gap-1">
                        <span>ĐƠN GIÁ</span>
                        <span className="text-[10px] opacity-75">▼</span>
                      </div>
                    </th>
                    <th className="border border-gray-600 py-2.5 px-4 text-center min-w-[140px]">
                      <div className="flex items-center justify-center gap-1">
                        <span>THÀNH TIỀN</span>
                        <span className="text-[10px] opacity-75">▼</span>
                      </div>
                    </th>
                    <th className="border border-gray-600 py-2.5 px-2 text-center w-14 bg-slate-700 text-white print:hidden screenshot-exclude">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {currentItems.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="border border-gray-400 py-8 text-center text-slate-400 italic">
                        Chưa có dữ liệu Ngô hộp trong tháng. Bấm "Quét AI Hóa Đơn" hoặc "Thêm Mặt Hàng" để nhập.
                      </td>
                    </tr>
                  ) : (
                    currentItems.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-emerald-50/40 transition">
                        <td className="border border-gray-500 py-2 px-3 text-center font-bold">{idx + 1}</td>
                        <td className="border border-gray-500 py-2 px-3 text-center font-bold">{item.dateStr}</td>
                        <td className="border border-gray-500 py-2 px-3 text-center font-semibold text-slate-700">{item.note || '671'}</td>
                        <td className="border border-gray-500 py-2 px-4 text-left font-bold text-gray-900">{item.itemName}</td>
                        <td className="border border-gray-500 py-2 px-3 text-center font-semibold">{item.unit || 'Hộp'}</td>
                        <td className="border border-gray-500 py-2 px-3 text-center font-bold">
                          {String(item.quantity).replace('.', ',')}
                        </td>
                        <td className="border border-gray-500 py-2 px-3 text-center font-bold">
                          {item.unitPrice.toLocaleString('vi-VN')}
                        </td>
                        <td className="border border-gray-500 py-2 px-4 text-center font-extrabold text-gray-900">
                          {item.amount.toLocaleString('vi-VN')}
                        </td>
                        <td className="border border-gray-500 py-2 px-2 text-center print:hidden screenshot-exclude">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleOpenEditModal(item)}
                              className="p-1 hover:text-blue-600 rounded text-slate-500"
                              title="Sửa"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteItem(item.id)}
                              className="p-1 hover:text-red-600 rounded text-slate-500"
                              title="Xóa"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}

                  {/* Hàng Tổng (Khớp Ô ĐỎ Tổng & Ô VÀNG ở Ảnh 4) */}
                  <tr className="bg-white font-black text-sm">
                    <td colSpan={6} className="border-0 py-2"></td>
                    <td className="border border-gray-500 py-2 px-4 text-center bg-[#ff0000] text-black font-black text-base">
                      Tổng
                    </td>
                    <td className="border border-gray-500 py-2 px-4 text-center bg-[#ffff00] text-black font-black text-base">
                      {activeCategoryTotal.toLocaleString('vi-VN')}
                    </td>
                    <td className="border border-gray-500 py-2 px-2 text-center print:hidden screenshot-exclude"></td>
                  </tr>
                </tbody>
              </table>
            ) : activeCategory.id === 9 || activeCategory.name.includes('음료수') ? (
              // CASE J: ĐỒ UỐNG & NƯỚC NGỌT (Khớp 100% Ảnh 5 đợt 2)
              <table className="w-full border-collapse border-2 border-gray-600 text-sm">
                <thead>
                  <tr className="bg-[#3b82f6] text-white font-extrabold select-none">
                    <th className="border border-gray-600 py-2.5 px-3 text-center w-20">NGÀY</th>
                    <th className="border border-gray-600 py-2.5 px-4 text-center min-w-[260px]">TÊN SẢN PHẨM</th>
                    <th className="border border-gray-600 py-2.5 px-3 text-center w-24">SỐ LƯỢNG</th>
                    <th className="border border-gray-600 py-2.5 px-2 text-center w-20">%VAT</th>
                    <th className="border border-gray-600 py-2.5 px-4 text-center min-w-[160px]">GHI CHÚ</th>
                    <th className="border border-gray-600 py-2.5 px-3 text-center w-28">ĐƠN GIÁ</th>
                    <th className="border border-gray-600 py-2.5 px-4 text-center min-w-[140px]">THÀNH TIỀN</th>
                    <th className="border border-gray-600 py-2.5 px-4 text-center bg-[#ff0000] text-white min-w-[130px]">
                      TỔNG TIỀN
                    </th>
                    <th className="border border-gray-600 py-2.5 px-2 text-center w-14 bg-slate-700 text-white print:hidden screenshot-exclude">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {currentItems.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="border border-gray-400 py-8 text-center text-slate-400 italic">
                        Chưa có dữ liệu Đồ uống trong tháng. Bấm "Quét AI Hóa Đơn" hoặc "Thêm Mặt Hàng" để nhập.
                      </td>
                    </tr>
                  ) : (
                    currentItems.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-blue-50/50 transition">
                        <td className="border border-gray-500 py-2 px-3 text-center font-bold">{item.dateStr || ''}</td>
                        <td className="border border-gray-500 py-2 px-4 text-left font-bold text-gray-900">{item.itemName}</td>
                        <td className="border border-gray-500 py-2 px-3 text-center font-bold">
                          {String(item.quantity).replace('.', ',')}
                        </td>
                        <td className="border border-gray-500 py-2 px-2 text-center font-bold">
                          {item.taxRate > 0 ? `${item.taxRate}%` : ''}
                        </td>
                        <td className="border border-gray-500 py-2 px-4 text-left text-xs text-slate-600">{item.note || ''}</td>
                        <td className="border border-gray-500 py-2 px-3 text-center font-bold">
                          {item.unitPrice > 0 ? item.unitPrice.toLocaleString('vi-VN') : '0'}
                        </td>
                        <td className="border border-gray-500 py-2 px-4 text-center font-extrabold text-blue-900">
                          {item.amount > 0 ? item.amount.toLocaleString('vi-VN') : ''}
                        </td>
                        {idx === currentItems.length - 1 ? (
                          <td
                            rowSpan={1}
                            className="border border-gray-500 py-2 px-4 text-center font-black text-gray-900 bg-white"
                          >
                            {activeCategoryTotal.toLocaleString('vi-VN')}
                          </td>
                        ) : (
                          <td className="border border-gray-500 py-2 px-4 text-center bg-white"></td>
                        )}
                        <td className="border border-gray-500 py-2 px-2 text-center print:hidden screenshot-exclude">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleOpenEditModal(item)}
                              className="p-1 hover:text-blue-600 rounded text-slate-500"
                              title="Sửa"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteItem(item.id)}
                              className="p-1 hover:text-red-600 rounded text-slate-500"
                              title="Xóa"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}

                  {/* Hàng Tổng (Khớp Ô ĐỎ Tổng & Ô TRẮNG ở Ảnh 5) */}
                  <tr className="bg-white font-black text-sm">
                    <td colSpan={6} className="border-0 py-2"></td>
                    <td className="border border-gray-500 py-2 px-4 text-center bg-[#ff0000] text-white font-black text-base">
                      Tổng
                    </td>
                    <td className="border border-gray-500 py-2 px-4 text-center font-black text-gray-900 bg-white text-base">
                      {activeCategoryTotal.toLocaleString('vi-VN')}
                    </td>
                    <td className="border border-gray-500 py-2 px-2 text-center print:hidden screenshot-exclude"></td>
                  </tr>
                </tbody>
              </table>
            ) : activeCategory.id === 11 || activeCategory.name.includes('주방세제') || activeCategory.name.includes('Nước rửa') || activeCategory.name.includes('lau sàn') ? (
              // CASE L: NƯỚC RỬA BÁT _ NƯỚC LAU SÀN (Khớp 100% Ảnh người dùng vừa gửi)
              <table className="w-full border-collapse border-2 border-gray-600 text-sm">
                <thead>
                  <tr className="bg-[#235c43] text-white font-extrabold select-none">
                    <th className="border border-gray-600 py-2.5 px-3 text-center w-14">
                      <div className="flex items-center justify-center gap-1">
                        <span>STT</span>
                        <span className="text-[10px] opacity-75">▼</span>
                      </div>
                    </th>
                    <th className="border border-gray-600 py-2.5 px-3 text-center w-24">
                      <div className="flex items-center justify-center gap-1">
                        <span>📅 NGÀY</span>
                        <span className="text-[10px] opacity-75">▼</span>
                      </div>
                    </th>
                    <th className="border border-gray-600 py-2.5 px-4 text-center min-w-[200px]">
                      <div className="flex items-center justify-center gap-1">
                        <span>TÊN HÀNG</span>
                        <span className="text-[10px] opacity-75">▼</span>
                      </div>
                    </th>
                    <th className="border border-gray-600 py-2.5 px-3 text-center w-20">
                      <div className="flex items-center justify-center gap-1">
                        <span>ĐVT</span>
                        <span className="text-[10px] opacity-75">▼</span>
                      </div>
                    </th>
                    <th className="border border-gray-600 py-2.5 px-3 text-center w-24">
                      <div className="flex items-center justify-center gap-1">
                        <span>SỐ LƯỢNG</span>
                        <span className="text-[10px] opacity-75">▼</span>
                      </div>
                    </th>
                    <th className="border border-gray-600 py-2.5 px-3 text-center w-28">
                      <div className="flex items-center justify-center gap-1">
                        <span>ĐƠN GIÁ</span>
                        <span className="text-[10px] opacity-75">▼</span>
                      </div>
                    </th>
                    <th className="border border-gray-600 py-2.5 px-4 text-center min-w-[140px]">
                      <div className="flex items-center justify-center gap-1">
                        <span># THÀNH TIỀN</span>
                        <span className="text-[10px] opacity-75">▼</span>
                      </div>
                    </th>
                    <th className="border border-gray-600 py-2.5 px-3 text-center min-w-[120px]">
                      <div className="flex items-center justify-center gap-1">
                        <span>Trả vỏ</span>
                        <span className="text-[10px] opacity-75">▼</span>
                      </div>
                    </th>
                    <th className="border border-gray-600 py-2.5 px-4 text-center min-w-[140px]">
                      <div className="flex items-center justify-center gap-1">
                        <span>Tổng</span>
                        <span className="text-[10px] opacity-75">▼</span>
                      </div>
                    </th>
                    <th className="border border-gray-600 py-2.5 px-2 text-center w-14 bg-slate-700 text-white print:hidden screenshot-exclude">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {currentItems.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="border border-gray-400 py-8 text-center text-slate-400 italic">
                        Chưa có dữ liệu Nước rửa bát - Nước lau sàn trong tháng. Bấm "Quét AI Hóa Đơn" hoặc "Thêm Mặt Hàng" để nhập.
                      </td>
                    </tr>
                  ) : (
                    currentItems.map((item, idx) => {
                      const finalItemTotal = item.totalPayment > 0 ? item.totalPayment : (item.amount - (item.depositFee || 0));
                      return (
                        <tr key={item.id} className="hover:bg-emerald-50/40 transition">
                          <td className="border border-gray-500 py-2 px-3 text-center font-bold">{idx + 1}</td>
                          <td className="border border-gray-500 py-2 px-3 text-center font-bold">{item.dateStr}</td>
                          <td className="border border-gray-500 py-2 px-4 text-left font-bold text-gray-900">{item.itemName}</td>
                          <td className="border border-gray-500 py-2 px-3 text-center font-semibold">{item.unit || 'Can'}</td>
                          <td className="border border-gray-500 py-2 px-3 text-center font-bold">
                            {String(item.quantity).replace('.', ',')}
                          </td>
                          <td className="border border-gray-500 py-2 px-3 text-center font-bold">
                            {item.unitPrice.toLocaleString('vi-VN')}
                          </td>
                          <td className="border border-gray-500 py-2 px-4 text-center font-bold text-gray-900">
                            {item.amount.toLocaleString('vi-VN')}
                          </td>
                          <td className="border border-gray-500 py-2 px-3 text-center font-semibold text-rose-600">
                            {(item.depositFee || 0) > 0 ? (item.depositFee || 0).toLocaleString('vi-VN') : ''}
                          </td>
                          <td className="border border-gray-500 py-2 px-4 text-center font-extrabold text-gray-900">
                            {finalItemTotal.toLocaleString('vi-VN')}
                          </td>
                          <td className="border border-gray-500 py-2 px-2 text-center print:hidden screenshot-exclude">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => handleOpenEditModal(item)}
                                className="p-1 hover:text-blue-600 rounded text-slate-500"
                                title="Sửa"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteItem(item.id)}
                                className="p-1 hover:text-red-600 rounded text-slate-500"
                                title="Xóa"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}

                  {/* Hàng Tổng (Khớp Ô ĐỎ Tổng & Ô VÀNG Thành Tiền) */}
                  <tr className="bg-white font-black text-sm">
                    <td colSpan={6} className="border-0 py-2"></td>
                    <td className="border border-gray-500 py-2 px-4 text-center font-extrabold text-gray-900 bg-slate-50">
                      {currentItems.reduce((s, i) => s + (i.amount || 0), 0) > 0
                        ? currentItems.reduce((s, i) => s + (i.amount || 0), 0).toLocaleString('vi-VN')
                        : ''}
                    </td>
                    <td className="border border-gray-500 py-2 px-3 text-center font-bold text-rose-700 bg-slate-50">
                      {currentItems.reduce((s, i) => s + (i.depositFee || 0), 0) > 0
                        ? currentItems.reduce((s, i) => s + (i.depositFee || 0), 0).toLocaleString('vi-VN')
                        : ''}
                    </td>
                    <td className="border border-gray-500 py-2 px-4 text-center bg-[#ffff00] text-black font-black text-base">
                      {activeCategoryTotal.toLocaleString('vi-VN')}
                    </td>
                    <td className="border border-gray-500 py-2 px-2 text-center print:hidden screenshot-exclude"></td>
                  </tr>
                </tbody>
              </table>
            ) : (
              // CASE C: CHI TIẾT THEO NGÀY (Khớp 100% Ảnh 2 - Rau củ / Chi tiêu ngày)
              <table className="w-full border-collapse border-2 border-gray-600 text-sm">
                <thead>
                  <tr className="bg-[#3b82f6] text-white font-extrabold select-none">
                    <th className="border border-gray-600 py-2.5 px-3 text-center w-14">STT</th>
                    <th className="border border-gray-600 py-2.5 px-3 text-center w-20">NGÀY</th>
                    <th className="border border-gray-600 py-2.5 px-4 text-center min-w-[200px]">TÊN HÀNG</th>
                    <th className="border border-gray-600 py-2.5 px-3 text-center w-24">SỐ LƯỢNG</th>
                    <th className="border border-gray-600 py-2.5 px-3 text-center w-28">ĐƠN GIÁ</th>
                    <th className="border border-gray-600 py-2.5 px-4 text-center min-w-[130px]">THÀNH TIỀN</th>
                    <th className="border border-gray-600 py-2.5 px-4 text-center bg-[#ff0000] text-white min-w-[120px]">
                      Tổng ngày
                    </th>
                    <th className="border border-gray-600 py-2.5 px-2 text-center w-14 bg-slate-700 text-white print:hidden screenshot-exclude">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {groupedDailyItems.map((group, groupIdx) => (
                    <React.Fragment key={group.dateStr || groupIdx}>
                      {group.items.map((item, itemIdx) => (
                        <tr key={item.id} className="hover:bg-blue-50/40 transition">
                          <td className="border border-gray-500 py-2 px-3 text-center font-bold">{itemIdx + 1}</td>
                          <td className="border border-gray-500 py-2 px-3 text-center font-bold">
                            {itemIdx === 0 && (
                              <div className="flex items-center justify-center gap-1.5">
                                <span>{item.dateStr}</span>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteByDate(group.dateStr, group.items.length, group.dayTotal)}
                                  className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 p-1 rounded-md transition print:hidden screenshot-exclude cursor-pointer"
                                  title={`Xóa toàn bộ hóa đơn ngày ${item.dateStr} (${group.items.length} mặt hàng)`}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </td>
                          <td className="border border-gray-500 py-2 px-4 text-left font-bold text-gray-900">
                            {item.itemName}
                          </td>
                          <td className="border border-gray-500 py-2 px-3 text-center font-bold">
                            {String(item.quantity).replace('.', ',')}
                          </td>
                          <td className="border border-gray-500 py-2 px-3 text-center font-bold">
                            {item.unitPrice.toLocaleString('vi-VN')}
                          </td>
                          <td className="border border-gray-500 py-2 px-4 text-center font-bold text-gray-900">
                            {item.amount.toLocaleString('vi-VN')}
                          </td>
                          {/* Ô tổng ngày ở hàng cuối cùng của ngày đó */}
                          {itemIdx === group.items.length - 1 ? (
                            <td
                              rowSpan={1}
                              className="border border-gray-500 py-2 px-4 text-center font-black text-gray-900 bg-white"
                            >
                              {group.dayTotal.toLocaleString('vi-VN')}
                            </td>
                          ) : (
                            <td className="border border-gray-500 py-2 px-4 text-center bg-white"></td>
                          )}
                          <td className="border border-gray-500 py-2 px-2 text-center print:hidden screenshot-exclude">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => handleOpenEditModal(item)}
                                className="p-1 hover:text-blue-600 rounded text-slate-500"
                                title="Sửa"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteItem(item.id)}
                                className="p-1 hover:text-red-600 rounded text-slate-500"
                                title="Xóa"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}

                      {/* Thanh phân cách MÀU VÀNG giữa các ngày (Khớp 100% Ảnh 2) */}
                      {groupIdx < groupedDailyItems.length - 1 && (
                        <tr className="bg-[#ffff00] h-4">
                          <td colSpan={8} className="border border-gray-400 bg-[#ffff00] py-1"></td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}

                  {/* Hàng tổng cộng của toàn bộ hạng mục */}
                  <tr className="bg-slate-100 font-black text-sm">
                    <td colSpan={5} className="border border-gray-500 py-2.5 px-4 text-right">
                      TỔNG CỘNG THÁNG {selectedMonth}:
                    </td>
                    <td colSpan={2} className="border border-gray-500 py-2.5 px-4 text-center text-emerald-900 text-base font-black">
                      {activeCategoryTotal.toLocaleString('vi-VN')} VNĐ
                    </td>
                    <td className="border border-gray-500 py-2 px-2 text-center print:hidden screenshot-exclude bg-slate-100"></td>
                  </tr>
                </tbody>
              </table>
            )}

            {/* Chữ ký xác nhận gửi sếp */}
            <div className="mt-8 pt-4 border-t border-slate-200 grid grid-cols-3 gap-4 text-center text-xs">
              <div>
                <div className="font-bold text-slate-700">Người lập biểu</div>
                <div className="text-[11px] text-slate-400 mt-0.5">(Ký & ghi rõ họ tên)</div>
                <div className="h-14"></div>
              </div>
              <div>
                <div className="font-bold text-slate-700">Quản lý thu mua / Bếp</div>
                <div className="text-[11px] text-slate-400 mt-0.5">(Ký & ghi rõ họ tên)</div>
                <div className="h-14"></div>
              </div>
              <div>
                <div className="font-bold text-slate-700">Ban Giám Đốc phê duyệt</div>
                <div className="text-[11px] text-slate-400 mt-0.5">(Ký & đóng dấu)</div>
                <div className="h-14"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )}

      {/* MODAL: THÊM / SỬA MẶT HÀNG HÓA ĐƠN */}
      {editingItem && (
        <div
          className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs"
          onClick={() => setEditingItem(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-5 border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-black text-slate-800 mb-3 flex items-center justify-between border-b pb-2">
              <span>{isNewItem ? '➕ Thêm mặt hàng hóa đơn mới' : '✏️ Chỉnh sửa mặt hàng'}</span>
              <button onClick={() => setEditingItem(null)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </h3>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Ngày nhập (VD: 1/9, 3/9):</label>
                  <input
                    type="text"
                    value={editingItem.dateStr || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, dateStr: e.target.value })}
                    placeholder="1/9"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 font-bold focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Đơn vị (kg, chai, thùng...):</label>
                  <input
                    type="text"
                    value={editingItem.unit || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, unit: e.target.value })}
                    placeholder="kg"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 font-bold focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tên hàng hóa:</label>
                <input
                  type="text"
                  value={editingItem.itemName || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, itemName: e.target.value })}
                  placeholder="VD: Xà lách, Ba chỉ heo, Gas..."
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 font-bold focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Số lượng:</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingItem.quantity || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, quantity: parseFloat(e.target.value) || 0 })}
                    placeholder="1"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 font-bold focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Đơn giá (VNĐ):</label>
                  <input
                    type="number"
                    step="1000"
                    value={editingItem.unitPrice || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, unitPrice: parseFloat(e.target.value) || 0 })}
                    placeholder="40000"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 font-bold focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
                  />
                </div>
              </div>

              {activeCategoryId === 4 && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Thuế suất GTGT (%):</label>
                  <input
                    type="number"
                    value={editingItem.taxRate || 0}
                    onChange={(e) => setEditingItem({ ...editingItem, taxRate: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 font-bold focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
                  />
                </div>
              )}

              {(activeCategoryId === 2 || activeCategory?.name.includes('가스') || activeCategoryId === 11 || activeCategory?.name.includes('주방세제') || activeCategory?.name.includes('Nước rửa') || activeCategory?.name.includes('lau sàn')) && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tiền trả vỏ can / bình (VNĐ):</label>
                  <input
                    type="number"
                    step="1000"
                    value={editingItem.depositFee || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, depositFee: parseFloat(e.target.value) || 0 })}
                    placeholder="VD: 40000"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 font-bold focus:ring-2 focus:ring-emerald-600 focus:outline-hidden"
                  />
                </div>
              )}

              {(activeCategoryId === 5 || activeCategory?.name.includes('막창')) && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tiền Ship (VNĐ):</label>
                  <input
                    type="number"
                    step="1000"
                    value={editingItem.shipFee || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, shipFee: parseFloat(e.target.value) || 0 })}
                    placeholder="70000"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 font-bold focus:ring-2 focus:ring-emerald-600 focus:outline-hidden"
                  />
                </div>
              )}

              {(activeCategoryId === 12 || activeCategory?.name.includes('베트남 술')) && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Giá đơn vị / Quy cách (VD: 30L):</label>
                  <input
                    type="text"
                    value={editingItem.note || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, note: e.target.value })}
                    placeholder="30L"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 font-bold focus:ring-2 focus:ring-emerald-600 focus:outline-hidden"
                  />
                </div>
              )}

              {(activeCategoryId === 7 || activeCategory?.name.includes('옥수수')) && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Mã hàng (VD: 671):</label>
                  <input
                    type="text"
                    value={editingItem.note || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, note: e.target.value })}
                    placeholder="671"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 font-bold focus:ring-2 focus:ring-emerald-600 focus:outline-hidden"
                  />
                </div>
              )}

              {(activeCategoryId === 9 || activeCategory?.name.includes('음료수')) && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Ghi chú (VD: chuong trinh coke 28 lon):</label>
                  <input
                    type="text"
                    value={editingItem.note || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, note: e.target.value })}
                    placeholder="chuong trinh coke 28 lon"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 font-bold focus:ring-2 focus:ring-emerald-600 focus:outline-hidden"
                  />
                </div>
              )}

              {(activeCategoryId === 6 || activeCategory?.name.includes('과일')) && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Danh mục sản phẩm:</label>
                  <input
                    type="text"
                    value={editingItem.note || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, note: e.target.value })}
                    placeholder="Soju hoa quả"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 font-bold focus:ring-2 focus:ring-emerald-600 focus:outline-hidden"
                  />
                </div>
              )}

              {(activeCategoryId === 10 || activeCategory?.name.includes('원마켓')) && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tiền thuế (세액 - VNĐ):</label>
                  <input
                    type="number"
                    step="1000"
                    value={editingItem.taxAmount || 0}
                    onChange={(e) => setEditingItem({ ...editingItem, taxAmount: parseFloat(e.target.value) || 0 })}
                    placeholder="0"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 font-bold focus:ring-2 focus:ring-emerald-600 focus:outline-hidden"
                  />
                </div>
              )}

              {/* Preview Total */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs flex justify-between font-bold">
                <span>Thành tiền dự kiến:</span>
                <span className="text-emerald-800 text-sm">
                  {(
                    (Number(editingItem.quantity) || 0) *
                    (Number(editingItem.unitPrice) || 0) *
                    (1 + (Number(editingItem.taxRate) || 0) / 100)
                  ).toLocaleString('vi-VN')}{' '}
                  VNĐ
                </span>
              </div>

              <div className="flex items-center gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={handleSaveItemModal}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm shadow-md transition"
                >
                  {isNewItem ? 'Lưu mặt hàng' : 'Cập nhật mặt hàng'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: SỬA SỐ TIỀN CỐ ĐỊNH CHO HẠNG MỤC CHƯA CÓ CHI TIẾT */}
      {editingCategoryAmount && (
        <div
          className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs"
          onClick={() => setEditingCategoryAmount(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-5 border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-black text-slate-800 mb-3 flex items-center justify-between border-b pb-2">
              <span>Nhập số tiền: {editingCategoryAmount.name}</span>
              <button onClick={() => setEditingCategoryAmount(null)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Số tiền chi phí trong tháng (VNĐ):
                </label>
                <input
                  type="number"
                  step="10000"
                  value={fixedAmountInput}
                  onChange={(e) => setFixedAmountInput(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 font-bold focus:ring-2 focus:ring-emerald-600 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={handleSaveFixedAmount}
                  className="flex-1 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-sm shadow-md transition"
                >
                  Lưu số tiền
                </button>
                <button
                  type="button"
                  onClick={() => setEditingCategoryAmount(null)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: THÊM MỤC HÓA ĐƠN MỚI */}
      {showAddCategoryModal && (
        <div
          className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs"
          onClick={() => setShowAddCategoryModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-black text-slate-800 mb-4 flex items-center justify-between border-b pb-3">
              <span className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-sm">
                  ➕
                </span>
                <span>Thêm Mục Hóa Đơn / NCC Mới</span>
              </span>
              <button
                onClick={() => setShowAddCategoryModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1"
              >
                ✕
              </button>
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Tên mục hóa đơn / Nhà cung cấp: <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="VD: Hải sản - Tôm mực, Than nướng, Gia vị..."
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 font-medium focus:ring-2 focus:ring-emerald-600 focus:outline-hidden"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Phân loại hình thức quản lý:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewCatType('Daily')}
                    className={`p-3 rounded-xl border text-xs font-bold text-left transition cursor-pointer ${
                      newCatType === 'Daily'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-900 shadow-2xs'
                        : 'border-slate-200 hover:border-slate-300 text-slate-600'
                    }`}
                  >
                    <div className="font-extrabold mb-0.5">🛒 Chi tiêu hàng ngày</div>
                    <div className="text-[11px] font-normal text-slate-500">Rau củ, gas, đá viên, lau sàn...</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewCatType('Supplier')}
                    className={`p-3 rounded-xl border text-xs font-bold text-left transition cursor-pointer ${
                      newCatType === 'Supplier'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-900 shadow-2xs'
                        : 'border-slate-200 hover:border-slate-300 text-slate-600'
                    }`}
                  >
                    <div className="font-extrabold mb-0.5">🏢 Nhà phân phối (NCC)</div>
                    <div className="text-[11px] font-normal text-slate-500">Keyfood, An Phát, Bia rượu...</div>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Số tiền định mức ban đầu (nếu không theo dõi chi tiết mặt hàng):
                </label>
                <input
                  type="number"
                  step="10000"
                  placeholder="0"
                  value={newCatFixedAmount || ''}
                  onChange={(e) => setNewCatFixedAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 font-bold focus:ring-2 focus:ring-emerald-600 focus:outline-hidden"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  💡 Nếu mục này có hóa đơn chi tiết từng ngày, bạn để số tiền 0 và bấm vào mục để thêm mặt hàng sau.
                </span>
              </div>

              <div className="flex items-center gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleCreateCategory}
                  className="flex-1 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-sm shadow-md transition cursor-pointer"
                >
                  💾 Lưu Vào Database SQL Server
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddCategoryModal(false)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Hủy
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: XÁC NHẬN XÓA / LÀM SẠCH DỮ LIỆU HÓA ĐƠN */}
      {showClearModal && (
        <div
          className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs"
          onClick={() => setShowClearModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">
                  {activeCategory
                    ? `Làm Sạch Giá Mục [${activeCategory.name}] Tháng ${selectedMonth}/${selectedYear}`
                    : `Làm Sạch Tổng Giá Tháng ${selectedMonth}/${selectedYear}`}
                </h3>
                <p className="text-xs text-slate-500 font-medium">Chỉ làm sạch số tiền tháng đang chọn, giữ nguyên danh mục</p>
              </div>
            </div>

            <div className="my-4 p-3.5 bg-rose-50/80 rounded-xl border border-rose-200 text-xs text-rose-900 leading-relaxed font-medium space-y-2">
              {activeCategory ? (
                <>
                  <div>
                    Bạn có chắc chắn muốn làm sạch toàn bộ <b>{currentItems.length} mặt hàng</b> trong hóa đơn <b>[{activeCategory.name}]</b> của <b>Tháng {selectedMonth}/{selectedYear}</b>?
                  </div>
                  <div className="text-[11px] text-slate-600 bg-white p-2 rounded-lg border border-rose-200">
                    <div>✓ <b>Mục [{activeCategory.name}]</b> vẫn được giữ nguyên trong hệ thống (không bị xóa).</div>
                    <div>✓ Chỉ xóa các mặt hàng chi tiết và đưa tổng tiền tháng {selectedMonth}/{selectedYear} về 0.</div>
                    <div>✓ Dữ liệu của các tháng khác được bảo toàn 100%.</div>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    Bạn có chắc chắn muốn làm sạch thông tin tổng giá của <b>Tháng {selectedMonth}/{selectedYear}</b>?
                  </div>
                  <div className="text-[11px] text-slate-600 bg-white p-2 rounded-lg border border-rose-200">
                    <div>✓ <b>Toàn bộ {categories.length} hạng mục</b> hóa đơn (Rau, Gas, Keyfood, An Phát...) vẫn được <b>giữ nguyên 100%</b>.</div>
                    <div>✓ Chỉ làm sạch các mặt hàng chi tiết và đặt số tiền của <b>Tháng {selectedMonth}/{selectedYear}</b> về 0.</div>
                    <div>✓ <b>Tuyệt đối không ảnh hưởng</b> đến dữ liệu hóa đơn của các tháng khác.</div>
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={handleClearData}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-sm shadow-md transition cursor-pointer"
              >
                Xác Nhận Xóa
              </button>
              <button
                type="button"
                onClick={() => setShowClearModal(false)}
                className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Hủy Bỏ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL TIẾN ĐỘ XUẤT ZIP */}
      {isExportingZip && zipProgress && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 border border-slate-200 text-center space-y-4">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center">
              <Archive className="w-7 h-7 animate-bounce" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-800">Đang Tạo Trọn Bộ Ảnh Hóa Đơn (.ZIP)</h3>
              <p className="text-xs text-slate-500 mt-1 font-semibold">
                {zipProgress.name} ({zipProgress.current}/{zipProgress.total})
              </p>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-amber-600 h-2.5 rounded-full transition-all duration-200"
                style={{
                  width: `${Math.max(5, Math.round((zipProgress.current / zipProgress.total) * 100))}%`,
                }}
              ></div>
            </div>
            <p className="text-[11px] text-slate-400">
              Đang tự động chụp Ultra HD bảng tổng hợp & từng hóa đơn chi tiết gửi sếp...
            </p>
          </div>
        </div>
      )}

      {/* MODAL: XÓA HÓA ĐƠN THEO NGÀY */}
      {showDeleteDateModal && activeCategory && (
        <div
          className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs"
          onClick={() => setShowDeleteDateModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-rose-600 to-red-700 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                  <Trash2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-sm sm:text-base">Xóa Hóa Đơn Theo Ngày</h3>
                  <p className="text-[11px] text-rose-100">
                    Mục: {activeCategory.name} (Tháng {selectedMonth}/{selectedYear})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowDeleteDateModal(false)}
                className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-sm font-bold text-white transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 leading-relaxed">
                <span className="font-bold">💡 Hướng dẫn:</span> Nếu bạn lỡ quét hoặc nhập nhầm ngày nào đó, hãy nhấn nút <strong>Xóa ngày này</strong> bên dưới. Toàn bộ các dòng hàng của ngày đó sẽ được xóa sạch khỏi cơ sở dữ liệu.
              </div>

              {availableDates.length === 0 ? (
                <div className="text-center py-6 text-sm text-slate-400 italic">
                  Chưa có ngày nào có mặt hàng trong mục này.
                </div>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {availableDates.map((item) => (
                    <div
                      key={item.dateStr}
                      className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:border-rose-300 hover:bg-rose-50/30 transition"
                    >
                      <div>
                        <div className="font-bold text-slate-800 flex items-center gap-2">
                          <span className="text-sm">📅 Ngày {item.dateStr}</span>
                          <span className="text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-bold">
                            {item.count} món
                          </span>
                        </div>
                        <div className="text-xs font-bold text-emerald-700 mt-1">
                          Tổng tiền: {item.total.toLocaleString('vi-VN')} đ
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={isDeletingDate}
                        onClick={() => handleDeleteByDate(item.dateStr, item.count, item.total)}
                        className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-bold rounded-xl text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Xóa ngày này</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowDeleteDateModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: QUÉT HÓA ĐƠN AI THÔNG MINH */}
      <InvoiceScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        categories={categories}
        currentCategoryId={activeCategoryId}
        onSaveItems={handleSaveScannedItems}
      />
    </div>
  );
};

import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { InvoiceCategory, InvoiceItem } from '../../types';
import { invoiceApi } from '../../services/api';
import { downloadScheduleImage, copyScheduleImageToClipboard } from '../../utils/screenshot';
import { exportInvoiceToExcel } from '../../utils/exportInvoiceExcel';
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

// Initial fallback items for Rau (Image 2)
const INITIAL_RAU_ITEMS: InvoiceItem[] = [
  { id: 1, categoryId: 1, dateStr: '1/9', itemName: 'Xà lách', unit: 'kg', quantity: 3.28, unitPrice: 40000, taxRate: 0, taxAmount: 0, amount: 131200, totalPayment: 131200, displayOrder: 1 },
  { id: 2, categoryId: 1, dateStr: '1/9', itemName: 'Dưa chuột', unit: 'kg', quantity: 1, unitPrice: 22000, taxRate: 0, taxAmount: 0, amount: 22000, totalPayment: 22000, displayOrder: 2 },
  { id: 3, categoryId: 1, dateStr: '1/9', itemName: 'Đậu phụ', unit: 'bìa', quantity: 5, unitPrice: 2500, taxRate: 0, taxAmount: 0, amount: 12500, totalPayment: 12500, displayOrder: 3 },
  { id: 4, categoryId: 1, dateStr: '1/9', itemName: 'Nấm đùi gà', unit: 'kg', quantity: 1, unitPrice: 40000, taxRate: 0, taxAmount: 0, amount: 40000, totalPayment: 40000, displayOrder: 4 },
  { id: 5, categoryId: 1, dateStr: '1/9', itemName: 'Ngồng tỏi', unit: 'kg', quantity: 0.55, unitPrice: 75000, taxRate: 0, taxAmount: 0, amount: 41250, totalPayment: 41250, displayOrder: 5 },
  { id: 6, categoryId: 1, dateStr: '1/9', itemName: 'Cà rốt', unit: 'kg', quantity: 1, unitPrice: 13000, taxRate: 0, taxAmount: 0, amount: 13000, totalPayment: 13000, displayOrder: 6 },
  { id: 7, categoryId: 1, dateStr: '1/9', itemName: 'Củ cải đường', unit: 'kg', quantity: 1.4, unitPrice: 13000, taxRate: 0, taxAmount: 0, amount: 18200, totalPayment: 18200, displayOrder: 7 },
  { id: 8, categoryId: 1, dateStr: '1/9', itemName: 'Bí ngòi', unit: 'kg', quantity: 0.96, unitPrice: 30000, taxRate: 0, taxAmount: 0, amount: 28800, totalPayment: 28800, displayOrder: 8 },
  { id: 9, categoryId: 1, dateStr: '1/9', itemName: 'Sốt mayonnaise', unit: 'chai', quantity: 2, unitPrice: 222000, taxRate: 0, taxAmount: 0, amount: 444000, totalPayment: 444000, displayOrder: 9 },
  { id: 10, categoryId: 1, dateStr: '2/9', itemName: 'Xà lách', unit: 'kg', quantity: 3, unitPrice: 40000, taxRate: 0, taxAmount: 0, amount: 120000, totalPayment: 120000, displayOrder: 10 },
  { id: 11, categoryId: 1, dateStr: '2/9', itemName: 'Lá nhíp', unit: 'kg', quantity: 0.5, unitPrice: 95000, taxRate: 0, taxAmount: 0, amount: 47500, totalPayment: 47500, displayOrder: 11 },
  { id: 12, categoryId: 1, dateStr: '2/9', itemName: 'Ngồng tỏi', unit: 'kg', quantity: 0.4, unitPrice: 75000, taxRate: 0, taxAmount: 0, amount: 30000, totalPayment: 30000, displayOrder: 12 },
];

// Initial fallback items for An Phát (Image 3)
const INITIAL_ANPHAT_ITEMS: InvoiceItem[] = [
  { id: 21, categoryId: 4, dateStr: '3/9', itemName: 'Dè Sườn Bò Cut Mỹ Swift', unit: 'kg', quantity: 5.24, unitPrice: 260000, taxRate: 5, taxAmount: 68120, amount: 1362400, totalPayment: 1430520, displayOrder: 1 },
  { id: 22, categoryId: 4, dateStr: '3/9', itemName: 'Dè Sườn Bò Cut Mỹ Swift', unit: 'kg', quantity: 2.62, unitPrice: 260000, taxRate: 5, taxAmount: 34060, amount: 681200, totalPayment: 715260, displayOrder: 2 },
  { id: 23, categoryId: 4, dateStr: '5/9', itemName: 'Ba Chỉ Heo Thái', unit: 'kg', quantity: 3, unitPrice: 125000, taxRate: 5, taxAmount: 18750, amount: 375000, totalPayment: 393750, displayOrder: 3 },
  { id: 24, categoryId: 4, dateStr: '7/9', itemName: 'Dè Sườn Bò Cut Mỹ Swift', unit: 'kg', quantity: 2.64, unitPrice: 260000, taxRate: 5, taxAmount: 34320, amount: 686400, totalPayment: 720720, displayOrder: 4 },
  { id: 25, categoryId: 4, dateStr: '7/9', itemName: 'Ba Chỉ Bò Cuộn 500gr', unit: 'kg', quantity: 3, unitPrice: 200000, taxRate: 5, taxAmount: 30000, amount: 600000, totalPayment: 630000, displayOrder: 5 },
  { id: 26, categoryId: 4, dateStr: '10/9', itemName: 'Dè Sườn Bò Cut Mỹ Swift', unit: 'kg', quantity: 2.7, unitPrice: 260000, taxRate: 5, taxAmount: 35100, totalPayment: 737100, amount: 702000, displayOrder: 6 },
  { id: 27, categoryId: 4, dateStr: '10/9', itemName: 'Ba Chỉ Bò Cuộn 500gr', unit: 'kg', quantity: 3, unitPrice: 200000, taxRate: 5, taxAmount: 30000, totalPayment: 630000, amount: 600000, displayOrder: 7 },
  { id: 28, categoryId: 4, dateStr: '10/9', itemName: 'Ba Chỉ Heo Thái', unit: 'kg', quantity: 5, unitPrice: 125000, taxRate: 5, taxAmount: 31250, totalPayment: 656250, amount: 625000, displayOrder: 8 },
];

// Initial fallback items for Keyfood (Image 3)
const INITIAL_KEYFOOD_ITEMS: InvoiceItem[] = [
  { id: 31, categoryId: 3, dateStr: '3/9', itemName: 'Sườn heo cánh buồm Rivasam TBN đông lạnh', unit: 'kg', quantity: 20, unitPrice: 93450, taxRate: 0, taxAmount: 0, amount: 1869000, totalPayment: 1869000, displayOrder: 1 },
  { id: 32, categoryId: 3, dateStr: '3/9', itemName: 'Ba chỉ heo có da rút sườn Nga - Apk Đông Lạnh', unit: 'kg', quantity: 20.92, unitPrice: 110250, taxRate: 0, taxAmount: 0, amount: 2306430, totalPayment: 2306430, displayOrder: 2 },
  { id: 33, categoryId: 3, dateStr: '7/9', itemName: 'Ba chỉ heo có da rút sườn Nga - Vlmk Đông Lạnh', unit: 'kg', quantity: 20.86, unitPrice: 113400, taxRate: 0, taxAmount: 0, amount: 2365524, totalPayment: 2365524, displayOrder: 3 },
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

  useEffect(() => {
    localStorage.setItem('tang2_invoice_selected_month', String(selectedMonth));
  }, [selectedMonth]);

  useEffect(() => {
    localStorage.setItem('tang2_invoice_selected_year', String(selectedYear));
  }, [selectedYear]);

  // Items per category
  const [categoryItems, setCategoryItems] = useState<Record<number, InvoiceItem[]>>({
    1: INITIAL_RAU_ITEMS,
    4: INITIAL_ANPHAT_ITEMS,
    3: INITIAL_KEYFOOD_ITEMS,
  });

  const summaryTableRef = useRef<HTMLDivElement>(null);
  const detailTableRef = useRef<HTMLDivElement>(null);

  const [toast, setToast] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  // Load from API on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const fetchedCats = await invoiceApi.getCategories();
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
  }, []);

  // When active category changes, fetch items from API if available
  useEffect(() => {
    if (!activeCategoryId) return;
    const fetchItems = async () => {
      try {
        const items = await invoiceApi.getItemsByCategory(activeCategoryId);
        if (items && items.length > 0) {
          setCategoryItems((prev) => ({ ...prev, [activeCategoryId]: items }));
        }
      } catch (err) {
        console.log('Using local fallback for items:', err);
      }
    };
    fetchItems();
  }, [activeCategoryId]);

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
      await invoiceApi.togglePayment(catId);
    } catch (err) {
      console.log('Payment toggled locally:', err);
    }
  };

  // Calculate total for each category
  const getCategoryTotal = (cat: InvoiceCategory) => {
    const items = categoryItems[cat.id];
    if (items && items.length > 0) {
      return items.reduce((sum, i) => sum + (i.totalPayment > 0 ? i.totalPayment : i.amount), 0);
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
      unit: activeCategory?.categoryType === 'Supplier' ? 'kg' : '',
      quantity: 1,
      unitPrice: 0,
      taxRate: activeCategoryId === 4 ? 5 : 0, // An Phát có thuế 5%
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
    const amount = qty * price;
    const taxAmount = taxR > 0 ? Math.round(amount * (taxR / 100)) : 0;
    const totalPayment = amount + taxAmount;

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
      displayOrder: editingItem.displayOrder || currentItems.length + 1,
      note: editingItem.note || '',
    };

    if (isNewItem) {
      try {
        const saved = await invoiceApi.createItem({ ...itemToSave, id: 0 });
        const freshItems = await invoiceApi.getItemsByCategory(activeCategoryId);
        setCategoryItems((prev) => ({
          ...prev,
          [activeCategoryId]: freshItems && freshItems.length > 0 ? freshItems : [...(prev[activeCategoryId] || []), saved || itemToSave],
        }));

        const updatedCats = await invoiceApi.getCategories();
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
        const freshItems = await invoiceApi.getItemsByCategory(activeCategoryId);
        setCategoryItems((prev) => ({
          ...prev,
          [activeCategoryId]: freshItems && freshItems.length > 0
            ? freshItems
            : (prev[activeCategoryId] || []).map((i) => (i.id === itemToSave.id ? itemToSave : i)),
        }));

        const updatedCats = await invoiceApi.getCategories();
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
      await invoiceApi.updateCategory(editingCategoryAmount.id, {
        ...editingCategoryAmount,
        fixedAmount: fixedAmountInput,
      });
      const updatedCats = await invoiceApi.getCategories();
      if (updatedCats && updatedCats.length > 0) setCategories(updatedCats);
      showToast(`💾 Đã cập nhật số tiền [${editingCategoryAmount.name}] vào Database!`);
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
      displayOrder: existingCount + idx + 1,
      note: it.note || '',
    }));

    try {
      // 1. Save directly to SQL Server database via batch API
      const savedItems = await invoiceApi.createBatchItems(itemsPayload);

      // 2. Fetch fresh items from database for this category
      const freshItems = await invoiceApi.getItemsByCategory(categoryId);
      setCategoryItems((prev) => ({
        ...prev,
        [categoryId]: freshItems && freshItems.length > 0 
          ? freshItems 
          : (savedItems?.length ? [...(prev[categoryId] || []), ...savedItems] : itemsPayload),
      }));

      // 3. Switch view to this category
      setActiveCategoryId(categoryId);

      // 4. Update categories summary so total reflects database immediately
      const updatedCats = await invoiceApi.getCategories();
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

  // Clear / Làm sạch tất cả dữ liệu hóa đơn trong DB
  const handleClearData = async () => {
    try {
      await invoiceApi.clearInvoiceData(activeCategoryId || undefined);
      if (activeCategoryId) {
        setCategoryItems((prev) => ({ ...prev, [activeCategoryId]: [] }));
        setCategories((prev) =>
          prev.map((c) => (c.id === activeCategoryId ? { ...c, fixedAmount: 0, isPaid: false } : c))
        );
        showToast(`🗑️ Đã làm sạch toàn bộ hóa đơn của [${activeCategory?.name}] trong Database SQL Server!`);
      } else {
        setCategoryItems({});
        setCategories((prev) => prev.map((c) => ({ ...c, fixedAmount: 0, isPaid: false })));
        showToast('🗑️ Đã làm sạch toàn bộ dữ liệu hóa đơn của tất cả các mục trong Database SQL Server!');
      }
    } catch (err) {
      console.error('Lỗi khi làm sạch dữ liệu hóa đơn:', err);
      showToast('⚠️ Không thể kết nối Database, vui lòng thử lại.');
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
        <div className="px-4 py-3 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white">
          <div className="flex items-center gap-2">
            {activeCategory ? (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setActiveCategoryId(null)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition border border-slate-200 shadow-2xs cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>← Bảng Chi Phí Tổng</span>
                </button>
                <div className="hidden sm:flex items-center gap-2 text-xs">
                  <span className="text-slate-500 font-medium">Tổng hóa đơn:</span>
                  <span className="font-extrabold text-blue-900 bg-blue-50 px-2.5 py-0.5 rounded-lg border border-blue-200">
                    {activeCategoryTotal.toLocaleString('vi-VN')} đ
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2.5 text-xs text-slate-600 font-medium flex-wrap">
                <span className="font-bold text-slate-700">Tổng chi phí:</span>
                <span className="text-sm font-black text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200">
                  {grandTotal.toLocaleString('vi-VN')} đ
                </span>
                <span className="text-[11px] text-slate-600 font-semibold bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                  Đã thanh toán: {categories.filter((c) => c.isPaid).length}/{categories.length}
                </span>
              </div>
            )}
          </div>

          {/* Action Buttons: Unified, Clean, Professional */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Thêm mục mới nếu đang ở Bảng Tổng */}
            {!activeCategory && (
              <button
                onClick={() => setShowAddCategoryModal(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs shadow-xs transition hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
                title="Thêm một hạng mục hóa đơn hoặc nhà cung cấp mới vào bảng tổng hợp"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Thêm Mục Mới</span>
              </button>
            )}

            {/* Thêm mặt hàng nếu đang ở chi tiết */}
            {activeCategory && (
              <button
                onClick={handleOpenAddModal}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs shadow-xs transition hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
                title="Thêm mặt hàng mới vào hóa đơn này"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Thêm Mặt Hàng</span>
              </button>
            )}

            {/* Quét Hóa Đơn AI */}
            <button
              onClick={() => setIsScannerOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold rounded-xl text-xs shadow-xs transition hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
              title="Dùng Camera hoặc Tải ảnh hóa đơn để AI tự động nhận diện và điền vào bảng"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Quét Hóa Đơn (AI)</span>
            </button>

            {/* Xuất Excel gửi sếp */}
            <button
              onClick={handleExportExcel}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded-xl text-xs shadow-xs transition hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
              title="Xuất bảng tổng hợp và chi tiết mặt hàng ra file Excel (.xlsx) gửi sếp"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
              <span>Xuất Excel gửi sếp</span>
            </button>

            {/* Copy ảnh Zalo */}
            <button
              onClick={() =>
                activeCategory
                  ? handleCopy(detailTableRef)
                  : handleCopy(summaryTableRef)
              }
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-xs border border-slate-200 shadow-2xs transition cursor-pointer"
              title="Copy ảnh hóa đơn độ nét cao để gửi nhanh qua Zalo"
            >
              <Copy className="w-3.5 h-3.5 text-blue-600" />
              <span>Copy Ảnh</span>
            </button>

            {/* Tải ảnh Ultra HD */}
            <button
              onClick={() =>
                activeCategory
                  ? handleDownload(
                      detailTableRef,
                      `Hoa_Don_${activeCategory.name.replace(/[^a-zA-Z0-9]/g, '_')}_Thang_${selectedMonth}_${selectedYear}.png`
                    )
                  : handleDownload(summaryTableRef, `Tong_Hop_Hoa_Don_Thang_${selectedMonth}_${selectedYear}.png`)
              }
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-xs border border-slate-200 shadow-2xs transition cursor-pointer"
              title="Tải ảnh hóa đơn độ phân giải cao Ultra HD về máy"
            >
              <Camera className="w-3.5 h-3.5 text-slate-600" />
              <span>Tải Ảnh HD</span>
            </button>

            {/* Xóa / Làm sạch dữ liệu */}
            <button
              onClick={() => setShowClearModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-rose-600 hover:bg-rose-50 hover:text-rose-700 font-bold rounded-xl text-xs border border-rose-200 transition cursor-pointer"
              title={activeCategory ? 'Xóa toàn bộ mặt hàng của mục này' : 'Làm sạch toàn bộ hóa đơn của tất cả các mục'}
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-500" />
              <span>{activeCategory ? 'Xóa Mục Này' : 'Xóa Dữ Liệu'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VIEW 1: BẢNG TỔNG HỢP HÓA ĐƠN THÁNG (KHỚP 100% ẢNH 1 CỦA USER)           */}
      {/* ========================================================================= */}
      {!activeCategoryId && (
        <div className="space-y-4">
          <div
            ref={summaryTableRef}
            className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-300 select-none overflow-x-auto text-slate-800 max-w-4xl mx-auto"
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
                  <th className="border border-gray-500 py-3 px-4 text-center min-w-[130px]">
                    <div className="flex items-center justify-center gap-1">
                      <span>금액</span>
                      <span className="text-[10px] opacity-75">▼</span>
                    </div>
                  </th>

                  {/* 결제 (Thanh toán) */}
                  <th className="border border-gray-500 py-3 px-3 text-center w-20">
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
                        className="border border-gray-500 py-2.5 px-3 text-center bg-white"
                        onClick={(e) => handleTogglePaid(cat.id, e)}
                      >
                        <div className="flex items-center justify-center">
                          {isChecked ? (
                            <div className="w-5 h-5 bg-emerald-700 text-white rounded-sm flex items-center justify-center text-xs font-black shadow-xs">
                              ✓
                            </div>
                          ) : (
                            <div className="w-5 h-5 border-2 border-gray-700 rounded-sm hover:border-emerald-600 bg-white transition"></div>
                          )}
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
                  <td className="border border-gray-500 py-3 px-3 text-center bg-white"></td>
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

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-600 flex items-center justify-between max-w-4xl mx-auto">
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
          <div
            ref={detailTableRef}
            className="bg-white p-5 sm:p-7 rounded-2xl shadow-sm border border-slate-300 select-none overflow-x-auto text-slate-800"
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
                // Yellow NPP AN PHÁT Header Banner (Khớp Ảnh 3)
                <div className="inline-block bg-[#ffff00] text-black px-4 py-1 font-black text-sm border border-gray-400 mb-2">
                  NPP AN PHÁT
                </div>
              ) : activeCategory.id === 3 ? (
                // Yellow NNP KEYFOOD Header Banner (Khớp Ảnh 3)
                <div className="inline-block bg-[#ffff00] text-black px-4 py-1 font-black text-sm border border-gray-400 mb-2">
                  NNP KEYFOOD
                </div>
              ) : (
                <div className="inline-block bg-emerald-800 text-white px-4 py-1 font-bold text-sm rounded-md mb-2">
                  HÓA ĐƠN: {activeCategory.name.toUpperCase()}
                </div>
              )}
            </div>

            {/* CASE A: NPP AN PHÁT (Có thuế suất GTGT 5% & Tổng thanh toán - Khớp Ảnh 3) */}
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
              // CASE B: NPP KEYFOOD (Không thuế GTGT, có tổng tháng - Khớp Ảnh 3)
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
                            {itemIdx === 0 ? item.dateStr : ''}
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
                  {activeCategory ? `Xóa Hóa Đơn [${activeCategory.name}]` : 'Làm Sạch Dữ Liệu Hóa Đơn'}
                </h3>
                <p className="text-xs text-slate-500 font-medium">Hành động này sẽ cập nhật vào Database SQL Server</p>
              </div>
            </div>

            <div className="my-4 p-3.5 bg-rose-50/80 rounded-xl border border-rose-200 text-xs text-rose-900 leading-relaxed font-medium">
              {activeCategory ? (
                <>
                  Bạn có chắc chắn muốn xóa <b>toàn bộ {currentItems.length} mặt hàng</b> trong hóa đơn <b>[{activeCategory.name}]</b>?
                  <br />
                  <span className="text-[11px] text-rose-700 mt-1 block">
                    ⚠️ Dữ liệu mặt hàng sẽ bị xóa vĩnh viễn khỏi Database và tổng chi phí mục này sẽ về 0.
                  </span>
                </>
              ) : (
                <>
                  Bạn có chắc chắn muốn <b>làm sạch toàn bộ hóa đơn</b> của tất cả các hạng mục?
                  <br />
                  <span className="text-[11px] text-rose-700 mt-1 block">
                    ⚠️ Toàn bộ các mặt hàng đã nhập trong Database SQL Server sẽ được xóa sạch và số tiền đặt lại về 0 để bạn bắt đầu kỳ mới.
                  </span>
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

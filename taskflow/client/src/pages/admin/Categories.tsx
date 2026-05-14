import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Plus, Search, Loader2, Edit2, Trash2, X, Check, TrendingUp, Tag } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  useGetAdminCategoriesQuery,
  useCreateCategoryMutation,
  useUpdateCategoryMutation,
  useDeleteCategoryMutation,
} from '../../features/admin/adminApi';
import { ICategory } from '../../types';
import ConfirmModal from '../../components/admin/ConfirmModal';

interface CategoryForm {
  name: string;
  description: string;
  icon: string;
  startingPrice: string;
  isActive: boolean;
  sortOrder: string;
  trending: boolean;
}

const EMPTY_FORM: CategoryForm = { name: '', description: '', icon: '', startingPrice: '0', isActive: true, sortOrder: '0', trending: false };

function CategoryModal({
  initial,
  onClose,
  onSave,
  isSaving,
}: {
  initial: CategoryForm;
  onClose: () => void;
  onSave: (f: CategoryForm) => void;
  isSaving: boolean;
}) {
  const [form, setForm] = useState<CategoryForm>(initial);
  const set = (k: keyof CategoryForm, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 className="font-bold text-gray-900">{initial.name ? 'Edit category' : 'New category'}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"><X className="w-4 h-4" /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
            <input value={form.name} onChange={(e) => set('name', e.target.value)} className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="e.g. Cleaning" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Icon (emoji)</label>
              <input value={form.icon} onChange={(e) => set('icon', e.target.value)} className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="🧹" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Starting price ($)</label>
              <input type="number" min="0" value={form.startingPrice} onChange={(e) => set('startingPrice', e.target.value)} className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea value={form.description} onChange={(e) => set('description', e.target.value)} rows={2} className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none" placeholder="Optional description" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sort order</label>
            <input type="number" value={form.sortOrder} onChange={(e) => set('sortOrder', e.target.value)} className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.isActive} onChange={(e) => set('isActive', e.target.checked)} className="w-4 h-4 rounded accent-primary-600" />
              <span className="text-sm text-gray-700">Active</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.trending} onChange={(e) => set('trending', e.target.checked)} className="w-4 h-4 rounded accent-amber-500" />
              <span className="text-sm text-gray-700">Trending</span>
            </label>
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-xl hover:bg-gray-50">Cancel</button>
          <button
            onClick={() => onSave(form)}
            disabled={isSaving || !form.name.trim()}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-primary-700 hover:bg-primary-800 disabled:opacity-60 text-white rounded-xl"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Categories() {
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [modal, setModal] = useState<{ open: boolean; editing: ICategory | null }>({ open: false, editing: null });
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const { data, isLoading } = useGetAdminCategoriesQuery({ search: search || undefined });
  const [createCategory, { isLoading: isCreating }] = useCreateCategoryMutation();
  const [updateCategory, { isLoading: isUpdating }] = useUpdateCategoryMutation();
  const [deleteCategory, { isLoading: isDeleting }] = useDeleteCategoryMutation();

  const categories = data?.categories ?? [];

  const openCreate = () => setModal({ open: true, editing: null });
  const openEdit = (c: ICategory) => setModal({ open: true, editing: c });
  const closeModal = () => setModal({ open: false, editing: null });

  const handleSave = async (form: CategoryForm) => {
    const payload = {
      name: form.name.trim(),
      description: form.description || undefined,
      icon: form.icon || undefined,
      startingPrice: parseFloat(form.startingPrice) || 0,
      isActive: form.isActive,
      sortOrder: parseInt(form.sortOrder) || 0,
      trending: form.trending,
    };
    try {
      if (modal.editing) {
        await updateCategory({ id: modal.editing._id, ...payload }).unwrap();
        toast.success('Category updated');
      } else {
        await createCategory(payload).unwrap();
        toast.success('Category created');
      }
      closeModal();
    } catch { toast.error('Failed to save category'); }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteCategory(id).unwrap();
      toast.success('Category deleted');
      setDeleteConfirm(null);
    } catch { toast.error('Failed to delete category'); }
  };

  const editingForm: CategoryForm = modal.editing ? {
    name: modal.editing.name,
    description: modal.editing.description ?? '',
    icon: modal.editing.icon ?? '',
    startingPrice: String(modal.editing.startingPrice),
    isActive: modal.editing.isActive,
    sortOrder: String(modal.editing.sortOrder),
    trending: modal.editing.trending,
  } : EMPTY_FORM;

  return (
    <>
      <Helmet><title>Categories | Admin</title></Helmet>
      {modal.open && (
        <CategoryModal
          initial={editingForm}
          onClose={closeModal}
          onSave={handleSave}
          isSaving={isCreating || isUpdating}
        />
      )}
      {deleteConfirm && (
        <ConfirmModal
          title="Delete category"
          message={`Are you sure you want to delete this category? Tasks using it may be affected.`}
          confirmLabel="Delete"
          isLoading={isDeleting}
          onConfirm={() => handleDelete(deleteConfirm)}
          onCancel={() => setDeleteConfirm(null)}
        />
      )}
      <div className="space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Categories</h2>
            <p className="text-sm text-gray-500 mt-0.5">Create and manage service categories</p>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary-700 hover:bg-primary-800 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            <Plus className="w-4 h-4" /> New category
          </button>
        </div>

        {/* Search */}
        <div className="relative max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') setSearch(searchInput); }}
            placeholder="Search categories…"
            className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary-600" /></div>
        ) : categories.length === 0 ? (
          <div className="text-center py-20 text-gray-400 bg-white rounded-2xl border border-gray-200">
            <Tag className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No categories found</p>
            <button onClick={openCreate} className="mt-3 text-sm text-primary-600 hover:underline">Create the first one →</button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Category</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Starting price</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Sort</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Flags</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 w-20" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {categories.map((c: ICategory) => (
                    <tr key={c._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          {c.icon && <span className="text-xl leading-none">{c.icon}</span>}
                          <div>
                            <p className="font-medium text-gray-900">{c.name}</p>
                            {c.description && <p className="text-xs text-gray-400 truncate max-w-[200px]">{c.description}</p>}
                            <p className="text-xs text-gray-300">/{c.slug}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-700">${c.startingPrice}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{c.sortOrder}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1.5 flex-wrap">
                          {c.trending && (
                            <span className="flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-full">
                              <TrendingUp className="w-3 h-3" /> Trending
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${c.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {c.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openEdit(c)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(c._id)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 border-t border-gray-100 text-xs text-gray-400 bg-gray-50">
              {data?.total ?? 0} categories total
            </div>
          </div>
        )}
      </div>
    </>
  );
}

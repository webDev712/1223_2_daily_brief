'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';

export interface InvenassetSupplyWarehouseOption {
  id: number;
  name: string;
}

export interface InvenassetSupplyProductOption {
  id: number;
  product_name: string;
  custom_id: string;
  unit: string;
  barcodes?: string[];
  stock_by_warehouse?: Record<string, number>;
}

export interface InvenassetSupplyDraftItem {
  product_id: number;
  qty: string;
}

interface Props {
  warehouses: InvenassetSupplyWarehouseOption[];
  products: InvenassetSupplyProductOption[];
  warehouseId: string;
  onWarehouseChange: (wid: string) => void;
  items: InvenassetSupplyDraftItem[];
  onItemsChange: (items: InvenassetSupplyDraftItem[]) => void;
  disabled?: boolean;
}

const fieldControlStyle: React.CSSProperties = {
  border: '1px solid #e8eaed',
  borderRadius: 8,
  padding: '5px 10px',
  fontSize: 14,
  backgroundColor: '#ffffff',
  color: '#0A0C10',
  boxSizing: 'border-box',
  height: 32,
};

export default function InvenassetSupplyPicker({
  warehouses,
  products,
  warehouseId,
  onWarehouseChange,
  items,
  onItemsChange,
  disabled = false,
}: Props) {
  const t = useTranslations('DailyBrief');
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);

  const rows: InvenassetSupplyDraftItem[] = items.length > 0 ? items : [{ product_id: 0, qty: '' }];

  const productMap = useMemo(() => {
    const map = new Map<number, InvenassetSupplyProductOption>();
    for (const p of products) map.set(p.id, p);
    return map;
  }, [products]);

  useEffect(() => {
    if (openIndex === null) return;
    const onMouseDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpenIndex(null);
        setQuery('');
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpenIndex(null);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [openIndex]);

  const unitFor = (p?: InvenassetSupplyProductOption) => (p?.unit || '').trim() || 'pcs';

  const stockFor = (p: InvenassetSupplyProductOption) => {
    const raw = warehouseId ? p.stock_by_warehouse?.[warehouseId] : undefined;
    const val = typeof raw === 'number' && Number.isFinite(raw) ? raw : 0;
    return Number.isInteger(val) ? String(val) : String(Number(val.toFixed(2)));
  };

  const optionsForRow = (rowIndex: number) => {
    const usedElsewhere = new Set(
      rows
        .map((r, i) => (i !== rowIndex ? r.product_id : 0))
        .filter(id => id > 0)
    );
    const q = query.trim().toLowerCase();
    return products.filter(p => {
      if (usedElsewhere.has(p.id)) return false;
      if (!q) return true;
      return (
        p.product_name.toLowerCase().includes(q) ||
        (p.custom_id || '').toLowerCase().includes(q) ||
        (p.barcodes || []).some(b => b.toLowerCase().includes(q))
      );
    });
  };

  const updateRow = (index: number, patch: Partial<InvenassetSupplyDraftItem>) => {
    onItemsChange(rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  };

  const handleSelectProduct = (index: number, pid: number) => {
    if (disabled) return;
    updateRow(index, { product_id: pid });
    setOpenIndex(null);
    setQuery('');
  };

  const handleQtyChange = (index: number, raw: string) => {
    if (disabled) return;
    updateRow(index, { qty: raw.replace(/[^\d.]/g, '') });
  };

  const handleAddRow = () => {
    if (disabled) return;
    onItemsChange([...rows, { product_id: 0, qty: '' }]);
  };

  const handleRemoveRow = (index: number) => {
    if (disabled || rows.length <= 1) return;
    setOpenIndex(null);
    setQuery('');
    onItemsChange(rows.filter((_, i) => i !== index));
  };

  return (
    <div ref={rootRef} style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%' }}>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <span style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 5 }}>{t('invenasset_supply_warehouse')}</span>
        <select
          style={{ ...fieldControlStyle, width: '100%' }}
          disabled={disabled}
          value={warehouseId}
          onChange={e => onWarehouseChange(e.target.value)}
        >
          {warehouses.map(w => (
            <option key={w.id} value={String(w.id)}>
              {w.name}
            </option>
          ))}
        </select>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <span style={{ fontSize: 12, color: '#9CA3AF' }}>{t('invenasset_supply_products')}</span>

        {rows.map((row, index) => {
          const selected = row.product_id > 0 ? productMap.get(row.product_id) : undefined;
          const isOpen = openIndex === index;
          const filtered = isOpen ? optionsForRow(index) : [];

          return (
            <div key={index} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => {
                      if (disabled) return;
                      setOpenIndex(isOpen ? null : index);
                      setQuery('');
                    }}
                    style={{
                      ...fieldControlStyle,
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 6,
                      textAlign: 'left',
                      cursor: disabled ? 'default' : 'pointer',
                      color: selected ? '#0A0C10' : '#6B7280',
                    }}
                  >
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {selected ? selected.product_name : t('invenasset_supply_choose_product')}
                    </span>
                    <span style={{ fontSize: 11, color: '#6B7280', flexShrink: 0 }}>▾</span>
                  </button>

                  {isOpen && (
                    <div
                      style={{
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        top: 'calc(100% + 4px)',
                        zIndex: 50,
                        backgroundColor: '#ffffff',
                        border: '1px solid #e8eaed',
                        borderRadius: 8,
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
                        padding: 6,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 6,
                      }}
                    >
                      <input
                        type="text"
                        autoFocus
                        placeholder={t('invenasset_supply_search')}
                        value={query}
                        onKeyDown={e => {
                          if (e.key === 'Enter') e.preventDefault();
                        }}
                        onChange={e => setQuery(e.target.value)}
                        style={{ ...fieldControlStyle, width: '100%' }}
                      />
                      <div style={{ maxHeight: 190, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                        {filtered.length > 0 ? (
                          filtered.map(p => (
                            <button
                              type="button"
                              key={p.id}
                              onClick={() => handleSelectProduct(index, p.id)}
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'flex-start',
                                width: '100%',
                                padding: '6px 8px',
                                border: 'none',
                                borderRadius: 6,
                                backgroundColor: row.product_id === p.id ? '#F5F7FA' : 'transparent',
                                textAlign: 'left',
                                cursor: 'pointer',
                              }}
                            >
                              <span style={{ fontSize: 13, color: '#0A0C10', fontWeight: 500 }}>{p.product_name}</span>
                              <span style={{ fontSize: 11, color: '#6B7280' }}>
                                {[p.custom_id, `${t('invenasset_supply_in_stock')}: ${stockFor(p)} ${unitFor(p)}`].filter(Boolean).join(' · ')}
                              </span>
                            </button>
                          ))
                        ) : (
                          <div style={{ padding: '8px', fontSize: 12, color: '#6B7280', textAlign: 'center' }}>
                            {t('invenasset_supply_no_products')}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    disabled={disabled}
                    placeholder="0"
                    value={row.qty}
                    onKeyDown={e => {
                      if (e.key === 'Enter') e.preventDefault();
                    }}
                    onChange={e => handleQtyChange(index, e.target.value)}
                    style={{ ...fieldControlStyle, width: 72, textAlign: 'center' }}
                  />
                  {selected && (
                    <span style={{ fontSize: 13, color: '#374151', whiteSpace: 'nowrap', minWidth: 26 }}>
                      {unitFor(selected)}
                    </span>
                  )}
                </div>

                {rows.length > 1 && (
                  <span
                    onClick={() => handleRemoveRow(index)}
                    style={{
                      cursor: disabled ? 'default' : 'pointer',
                      color: '#9CA3AF',
                      fontSize: 16,
                      lineHeight: 1,
                      padding: '0 4px',
                      userSelect: 'none',
                    }}
                  >
                    ×
                  </span>
                )}
              </div>

              {selected && (
                <div style={{ fontSize: 12, color: '#6B7280' }}>
                  {[selected.custom_id, `${t('invenasset_supply_in_stock')}: ${stockFor(selected)} ${unitFor(selected)}`].filter(Boolean).join(' · ')}
                </div>
              )}
            </div>
          );
        })}

        <div
          onClick={handleAddRow}
          style={{
            alignSelf: 'flex-start',
            color: '#4361EE',
            fontSize: 13,
            fontWeight: 600,
            cursor: disabled ? 'default' : 'pointer',
            opacity: disabled ? 0.5 : 1,
            paddingTop: 2,
          }}
        >
          + {t('invenasset_supply_add_product')}
        </div>
      </div>
    </div>
  );
}

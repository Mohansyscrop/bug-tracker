'use client';

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface TablePaginationProps {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  pageSizeOptions?: number[];
  itemLabel?: string;
}

export default function TablePagination({
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100],
  itemLabel = 'entries',
}: TablePaginationProps) {
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(totalItems, currentPage * pageSize);

  const delta = 1;
  const range: (number | string)[] = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= currentPage - delta && i <= currentPage + delta)) {
      range.push(i);
    } else if (range[range.length - 1] !== '...') {
      range.push('...');
    }
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px 16px',
      background: 'var(--color-surface-2)',
      borderTop: '1px solid var(--color-border)',
      borderBottomLeftRadius: 'var(--radius-md)',
      borderBottomRightRadius: 'var(--radius-md)',
      flexWrap: 'wrap',
      gap: '12px',
      fontSize: '12.5px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
        <span style={{ color: 'var(--color-text-muted)' }}>
          Showing <strong style={{ color: 'var(--color-text)', fontWeight: '700' }}>{startItem}</strong> to <strong style={{ color: 'var(--color-text)', fontWeight: '700' }}>{endItem}</strong> of <strong style={{ color: 'var(--color-text)', fontWeight: '700' }}>{totalItems}</strong> {itemLabel}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--color-text-muted)' }}>
          <span>Per page:</span>
          {pageSizeOptions.map((size) => (
            <button
              key={size}
              type="button"
              onClick={() => {
                onPageSizeChange(size);
                onPageChange(1);
              }}
              style={{
                padding: '2px 7px',
                borderRadius: '4px',
                background: pageSize === size ? '#4f46e5' : '#ffffff',
                color: pageSize === size ? '#ffffff' : 'var(--color-text)',
                border: pageSize === size ? '1px solid #4f46e5' : '1px solid var(--color-border)',
                boxShadow: pageSize === size ? '0 1px 3px rgba(79, 70, 229, 0.3)' : 'none',
                cursor: 'pointer',
                fontSize: '11.5px',
                fontWeight: '700',
                transition: 'all 0.15s ease',
              }}
            >
              {size}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          style={{
            height: '30px',
            padding: '0 10px',
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            opacity: currentPage <= 1 ? 0.45 : 1,
            cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
          }}
        >
          <ChevronLeft size={13} />
          <span>Prev</span>
        </button>

        {range.map((page, idx) => {
          if (page === '...') {
            return (
              <span key={`ell-${idx}`} style={{ padding: '0 4px', color: 'var(--color-text-muted)', fontSize: '12px' }}>
                ...
              </span>
            );
          }
          const pageNum = Number(page);
          const isCurrent = pageNum === currentPage;
          return (
            <button
              key={pageNum}
              type="button"
              onClick={() => onPageChange(pageNum)}
              style={{
                minWidth: '30px',
                height: '30px',
                padding: '0 6px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                fontWeight: isCurrent ? '700' : '500',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                border: isCurrent ? '1px solid #4f46e5' : '1px solid var(--color-border)',
                background: isCurrent ? '#4f46e5' : '#ffffff',
                color: isCurrent ? '#ffffff' : 'var(--color-text)',
                boxShadow: isCurrent ? '0 1px 3px rgba(79, 70, 229, 0.3)' : 'none',
              }}
            >
              {pageNum}
            </button>
          );
        })}

        <button
          type="button"
          className="btn btn-secondary btn-sm"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          style={{
            height: '30px',
            padding: '0 10px',
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            opacity: currentPage >= totalPages ? 0.45 : 1,
            cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
          }}
        >
          <span>Next</span>
          <ChevronRight size={13} />
        </button>
      </div>
    </div>
  );
}

'use client';

import { useState, useMemo, useCallback, Fragment } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  getFilteredRowModel,
  getExpandedRowModel,
  flexRender,
} from '@tanstack/react-table';
import NotesEditor from './NotesEditor';
import AuditHistory from './AuditHistory';

export default function AdminTable({
  columns: columnDefs,
  data,
  loading,
  error,
  tableName,
  onSave,
  onBulkDelete,
  onBulkSuppress,
  onBulkUnsuppress,
  emptyMessage = 'No data',
  renderExpandedRow,
}) {
  const [sorting, setSorting] = useState([]);
  const [rowSelection, setRowSelection] = useState({});
  const [editingCell, setEditingCell] = useState(null); // { rowId, columnId }
  const [editValue, setEditValue] = useState('');
  const [globalFilter, setGlobalFilter] = useState('');

  // Prepend checkbox column
  const columns = useMemo(() => [
    {
      id: 'select',
      header: ({ table }) => (
        <input
          type="checkbox"
          className="at-checkbox"
          checked={table.getIsAllRowsSelected()}
          onChange={table.getToggleAllRowsSelectedHandler()}
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          className="at-checkbox"
          checked={row.getIsSelected()}
          onChange={row.getToggleSelectedHandler()}
          onClick={e => e.stopPropagation()}
        />
      ),
      size: 40,
      enableSorting: false,
    },
    ...columnDefs,
  ], [columnDefs]);

  const table = useReactTable({
    data,
    columns,
    state: { sorting, rowSelection, globalFilter },
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getRowCanExpand: () => true,
    enableRowSelection: true,
    initialState: {
      pagination: { pageSize: 25 },
    },
  });

  const selectedCount = Object.keys(rowSelection).length;
  const selectedIds = table.getSelectedRowModel().rows.map(r => r.original.id);

  const startEdit = useCallback((rowId, columnId, currentValue) => {
    setEditingCell({ rowId, columnId });
    setEditValue(currentValue ?? '');
  }, []);

  const commitEdit = useCallback(async () => {
    if (!editingCell || !onSave) return;
    const { rowId, columnId } = editingCell;
    await onSave([rowId], { [columnId]: editValue });
    setEditingCell(null);
    setEditValue('');
  }, [editingCell, editValue, onSave]);

  const cancelEdit = useCallback(() => {
    setEditingCell(null);
    setEditValue('');
  }, []);

  if (loading) {
    return <p className="at-status">Loading…</p>;
  }
  if (error) {
    return <p className="at-status at-error">Error: {error}</p>;
  }

  return (
    <div className="admin-table-wrap">
      {/* Bulk Actions Toolbar */}
      {selectedCount > 0 && (
        <div className="at-bulk-bar">
          <span className="at-bulk-count">{selectedCount} selected</span>
          {onBulkSuppress && (
            <button className="at-bulk-btn suppress" onClick={() => onBulkSuppress(selectedIds)}>
              Suppress
            </button>
          )}
          {onBulkUnsuppress && (
            <button className="at-bulk-btn unsuppress" onClick={() => onBulkUnsuppress(selectedIds)}>
              Unsuppress
            </button>
          )}
          {onBulkDelete && (
            <button className="at-bulk-btn delete" onClick={() => onBulkDelete(selectedIds)}>
              Delete
            </button>
          )}
          <button className="at-bulk-btn clear" onClick={() => setRowSelection({})}>
            Clear
          </button>
        </div>
      )}

      {/* Table */}
      <div className="at-table-container">
        <table className="at-table">
          <thead>
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <th
                    key={header.id}
                    className={`at-th ${header.column.getCanSort() ? 'sortable' : ''}`}
                    style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}
                    onClick={header.column.getCanSort() ? header.column.getToggleSortingHandler() : undefined}
                  >
                    {header.isPlaceholder ? null : (
                      <div className="at-th-content">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.getCanSort() && (
                          <span className={`at-sort-arrow ${header.column.getIsSorted() ? 'active' : ''}`}>
                            {header.column.getIsSorted() === 'asc' ? ' ▲' : header.column.getIsSorted() === 'desc' ? ' ▼' : ' ⇅'}
                          </span>
                        )}
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="at-empty">{emptyMessage}</td>
              </tr>
            )}
            {table.getRowModel().rows.map(row => {
              const isSuppressed = row.original.suppressed;
              return (
                <Fragment key={row.id}>
                  <tr
                    className={`at-row ${isSuppressed ? 'suppressed' : ''} ${row.getIsExpanded() ? 'expanded' : ''}`}
                    onClick={() => row.toggleExpanded()}
                  >
                    {row.getVisibleCells().map(cell => {
                      const isEditing = editingCell?.rowId === row.original.id && editingCell?.columnId === cell.column.id;
                      const isEditable = cell.column.columnDef.meta?.editable;
                      return (
                        <td key={cell.id} className="at-td">
                          {isEditing ? (
                            cell.column.columnDef.meta?.editOptions ? (
                              <select
                                className="at-edit-input"
                                value={editValue}
                                onChange={e => {
                                  setEditValue(e.target.value);
                                  // Auto-commit on select change
                                  const newVal = e.target.value;
                                  if (editingCell && onSave) {
                                    onSave([editingCell.rowId], { [editingCell.columnId]: newVal });
                                    setEditingCell(null);
                                    setEditValue('');
                                  }
                                }}
                                onBlur={cancelEdit}
                                onKeyDown={e => {
                                  if (e.key === 'Escape') cancelEdit();
                                }}
                                autoFocus
                                onClick={e => e.stopPropagation()}
                              >
                                {cell.column.columnDef.meta.editOptions.map(opt => (
                                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                              </select>
                            ) : (
                              <input
                                className="at-edit-input"
                                value={editValue}
                                onChange={e => setEditValue(e.target.value)}
                                onBlur={commitEdit}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') commitEdit();
                                  if (e.key === 'Escape') cancelEdit();
                                }}
                                autoFocus
                                onClick={e => e.stopPropagation()}
                              />
                            )
                          ) : (
                            <span
                              className={isEditable ? 'at-editable-cell' : ''}
                              onDoubleClick={isEditable ? (e) => {
                                e.stopPropagation();
                                startEdit(row.original.id, cell.column.id, cell.getValue());
                              } : undefined}
                            >
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                  {row.getIsExpanded() && (
                    <tr className="at-expanded-row">
                      <td colSpan={columns.length}>
                        <div className="at-expanded-content">
                          {renderExpandedRow ? (
                            renderExpandedRow(row.original)
                          ) : (
                            <div className="at-expanded-default">
                              <NotesEditor
                                notes={row.original.notes}
                                tags={row.original.tags || []}
                                onSaveNotes={(val) => onSave?.([row.original.id], { notes: val })}
                                onSaveTags={(val) => onSave?.([row.original.id], { tags: val })}
                              />
                              <AuditHistory tableName={tableName} rowId={row.original.id} />
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {table.getPageCount() > 1 && (
        <div className="at-pagination">
          <button
            className="at-page-btn"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            ← Prev
          </button>
          <span className="at-page-info">
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
          </span>
          <button
            className="at-page-btn"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}

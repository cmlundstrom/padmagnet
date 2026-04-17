'use client';

import { useState, useMemo, useCallback, useEffect, Fragment } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  getFilteredRowModel,
  getExpandedRowModel,
  flexRender,
} from '@tanstack/react-table';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  horizontalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import NotesEditor from './NotesEditor';
import AuditHistory from './AuditHistory';

function DraggableHeader({ header, children }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: header.column.id,
  });
  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    position: 'relative',
    zIndex: isDragging ? 10 : undefined,
    cursor: 'grab',
    width: header.getSize(),
  };
  return (
    <th
      ref={setNodeRef}
      style={style}
      className={`at-th ${header.column.getCanSort() ? 'sortable' : ''}`}
      {...attributes}
      {...listeners}
    >
      {children}
    </th>
  );
}

function RowCells({ row, cells, editingCell, editValue, setEditValue, onSave, setEditingCell, cancelEdit, commitEdit, startEdit }) {
  return cells.map(cell => {
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
                const newVal = e.target.value;
                if (editingCell && onSave) {
                  onSave([editingCell.rowId], { [editingCell.columnId]: newVal });
                  setEditingCell(null);
                  setEditValue('');
                }
              }}
              onBlur={cancelEdit}
              onKeyDown={e => { if (e.key === 'Escape') cancelEdit(); }}
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
  });
}

function TableBody({ table, columns, editingCell, editValue, setEditValue, onSave, setEditingCell, cancelEdit, commitEdit, startEdit, emptyMessage, renderExpandedRow, tableName }) {
  const cellProps = { editingCell, editValue, setEditValue, onSave, setEditingCell, cancelEdit, commitEdit, startEdit };

  const rows = table.getRowModel().rows;

  return (
    <tbody>
      {rows.length === 0 && (
        <tr><td colSpan={columns.length} className="at-empty">{emptyMessage}</td></tr>
      )}
      {rows.map(row => {
        const isSuppressed = row.original.suppressed;
        return (
          <Fragment key={row.id}>
            <tr
              className={`at-row ${isSuppressed ? 'suppressed' : ''} ${row.getIsExpanded() ? 'expanded' : ''}`}
              onClick={() => row.toggleExpanded()}
            >
              <RowCells row={row} cells={row.getVisibleCells()} {...cellProps} />
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
  );
}

export default function AdminTable({
  columns: columnDefs,
  data,
  loading,
  error,
  tableName,
  onSave,
  onBulkDelete,
  onBulkDeleteLabel = 'Delete',
  onBulkClose,
  onBulkSuppress,
  onBulkUnsuppress,
  onBulkHardDelete,
  onBulkHardDeleteLabel = 'Permanently Remove',
  emptyMessage = 'No data',
  renderExpandedRow,
  storageKey,
}) {
  const [sorting, setSorting] = useState([]);
  const [rowSelection, setRowSelection] = useState({});
  const [editingCell, setEditingCell] = useState(null); // { rowId, columnId }
  const [editValue, setEditValue] = useState('');
  const [globalFilter, setGlobalFilter] = useState('');

  // Persistent column sizing via localStorage
  const lsKey = storageKey ? `at-col-sizes-${storageKey}` : null;
  const [columnSizing, setColumnSizing] = useState(() => {
    if (!lsKey || typeof window === 'undefined') return {};
    try {
      const stored = localStorage.getItem(lsKey);
      return stored ? JSON.parse(stored) : {};
    } catch { return {}; }
  });

  const handleColumnSizingChange = useCallback((updater) => {
    setColumnSizing(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      if (lsKey) {
        try { localStorage.setItem(lsKey, JSON.stringify(next)); } catch {}
      }
      return next;
    });
  }, [lsKey]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

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

  const colOrderKey = storageKey ? `at-col-order-${storageKey}` : null;

  const getColumnOrder = useCallback(() => {
    const ids = columns.map(c => c.id || c.accessorKey);
    if (!colOrderKey || typeof window === 'undefined') return ids;
    try {
      const stored = localStorage.getItem(colOrderKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        const valid = parsed.filter(id => ids.includes(id));
        const missing = ids.filter(id => !parsed.includes(id));
        if (valid.length > 0) return [...valid, ...missing];
      }
    } catch {}
    return ids;
  }, [columns, colOrderKey]);

  const [columnOrder, setColumnOrder] = useState(getColumnOrder);

  // Sync when columns change (e.g. new column added to a panel)
  useEffect(() => {
    setColumnOrder(getColumnOrder());
  }, [getColumnOrder]);

  const handleColumnDragEnd = useCallback((event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setColumnOrder(prev => {
      const oldIndex = prev.indexOf(active.id);
      const newIndex = prev.indexOf(over.id);
      if (oldIndex === -1 || newIndex === -1) return prev;
      const next = arrayMove(prev, oldIndex, newIndex);
      if (colOrderKey) {
        try { localStorage.setItem(colOrderKey, JSON.stringify(next)); } catch {}
      }
      return next;
    });
  }, [colOrderKey]);

  // Track row selection by stable row id (UUID) instead of array index.
  // Without this, deleting/archiving a row leaves the selection state pointed
  // at whatever row now occupies the deleted index — looks like other rows
  // are still checked after a destructive action. Dangerous on bulk delete.
  const table = useReactTable({
    data,
    columns,
    state: { sorting, rowSelection, globalFilter, columnSizing, columnOrder },
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    onColumnSizingChange: handleColumnSizingChange,
    onColumnOrderChange: setColumnOrder,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getRowCanExpand: () => true,
    getRowId: row => row.id,
    enableRowSelection: true,
    enableColumnResizing: true,
    columnResizeMode: 'onChange',
    initialState: {
      pagination: { pageSize: 25 },
    },
  });

  // Defensive: when the underlying data changes, drop any rowSelection keys
  // whose row id is no longer present. Catches the bulk-delete + refetch flow
  // even if a future change reverts getRowId or selection survives a re-mount.
  useEffect(() => {
    setRowSelection(prev => {
      const ids = new Set((data || []).map(r => r?.id));
      const next = {};
      for (const [k, v] of Object.entries(prev)) {
        if (v && ids.has(k)) next[k] = true;
      }
      return Object.keys(next).length === Object.keys(prev).length ? prev : next;
    });
  }, [data]);

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
          {onBulkClose && (
            <button className="at-bulk-btn close" onClick={() => onBulkClose(selectedIds)}>
              Close
            </button>
          )}
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
              {onBulkDeleteLabel}
            </button>
          )}
          {onBulkHardDelete && (
            <button className="at-bulk-btn delete" style={{ background: '#7f1d1d' }} onClick={() => onBulkHardDelete(selectedIds)}>
              {onBulkHardDeleteLabel}
            </button>
          )}
          <button className="at-bulk-btn clear" onClick={() => setRowSelection({})}>
            Deselect
          </button>
        </div>
      )}

      {/* Table */}
      <div className="at-table-container">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleColumnDragEnd}>
        <table className="at-table" style={{ width: table.getCenterTotalSize() }}>
          <thead>
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id}>
                <SortableContext items={columnOrder} strategy={horizontalListSortingStrategy}>
                  {headerGroup.headers.map(header => (
                    <DraggableHeader key={header.id} header={header}>
                      {header.isPlaceholder ? null : (
                        <div
                          className="at-th-content"
                          onClick={header.column.getCanSort() ? header.column.getToggleSortingHandler() : undefined}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {header.column.getCanSort() && (
                            <span className={`at-sort-arrow ${header.column.getIsSorted() ? 'active' : ''}`}>
                              {header.column.getIsSorted() === 'asc' ? ' ▲' : header.column.getIsSorted() === 'desc' ? ' ▼' : ' ⇅'}
                            </span>
                          )}
                        </div>
                      )}
                      {header.column.getCanResize() && (
                        <div
                          onMouseDown={header.getResizeHandler()}
                          onTouchStart={header.getResizeHandler()}
                          onClick={e => e.stopPropagation()}
                          className={`at-resize-handle ${header.column.getIsResizing() ? 'resizing' : ''}`}
                        />
                      )}
                    </DraggableHeader>
                  ))}
                </SortableContext>
              </tr>
            ))}
          </thead>
          <TableBody
            table={table}
            columns={columns}
            editingCell={editingCell}
            editValue={editValue}
            setEditValue={setEditValue}
            onSave={onSave}
            setEditingCell={setEditingCell}
            cancelEdit={cancelEdit}
            commitEdit={commitEdit}
            startEdit={startEdit}
            emptyMessage={emptyMessage}
            renderExpandedRow={renderExpandedRow}
            tableName={tableName}
          />
        </table>
        </DndContext>
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

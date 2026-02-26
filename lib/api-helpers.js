import { createServiceClient } from './supabase';

/**
 * Write a single audit log entry.
 */
export async function writeAuditLog({ tableName, rowId, action, fieldChanged, oldValue, newValue, adminUser = 'admin', metadata = {} }) {
  const supabase = createServiceClient();
  const { error } = await supabase.from('audit_log').insert({
    table_name: tableName,
    row_id: String(rowId),
    action,
    field_changed: fieldChanged || null,
    old_value: oldValue != null ? String(oldValue) : null,
    new_value: newValue != null ? String(newValue) : null,
    admin_user: adminUser,
    metadata,
  });
  if (error) console.error('Audit log write failed:', error.message);
}

/**
 * Write multiple audit log entries in one insert.
 */
export async function writeAuditLogBatch(entries) {
  if (!entries.length) return;
  const supabase = createServiceClient();
  const rows = entries.map(e => ({
    table_name: e.tableName,
    row_id: String(e.rowId),
    action: e.action,
    field_changed: e.fieldChanged || null,
    old_value: e.oldValue != null ? String(e.oldValue) : null,
    new_value: e.newValue != null ? String(e.newValue) : null,
    admin_user: e.adminUser || 'admin',
    metadata: e.metadata || {},
  }));
  const { error } = await supabase.from('audit_log').insert(rows);
  if (error) console.error('Audit log batch write failed:', error.message);
}

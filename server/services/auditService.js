import crypto from 'crypto';
import { query } from '../db/neon-client.js';

export const auditService = {
  async log({
    entityType,
    entityId,
    action,
    actorId = null,
    actorType = 'SYSTEM',
    previousState = null,
    newState = null,
    ipAddress = null
  }) {
    try {
      const res = await query(`
        INSERT INTO audit_logs (
          id,
          entity_type,
          entity_id,
          action,
          actor_id,
          actor_type,
          previous_state,
          new_state,
          ip_address
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id, created_at
      `, [
        crypto.randomUUID(),
        entityType,
        entityId,
        action,
        actorId,
        actorType,
        previousState ? JSON.stringify(previousState) : null,
        newState ? JSON.stringify(newState) : null,
        ipAddress
      ]);
      return res.rows[0];
    } catch (err) {
      console.error('Audit logging error:', err);
    }
  },

  async getRecentLogs(limit = 50) {
    const res = await query(`
      SELECT * FROM audit_logs
      ORDER BY created_at DESC
      LIMIT $1
    `, [limit]);
    return res.rows || [];
  }
};

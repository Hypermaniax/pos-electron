import type { Request, Response } from 'express'
import { first, intParam } from '../lib/validate'
import { listAuditLogs } from '../services/audit.service'

export async function listHandler(req: Request, res: Response): Promise<void> {
  const items = await listAuditLogs({
    action: first(req.query.action),
    correlationId: first(req.query.correlationId),
    from: first(req.query.from),
    to: first(req.query.to),
    limit: intParam(first(req.query.limit), 200, 500)
  })
  res.json({ items })
}

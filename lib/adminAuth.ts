import { NextRequest } from 'next/server';

export function checkAdminAuth(req: NextRequest): boolean {
  const token = process.env.ADMIN_TOKEN;
  if (!token) throw new Error('ADMIN_TOKEN není nastaven v environment variables.');
  return req.headers.get('x-admin-token') === token;
}

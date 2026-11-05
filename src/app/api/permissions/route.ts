import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { EDITABLE_ROLES, FEATURES, Feature, Role, isAllowed } from '@/lib/permissions';
import { getMatrix, saveMatrix } from '@/lib/permissions-server';

export const dynamic = 'force-dynamic';

/** What the signed-in user may do; admins also get the whole matrix to edit. */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const matrix = await getMatrix();
  const role = session.user.role;
  const allowed = {} as Record<Feature, boolean>;
  for (const f of FEATURES) allowed[f.key] = isAllowed(matrix, role, f.key);
  return NextResponse.json({
    role,
    allowed,
    ...(role === 'ADMIN' ? { matrix, features: FEATURES, editableRoles: EDITABLE_ROLES } : {}),
  });
}

/** Admins only: { matrix: { SCHEDULER: { reports: true, … }, INSTRUCTOR: { … } } } */
export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Only admins can change permissions' }, { status: 403 });
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const input: Partial<Record<Role, Partial<Record<Feature, boolean>>>> = {};
  for (const role of EDITABLE_ROLES) {
    const given = body?.matrix?.[role];
    if (!given || typeof given !== 'object') continue;
    input[role] = {};
    for (const f of FEATURES) if (typeof given[f.key] === 'boolean') input[role]![f.key] = given[f.key];
  }
  const matrix = await saveMatrix(input);
  return NextResponse.json({ matrix });
}

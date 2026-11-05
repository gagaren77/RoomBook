import { prisma } from './prisma';
import { EDITABLE_ROLES, FEATURES, Feature, Matrix, Role, defaultMatrix, isAllowed, isFeature, isRole } from './permissions';

const TTL_MS = 5000;
let cache: { matrix: Matrix; at: number } | null = null;

/** The current permission matrix: stored rows over the defaults. */
export async function getMatrix(fresh = false): Promise<Matrix> {
  if (!fresh && cache && Date.now() - cache.at < TTL_MS) return cache.matrix;
  const rows = await prisma.rolePermission.findMany();
  const matrix = defaultMatrix();
  for (const r of rows) {
    if (isRole(r.role) && r.role !== 'ADMIN' && isFeature(r.feature)) matrix[r.role][r.feature] = r.allowed;
  }
  cache = { matrix, at: Date.now() };
  return matrix;
}

/** May this role use the feature? Admins always may. */
export async function can(role: string | null | undefined, feature: Feature): Promise<boolean> {
  if (!isRole(role)) return false;
  if (role === 'ADMIN') return true;
  return isAllowed(await getMatrix(), role, feature);
}

/** Store the editable part of the matrix and return the result. */
export async function saveMatrix(input: Partial<Record<Role, Partial<Record<Feature, boolean>>>>): Promise<Matrix> {
  const ops = [];
  for (const role of EDITABLE_ROLES) {
    for (const f of FEATURES) {
      const allowed = input[role]?.[f.key];
      if (typeof allowed !== 'boolean') continue;
      ops.push(
        prisma.rolePermission.upsert({
          where: { role_feature: { role, feature: f.key } },
          update: { allowed },
          create: { role, feature: f.key, allowed },
        })
      );
    }
  }
  if (ops.length) await prisma.$transaction(ops);
  cache = null;
  return getMatrix(true);
}

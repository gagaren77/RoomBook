// The campus list lives next to the seed script so it ships in the production
// image (which includes prisma/ but not src/).
export { CAMPUSES, ensureCampuses } from '../../prisma/campuses';

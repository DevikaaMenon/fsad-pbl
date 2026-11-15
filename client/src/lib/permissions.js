// Mirrors the server's rules so the UI only shows what a user can actually do.
// (The server still checks everything; this is just for display.)

export const isAdmin = (user) => user?.role === 'admin';
export const isLead = (user) => user?.role === 'lead';
export const isManager = (user) => isAdmin(user) || isLead(user);

export function canManage(user, clubId) {
  if (!user || !clubId) return false;
  if (user.role === 'admin') return true;
  return user.role === 'lead' && String(user.leadClub) === String(clubId);
}

// clubs this user may pick in "club" dropdowns on forms
export function manageableClubs(user, clubs) {
  if (isAdmin(user)) return clubs;
  if (isLead(user)) return clubs.filter((c) => String(c._id) === String(user.leadClub));
  return [];
}

export function roleLabel(role) {
  return { admin: 'Admin', lead: 'Club lead', student: 'Student' }[role] || role;
}

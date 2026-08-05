function inferRoleFromEmail(email) {
  const normalizedEmail = (email || '').toLowerCase();

  if (!normalizedEmail) {
    return 'User';
  }

  if (normalizedEmail.includes('tech') || normalizedEmail.includes('technician')) {
    return 'Technician';
  }

  if (normalizedEmail.includes('manager') || normalizedEmail.includes('admin')) {
    return 'Manager';
  }

  return 'User';
}

module.exports = { inferRoleFromEmail };

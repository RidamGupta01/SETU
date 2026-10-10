export const toUserDTO = (user) => {
  if (!user) return null;
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role && typeof user.role === 'object' ? user.role.name : user.role,
    department: user.department && typeof user.department === 'object' ? {
      id: user.department._id,
      name: user.department.name,
      code: user.department.code,
      color: user.department.color
    } : user.department || null,
    phone: user.phone,
    ward: user.ward && typeof user.ward === 'object' ? {
      id: user.ward._id,
      name: user.ward.name,
      number: user.ward.number
    } : user.ward || null,
    isVerified: user.isVerified,
    isActive: user.isActive,
    createdAt: user.createdAt
  };
};

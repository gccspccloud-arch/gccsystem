const calculateAge = (birthdate) => {
  if (!birthdate) return null;
  const birth = new Date(birthdate);
  if (isNaN(birth.getTime())) return null;

  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return age;
};

const getAgeClass = (age) => {
  if (age == null || age < 0) return null;
  if (age < 10) return 'Kids';
  if (age <= 12) return 'Tweens';
  if (age <= 19) return 'Teens';
  return 'Adult';
};

module.exports = { calculateAge, getAgeClass };

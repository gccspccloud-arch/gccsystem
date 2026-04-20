export const calculateAge = (birthdate) => {
  if (!birthdate) return null;
  const birth = new Date(birthdate);
  if (isNaN(birth.getTime())) return null;

  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return age;
};

export const getAgeClass = (age) => {
  if (age == null || age < 0) return null;
  if (age < 10) return 'Kids';
  if (age <= 12) return 'Tweens';
  if (age <= 19) return 'Teens';
  return 'Adult';
};

export const AGE_CLASS_STYLES = {
  Kids: 'bg-pink-100 text-pink-700',
  Tweens: 'bg-purple-100 text-purple-700',
  Teens: 'bg-indigo-100 text-indigo-700',
  Adult: 'bg-slate-100 text-slate-700',
};

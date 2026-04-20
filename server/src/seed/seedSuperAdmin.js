require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');

const seed = async () => {
  await connectDB();

  const email = (process.env.SUPER_ADMIN_EMAIL || 'superadmin@gcc.local').toLowerCase();
  const password = process.env.SUPER_ADMIN_PASSWORD || 'ChangeMe123!';
  const firstName = process.env.SUPER_ADMIN_FIRST_NAME || 'Super';
  const lastName = process.env.SUPER_ADMIN_LAST_NAME || 'Admin';

  const existing = await User.findOne({ email });
  if (existing) {
    console.log(`[Seed] Super admin already exists: ${email}`);
    await mongoose.disconnect();
    return;
  }

  await User.create({ firstName, lastName, email, password, role: 'super_admin' });

  console.log('[Seed] Super admin created');
  console.log(`        Email:    ${email}`);
  console.log(`        Password: ${password}`);
  console.log('        ⚠ Change this password after first login.');

  await mongoose.disconnect();
};

seed().catch((err) => {
  console.error('[Seed] Failed:', err.message);
  process.exit(1);
});

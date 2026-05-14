const LdpCategory = require('../models/LdpCategory');
const Member = require('../models/Member');
const { syncDescriptionByName } = require('../utils/syncDescription');
const { success, error } = require('../utils/apiResponse');

const list = async (req, res, next) => {
  try {
    const { includeInactive } = req.query;
    const filter = includeInactive === 'true' ? {} : { isActive: true };
    const items = await LdpCategory.find(filter).sort({ order: 1, name: 1 });
    return success(res, items, 'LDP categories fetched');
  } catch (err) {
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const exists = await LdpCategory.findOne({
      name: new RegExp(`^${req.body.name}$`, 'i'),
    });
    if (exists) return error(res, 'A category with that name already exists', 409);
    const item = await LdpCategory.create({ ...req.body, createdBy: req.user._id });
    syncDescriptionByName({
      name: item.name,
      description: item.description,
      exclude: { collection: 'LdpCategory', id: item._id },
    });
    return success(res, item, 'LDP category created', 201);
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    if (req.body.name) {
      const dup = await LdpCategory.findOne({
        _id: { $ne: req.params.id },
        name: new RegExp(`^${req.body.name}$`, 'i'),
      });
      if (dup) return error(res, 'A category with that name already exists', 409);
    }
    const item = await LdpCategory.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!item) return error(res, 'Category not found', 404);
    syncDescriptionByName({
      name: item.name,
      description: item.description,
      exclude: { collection: 'LdpCategory', id: item._id },
    });
    return success(res, item, 'LDP category updated');
  } catch (err) {
    next(err);
  }
};

const remove = async (req, res, next) => {
  try {
    // If any member references this category, refuse hard-delete — direct
    // them to deactivate instead so historical data survives.
    const inUse = await Member.countDocuments({ 'ldp.category': req.params.id });
    if (inUse > 0) {
      return error(
        res,
        `Cannot delete: ${inUse} member(s) have a status under this category. Deactivate it instead.`,
        400,
      );
    }
    const item = await LdpCategory.findByIdAndDelete(req.params.id);
    if (!item) return error(res, 'Category not found', 404);
    return success(res, { id: item._id }, 'LDP category deleted');
  } catch (err) {
    next(err);
  }
};

/**
 * POST /ldp-categories/:id/rename-option
 * Body: { from: "Regular", to: "Regularly" }
 * Renames the option label on the category AND on every Member.ldp entry
 * that currently holds the old value.
 */
const renameOption = async (req, res, next) => {
  try {
    const { from, to } = req.body || {};
    if (!from || !to) return error(res, 'from and to are required', 400);

    const cat = await LdpCategory.findById(req.params.id);
    if (!cat) return error(res, 'Category not found', 404);

    const opt = cat.options.find((o) => o.label === from);
    if (!opt) return error(res, `Option "${from}" not found on this category`, 404);

    // Reject collision: don't allow renaming to a label that already exists.
    if (cat.options.some((o) => o.label === to)) {
      return error(res, `Option "${to}" already exists on this category`, 409);
    }

    opt.label = to;
    await cat.save();

    const result = await Member.updateMany(
      { ldp: { $elemMatch: { category: cat._id, value: from } } },
      { $set: { 'ldp.$[el].value': to } },
      { arrayFilters: [{ 'el.category': cat._id, 'el.value': from }] },
    );

    return success(res, {
      category: cat,
      migratedMembers: result.modifiedCount || 0,
    }, 'Option renamed and member values migrated');
  } catch (err) {
    next(err);
  }
};

module.exports = { list, create, update, remove, renameOption };

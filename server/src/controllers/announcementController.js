const Announcement = require('../models/Announcement');
const { success, error } = require('../utils/apiResponse');

const list = async (req, res, next) => {
  try {
    const items = await Announcement.find({ isPublished: true })
      .populate('author', 'firstName lastName')
      .sort({ isPinned: -1, publishedAt: -1 });
    return success(res, items, 'Announcements fetched');
  } catch (err) {
    next(err);
  }
};

const listAll = async (req, res, next) => {
  try {
    const items = await Announcement.find()
      .populate('author', 'firstName lastName')
      .sort({ isPinned: -1, publishedAt: -1 });
    return success(res, items, 'All announcements fetched');
  } catch (err) {
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const announcement = await Announcement.create({ ...req.body, author: req.user._id });
    await announcement.populate('author', 'firstName lastName');
    return success(res, announcement, 'Announcement posted', 201);
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const announcement = await Announcement.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).populate('author', 'firstName lastName');
    if (!announcement) return error(res, 'Announcement not found', 404);
    return success(res, announcement, 'Announcement updated');
  } catch (err) {
    next(err);
  }
};

const remove = async (req, res, next) => {
  try {
    const announcement = await Announcement.findByIdAndDelete(req.params.id);
    if (!announcement) return error(res, 'Announcement not found', 404);
    return success(res, { id: announcement._id }, 'Announcement deleted');
  } catch (err) {
    next(err);
  }
};

module.exports = { list, listAll, create, update, remove };

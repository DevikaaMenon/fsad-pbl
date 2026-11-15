const mongoose = require('mongoose');
const { titleCase, EMAIL_REGEX } = require('./helpers');

const CATEGORIES = ['Technical', 'Cultural', 'Sports', 'Literary', 'Entrepreneurship', 'Social Service'];

const clubSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Club name is required'],
      unique: true,
      maxlength: [60, 'Club name must be at most 60 characters'],
      set: titleCase, // custom setter
    },
    category: { type: String, enum: CATEGORIES, default: 'Technical' }, // predefined modifier + default
    description: { type: String, trim: true, maxlength: 500, default: '' },
    coordinator: { type: String, required: [true, 'Faculty coordinator is required'], trim: true },
    email: { type: String, trim: true, lowercase: true, match: [EMAIL_REGEX, 'Enter a valid email'] },
    foundedYear: {
      type: Number,
      min: [1950, 'Founded year looks too early'],
      max: [new Date().getFullYear(), 'Founded year cannot be in the future'],
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Club', clubSchema);
module.exports.CATEGORIES = CATEGORIES;

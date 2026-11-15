const mongoose = require('mongoose');
const { toDateString } = require('./helpers');

const STATUSES = ['Upcoming', 'Completed', 'Cancelled'];

const eventSchema = new mongoose.Schema(
  {
    title: { type: String, required: [true, 'Event title is required'], trim: true, maxlength: 80 },
    club: { type: mongoose.Schema.Types.ObjectId, ref: 'Club', required: [true, 'Club is required'] },
    date: { type: Date, required: [true, 'Event date is required'], get: toDateString },
    time: {
      type: String,
      trim: true,
      default: '10:00',
      match: [/^([01]\d|2[0-3]):[0-5]\d$/, 'Use 24-hour time, e.g. 14:30'],
    },
    venue: { type: String, trim: true, default: 'Seminar Hall' },
    description: { type: String, trim: true, default: '' },
    capacity: {
      type: Number,
      default: 50,
      min: [1, 'Capacity must be at least 1'],
      max: [5000, 'Capacity looks too large'],
    },
    // typed in rupees, stored in paise
    budget: {
      type: Number,
      default: 0,
      min: [0, 'Budget cannot be negative'],
      set: (rupees) => Math.round(Number(rupees) * 100),
      get: (paise) => paise / 100,
    },
    status: { type: String, enum: STATUSES, default: 'Upcoming' },
  },
  { timestamps: true, toJSON: { getters: true }, toObject: { getters: true } }
);

eventSchema.index({ club: 1, date: 1 });
eventSchema.index({ status: 1, date: 1 });

module.exports = mongoose.model('Event', eventSchema);
module.exports.STATUSES = STATUSES;

const mongoose = require('mongoose');
const { titleCase, toDateString, EMAIL_REGEX } = require('./helpers');

const ROLES = ['President', 'Vice President', 'Secretary', 'Treasurer', 'Member'];

const memberSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Member name is required'], set: titleCase },
    usn: { type: String, required: [true, 'USN is required'], trim: true, uppercase: true },
    email: { type: String, trim: true, lowercase: true, match: [EMAIL_REGEX, 'Enter a valid email'] },
    role: { type: String, enum: ROLES, default: 'Member' },
    club: { type: mongoose.Schema.Types.ObjectId, ref: 'Club', required: [true, 'Club is required'] },
    joinedOn: { type: Date, default: Date.now, get: toDateString },
  },
  { timestamps: true, toJSON: { getters: true }, toObject: { getters: true } }
);

// A student can be in many clubs, but only once in each.
memberSchema.index({ club: 1, usn: 1 }, { unique: true });
memberSchema.index({ club: 1, name: 1 });

module.exports = mongoose.model('Member', memberSchema);
module.exports.ROLES = ROLES;

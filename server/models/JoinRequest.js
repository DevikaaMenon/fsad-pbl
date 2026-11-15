const mongoose = require('mongoose');
const { titleCase, EMAIL_REGEX } = require('./helpers');

const REQUEST_STATUSES = ['Pending', 'Approved', 'Rejected'];

const joinRequestSchema = new mongoose.Schema(
  {
    club: { type: mongoose.Schema.Types.ObjectId, ref: 'Club', required: [true, 'Club is required'] },
    name: { type: String, required: [true, 'Name is required'], set: titleCase },
    usn: { type: String, required: [true, 'USN is required'], trim: true, uppercase: true },
    email: { type: String, trim: true, lowercase: true, match: [EMAIL_REGEX, 'Enter a valid email'] },
    message: { type: String, trim: true, maxlength: [500, 'Keep it under 500 characters'], default: '' },
    status: { type: String, enum: REQUEST_STATUSES, default: 'Pending' },
    decidedAt: { type: Date },
  },
  { timestamps: true }
);

joinRequestSchema.index({ club: 1, status: 1 });

module.exports = mongoose.model('JoinRequest', joinRequestSchema);
module.exports.REQUEST_STATUSES = REQUEST_STATUSES;

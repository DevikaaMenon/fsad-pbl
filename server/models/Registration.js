const mongoose = require('mongoose');
const { titleCase, EMAIL_REGEX } = require('./helpers');

const registrationSchema = new mongoose.Schema(
  {
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: [true, 'Event is required'] },
    name: { type: String, required: [true, 'Name is required'], set: titleCase },
    usn: { type: String, required: [true, 'USN is required'], trim: true, uppercase: true },
    email: { type: String, trim: true, lowercase: true, match: [EMAIL_REGEX, 'Enter a valid email'] },
    attended: { type: Boolean, default: false },
  },
  { timestamps: true }
);

registrationSchema.index({ event: 1, usn: 1 }, { unique: true });

module.exports = mongoose.model('Registration', registrationSchema);

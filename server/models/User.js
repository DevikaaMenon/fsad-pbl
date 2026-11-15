const mongoose = require('mongoose');
const { titleCase, EMAIL_REGEX } = require('./helpers');

const ROLES = ['admin', 'lead', 'student'];

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Name is required'], maxlength: 60, set: titleCase },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [EMAIL_REGEX, 'Enter a valid email'],
    },
    // empty string -> undefined so the sparse unique index ignores it
    usn: {
      type: String,
      trim: true,
      uppercase: true,
      set: (v) => (v ? v : undefined),
      required: [function needsUsn() { return this.role === 'student'; }, 'USN is required for students'],
    },
    role: { type: String, enum: ROLES, default: 'student' },
    leadClub: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Club',
      required: [function needsClub() { return this.role === 'lead'; }, 'Pick the club this lead manages'],
    },
    passwordHash: { type: String, required: true, select: false },
    lastLoginAt: { type: Date },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        delete ret.passwordHash;
        delete ret.__v;
        return ret;
      },
    },
  }
);

userSchema.index({ usn: 1 }, { unique: true, sparse: true });

// only leads have a club
userSchema.pre('validate', function clearLeadClub(next) {
  if (this.role !== 'lead') this.leadClub = undefined;
  next();
});

module.exports = mongoose.model('User', userSchema);
module.exports.ROLES = ROLES;

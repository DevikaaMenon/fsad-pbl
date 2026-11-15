const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema(
  {
    club: { type: mongoose.Schema.Types.ObjectId, ref: 'Club', required: [true, 'Club is required'] },
    title: { type: String, required: [true, 'Title is required'], trim: true, maxlength: [100, 'Keep the title under 100 characters'] },
    body: { type: String, required: [true, 'Write something for the notice'], trim: true, maxlength: [2000, 'Keep the notice under 2000 characters'] },
    pinned: { type: Boolean, default: false },
  },
  { timestamps: true }
);

announcementSchema.index({ club: 1, pinned: -1, createdAt: -1 });

module.exports = mongoose.model('Announcement', announcementSchema);

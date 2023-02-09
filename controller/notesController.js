const asyncHandler = require("express-async-handler");
const Note = require("../models/Note");
const User = require("../models/User");

// @desc Get all notes
// @route GET /notes
// @access Private
const getAllNotes = asyncHandler(async (req, res) => {
  const notes = await Note.find().lean();
  if (!notes?.length) {
    return res.status(400).json({ message: "No notes available" });
  }
  // Update user id with username

  const noteswithUser = await Promise.all(
    (
      await notes
    ).map(async (note) => {
      const user = await User.findById(note.user).lean().exec();
      return { ...note, username: user.username };
    })
  );
  res.json(noteswithUser);
});

// @desc Create new note
// @route POST /notes
// @access Private
const createNote = asyncHandler(async (req, res) => {
  const { user, title, text } = req.body;

  if (!user || !title || !text) {
    return res.send(400).json({ message: "All fields are required" });
  }
  // Check for duplicate title
  const duplicate = await Note.findOne({ title })
    .collation({ locale: "en", strength: 2 })
    .lean()
    .exec();

  if (duplicate) {
    return res.status(409).json({ message: "Duplicate note title" });
  }

  const note = {
    user,
    title,
    text,
  };
  const newNote = await Note.create(note);

  if (newNote) {
    res.status(201).json({ message: `New Note created` });
  } else {
    res.status(400).json({ message: "Invalid Note data recieved" });
  }
});

// @desc Update a note
// @route PATCH /notes
// @access Private
const updateNote = asyncHandler(async (req, res) => {
  const { user, title, text, id, completed } = req.body;

  if (!id || !user || !title || !text || typeof completed !== "boolean") {
    res.send(400).json({ message: "All fields are required" });
  }

  // Confirm note exists to update
  const note = await Note.findById(id).exec();

  if (!note) {
    return res.status(400).json({ message: "Note not found" });
  }
  // Check for duplicate title
  const duplicate = await Note.findOne({ title })
    .collation({ locale: "en", strength: 2 })
    .lean()
    .exec();

  // Allow renaming of the original note
  if (duplicate && duplicate?._id.toString() !== id) {
    return res.status(409).json({ message: "Duplicate note title" });
  }
  note.user = user;
  note.title = title;
  note.text = text;
  note.completed = completed;

  const updatedNote = await note.save();

  res.json(`${updatedNote.title} updated`);
});

const deleteNote = asyncHandler(async (req, res) => {
  const { id } = req.body;

  if (!id) {
    res.send(400).json({ message: "Note ID is required" });
  }

  const note = await Note.findById(id).exec();
  if (!note) {
    return res.send(400).json({ message: `Note not found` });
  }

  const result = await note.deleteOne();

  const reply = `Note '${result.title}' with ID ${result._id} deleted`;

  res.json(reply);
});

module.exports = {
  getAllNotes,
  createNote,
  updateNote,
  deleteNote,
};

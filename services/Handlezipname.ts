import multer from "multer";
import path from "path";

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/"); // folder where files will be saved
  },
  filename: (req, file, cb) => {
    // Keep original file name
    cb(null, file.originalname);
  },
});

// Initialize Multer with custom storage
const upload = multer({ storage: storage });

export default upload;

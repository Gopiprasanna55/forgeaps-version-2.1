import fs from "fs";
import path from "path";

// Utility function to clear uploads folder
export function clearUploadsFolder() {
  const uploadsPath = path.join(__dirname, "../uploads"); // adjust if needed

  if (fs.existsSync(uploadsPath)) {
    fs.readdirSync(uploadsPath).forEach(file => {
      const filePath = path.join(uploadsPath, file);
      try {
        fs.unlinkSync(filePath);
      } catch (err) {
        console.error("❌ Error deleting file:", filePath, err);
      }
    });
  }
}

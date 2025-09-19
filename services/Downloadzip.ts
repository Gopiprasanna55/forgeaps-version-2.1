import axios from "axios";
import * as fs from "fs";
import * as path from "path";

/**
 * Download a zip file from a given URL and save it with the given name.
 *
 * @param fileUrl - The URL of the zip file
 * @param zipName - The file name to save as (e.g., "output.zip")
 * @returns The full path to the saved file
 */
export async function downloadZip(fileUrl: string, zipName: string): Promise<string> {
  try {
    const saveDir = "./downloads"; // fixed folder
    if (!fs.existsSync(saveDir)) {
      fs.mkdirSync(saveDir, { recursive: true });
    }

    const filePath = path.resolve(saveDir, zipName);
    const writer = fs.createWriteStream(filePath);

    const response = await axios.get(fileUrl, { responseType: "stream" });

    response.data.pipe(writer);

    await new Promise<void>((resolve, reject) => {
      writer.on("finish", () => resolve());
      writer.on("error", reject);
    });
    return filePath;
  } catch (err: any) {
    console.error("❌ Error downloading zip:", err.message);
    throw err;
  }
}

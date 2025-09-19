import axios from "axios";
import archiver from "archiver";
import { Response } from "express";

/**
 * Streams a remote file into a zip and sends it to client
 */
export async function streamRvtAsZip(
  fileUrl: string,
  res: Response,
  zipName = "model.zip",
  rvtName = "model.rvt"
): Promise<void> {
  res.setHeader("Content-Disposition", `attachment; filename="${zipName}"`);
  res.setHeader("Content-Type", "application/zip");

  const archive = archiver("zip", { zlib: { level: 9 } });
  archive.pipe(res);

  const response = await axios.get(fileUrl, { responseType: "stream" });
  archive.append(response.data, { name: rvtName });
  await archive.finalize();
}

import fs from "fs";
import path from "path";
import {
  generateForgeAccessToken,
  generateSignedURL,
  uploadFileToSignedUrl,
  completeForgeUpload,
} from "../ForgeManager";

export async function handleFileUpload(file: string) {
  const inputFiles = [
    {
      label: "Revit File",
      path: "./Revit_Template_Metric.rvt",
    },
    {
      label: "Params ZIP",
      path: file!,
    },
  ];

  const forgeAccessToken = await generateForgeAccessToken().then((t) => t.access_token);
  const results = [];

  for (const input of inputFiles) {
    const filePath = input.path;

    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const fileName = path.basename(filePath);
   
    // Generate signed URL
    const signedUrlResponse: any = await generateSignedURL(fileName, forgeAccessToken);
    const signedUrl = signedUrlResponse.urls[0];
    const uploadKey = signedUrlResponse.uploadKey;
     
    // Upload file
    await uploadFileToSignedUrl(signedUrl, filePath);
   
    // Complete the upload
    const completeResult = await completeForgeUpload(uploadKey, fileName, forgeAccessToken);
   
    results.push({
      label: input.label,
      fileName,
      signedUrl,
      uploadKey,
      completeStatus: completeResult.status,
    });
  }

  return results;
}

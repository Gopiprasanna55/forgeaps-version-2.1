import { generateForgeAccessToken, generateSignedURL } from "../ForgeManager";


export async function generateOutputUrls() {
  // Get access token
  const accessToken = await generateForgeAccessToken().then(t => t.access_token);

  // List of output file names
  const outputFiles = [
    "outputFile.rvt"
  ];

  // Generate signed URLs
  const signedUrls = await Promise.all(
    outputFiles.map(async (fileName) => {
      const signedUrlResponse: any = await generateSignedURL(fileName, accessToken);
      return {
        fileName,
        url: signedUrlResponse.urls[0],
      };
    })
  );

  // Convert array to object { fileName: url }
  return signedUrls.reduce((acc, { fileName, url }) => {
    acc[fileName] = url;
    return acc;
  }, {} as Record<string, string>);
}

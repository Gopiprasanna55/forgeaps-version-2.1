import express, { Request, Response } from 'express';
import axios from 'axios';
import {
  generateForgeAccessToken,
  generateSignedURL,
  uploadFileToSignedUrl,
  completeForgeUpload,
  submitRevitWorkItem,
  INPUT_PARAMS_ZIP_URL_dynamic_read,
} from './ForgeManager';
import fs from 'fs';
import path from 'path';
import { handleFileUpload } from "./services/uploadService";
import { generateOutputUrls } from "./services/forgeOutputs";
import {clearUploadsFolder} from './services/Deleteupload_files';
import {downloadZip} from "./services/Downloadzip";
import upload from "./services/Handlezipname";
import { CLIENT_RENEG_LIMIT } from 'tls';

//const upload = multer({ dest: 'uploads/' });
const router = express.Router();

//Token generation route

router.post('/token', async (req, res) => {
    
  try {
    const token = await generateForgeAccessToken();

    res.json(token);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

//Signed url generation route

router.post('/signed-url', async (req, res) => {
const inputFile=process.env.INPUT_PARAMS_ZIP_URL?.split('\\').pop() || 'params.zip';
const forgeAccessToken=await generateForgeAccessToken().then(token => token.access_token);

  try {
    const url = await generateSignedURL(inputFile, forgeAccessToken);
    res.json({ signedUrl: url });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// Upload input files route

router.post('/upload-input-files', async (req, res) => {
 const {file}=req.body;

  try {
    const inputFiles = [
      {
        label: 'Revit File',
        path: "./Revit_Template_Metric.rvt",
      },
      {
        label: 'Params ZIP',
        path: file!,
      }
    ];

    const forgeAccessToken = await generateForgeAccessToken().then(t => t.access_token);

    const results = [];

    for (const input of inputFiles) {
      const filePath = input.path;

      if (!fs.existsSync(filePath)) {
        return res.status(400).json({ error: `File not found: ${filePath}` });
      }

      const fileName = path.basename(filePath);

      // Generate signed URL for upload
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

    res.json({
      success: true,
      uploadedFiles: results,
    });

  } catch (err: any) {
    console.error('Error uploading input files:', err);
    res.status(500).json({ error: err.message || 'An unknown error occurred' });
  }
});

// Generate output URLs route

router.post('/generate-output-urls', async (req, res) => {
  try {
    const accessToken = await generateForgeAccessToken().then(t => t.access_token);

    // List of output file names to generate signed URLs for
    const outputFiles = [
      'outputFile.rvt',
      'outputFileDWG.dwg',
      'outputSignedTitleBlockRvt.rvt',
      'outputSignedDWGImg.img'
    ];

    // Generate a signed URL (PUT) for each file
    const signedUrls = await Promise.all(
      outputFiles.map(async (fileName) => {
        const signedUrlResponse: any = await generateSignedURL(fileName, accessToken);
        return {
          fileName,
          url: signedUrlResponse.urls[0], // assuming one URL per file
        };
      })
    );

    // Format response
    const response = signedUrls.reduce((acc, { fileName, url }) => {
      acc[fileName] = url;
      return acc;
    }, {} as Record<string, string>);

    res.json({
      success: true,
      outputUrls: response,
    });

  } catch (err: any) {
    console.error('Error generating output URLs:', err.message);
    res.status(500).json({ error: err.message });
  }
});

//Submit workitem route

router.post('/submit-workitem1', async (req, res) => {
  try {

    const {callbackURL}=req.body;

    const result = await submitRevitWorkItem(callbackURL);
    res.json({ success: true, workItemId: result.id, status: result.status });
  } catch (err: any) {
    console.error('Error submitting workitem:', err);
    res.status(500).json({ error: err.message });
  }
});

//callback designautomation route

router.post("/callback/designautomation", async (req: Request, res: Response) => {
  try {
    const { id, outputFileName, callbackURL } = req.query;
    const body = req.body;

    if (body.reportUrl) {
      const reportResponse = await axios.get(body.reportUrl);
    }

    //  Get OAuth token
    const accessToken = await generateForgeAccessToken().then(t => t.access_token);

    // console.log("hai")

    // Get signed URLs for all outputs
  const clientid=process.env.FORGE_CLIENT_ID || ""
  const bucketId: string = `${clientid.toLowerCase()}-designautomation`;
  
   console.log(bucketId)
   console.log(outputFileName);
  //  console.log( `https://developer.api.autodesk.com/oss/v2/buckets/${bucketId}/objects/${outputFileName}/signeds3download`)
  
   const outputUrlRes = await axios.get(
      `https://developer.api.autodesk.com/oss/v2/buckets/${bucketId}/objects/${outputFileName}/signeds3download`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: { minutesExpiration: 15.0, useCdn: true },
      }
    );
    console.log(outputUrlRes);
    const revitdownloadurl=outputUrlRes.data.url;
    console.log("revitdownloadurl",revitdownloadurl);
    downloadZip(revitdownloadurl,"outputFiles.zip");
    
    const callbackDownload = await axios.post(callbackURL as string, {
      zipPath: `${process.env.HOST_DOMAIN_URL}/forge/download/OutputFile`,
    });
   
    clearUploadsFolder();
  } catch (error: any) {
    console.error(" Callback error at route=> /callback/designautomation:", error.message);
  }
});

// main route 

router.post("/submit-workitem",upload.single('file'), async (req: Request, res: Response) => {
  try {

   
     if (!req.file) return res.status(400).json({ error: 'File not found' });
    
    const filePathread = req.file.path;
    const {callbackURL} = req.body;
    const fileNamezip = req.file.originalname;
    INPUT_PARAMS_ZIP_URL_dynamic_read(filePathread,fileNamezip);

    // Step 1: Upload input files
   
     const uploadRes = await handleFileUpload(filePathread);
     console.log("uploadRes",uploadRes);
    // Step 2: Generate output URLs
    
    const outputRes = await generateOutputUrls();
    console.log("outputRes",outputRes);
    // Step 3: Submit workitem
    const workitemRes = await submitRevitWorkItem(callbackURL);
    console.log("workitemRes",workitemRes);
     res.json({
      workitem: workitemRes,
    });
    
  } catch (err: any) {
    console.error("Error in run-all => /submit-workitem:", err.message);
    res.status(500).json({ error: err.message });
  }
});

//Download route

router.get("/download/OutputFile", (req: Request, res: Response) => {
  const filePath = path.join(__dirname, "./downloads/outputFiles.zip"); 
 
  res.download(filePath, "Output_Files.zip", (err) => {
    if (err) {
      console.error("File download error:", err);
      res.status(500).send("Error downloading file.");
    }
  });
});


 





export default router;
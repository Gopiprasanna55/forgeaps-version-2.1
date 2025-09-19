import fetch, { Headers } from 'node-fetch';
import fs from 'fs';
import axios from 'axios';
import path from 'path';
import AdmZip from 'adm-zip';


const FORGE_CLIENT_ID = process.env.FORGE_CLIENT_ID;
const FORGE_CLIENT_SECRET = process.env.FORGE_CLIENT_SECRET;




//mycallbackurlmehtod is used  to store Hosted domain url

let mycallbackurl="";
export const mycallbackurlmehtod=(url:string) =>{
      mycallbackurl= url
}

//INPUT_PARAMS_ZIP_URL_dynamic is used to store INPUT PARAMS ZIP URL path Dynamically.
//INPUT_PARAMS_ZIP_URL_dynamic_read  is used to read INPUT_PARAMS_ZIP_URL_dynamic.

let INPUT_PARAMS_ZIP_URL_dynamic=""
let input_params_zipfile=""
export const INPUT_PARAMS_ZIP_URL_dynamic_read=(pathurlread:string,fileNamezip:string)=>{
   INPUT_PARAMS_ZIP_URL_dynamic=pathurlread;
   input_params_zipfile=fileNamezip;
}

/**
 * Generates an OAuth access token for Autodesk Forge (APS) APIs.
 * Reads the Forge Client ID and Client Secret from environment variables,
 * requests a short-lived access token from the Autodesk authentication server.
 */

export const generateForgeAccessToken = () => {
  
    
 const myHeaders = new Headers();
 myHeaders.append('Content-Type', 'application/x-www-form-urlencoded');
 myHeaders.append('Accept', 'application/json');
 const urlencoded = new URLSearchParams();
 urlencoded.append('client_id', FORGE_CLIENT_ID || '');
 urlencoded.append('client_secret', FORGE_CLIENT_SECRET || '');
 urlencoded.append('grant_type', 'client_credentials');
 urlencoded.append('scope', 'bucket:create bucket:read data:create data:read data:write code:all');
 const requestOptions = {
   method: 'POST',
   headers: myHeaders,
   body: urlencoded,
 };
 return fetch('https://developer.api.autodesk.com/authentication/v2/token', requestOptions)
   .then(async (response) => {
     const body = await response.text();
     try {
       return JSON.parse(body);
     } catch (e) {
       return { error: 'Invalid JSON', body };
     }
   });
};

/**
 * Generates a signed URL for a given file stored in the Autodesk Forge (APS) bucket.
 *
 * A signed URL allows temporary, secure access to a file without requiring
 * direct authentication. This is typically used for uploading or downloading
 * files to/from Forge Object Storage Service (OSS).
 *
 * @param {string} fileName - The name of the file in the Forge bucket.
 * @param {string} forgeAccessToken - A valid Forge access token with bucket read/write permissions.
 * @returns {Promise<string>} A Promise that resolves to the signed URL string.
 */

export const generateSignedURL = async (
 fileName: string,
 forgeAccessToken: string,
): Promise<string> => {
 const myHeaders = new Headers();
 myHeaders.append('Authorization', `Bearer ${forgeAccessToken}`);
 myHeaders.append('Content-Type', 'application/json');
 const raw = JSON.stringify({
   uploadKey: `$(fileName==='Revit_Template_Metric.rvt'? "Revit_Template_Metric.rvt":${input_params_zipfile})`
 });
 const requestOptions = {
   method: 'GET',
   headers: myHeaders,
   redirect: 'follow',
 };

const clientid=process.env.FORGE_CLIENT_ID || ""
const bucketId: string = `${clientid.toLowerCase()}-designautomation`;
  
   console.log(bucketId)

 const response = await fetch(

    `https://developer.api.autodesk.com/oss/v2/buckets/${bucketId}/objects/${fileName}/signeds3upload?minutesExpiration=30`,

   // @ts-expect-error
   requestOptions,
 );
 const result: any = await response.json();

 return result;

};

/**
 * Uploads a local file to Autodesk Forge (APS) using a provided signed URL.
 *
 * This function streams the specified local file to Forge Object Storage Service (OSS)
 * via the signed URL, which temporarily grants secure upload access without
 * requiring a direct access token.
 *
 * @param {string} signedUrl - The pre-generated signed URL used for uploading the file.
 * @param {string} filePath - The local file system path of the file to be uploaded.
 * @returns {Promise<void>} A Promise that resolves when the file upload completes successfully.
 */

export async function uploadFileToSignedUrl(signedUrl: string, filePath: string): Promise<void> {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const fileStream = fs.createReadStream(filePath);
  const contentLength = fs.statSync(filePath).size;

  const response = await axios.put(signedUrl, fileStream, {
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Length': contentLength,
    },
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
  });

  if (response.status !== 200) {
    throw new Error(`Failed to upload file to signed URL. Status: ${response.status}`);
  }

 
}

/**
 * Finalizes a file upload to Autodesk Forge (APS) Object Storage Service (OSS).
 *
 * After a file is uploaded using a signed URL, this function notifies Forge
 * that the upload is complete. This step is required to make the file available
 * for downstream processes such as Design Automation work items.
 *
 * @param {string} uploadKey - The unique identifier for the upload session.
 * @param {string} fileName - The name of the file being finalized in the Forge bucket.
 * @param {string} forgeAccessToken - A valid Forge access token with bucket write permissions.
 * @returns {Promise<any>} A Promise that resolves with the Forge API response confirming completion.
 */

const clientid=process.env.FORGE_CLIENT_ID || ""
const bucketId: string = `${clientid.toLowerCase()}-designautomation`;
  
   console.log(bucketId)

export async function completeForgeUpload(
  uploadKey: string,
  fileName: string,
  forgeAccessToken: string
): Promise<any> {
  const completeUploadUrl = `https://developer.api.autodesk.com/oss/v2/buckets/${bucketId}/objects/${fileName}/signeds3upload`;

  const headers = {
    'Authorization': `Bearer ${forgeAccessToken}`,
    'Content-Type': 'application/json',
  };

  const body = JSON.stringify({ uploadKey });

  const response = await fetch(completeUploadUrl, {
    method: 'POST',
    headers,
    body,
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Failed to complete upload: ${response.status} ${response.statusText} - ${errText}`);
  }

  return await response.json();
}

/**
 * Submits a Revit work item to Autodesk Forge (APS) Design Automation.
 *
 * This function configures the work item request by attaching the required input files,
 * output definitions, and the callback URL where Forge will send the results once
 * the automation job is complete.
 *
 * @param {string} callbackURL - The publicly accessible endpoint where Forge will
 *                               send the work item results and status updates.
 * @returns {Promise<any>} A Promise that resolves with the Forge API response
 *                         containing the submitted work item details.
 */

export async function submitRevitWorkItem(callbackURL: string): Promise<any> {
  const accessToken = await generateForgeAccessToken().then(t => t.access_token);
 
 
  const revitInputUrl = path.basename(`./Revit_Template_Metric.rvt`);
  const zipInputUrl = path.basename(`${INPUT_PARAMS_ZIP_URL_dynamic}`);
   
    
 
  const DA_BASE_URL = "https://developer.api.autodesk.com/da/us-east/v3";
  const activityId = `${process.env.FORGE_CLIENT_ID}.RevitAutomationActivity+dev` || "";      //Forge Workitem Activity id
  const clientid=process.env.FORGE_CLIENT_ID || ""
  const bucketId: string = `${clientid.toLowerCase()}-designautomation`;
  
   console.log(bucketId)
   const timestamp = new Date().toISOString().replace(/[:.]/g, '-'); // Format: 2025-09-18T12-34-56-789Z
  const outputFileName = `outputFile_${timestamp}.zip`;

  //  Step 2: Build arguments
  const argumentsPayload: any = {
      inputFile: {
      verb:"get",
      url: `urn:adsk.objects:os.object:${bucketId}/${revitInputUrl}`, //File location object id
      headers: { Authorization: `Bearer ${accessToken}` }
    },
    inputJSON: {
      verb:"get",
      url: `urn:adsk.objects:os.object:${bucketId}/${zipInputUrl}`,     //File location object id
      headers: { Authorization: `Bearer ${accessToken}` }
    },
    outputFile: {   
      verb: "put",
      url: `urn:adsk.objects:os.object:${bucketId}/${outputFileName}`,       //File location object id
      headers: { Authorization: `Bearer ${accessToken}` }
    },

    onComplete: {
      verb: "post",
      url: `${mycallbackurl}/forge/callback/designautomation?id=null&outputFileName=${outputFileName}&callbackURL=${callbackURL}`
    }
  };

 
  
  // Step 4: Submit WorkItem
  const workItemPayload = { activityId, arguments: argumentsPayload };
 
  const response = await axios.post(`${DA_BASE_URL}/workitems`, workItemPayload, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    }
  });
 
  return response.data
 
 
}



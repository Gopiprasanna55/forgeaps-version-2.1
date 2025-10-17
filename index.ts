import dotenv from 'dotenv';
dotenv.config();
// Example Express app setup
import express from 'express';
import ForgeManagerRoutes from './ForgeManagerRoutes';


const app = express();
app.use(express.json());
app.use('/forge', ForgeManagerRoutes);
app.get("/api/hello", (req, res) => {
  res.json({ message: "Hello, world!" });
});
app.listen(process.env.FORGE_HOSIT || 3000, () => {
  // const url=startNgrok(3000);
  console.log('Server running on port',process.env.FORGE_HOSIT);
});

// import ngrok from 'ngrok';
// import { mycallbackurlmehtod } from './ForgeManager';

// export async function startNgrok(port: 3000): Promise<string> {
//   const url = await ngrok.connect({
//     addr: port,
//     authtoken: process.env.NGROK_AUTHTOKEN, // or hardcode for testing
//   });

//   console.log(`Ngrok tunnel running at: ${url}`);
//   mycallbackurlmehtod(url)
//   return url;
// }

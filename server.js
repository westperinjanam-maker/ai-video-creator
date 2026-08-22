import 'dotenv/config';
import express from 'express';
import multer from 'multer';
import OpenAI from 'openai';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const upload = multer({dest:path.join(os.tmpdir(),'aivideo')});
const client = new OpenAI({apiKey:process.env.OPENAI_API_KEY});
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/enhance', async (req,res)=>{
 try {
  const {prompt,style='Cinematic'}=req.body;
  const r=await client.responses.create({model:'gpt-5.6',input:`Improve this AI video prompt for a ${style} video. Add camera movement, lighting, composition, environment and realistic motion. Keep the original idea. Return only the final prompt.\n\n${prompt}`});
  res.json({prompt:r.output_text});
 } catch(e){res.status(500).json({error:e.message});}
});

app.post('/api/generate', upload.single('image'), async (req,res)=>{
 let tmp=req.file?.path;
 try {
  const {prompt,model='sora-2',seconds='4',size='720x1280'}=req.body;
  const params={model,prompt,seconds,size};
  if(req.file){
   const f=await client.files.create({file:fs.createReadStream(req.file.path),purpose:'vision'});
   params.input_reference={file_id:f.id};
  }
  const v=await client.videos.create(params);
  res.json(v);
 } catch(e){res.status(500).json({error:e.message});}
 finally {if(tmp)fs.unlink(tmp,()=>{});}
});
app.get('/api/generate/:id',async(req,res)=>{try{res.json(await client.videos.retrieve(req.params.id));}catch(e){res.status(500).json({error:e.message});}});
app.get('/api/generate/:id/download',async(req,res)=>{try{const r=await client.videos.downloadContent(req.params.id);res.setHeader('Content-Type','video/mp4');res.send(Buffer.from(await r.arrayBuffer()));}catch(e){res.status(500).json({error:e.message});}});

// Local testing-ന് മാത്രം (Vercel-ൽ ഇത് പ്രവർത്തിക്കില്ല, അതിന് export വേണം)
if (!process.env.VERCEL) {
  app.listen(process.env.PORT||3000,()=>console.log('AI Video Creator running on http://localhost:'+ (process.env.PORT||3000)));
}

export default app;

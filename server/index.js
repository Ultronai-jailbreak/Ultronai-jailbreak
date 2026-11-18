import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Database from 'better-sqlite3';

const app = express();
const db = new Database(process.env.DB_PATH || 'ultron.sqlite');
const secret = process.env.JWT_SECRET;
if (!secret) console.warn('WARNING: JWT_SECRET is not configured.');
db.exec(`CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY, username TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'user');`);
db.exec(`CREATE TABLE IF NOT EXISTS messages(id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL, role TEXT NOT NULL, content TEXT NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP);`);
app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : true }));
app.use(express.json({limit:'1mb'}));
app.use('/api', rateLimit({windowMs:15*60*1000, limit:100}));
const ownerName = process.env.OWNER_USERNAME;
const ownerPass = process.env.OWNER_PASSWORD;
if (ownerName && ownerPass && !db.prepare('SELECT id FROM users WHERE username=?').get(ownerName)) {
  db.prepare('INSERT INTO users(username,password_hash,role) VALUES(?,?,?)').run(ownerName,bcrypt.hashSync(ownerPass,12),'owner');
}
function auth(req,res,next){
  try { const token=(req.headers.authorization||'').replace(/^Bearer\s+/,''); req.user=jwt.verify(token,secret); next(); }
  catch { res.status(401).json({error:'Please log in again'}); }
}
app.get('/health',(_,res)=>res.json({ok:true,service:'ULTRON V5 API'}));
app.post('/api/auth/register',(req,res)=>{
  const {username,password}=req.body||{};
  if(typeof username!=='string'||username.length<3||username.length>32||!/^[a-zA-Z0-9_-]+$/.test(username)) return res.status(400).json({error:'Username must be 3-32 letters, numbers, _ or -'});
  if(typeof password!=='string'||password.length<8||password.length>128) return res.status(400).json({error:'Password must be at least 8 characters'});
  try { const info=db.prepare('INSERT INTO users(username,password_hash,role) VALUES(?,?,?)').run(username,bcrypt.hashSync(password,12),'user'); const user={id:Number(info.lastInsertRowid),username,role:'user'}; res.json({token:jwt.sign(user,secret,{expiresIn:'7d'}),user}); }
  catch { res.status(409).json({error:'That username is already taken'}); }
});
app.post('/api/auth/login',(req,res)=>{
  const {username,password}=req.body||{}; const row=db.prepare('SELECT * FROM users WHERE username=?').get(username||'');
  if(!row||!bcrypt.compareSync(password||'',row.password_hash)) return res.status(401).json({error:'Incorrect username or password'});
  const user={id:row.id,username:row.username,role:row.role}; res.json({token:jwt.sign(user,secret,{expiresIn:'7d'}),user});
});
app.get('/api/users',auth,(req,res)=>{
  if(req.user.role!=='owner') return res.status(403).json({error:'Owner access required'});
  res.json(db.prepare('SELECT id,username,role FROM users ORDER BY id').all());
});
async function askProvider(message){
  const provider=(process.env.AI_PROVIDER||'openai').toLowerCase();
  if(provider==='openai'){
    if(!process.env.OPENAI_API_KEY) throw new Error('OpenAI API key is not configured on the server');
    const r=await fetch('https://api.openai.com/v1/chat/completions',{method:'POST',headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({model:'gpt-4o-mini',messages:[{role:'user',content:message}]})});
    const d=await r.json(); if(!r.ok) throw new Error(d.error?.message||'OpenAI request failed'); return d.choices?.[0]?.message?.content||'No response';
  }
  if(provider==='anthropic'){
    if(!process.env.ANTHROPIC_API_KEY) throw new Error('Anthropic API key is not configured on the server');
    const r=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'x-api-key':process.env.ANTHROPIC_API_KEY,'anthropic-version':'2023-06-01','content-type':'application/json'},body:JSON.stringify({model:'claude-3-5-haiku-latest',max_tokens:1024,messages:[{role:'user',content:message}]})});
    const d=await r.json(); if(!r.ok) throw new Error(d.error?.message||'Anthropic request failed'); return d.content?.[0]?.text||'No response';
  }
  if(provider==='gemini'){
    if(!process.env.GEMINI_API_KEY) throw new Error('Gemini API key is not configured on the server');
    const r=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({contents:[{parts:[{text:message}]}]})});
    const d=await r.json(); if(!r.ok) throw new Error(d.error?.message||'Gemini request failed'); return d.candidates?.[0]?.content?.parts?.[0]?.text||'No response';
  }
  throw new Error('Unsupported AI_PROVIDER. Choose openai, anthropic or gemini.');
}
app.post('/api/chat',auth,async(req,res)=>{
  const message=req.body?.message;
  if(typeof message!=='string'||!message.trim()||message.length>12000) return res.status(400).json({error:'Message must be 1-12000 characters'});
  try {
    db.prepare('INSERT INTO messages(user_id,role,content) VALUES(?,?,?)').run(req.user.id,'user',message);
    const reply=await askProvider(message);
    db.prepare('INSERT INTO messages(user_id,role,content) VALUES(?,?,?)').run(req.user.id,'assistant',reply);
    res.json({reply});
  } catch(e){res.status(502).json({error:e.message||'AI provider error'});}
});
app.listen(process.env.PORT||8787,()=>console.log(`ULTRON API listening on ${process.env.PORT||8787}`));

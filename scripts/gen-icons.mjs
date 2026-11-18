import { mkdirSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '..', 'public', 'icons');
mkdirSync(outDir, { recursive: true });

function crc32(buf) {
  let c = 0xffffffff;
  const table = crc32.table || (crc32.table = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c >>> 0;
    }
    return t;
  })());
  for (let i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const t = Buffer.from(type);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crc]);
}

function makePng(width, height, draw) {
  const rgba = Buffer.alloc(width * height * 4, 0);
  draw(rgba, width, height);
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0;
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([137,80,78,71,13,10,26,10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function setPx(buf, w, x, y, r,g,b,a=255) {
  if (x<0||y<0||x>=w||y>=buf.length/(w*4)) return;
  const i = (y*w + x)*4;
  buf[i]=r; buf[i+1]=g; buf[i+2]=b; buf[i+3]=a;
}

function fillRect(buf,w,x0,y0,x1,y1,r,g,b,a=255){
  for(let y=Math.max(0,y0|0); y<Math.min((buf.length/(w*4))|0,y1|0); y++)
    for(let x=Math.max(0,x0|0); x<Math.min(w,x1|0); x++) setPx(buf,w,x,y,r,g,b,a);
}

function fillRoundRect(buf,w,h,x0,y0,rw,rh,rad,r,g,b,a=255){
  for(let y=y0;y<y0+rh;y++) for(let x=x0;x<x0+rw;x++){
    const dx = x < x0+rad ? x0+rad-x : x >= x0+rw-rad ? x-(x0+rw-rad-1) : 0;
    const dy = y < y0+rad ? y0+rad-y : y >= y0+rh-rad ? y-(y0+rh-rad-1) : 0;
    if (dx*dx + dy*dy <= rad*rad) setPx(buf,w,x,y,r,g,b,a);
  }
}

function drawK(buf,w,ox,oy,s,color){
  const [r,g,b]=color; const t=Math.max(2,Math.round(s*0.18));
  // vertical stroke
  fillRect(buf,w,ox,oy,ox+t,oy+s,r,g,b);
  // upper diagonal
  for(let y=0;y<s*0.55;y++){
    const x = ox + t + (s*0.55 - y) * (s*0.7/(s*0.55));
    fillRect(buf,w,Math.round(x)-Math.round(t/2), oy+Math.round(y), Math.round(x)+Math.round(t/2)+1, oy+Math.round(y)+1, r,g,b);
  }
  // lower diagonal
  for(let y=0;y<s*0.55;y++){
    const x = ox + t + y * (s*0.7/(s*0.55));
    const yy = oy + s*0.45 + y;
    fillRect(buf,w,Math.round(x)-Math.round(t/2), Math.round(yy), Math.round(x)+Math.round(t/2)+1, Math.round(yy)+1, r,g,b);
  }
}

function drawJ(buf,w,ox,oy,s,color){
  const [r,g,b]=color; const t=Math.max(2,Math.round(s*0.18));
  // vertical
  fillRect(buf,w,ox+s-t,oy,ox+s,oy+Math.round(s*0.75),r,g,b);
  // bottom hook
  fillRect(buf,w,ox,oy+Math.round(s*0.75)-t,ox+s,oy+Math.round(s*0.75),r,g,b);
  fillRect(buf,w,ox,oy+Math.round(s*0.45),ox+t,oy+Math.round(s*0.75),r,g,b);
}

function drawBrandIcon(size, { maskable=false } = {}) {
  return makePng(size,size,(buf,w,h)=>{
    const bg=[15,23,42]; // #0f172a
    fillRect(buf,w,0,0,w,h,bg[0],bg[1],bg[2]);
    const pad = maskable ? Math.round(size*0.18) : Math.round(size*0.1);
    const inner = size - pad*2;
    const rad = Math.round(inner*0.22);
    // accent rounded rect
    fillRoundRect(buf,w,h,pad,pad,inner,inner,rad,249,115,22);
    // draw KJ in white
    const glyphH = Math.round(inner*0.42);
    const glyphW = Math.round(glyphH*0.9);
    const gap = Math.round(glyphH*0.18);
    const totalW = glyphW*2 + gap;
    const sx = Math.round((size-totalW)/2);
    const sy = Math.round((size-glyphH)/2);
    drawK(buf,w,sx,sy,glyphH,[255,255,255]);
    drawJ(buf,w,sx+glyphW+gap,sy,glyphH,[255,255,255]);
  });
}

writeFileSync(join(outDir,'icon-192x192.png'), drawBrandIcon(192));
writeFileSync(join(outDir,'icon-512x512.png'), drawBrandIcon(512));
writeFileSync(join(outDir,'icon-maskable-512x512.png'), drawBrandIcon(512,{maskable:true}));
writeFileSync(join(outDir,'apple-touch-icon.png'), drawBrandIcon(180));
console.log('icons generated');

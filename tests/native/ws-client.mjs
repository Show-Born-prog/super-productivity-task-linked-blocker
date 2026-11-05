import http from 'node:http';
import {randomBytes} from 'node:crypto';

// Minimal test client: production browser communication uses the browser WebSocket API.
export async function connect(port, extensionId) {
 const socket=await new Promise((resolve,reject)=>{
  const req=http.get({hostname:'127.0.0.1',port,path:'/state',headers:{Connection:'Upgrade',Upgrade:'websocket',
   'Sec-WebSocket-Version':'13','Sec-WebSocket-Key':randomBytes(16).toString('base64'),Origin:`chrome-extension://${extensionId}`}});
  req.on('upgrade',(_res,socket,head)=>{socket.pause();socket.initial=head;resolve(socket);});
  req.on('response',res=>reject(Error(`HTTP ${res.statusCode}`)));req.on('error',reject);
 });
 let buffer=socket.initial;const messages=[];const waiters=[];
 function dispatch(message){messages.push(message);for(const w of [...waiters])if(w.match(message)){waiters.splice(waiters.indexOf(w),1);clearTimeout(w.timer);w.resolve(message);}}
 function parse(){
  while(buffer.length>=2){const opcode=buffer[0]&15;let length=buffer[1]&127;let offset=2;
   if(length===126){if(buffer.length<4)return;length=buffer.readUInt16BE(2);offset=4;}
   else if(length===127){if(buffer.length<10)return;length=Number(buffer.readBigUInt64BE(2));offset=10;}
   if(length>262144)throw Error(`oversize frame (${buffer.subarray(0,16).toString('hex')})`);if(buffer.length<offset+length)return;
   const body=buffer.subarray(offset,offset+length);buffer=buffer.subarray(offset+length);
   if(opcode===1)dispatch(JSON.parse(body.toString()));
  }
 }
 socket.on('data',data=>{buffer=Buffer.concat([buffer,data]);parse();});socket.on('error',()=>{});socket.resume();parse();
 return {
  wait(match,timeout=5000){const found=messages.findLast(match);if(found)return Promise.resolve(found);return new Promise((resolve,reject)=>{
   const w={match,resolve,timer:setTimeout(()=>{waiters.splice(waiters.indexOf(w),1);reject(Error('WebSocket timeout'));},timeout)};waiters.push(w);
  });},
  send(value){const payload=Buffer.from(JSON.stringify(value));const mask=randomBytes(4);const offset=payload.length<126?2:4;const head=Buffer.alloc(offset+4);
   head[0]=0x81;head[1]=0x80|(offset===2?payload.length:126);if(offset===4)head.writeUInt16BE(payload.length,2);mask.copy(head,offset);
   const body=Buffer.from(payload);for(let i=0;i<body.length;i++)body[i]^=mask[i%4];socket.write(Buffer.concat([head,body]));
  },
  close(){for(const w of waiters){clearTimeout(w.timer);w.resolve(null);}socket.destroy();}
 };
}

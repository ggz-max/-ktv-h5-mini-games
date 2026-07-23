import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import test, { after, before } from "node:test";
import { WebSocket } from "ws";

const port=4642;const base=`http://127.0.0.1:${port}`;let server:ChildProcess;
interface Session{code:string;playerId:string;sessionToken:string}
async function wait(){for(let i=0;i<80;i++){try{if((await fetch(`${base}/api/health`)).ok)return}catch{/* starting */}await new Promise(r=>setTimeout(r,50))}throw new Error("server failed")}
async function post(path:string,data:any){const r=await fetch(base+path,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(data)});const j=await r.json();if(!r.ok)throw new Error(j.error);return j as Session}
async function connect(s:Session){const states:any[]=[];const ws=new WebSocket(`ws://127.0.0.1:${port}/ws?room=${s.code}&player=${s.playerId}&token=${s.sessionToken}`);ws.on("message",raw=>{const m=JSON.parse(raw.toString());if(m.type==="state")states.push(m)});await new Promise<void>((resolve,reject)=>{ws.once("open",()=>resolve());ws.once("error",reject)});return{ws,states}}
async function until(fn:()=>boolean,message:string){const start=Date.now();while(Date.now()-start<5000){if(fn())return;await new Promise(r=>setTimeout(r,20))}throw new Error(message)}
function action(ws:WebSocket,actionName:string,data:any={}){ws.send(JSON.stringify({action:actionName,requestId:crypto.randomUUID(),...data}))}

before(async()=>{server=spawn(process.execPath,["--import","tsx","server/index.ts"],{cwd:process.cwd(),env:{...process.env,PORT:String(port),TURN_MS:"5000",DATA_DIR:"output/verification/test-data"},stdio:"ignore"});await wait()});
after(()=>server?.kill());

test("four websocket clients receive private 27-card hands and can submit a legal opening",async()=>{
  const owner=await post("/api/rooms",{name:"房主"});const sessions=[owner];
  for(let i=1;i<4;i++)sessions.push(await post(`/api/rooms/${owner.code}/join`,{name:`玩家${i+1}`}));
  const clients=await Promise.all(sessions.map(connect));await until(()=>clients.every(c=>c.states.at(-1)?.room.players.length===4),"roster not synchronized");
  action(clients[0].ws,"start_game");await until(()=>clients.every(c=>c.states.at(-1)?.room.status==="playing"),"game not started");
  for(const client of clients){const state=client.states.at(-1);assert.equal(state.game.hand.length,27);assert.equal(state.room.players.some((p:any)=>"hand" in p),false)}
  const first=clients[0].states.at(-1);assert.ok(first.game.legalHint.length>0);action(clients[0].ws,"play",{cardIds:first.game.legalHint});
  await until(()=>clients.every(c=>c.states.at(-1)?.game.currentSeat===1),"opening play not synchronized");
  assert.equal(clients[0].states.at(-1).game.trickActions.length,1);assert.equal(clients[0].states.at(-1).game.trickActions[0].playerId,owner.playerId);
  assert.equal(clients[0].states.at(-1).game.audioAction.serial,1);assert.equal(clients[0].states.at(-1).game.audioAction.playerId,owner.playerId);assert.equal(clients[0].states.at(-1).game.audioAction.passed,false);
  action(clients[1].ws,"pass");await until(()=>clients.every(c=>c.states.at(-1)?.game.currentSeat===2),"pass not synchronized");
  const actions=clients[0].states.at(-1).game.trickActions;assert.equal(actions.length,2);assert.equal(actions.find((item:any)=>item.playerId===sessions[1].playerId).passed,true);assert.equal(clients[0].states.at(-1).game.audioAction.serial,2);assert.equal(clients[0].states.at(-1).game.audioAction.playerId,sessions[1].playerId);assert.equal(clients[0].states.at(-1).game.audioAction.passed,true);
  clients.forEach(c=>c.ws.close());
});

test("bots take turns and expose visible tactical interaction",async()=>{
  const owner=await post("/api/rooms",{name:"单人练习"});const client=await connect(owner);await until(()=>client.states.length>0,"owner not connected");
  action(client.ws,"start_game");await until(()=>client.states.at(-1)?.room.status==="playing","practice not started");
  const first=client.states.at(-1);action(client.ws,"play",{cardIds:first.game.legalHint});
  await until(()=>Boolean(client.states.at(-1)?.game.interaction),"bot interaction not shown");
  const latest=client.states.at(-1);const speaker=latest.room.players.find((p:any)=>p.id===latest.game.interaction.playerId);
  assert.equal(speaker.bot,true);assert.ok(latest.game.interaction.text.length>=4);client.ws.close();
});

test("HTTP polling clients can start and play when websocket upgrade is unavailable",async()=>{
  const owner=await post("/api/rooms",{name:"轮询房主"});
  const stateResponse=await fetch(`${base}/api/rooms/${owner.code}/state?player=${owner.playerId}&token=${owner.sessionToken}`);assert.equal(stateResponse.ok,true);
  const actionResponse=await fetch(`${base}/api/rooms/${owner.code}/action`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"start_game",requestId:crypto.randomUUID(),playerId:owner.playerId,sessionToken:owner.sessionToken})});
  const playing=await actionResponse.json();assert.equal(actionResponse.ok,true);assert.equal(playing.room.status,"playing");assert.equal(playing.game.hand.length,27);
  const playResponse=await fetch(`${base}/api/rooms/${owner.code}/action`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"play",requestId:crypto.randomUUID(),playerId:owner.playerId,sessionToken:owner.sessionToken,cardIds:playing.game.legalHint})});
  assert.equal(playResponse.ok,true);assert.equal((await playResponse.json()).game.currentSeat,1);
});

import { HocuspocusProvider } from "@hocuspocus/provider";
import * as Y from "yjs";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const mk = (token, doc) => new HocuspocusProvider({ url: "ws://localhost:3001/collab", name: process.env.PAGE, token, document: doc });
// 1) Alice (EDIT) writes content while unrestricted, let it persist
const dA = new Y.Doc(); const pA = mk(process.env.ATOK, dA);
await new Promise((res) => { let n=0; const c=()=> pA.isSynced || n++>60 ? res() : setTimeout(c,100); c(); });
dA.getMap("t").set("konten", "isi penting");
await wait(2500); // biarkan onStoreDocument menyimpan
pA.destroy();
console.log("STEP1: konten dibuat & disimpan oleh EDITOR");

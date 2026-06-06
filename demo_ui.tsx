import React from 'react';
import { render } from 'ink-testing-library';
import { Header } from './src/ui/Header.js';
import { CrewStatusLine } from './src/ui/CrewStatusLine.js';
import { AgentPanes } from './src/ui/AgentPanes.js';
import { ConversationTimeline } from './src/ui/ConversationTimeline.js';
import { Input } from './src/ui/Input.js';
import { Footer } from './src/ui/Footer.js';

const acts:any = [
  { id:'atlas', status:'done', progress:1, action:'planned 2 tasks' },
  { id:'iris', status:'working', progress:0.6, action:'editing LoginForm.tsx' },
  { id:'forge', status:'thinking', progress:0.3, action:'designing /api/login' },
];
const panes = acts.filter((a:any)=>a.status==='working'||a.status==='thinking');
const transcript:any = [
  { kind:'user', text:'build me a login page with an API' },
  { kind:'agentText', agent:'atlas', text:'On it — delegating UI to Iris and the endpoint to Forge.' },
  { kind:'tool', agent:'iris', tool:'write', detail:'src/LoginForm.tsx', ok:true },
  { kind:'tool', agent:'forge', tool:'bash', detail:'npm test — 12 passing', ok:true },
];
function frame(label:string, el:any){ const {lastFrame}=render(el); console.log('\n'+label+'\n'+lastFrame()); }
frame('══ HEADER ══', <Header notice='Ready — running on your Claude Code (Max) login. Describe what to build, or /help.' status='MAX' />);
frame('══ CREW STATUS LINE ══', <CrewStatusLine activities={acts} />);
frame('══ CONVERSATION TIMELINE ══', <ConversationTimeline items={transcript} />);
frame('══ PARALLEL AGENT PANES ══', <AgentPanes activities={panes} />);
frame('══ INPUT (idle) ══', <Input disabled={false} onSubmit={()=>{}} />);
frame('══ INPUT (busy) ══', <Input disabled={true} onSubmit={()=>{}} />);
frame('══ FOOTER ══', <Footer online={true} />);

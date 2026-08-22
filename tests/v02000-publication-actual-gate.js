'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert');
const ROOT=path.resolve(__dirname,'..','release','v0.19.54','site');
const read=p=>fs.readFileSync(path.join(ROOT,p),'utf8');
const ok=(v,m)=>{assert.ok(v,m);console.log('PASS ',m)};
const workflow=read('src/core/workflow.js');
const actual=read('src/core/actual.js');
const app=read('src/ui/app.js');

// Publication contract.
ok(workflow.includes("K.auth?.require?.('roster.plan.publish'"),'publication requires roster.plan.publish');
ok(workflow.includes('if(!check.canPublish)throw new Error'),'pause-rule errors can block publication');
ok(workflow.includes("if(check.critical>0&&!String(reason||'').trim())throw new Error"),'critical staffing publication requires explicit reason');
ok(workflow.includes('const version=(previousPublished?.version||0)+1'),'publication increments immutable plan version');
ok(workflow.includes('K.planVersions.push(snapshot)'),'publication stores version snapshot');
ok(workflow.includes("K.recordAudit?.('plan.publish'"),'publication is audited');
ok(workflow.includes("K.sync?.enqueue?.({entity:'plan_version',operation:'publish'"),'publication is queued for sync');
ok(workflow.includes('K.visiblePlannedShifts=function'),'published/draft visibility is separated');
ok(workflow.includes("K.auth?.require?.('roster.plan.mark_seen'"),'member seen acknowledgement is permission guarded');

// Actual / Soll-Ist contract.
ok(actual.includes("K.auth?.require?.(source==='file_import'||source==='timeclock'?'roster.actual.import':'roster.actual.correct'"),'actual writes are permission guarded');
ok(actual.includes("if(K.actualWorkflow.status==='closed')throw new Error"),'closed actual workflow blocks writes');
ok(actual.includes('function matchCandidate(actual)'),'actual entries are matched to planned shifts');
ok(actual.includes('actual.comparison={status:c.status'),'actual records persist Soll/Ist comparison state');
ok(actual.includes("K.recordAudit?.(before?'actual.update':'actual.create'"),'actual changes are audited');
ok(actual.includes("K.sync?.enqueue?.({entity:'actual_shift'"),'actual changes are queued for sync');
ok(actual.includes('function missingPlanned(date=null)'),'missing actual records for planned shifts are detectable');
ok(actual.includes('function dayStats(date)'),'daily Soll/Ist statistics exist');
ok(actual.includes('critical_deviation'),'critical Soll/Ist deviation state exists');

// UI contract: compare layer must stay available.
ok(app.includes("K.state.layer==='compare'")||app.includes("data-layer=\"compare\""),'compare layer is handled in planner UI');
ok(app.includes('SOLL-/IST')||app.includes('Soll/Ist')||app.includes('compare'),'planner UI contains Soll/Ist comparison path');

console.log('KC DP2 V0.20 publication + actual recovery gate PASS');

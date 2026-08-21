(function(){
'use strict';
const K=window.KCDP=window.KCDP||{};
// V0.19.54-style behavior: no global capture interception, no diagnostic overlay
// injected before the application, and no duplicate error/unhandledrejection hooks.
// The normal diagnostics center owns its own button and error handling.
K.diagnosticsFreezeGuard={version:'0.19.55-disabled-v01954-path',disabled:true};
})();

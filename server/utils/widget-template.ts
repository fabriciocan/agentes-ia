export interface WidgetTemplateConfig {
  agentId: string
  agentName: string
  webhookUrl: string
  primaryColor: string
  botName: string
  welcomeMessage: string
  inputPlaceholder: string
  headerOnlineText: string
  consentEnabled: boolean
  consentTitle: string
  consentDescription: string
  consentText: string
  consentCheckboxLabel: string
  consentButtonText: string
}

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `${r}, ${g}, ${b}`
}

function escapeJs(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '')
}

export function generateWidgetScript(config: WidgetTemplateConfig): string {
  const pc = config.primaryColor
  const pcRgb = hexToRgb(pc)

  const consentHtml = config.consentEnabled ? `
            <div class="cw-consent-screen" id="cwConsentScreen">
                <div class="cw-consent-header">
                    <h3>${escapeJs(config.consentTitle)}</h3>
                    <p>${escapeJs(config.consentDescription)}</p>
                </div>
                <div class="cw-consent-content">
                    <div class="cw-consent-text">${config.consentText}</div>
                </div>
                <div class="cw-consent-footer">
                    <div class="cw-consent-checkbox-wrapper">
                        <input type="checkbox" id="cwConsentCheckbox" class="cw-consent-checkbox-input">
                        <label for="cwConsentCheckbox" class="cw-consent-checkbox-label">${escapeJs(config.consentCheckboxLabel)}</label>
                    </div>
                    <button class="cw-consent-accept-btn" id="cwConsentAcceptBtn" disabled>${escapeJs(config.consentButtonText)}</button>
                </div>
            </div>` : ''

  return `(function(){
"use strict";
if(document.getElementById("cw-widget-wrapper"))return;

var CONFIG={
  webhookUrl:"${escapeJs(config.webhookUrl)}",
  agentId:"${escapeJs(config.agentId)}",
  agentName:"${escapeJs(config.agentName)}",
  botName:"${escapeJs(config.botName)}",
  welcomeMessage:"${escapeJs(config.welcomeMessage)}",
  inputPlaceholder:"${escapeJs(config.inputPlaceholder)}",
  headerOnlineText:"${escapeJs(config.headerOnlineText)}",
  consentEnabled:${config.consentEnabled},
  sessionId:"session_"+Date.now()+"_"+Math.random().toString(36).substr(2,9)
};

var wrapper=document.createElement("div");
wrapper.id="cw-widget-wrapper";
wrapper.innerHTML='<style>'+
'#cw-widget-wrapper *{margin:0;padding:0;box-sizing:border-box;-webkit-tap-highlight-color:transparent}'+
'#cw-widget-wrapper .cw-btn{position:fixed!important;bottom:20px!important;right:20px!important;top:auto!important;left:auto!important;width:56px;height:56px;border-radius:16px;background:${pc};border:none;cursor:pointer;box-shadow:0 4px 16px rgba(${pcRgb},0.12);display:flex;align-items:center;justify-content:center;transition:all .2s ease;z-index:2147483647!important;touch-action:manipulation;transform:translate(0,0)!important;margin:0!important;padding:0;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,Arial,sans-serif}'+
'@media(max-width:480px){#cw-widget-wrapper .cw-btn.active{display:none!important}}'+
'#cw-widget-wrapper .cw-btn:hover{transform:translateY(-2px)!important;box-shadow:0 8px 24px rgba(${pcRgb},0.16)}'+
'#cw-widget-wrapper .cw-btn:active{transform:translateY(0)!important}'+
'#cw-widget-wrapper .cw-btn svg{width:24px;height:24px;stroke:#fff;fill:none;stroke-width:2}'+
'#cw-widget-wrapper .cw-btn .cw-icon-chat{display:block}'+
'#cw-widget-wrapper .cw-btn .cw-icon-close{display:none}'+
'#cw-widget-wrapper .cw-btn.active .cw-icon-chat{display:none}'+
'#cw-widget-wrapper .cw-btn.active .cw-icon-close{display:block}'+
'#cw-widget-wrapper .cw-container{position:fixed!important;bottom:88px!important;right:20px!important;top:auto!important;left:auto!important;width:400px;max-width:calc(100vw - 40px);height:600px;max-height:calc(100vh - 120px);background:#fff;border-radius:16px;box-shadow:0 0 0 1px rgba(0,0,0,.04),0 8px 32px rgba(0,0,0,.08);display:none;flex-direction:column;overflow:hidden;z-index:2147483646!important;animation:cwSlideUp .3s ease;transform:translate(0,0)!important;margin:0!important;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,Arial,sans-serif}'+
'#cw-widget-wrapper .cw-container.active{display:flex}'+
'@keyframes cwSlideUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}'+
'#cw-widget-wrapper .cw-consent-screen{display:flex;flex-direction:column;height:100%;background:#fff}'+
'#cw-widget-wrapper .cw-consent-screen.hidden{display:none}'+
'#cw-widget-wrapper .cw-consent-header{background:#fff;padding:20px;border-bottom:1px solid #F1F5F9;flex-shrink:0}'+
'#cw-widget-wrapper .cw-consent-header h3{font-size:18px;font-weight:600;color:${pc};margin-bottom:8px}'+
'#cw-widget-wrapper .cw-consent-header p{font-size:14px;color:#64748B;line-height:1.5}'+
'#cw-widget-wrapper .cw-consent-content{flex:1;overflow-y:auto;padding:20px;background:#FAFAFA}'+
'#cw-widget-wrapper .cw-consent-text{background:#fff;padding:20px;border-radius:12px;border:1px solid #E2E8F0;font-size:14px;line-height:1.7;color:#1E293B}'+
'#cw-widget-wrapper .cw-consent-text a{color:${pc};font-weight:600;text-decoration:underline}'+
'#cw-widget-wrapper .cw-consent-text a:hover{text-decoration:none}'+
'#cw-widget-wrapper .cw-consent-footer{padding:20px;background:#fff;border-top:1px solid #F1F5F9;flex-shrink:0}'+
'#cw-widget-wrapper .cw-consent-checkbox-wrapper{display:flex!important;align-items:flex-start!important;gap:12px!important;margin-bottom:16px!important;cursor:pointer!important}'+
'#cw-widget-wrapper .cw-consent-checkbox-input{-webkit-appearance:checkbox!important;-moz-appearance:checkbox!important;appearance:checkbox!important;width:20px!important;height:20px!important;margin:2px 0 0 0!important;padding:0!important;cursor:pointer!important;accent-color:${pc}!important;flex-shrink:0!important;display:block!important;opacity:1!important;visibility:visible!important;position:relative!important;border:2px solid #CBD5E1!important;border-radius:4px!important;background:#fff!important}'+
'#cw-widget-wrapper .cw-consent-checkbox-input:checked{background:${pc}!important;border-color:${pc}!important}'+
'#cw-widget-wrapper .cw-consent-checkbox-label{font-size:13px!important;line-height:1.6!important;color:#475569!important;cursor:pointer!important;user-select:none!important;display:block!important;flex:1!important}'+
'#cw-widget-wrapper .cw-consent-accept-btn{width:100%;padding:14px;background:${pc};color:#fff;border:none;border-radius:10px;font-size:15px;font-weight:600;cursor:pointer;transition:all .2s;font-family:inherit}'+
'#cw-widget-wrapper .cw-consent-accept-btn:disabled{opacity:.4;cursor:not-allowed}'+
'#cw-widget-wrapper .cw-consent-accept-btn:not(:disabled):hover{transform:translateY(-1px);box-shadow:0 4px 12px rgba(${pcRgb},0.16)}'+
'#cw-widget-wrapper .cw-consent-accept-btn:not(:disabled):active{transform:translateY(0)}'+
'#cw-widget-wrapper .cw-header{background:#fff;color:${pc};padding:16px 20px;display:flex;align-items:center;gap:12px;border-bottom:1px solid #F1F5F9;flex-shrink:0}'+
'#cw-widget-wrapper .cw-header-close{display:none;width:32px;height:32px;border-radius:8px;background:transparent;border:none;cursor:pointer;align-items:center;justify-content:center;transition:all .2s;flex-shrink:0;margin-left:auto}'+
'#cw-widget-wrapper .cw-header-close:hover{background:#F1F5F9}'+
'#cw-widget-wrapper .cw-header-close svg{width:20px;height:20px;stroke:#64748B;stroke-width:2}'+
'#cw-widget-wrapper .cw-header-avatar{width:40px;height:40px;border-radius:10px;background:${pc};display:flex;align-items:center;justify-content:center;flex-shrink:0}'+
'#cw-widget-wrapper .cw-header-avatar svg{width:20px;height:20px;stroke:#fff;fill:none;stroke-width:2}'+
'#cw-widget-wrapper .cw-header-info{flex:1;min-width:0}'+
'#cw-widget-wrapper .cw-header-info h3{font-size:15px;font-weight:600;margin-bottom:2px;color:${pc};white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'+
'#cw-widget-wrapper .cw-header-info p{font-size:13px;color:#64748B}'+
'#cw-widget-wrapper .cw-header-status{display:flex;align-items:center;gap:6px}'+
'#cw-widget-wrapper .cw-status-dot{width:8px;height:8px;border-radius:50%;background:#10B981;flex-shrink:0}'+
'#cw-widget-wrapper .cw-content{display:none;flex-direction:column;height:100%}'+
'#cw-widget-wrapper .cw-content.active{display:flex}'+
'#cw-widget-wrapper .cw-messages{flex:1;overflow-y:auto;overflow-x:hidden;padding:20px;background:#FAFAFA;display:flex;flex-direction:column;gap:16px;-webkit-overflow-scrolling:touch}'+
'#cw-widget-wrapper .cw-messages::-webkit-scrollbar{width:6px}'+
'#cw-widget-wrapper .cw-messages::-webkit-scrollbar-track{background:transparent}'+
'#cw-widget-wrapper .cw-messages::-webkit-scrollbar-thumb{background:#CBD5E1;border-radius:3px}'+
'#cw-widget-wrapper .cw-msg{display:flex;gap:10px;animation:cwMsgAppear .3s ease;align-items:flex-start;max-width:100%}'+
'@keyframes cwMsgAppear{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}'+
'#cw-widget-wrapper .cw-msg.user{flex-direction:row-reverse}'+
'#cw-widget-wrapper .cw-msg-avatar{width:32px;height:32px;border-radius:8px;background:#F1F5F9;display:flex;align-items:center;justify-content:center;flex-shrink:0}'+
'#cw-widget-wrapper .cw-msg-avatar svg{width:16px;height:16px;stroke:#64748B;fill:none;stroke-width:2}'+
'#cw-widget-wrapper .cw-msg.user .cw-msg-avatar{background:${pc}}'+
'#cw-widget-wrapper .cw-msg.user .cw-msg-avatar svg{stroke:#fff}'+
'#cw-widget-wrapper .cw-msg-content{display:flex;flex-direction:column;gap:4px;max-width:calc(100% - 42px);min-width:0}'+
'#cw-widget-wrapper .cw-msg-bubble{padding:12px 16px;border-radius:12px;background:#fff;border:1px solid #E2E8F0;word-wrap:break-word;overflow-wrap:break-word;word-break:break-word}'+
'#cw-widget-wrapper .cw-msg.user .cw-msg-bubble{background:${pc};color:#fff;border:none}'+
'#cw-widget-wrapper .cw-msg-text{font-size:14px;line-height:1.5;white-space:pre-wrap;word-wrap:break-word;overflow-wrap:break-word;word-break:break-word;color:#1E293B}'+
'#cw-widget-wrapper .cw-msg.user .cw-msg-text{color:#fff}'+
'#cw-widget-wrapper .cw-msg-time{font-size:11px;color:#94A3B8;padding:0 4px}'+
'#cw-widget-wrapper .cw-msg.user .cw-msg-time{text-align:right}'+
'#cw-widget-wrapper .cw-typing{display:none;align-items:center;gap:6px;padding:12px 16px;background:#fff;border:1px solid #E2E8F0;border-radius:12px;width:fit-content}'+
'#cw-widget-wrapper .cw-typing.active{display:flex}'+
'#cw-widget-wrapper .cw-typing-dot{width:6px;height:6px;border-radius:50%;background:#CBD5E1;animation:cwTyping 1.4s infinite}'+
'#cw-widget-wrapper .cw-typing-dot:nth-child(2){animation-delay:.2s}'+
'#cw-widget-wrapper .cw-typing-dot:nth-child(3){animation-delay:.4s}'+
'@keyframes cwTyping{0%,60%,100%{transform:translateY(0);opacity:.4}30%{transform:translateY(-6px);opacity:1}}'+
'#cw-widget-wrapper .cw-input-area{padding:16px 20px;background:#fff;border-top:1px solid #F1F5F9;display:flex;gap:12px;align-items:flex-end;flex-shrink:0;position:relative;z-index:10}'+
'#cw-widget-wrapper .cw-input-field{flex:1;padding:12px 16px;border:1px solid #E2E8F0;border-radius:10px;font-size:14px;outline:none;transition:all .2s;font-family:inherit;color:#1E293B;background:#FAFAFA;resize:none;min-height:44px;max-height:120px;line-height:1.5}'+
'#cw-widget-wrapper .cw-input-field:focus{border-color:${pc};background:#fff}'+
'#cw-widget-wrapper .cw-input-field::placeholder{color:#94A3B8}'+
'#cw-widget-wrapper .cw-send-btn{width:44px;height:44px;border-radius:10px;background:${pc};border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .2s;flex-shrink:0;touch-action:manipulation}'+
'#cw-widget-wrapper .cw-send-btn:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 4px 12px rgba(${pcRgb},0.16)}'+
'#cw-widget-wrapper .cw-send-btn:active:not(:disabled){transform:translateY(0)}'+
'#cw-widget-wrapper .cw-send-btn:disabled{opacity:.4;cursor:not-allowed}'+
'#cw-widget-wrapper .cw-send-btn svg{width:18px;height:18px;stroke:#fff;fill:none;stroke-width:2}'+
'@media(max-width:768px){#cw-widget-wrapper .cw-container{width:380px;height:550px}#cw-widget-wrapper .cw-messages{padding:16px;gap:14px}}'+
'@media(max-width:640px){#cw-widget-wrapper .cw-btn{bottom:16px!important;right:16px!important;width:52px;height:52px}#cw-widget-wrapper .cw-container{width:calc(100vw - 32px);height:calc(100vh - 100px);right:16px!important;bottom:80px!important;border-radius:12px}#cw-widget-wrapper .cw-header{padding:14px 16px}#cw-widget-wrapper .cw-messages{padding:16px}#cw-widget-wrapper .cw-input-area{padding:14px 16px;gap:10px}#cw-widget-wrapper .cw-consent-header,#cw-widget-wrapper .cw-consent-content,#cw-widget-wrapper .cw-consent-footer{padding:16px}}'+
'@media(max-width:480px){#cw-widget-wrapper .cw-btn{width:50px;height:50px;bottom:12px!important;right:12px!important}#cw-widget-wrapper .cw-btn svg{width:22px;height:22px}#cw-widget-wrapper .cw-container{width:100vw!important;max-width:100vw!important;height:100vh!important;height:100dvh!important;max-height:none!important;right:0!important;bottom:0!important;top:0!important;left:0!important;border-radius:0!important;position:fixed!important;margin:0!important;padding:0!important;box-shadow:none!important}#cw-widget-wrapper .cw-container.keyboard-open{height:100vh!important;max-height:100vh!important;bottom:0!important;top:auto!important}#cw-widget-wrapper .cw-header{padding:16px;border-bottom:1px solid #E2E8F0;width:100%}#cw-widget-wrapper .cw-header-close{display:flex}#cw-widget-wrapper .cw-messages{padding:16px;gap:16px;width:100%}#cw-widget-wrapper .cw-msg-text{font-size:15px}#cw-widget-wrapper .cw-input-area{padding:16px;gap:12px;border-top:1px solid #E2E8F0;width:100%}#cw-widget-wrapper .cw-input-field{padding:12px 16px;font-size:16px;border-radius:12px;min-height:48px}#cw-widget-wrapper .cw-send-btn{width:48px;height:48px;border-radius:12px}#cw-widget-wrapper .cw-send-btn svg{width:20px;height:20px}}'+
'@media(max-height:500px) and (orientation:landscape) and (max-width:768px){#cw-widget-wrapper .cw-container{height:100vh!important}#cw-widget-wrapper .cw-header{padding:12px 16px}#cw-widget-wrapper .cw-messages{padding:12px 16px}#cw-widget-wrapper .cw-input-area{padding:12px 16px}#cw-widget-wrapper .cw-msg-bubble{padding:10px 14px}#cw-widget-wrapper .cw-consent-header,#cw-widget-wrapper .cw-consent-content,#cw-widget-wrapper .cw-consent-footer{padding:12px 16px}}'+
'@supports(-webkit-touch-callout:none){#cw-widget-wrapper .cw-input-field{font-size:16px}@media(max-width:480px){#cw-widget-wrapper .cw-container{height:100vh!important;height:-webkit-fill-available!important}#cw-widget-wrapper .cw-input-area{position:sticky;bottom:0;background:#fff;z-index:100}}}'+
'@supports(padding:max(0px)){@media(max-width:480px){#cw-widget-wrapper .cw-header,#cw-widget-wrapper .cw-consent-header{padding-top:max(env(safe-area-inset-top),16px)}#cw-widget-wrapper .cw-input-area,#cw-widget-wrapper .cw-consent-footer{padding-bottom:max(env(safe-area-inset-bottom),16px)}}}'+
'</style>'+
'<button class="cw-btn" id="cwBtn" aria-label="Open chat">'+
  '<svg class="cw-icon-chat" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>'+
  '<svg class="cw-icon-close" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>'+
'</button>'+
'<div class="cw-container" id="cwContainer">'+
  '${consentHtml}'+
  '<div class="cw-content${config.consentEnabled ? '' : ' active'}" id="cwContent">'+
    '<div class="cw-header">'+
      '<div class="cw-header-avatar"><svg viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg></div>'+
      '<div class="cw-header-info"><h3>${escapeJs(config.botName)}</h3><div class="cw-header-status"><span class="cw-status-dot"></span><p>${escapeJs(config.headerOnlineText)}</p></div></div>'+
      '<button class="cw-header-close" id="cwHeaderClose" aria-label="Close chat"><svg viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>'+
    '</div>'+
    '<div class="cw-messages" id="cwMessages">'+
      '<div class="cw-msg bot"><div class="cw-msg-avatar"><svg viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg></div><div class="cw-msg-content"><div class="cw-msg-bubble"><div class="cw-msg-text">${escapeJs(config.welcomeMessage)}</div></div><div class="cw-msg-time" id="cwInitialTime"></div></div></div>'+
    '</div>'+
    '<div class="cw-input-area">'+
      '<textarea class="cw-input-field" id="cwInputField" placeholder="${escapeJs(config.inputPlaceholder)}" autocomplete="off" rows="1"></textarea>'+
      '<button class="cw-send-btn" id="cwSendBtn" aria-label="Send message"><svg viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg></button>'+
    '</div>'+
  '</div>'+
'</div>';

document.body.appendChild(wrapper);

var btn=document.getElementById("cwBtn");
var container=document.getElementById("cwContainer");
var messages=document.getElementById("cwMessages");
var inputField=document.getElementById("cwInputField");
var sendBtn=document.getElementById("cwSendBtn");
var headerClose=document.getElementById("cwHeaderClose");
var content=document.getElementById("cwContent");
var consentScreen=CONFIG.consentEnabled?document.getElementById("cwConsentScreen"):null;
var consentCheckbox=CONFIG.consentEnabled?document.getElementById("cwConsentCheckbox"):null;
var consentAcceptBtn=CONFIG.consentEnabled?document.getElementById("cwConsentAcceptBtn"):null;

var msgCount=0;
var consentGiven=!CONFIG.consentEnabled;

function getTime(){return new Date().toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit"})}
function scrollBottom(){requestAnimationFrame(function(){messages.scrollTop=messages.scrollHeight})}
function escapeHtml(t){var d=document.createElement("div");d.textContent=t;return d.innerHTML}
function formatMsg(t){var f=escapeHtml(t);f=f.replace(/\\n/g,"<br>");return f}
function sleep(ms){return new Promise(function(r){setTimeout(r,ms)})}

document.getElementById("cwInitialTime").textContent=getTime();

// Consent
if(CONFIG.consentEnabled){
  var prev=localStorage.getItem("cwConsent_"+CONFIG.agentId);
  if(prev==="true"){consentGiven=true;showContent()}
  consentCheckbox.addEventListener("change",function(){consentAcceptBtn.disabled=!consentCheckbox.checked});
  consentAcceptBtn.addEventListener("click",function(){
    if(consentCheckbox.checked){
      consentGiven=true;
      localStorage.setItem("cwConsent_"+CONFIG.agentId,"true");
      sendToN8N({eventType:"consent_accepted",sessionId:CONFIG.sessionId,timestamp:new Date().toISOString()});
      showContent();
    }
  });
}
function showContent(){
  if(consentScreen)consentScreen.classList.add("hidden");
  content.classList.add("active");
  setTimeout(function(){inputField.focus();scrollBottom()},100);
}

// Auto-resize textarea
inputField.addEventListener("input",function(){
  inputField.style.height="auto";
  inputField.style.height=Math.min(inputField.scrollHeight,120)+"px";
});

// Mobile keyboard
var origVH=window.visualViewport?window.visualViewport.height:window.innerHeight;
function handleKB(){
  if(window.innerWidth>480)return;
  var ch=window.visualViewport?window.visualViewport.height:window.innerHeight;
  if(origVH-ch>150){
    container.classList.add("keyboard-open");
    container.style.height=ch+"px";
    setTimeout(function(){scrollBottom()},150);
  }else{
    container.classList.remove("keyboard-open");
    container.style.height="";
  }
}
if(window.visualViewport){window.visualViewport.addEventListener("resize",handleKB);window.visualViewport.addEventListener("scroll",handleKB)}
inputField.addEventListener("focus",function(){
  if(!container.classList.contains("keyboard-open"))origVH=window.visualViewport?window.visualViewport.height:window.innerHeight;
  setTimeout(handleKB,300);
  if(window.innerWidth<=480)setTimeout(function(){scrollBottom()},500);
});
inputField.addEventListener("blur",function(){setTimeout(handleKB,300)});

// Messages
function addMsg(text,isUser){
  msgCount++;
  hideTyping();
  var div=document.createElement("div");
  div.className="cw-msg "+(isUser?"user":"bot");
  var icon=isUser?'<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle>':'<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>';
  div.innerHTML='<div class="cw-msg-avatar"><svg viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round">'+icon+'</svg></div><div class="cw-msg-content"><div class="cw-msg-bubble"><div class="cw-msg-text">'+formatMsg(text)+'</div></div><div class="cw-msg-time">'+getTime()+'</div></div>';
  messages.appendChild(div);
  setTimeout(scrollBottom,100);
}
function showTyping(){
  var d=document.createElement("div");
  d.className="cw-msg bot";d.id="cwTyping";
  d.innerHTML='<div class="cw-msg-avatar"><svg viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg></div><div class="cw-msg-content"><div class="cw-typing active"><div class="cw-typing-dot"></div><div class="cw-typing-dot"></div><div class="cw-typing-dot"></div></div></div>';
  messages.appendChild(d);scrollBottom();
}
function hideTyping(){var t=document.getElementById("cwTyping");if(t)t.remove()}

// N8N communication
function sendToN8N(body){
  return fetch(CONFIG.webhookUrl,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
}
async function sendMessage(message){
  var response=await fetch(CONFIG.webhookUrl,{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({
      message:message,
      agentName:CONFIG.agentName,
      agentId:CONFIG.agentId,
      sessionId:CONFIG.sessionId,
      timestamp:new Date().toISOString(),
      consentGiven:consentGiven,
      metadata:{url:window.location.href,referrer:document.referrer}
    })
  });
  if(!response.ok)throw new Error("HTTP "+response.status);
  return response.json();
}

async function handleSend(){
  var msg=inputField.value.trim();
  if(!msg)return;
  inputField.value="";inputField.style.height="auto";sendBtn.disabled=true;
  if(window.innerWidth<=480)inputField.blur();
  addMsg(msg,true);showTyping();
  try{
    var data=await sendMessage(msg);
    hideTyping();
    var list=[];
    if(data.messages&&Array.isArray(data.messages))list=data.messages;
    else if(data.messages&&typeof data.messages==="string"){try{var p=JSON.parse(data.messages);list=Array.isArray(p)?p:[data.messages]}catch(e){list=[data.messages]}}
    else if(data.response)list=[data.response];
    else if(data.message)list=[data.message];
    else list=["Sorry, I didn't receive a valid response."];
    list=list.filter(function(m){return m&&m.trim()});
    if(list.length>0){for(var i=0;i<list.length;i++){if(i>0){showTyping();await sleep(1500)}hideTyping();addMsg(list[i],false)}}
    else addMsg("Sorry, I didn't receive a valid response.",false);
  }catch(e){hideTyping();addMsg("Sorry, an error occurred. Please try again.",false)}
  finally{sendBtn.disabled=false;inputField.focus()}
}

// Close chat
function closeChat(){
  btn.classList.remove("active");container.classList.remove("active");
  if(window.innerWidth<=480){document.body.style.overflow="";document.documentElement.style.overflow="";document.body.style.position="";document.body.style.width="";document.body.style.top=""}
  container.style.height="";container.classList.remove("keyboard-open");
}

// Events
btn.addEventListener("click",function(){
  btn.classList.toggle("active");container.classList.toggle("active");
  if(container.classList.contains("active")){
    origVH=window.visualViewport?window.visualViewport.height:window.innerHeight;
    if(window.innerWidth<=480){document.body.style.overflow="hidden";document.documentElement.style.overflow="hidden";document.body.style.position="fixed";document.body.style.width="100%";document.body.style.top="0"}
    if(!consentGiven&&consentCheckbox)setTimeout(function(){consentCheckbox.focus()},100);
    else setTimeout(function(){inputField.focus();scrollBottom()},100);
  }else{
    if(window.innerWidth<=480){document.body.style.overflow="";document.documentElement.style.overflow="";document.body.style.position="";document.body.style.width="";document.body.style.top=""}
  }
});
headerClose.addEventListener("click",closeChat);
sendBtn.addEventListener("click",handleSend);
inputField.addEventListener("keypress",function(e){if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();handleSend()}});
container.addEventListener("touchmove",function(e){e.stopPropagation()});
document.addEventListener("keydown",function(e){if(e.key==="Escape"&&container.classList.contains("active"))closeChat()});

})();`
}

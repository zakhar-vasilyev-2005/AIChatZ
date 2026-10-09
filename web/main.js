import { wait_for, block_contextmenu } from './misc.js';
import { GroupChooser } from './groupchooser.js';
import { ChatList } from './chatlist.js';
import { ChatSelection } from './chatselection.js';
import { ChatManager } from './chatmgr.js';
import { ChatInput } from './chatinput.js';
import { AppSettings } from './appsettings.js';


async function init() {
	const app_config = await window.app.config();
	document.body.dataset.theme=app_config.theme;
	window._textcallbacks = {};
	window._textset = {};
	window._textreset = async (language=undefined)=>{
		if (language!==undefined && language!=="ru" && language!=="en") {
			throw new Error(`bad value for 'language': ${JSON.stringify(language)}`);
		}
		const config = await window.app.config(language ? { language } : undefined);
		window._text = config["text_entries_"+(language||config.language)];
		for (let k in window._text) {
			if (!window._textcallbacks[k]) {window._textcallbacks[k]=[];}
			if (!window._textset[k]) {window._textset[k] = f=>{ (f.func?f.func:f)(window._text[k]); window._textcallbacks[k].push(f); };}
			window._textcallbacks[k].forEach( f => (f.func?f.func:f)(window._text[k]) );
		}
	};
	await window._textreset(app_config.language);
	const sidepane_blank=document.querySelector("#sidepane .blankpane .blankpane-content");
	window._textset.sidepane_no_chats_in_group(s=>{sidepane_blank.querySelector(".text").textContent=s;});;
	window._chatlist=new ChatList({
		listelem: document.getElementById("sidepane-chats-list"),
		visibilityFilter: null,
	});
	document.getElementById("show-sidepane").addEventListener("click",()=>{
		document.getElementById("sidepane").classList.toggle("hidden");
	});
	window._groupchooser=new GroupChooser({
		all_groups: "\u200Ball",
		default_group: "\u200Bdefault",
		removed_group: "\u200Btrash\u200B",
		dropdown: document.querySelector("#sidepane .dropdown"),
		sidepane: document.querySelector("#sidepane"),
	});
	await window._groupchooser.init();
	window._chatselection=new ChatSelection(document.getElementById("sidepane"));
	let blankpane=document.querySelector("#sidepane .blankpane");
	blankpane.addEventListener("click",(e)=>{
		e.stopPropagation();
		window._chatselection.endSelection();
	});
	block_contextmenu(blankpane);
	window._groupchooser.updateVisibilityFilter();
	block_contextmenu(document.getElementById("chat-content-header"));
	window._chatmgr=new ChatManager({
		content_elem: document.getElementById("chat-content"),
		title_elem: document.getElementById("chat-title"),
		add_chat_button: document.getElementById("new-chat"),
	});
	window._chatinput=new ChatInput(document.getElementById("chat-input"));
	window._appsettings=new AppSettings();
	document.getElementById("settings").addEventListener("click",()=>{
		window._appsettings.open();
	});
	document.querySelector("#chat-input .send-button").addEventListener("click",()=>window._chatinput.send());
}




document.addEventListener("DOMContentLoaded",()=>{
	function update(){
		if (window.app) {init().catch(e=>{throw e;});}
		else {setTimeout(update,10);}
	}
	update();
});










//
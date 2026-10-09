import { str_format, wait_for, objeq, block_contextmenu, insertChild, getTimeFormatter } from './misc.js';
import { parse_markdown } from "./markdown_parser.js";


class Message {
	constructor(text,role,tm) {
		if (typeof(text)!=="string") {throw new Error("bad argument: 'text' must be a string");}
		if (['user','assistant','system'].indexOf(role)===-1) {throw new Error(`bad argument: 'role' must be either 'user', 'assistant' or 'system', not ${JSON.stringify(role)}`);}
		this.text=text;
		this.role=role;
		if (!tm) {this.tm=new Date();}
		else if (typeof(tm)==="string") {this.tm=new Date(tm);}
		else {this.tm=tm;}
	}
	getData() {return {text:this.text,role:this.role,datetime:this.tm.toISOString()};}
}
export class ChatManager {
	constructor(args) {
		this.add_chat_button=args.add_chat_button;
		this.add_chat_button.addEventListener("click",()=>{this.newChat();});
		for (let key in this.special) {
			if (typeof(this.special[key])!=="string") {throw new Error(`value of 'args.${key}' must be a string`);}
		}
		this.date_options=args.date_options;
		window._textset.message_date_options(p=>{
			this.timeFormatter=getTimeFormatter(p);
		})
		this.content=args.content_elem;
		this.title=args.title_elem;
		this.newChat();
	}
	newChat(callback=undefined) {
		let group=window._groupchooser.currentGroup();
		if (group===window._groupchooser.special.all_groups) {
			group=window._groupchooser.special.default_group;
		}
		let name=str_format(window._text.newchat_pattern,{group});
		let i=1;
		while (window._chatlist.hasChat(group,name)) {
			name=str_format(window._text.newchat_pattern_n,{group,n:i++});
		}
		function select_chat() {
			if (window._chatlist.hasChat(group,name)) {
				window._chatmgr.setChat(group,name);
				(callback||(_=>0))();
			} else {
				setTimeout(select_chat,10);
			}
		}
		new Promise(resolve=>window._chatlist.insertChat(group,name,0,resolve)).then(select_chat).catch(e=>{throw e;});
	}
	isNoChat() {
		return !this.getCurrentChatElem(true);
	}
	getCurrentChatElem(ignore_errors=false) {
		const elems=window._chatlist.getChatElems().filter(e=>e.classList.contains("currently-used"));
		if (!elems.length && ignore_errors) {return null;}
		return elems[0];
	}
	setChat(group,name) {
		this.setNoChat();
		window._textcallbacks.chat_title_no_chat_selected=window._textcallbacks.chat_title_no_chat_selected.filter(e=>!e.set_no_chat);
		let elem=window._chatlist.getChatElem(group,name);
		this.title.textContent=elem.querySelector(".chat-name").textContent;
		elem.classList.add("currently-used");
		this.loadMessages().then(async (messages)=>{
			for (let msg of messages) {
				await new Promise(resolve=>this.insertMessage(
					new Message(msg.text,msg.role,msg.datetime).getData(),
					this.countMessages(),resolve,true
				));
			}
		}).catch(e=>{throw e;});
	}
	setNoChat() {
		window._textset.chat_title_no_chat_selected({
			func: (s)=>{this.title.textContent=s;},
			set_no_chat: true,
		});
		let prev=this.getCurrentChatElem();
		if (prev) {prev.classList.remove("currently-used");}
		this.clearMessages();
	}
	async loadMessages() {
		const {group,name}=this.currentChat();
		const chat_exists=await window._chatlist.checkChatFileExists(group,name);
		return chat_exists?await window.app.load_chat(group,name):[];
	}
	currentChat(ignore_errors=false) {
		const elem=window._chatlist.getChatElems().find(e=>e.classList.contains("currently-used"));
		if (!elem && ignore_errors) {return false;}
		if (!elem) {throw new Error("cannot find '.currently-selected' chat");}
		return {group:elem.dataset.group,name:elem.dataset.name};
	}
	onSetGroup() {
		const elem=window._chatlist.getVisibleChatElems()[0];
		if (elem) {
			this.setChat(elem.dataset.group,elem.dataset.name);
		} else {
			this.setNoChat();
		}
		const is_removed_group=window._groupchooser.currentGroup()===window._groupchooser.special.removed_group;
		this.add_chat_button.classList[is_removed_group?"add":"remove"]("impossible");
	}
	async startGeneration(elem,on_token=undefined) {
		elem.setAttribute("data-in_progress","true");
		const messages=this.getMessages().map(e=>({role:e.role,content:e.text}));
		if (!messages.length || messages[0].role!=="system") {
			messages.unshift({role:"system",content:window._text.default_system_message});
		}
		const target_chat=this.currentChat();
		const line_id=await window.app.restart_generation(messages,{});
		const inner={text:"",datetime:elem.querySelector(".message-footer > time").getAttribute("datetime")};
		function disableInProgressStatus() {
			const elem = window._chatmgr.getMessageElems().find(
				e=>e.querySelector(".message-footer time").getAttribute("datetime")===inner.datetime
			);
			if (elem) {
				elem.removeAttribute("data-in_progress");
			} else {
				setTimeout(disableInProgressStatus,100);
			}
		}
		async function update_message() {
			const current_chat=window._chatmgr.currentChat(true)||{};
			const delta=await window.app.read_generation(line_id);
			if (delta!==undefined) {
				inner.text+=delta;
				if (objeq(target_chat,current_chat)) {
					const elem = window._chatmgr.getMessageElems().find(
						e=>e.querySelector(".message-footer time").getAttribute("datetime")===inner.datetime
					);
					if (elem) {
						await window._chatmgr.updateMessageContent(elem,inner.text);
					}
				}
				setTimeout(update_message,100);
			} else {
				disableInProgressStatus();
			}
		}
		update_message().catch(e=>{throw e;});
	}
	isInProgress() {
		const elems=this.getMessageElems();
		if (!elems.length) {return false;}
		const elem=elems.at(-1);
		if (elem.classList.contains("assistant-message")) {
			if (elem.hasAttribute("data-in_progress")) {
				return true;
			}
		}
		return false;
	}
	onNewMessage(text,role,tm,callback=undefined) {
		this.insertMessage(new Message(text,role,tm).getData(),this.countMessages(),()=>{
			this.saveCurrentChat().then(()=>{
				if (role==="user") {
					setTimeout(()=>this.onNewMessage("","assistant",undefined,()=>{
						this.startGeneration(this.getMessageElems().at(-1))
						.then(()=>{(callback||(_=>null))();})
						.catch(e=>{throw e;});
					}),500);
				} else {
					(callback||(_=>null))();
				}
			}).catch(e=>{throw e;});
		});
	}
	countMessages() {
		return this.content.children.length;
	}
	clearMessages() {
		if (this.generation_interval!==undefined) {
			clearInterval(this.generation_interval);
			this.generation_interval=undefined;
		}
		for (let id of this.getTimers()) {clearInterval(id);}
		this.content.innerHTML="";
	}
	async updateMessageContent(elem,text,datetime=undefined,nosave=false) {
		elem.dataset.text=text;
		elem.querySelector(".message-content").innerHTML=parse_markdown(text);
		this.updateMessageTime(elem,datetime||new Date());
		if (!nosave) {await this.saveCurrentChat();}
	}
	updateMessageTime(elem,datetime) {
		let timeelem=elem.querySelector(".message-footer time");
		let updateTime=()=>{timeelem.textContent=this.timeFormatter(datetime);}
		const time_interval=setInterval(updateTime,1000);
		if (elem.dataset.time_interval!==undefined) {
			clearInterval(parseInt(elem.dataset.time_interval));
		}
		elem.dataset.time_interval=time_interval;
		setTimeout(updateTime,0);
	}
	insertMessage(msg,index,resolve=undefined,nosave=false) {
		let elem=document.createElement("div");
		elem.classList.add("chat-message");
		elem.classList.add(`${msg.role}-message`);
		elem.innerHTML=`
		<div class="text message-content"></div>
		<div class="text message-footer">
			<time datetime="${msg.datetime}"></time>
		</div>
		`;
		this.updateMessageContent(elem,msg.text,new Date(msg.datetime),nosave).then(()=>{
			insertChild(this.content,elem,index);
			(resolve||(_=>0))();
		}).catch(e=>{throw e;});
	}
	getTimers() {
		return this.getMessageElems().map(e=>parseInt(e.dataset.time_interval));
	}
	getMessageElems() {
		return Array.from(this.content.children).filter(e=>e.classList.contains("chat-message"))
	}
	getMessages() {
		return this.getMessageElems().map(elem=>this.getMessageData(elem));
	}
	getMessageData(e) {
		let role;
		if (e.classList.contains("user-message")) {role="user";}
		if (e.classList.contains("assistant-message")) {role="assistant";}
		if (e.classList.contains("system-message")) {role="system";}
		return {text:e.dataset.text,role,datetime:e.querySelector("time").attributes.datetime.value};
	}
	async saveCurrentChat() {
		let {group,name}=this.currentChat();
		await window.app.save_chat(group,name,this.getMessages());
		await window._chatlist.updateChatEmptiness(group,name);
	}
}






import { html_delete_button, objeq, str_format, block_contextmenu, insertChild } from './misc.js';
import { ask_yes_no, ask_text_input, reject_ask } from './uimessage.js';



export class ChatList{
	constructor(args){
		this.listelem=args.listelem;
		block_contextmenu(this.listelem);
		this.setVisibilityFilter(args.visibilityFilter||(_=>true));
		setInterval(this.updateScroll,100);
	}
	updateScroll() {
		const elem=window._chatlist.listelem;
		elem.classList[elem.scrollHeight>elem.clientHeight?"add":"remove"]("has-scrollbar");
	}
	addChat(group,name,callback=undefined) {this.insertChat(group,name,this.countChats(),callback);}
	insertChat(group,name,index=0,callback=undefined) {
		if (!window._groupchooser.hasGroup(group)) {
			throw new Error(`group ${JSON.stringify(group)} not exists`);
		}
		const elem=document.createElement("row");
		elem.classList.add("sidepane-chat");
		elem.classList.add("appearing");
		elem.innerHTML=`
		<span class="marker-container">
			<span class="marker"><svg class="icon" viewBox="0 0 24 24">
				<circle cx="12" cy="12" r="8" fill="none"/>
			</svg></span>
			<span class="text chat-group button"></span>
		</span>
		<span class="expand text chat-name"></span>
		${html_delete_button}
		`;
		this.renameChat(null,null,group,name,elem,true);
		elem.querySelector(".chat-group").addEventListener("click",this.selectGroupHandler);
		elem.querySelector(".delete-button").addEventListener("click",this.deleteChatHandler);
		elem.addEventListener("click",this.selectChatHandler);
		elem.addEventListener("contextmenu",this.contextmenuChatHandler);
		setTimeout(async ()=>{
			setTimeout(()=>{
				elem.classList.remove("appearing");
			},700);
			await this.updateChatEmptiness(group,name,elem);
			insertChild(this.listelem,elem,index);
			this.updateScroll();
			(callback||(_=>0))();
		},0);
	}
	async loadExsistingChats(group) {
		if (group===window._groupchooser.special.all_groups) {
			for (group of await window.app.get_groups()) {
				if (!group.startsWith(window._groupchooser.special.removed_group)) {
					await this.loadExsistingChats(group);
				}
			}
		} else if (group===window._groupchooser.special.removed_group) {
			for (group of await window.app.get_groups()) {
				if (group.startsWith(window._groupchooser.special.removed_group)) {
					await this.loadExsistingChats(group);
				}
			}
		} else {
			let chats_to_add=[];
			for (let name of await window.app.get_chats(group)) {
				if (!this.hasChat(group,name)) {
					let mtime=await window.app.get_chat_mtime(group,name);
					chats_to_add.push({group,name,mtime:0});
				}
			}
			chats_to_add.sort((a,b)=>{b.mtime-a.mtime});
			for (let {group,name} of chats_to_add) {
				await new Promise(resolve=>this.addChat(group,name,resolve));
			}
		}
	}
	async checkChatFileExists(group,name) {
		for (let chat_name of await window.app.get_chats(group)) {
			if (chat_name===name) {return true;}
		}
		return false;
	}
	async updateChatEmptiness(group,name,elem=undefined) {
		elem = elem || this.getChatElem(group,name);
		let is_empty;
		if (await this.checkChatFileExists(group,name)) {
			is_empty=false;
		} else {
			is_empty=true;
		}
		elem.classList[is_empty?"add":"remove"]("empty-chat");
		if (is_empty) {
			window._textcallbacks.empty_chat_tooltip = window._textcallbacks.empty_chat_tooltip.filter(e=>!(e.emptychat&&e.elem===elem));
			window._textset.empty_chat_tooltip({
				func: (s)=>elem.setAttribute("title",s),
				elem: elem,
				emptychat: true
			});
		} else {elem.removeAttribute("title");}
	}
	contextmenuChatHandler(event) {
		event.preventDefault();
		event.stopPropagation()
		const perm=window._groupchooser.currentGroup()===window._groupchooser.special.removed_group?"_permanently":"";
		const n_selected=window._chatselection.history.length;
		const rename_this=window._text["sidepanechat_rename"];
		const delete_this=window._text["sidepanechat_delete"+perm];
		const delete_selected=str_format(window._text["sidepanechat_delete_selected"+perm],{count:n_selected});
		const entries=[];
		entries.push({label:rename_this,value:"rename"});
		if (perm.length) {
			const restore_this=window._text["sidepanechat_restore"];
			const restore_selected=str_format(window._text["sidepanechat_restore_selected"],{count:n_selected});
			if (n_selected) {entries.push({label:restore_selected,value:"restore"});}
			else {entries.push({label:restore_this,value:"restore"});}
		}
		if (n_selected) {entries.push({label:delete_selected,value:"delete"});}
		else {entries.push({label:delete_this,value:"delete"});}
		window.app.show_context_menu(entries).then(async (command)=>{
			const elem=event.target.closest(".sidepane-chat");
			if (command==="delete") {
				const {group,name}=elem.dataset;
				const to_delete=n_selected?window._chatselection.history:[{group,name}];
				const deleteFunc=()=>{
					for (let {group,name} of to_delete) {
						window._chatlist.deleteChat(group,name,!!perm.length);
					}
				}
				if (perm.length) {
					await ask_yes_no({
						text: window._text.dialog_delete_chat_permanently_text,
						text_yes: window._text.dialog_delete_chat_permanently_yes,
						text_no: window._text.dialog_delete_chat_permanently_no,
						command: deleteFunc,
						danger_yes: true,
						danger_no: false,
					});
				} else {
					deleteFunc();
				}
			} else if (command==="rename") {
				const {group,name}=elem.dataset;
				await ask_text_input({
					text: window._text.dialog_rename_chat_text,
					text_cancel: window._text.dialog_rename_chat_cancel,
					text_commit: window._text.dialog_rename_chat_commit,
					on_enter: (new_name)=>{
						if (name===new_name) {
							return;
						} else if (!new_name.length) {
							return reject_ask(window._text.dialog_rename_chat_nameempty,window._text.dialog_ok_button,false);
						} else if (!!window._chatlist.hasChat(group,new_name)) {
							return reject_ask(window._text.dialog_rename_chat_nameexist,window._text.dialog_ok_button,false);
						} else {
							window._chatlist.renameChat(group,name,group,new_name);
						}
					}
				});
			} else if (command==="restore") {
				const {group,name}=elem.dataset;
				const new_group=group.slice(window._groupchooser.special.removed_group.length,group.length);
				elem.classList.add("removing");
				setTimeout(()=>{
					window._chatlist.chatToTrash({group,name},new_group);
					setTimeout(()=>elem.classList.remove("removing"),0);
				},200);
			}
		}).catch(e=>{throw e});
	}
	selectChatHandler(event) {
		event.stopPropagation();
		if (event.shiftKey || event.ctrlKey) {
			window._chatselection.handleEvent(this,event);
		} else {
			let d=event.target.closest(".sidepane-chat").dataset;
			window._chatselection.endSelection();
			window._chatmgr.setChat(d.group,d.name);
		}
	}
	selectGroupHandler(event){
		event.stopPropagation();
		window._groupchooser.setGroup(this.closest(".sidepane-chat").dataset.group);
	}
	deleteChatHandler(event){
		event.stopPropagation();
		const {group,name} = event.target.closest(".sidepane-chat").dataset
		window._chatlist.deleteChat(group,name);
	}
	isChatHidden(group,name,elem=undefined) {
		return (elem||this.getChatElem(group,name)).classList.contains("hidden");
	}
	setChatHidden(group,name,hidden) {
		this.getChatElem(group,name).classList[hidden?"add":"remove"]("hidden");
	}
	setVisibilityFilter(filter) {
		this.visibilityFilter=(chat)=>{
			if ((!chat.group)||(!chat.name)) {throw new Error(`cannot use window._chatlist.visibilityFilter() on chat ${JSON.stringify(chat)}`);}
			return filter(chat);
		};
		for (let chat of this.getChats()) {
			this.setChatHidden(chat.group,chat.name,!filter(chat));
		}
	}
	renameChat(group,name,newGroup,newName,elem=undefined,nosave=false) {
		elem=elem||this.getChatElem(group,name);
		const is_visible=this.visibilityFilter({group:newGroup,name:newName});
		if (is_visible) {
			elem.classList.remove("hidden");
		} else {
			elem.classList.add("hidden");
		}
		elem.querySelector(".chat-name").textContent=newName;
		let removed_group=window._groupchooser.special.removed_group;
		let is_removed_group=newGroup.slice(0,removed_group.length)===removed_group;
		elem.querySelector(".chat-group").textContent=window._groupchooser.getGroupElem(
			is_removed_group ? newGroup.slice(removed_group.length,newGroup.length) : newGroup
		).textContent;
		if (!nosave) {
			window.app.move_chat(elem.dataset.group,elem.dataset.name,newGroup,newName).catch(e=>{throw e;});
		}
		elem.dataset.group=newGroup;
		elem.dataset.name=newName;
	}
	hasChat(group,name) {
		return !!this.getChatElem(group,name,true);
	}
	getChatElem(group,name,ignore_error=false) {
		let elem=this.getChatElems().find(e=>objeq({group,name},e.dataset));
		if (elem || ignore_error) {return elem;}
		else {throw new Error(`chat ${JSON.stringify({group,name})} not found`);}
	}
	getVisibleChatElem(group,name,ignore_error=false) {
		let elem=this.getChatElems().find(e=>objeq({group,name},e.dataset));
		if (elem || ignore_error) {return elem;}
		else {throw new Error(`chat ${JSON.stringify({group,name})} not found`);}
	}
	chatIsEmpty(group,name) {
		const elem=this.getChatElem(group,name);
		return elem.classList.contains("empty-chat");
	}
	deleteChat(group,name,delete_permanently=false) {
		let removed_group=window._groupchooser.special.removed_group;
		const chat = this.getChatElem(group,name);
		let alreadyRemoved = group.slice(0,removed_group.length)===removed_group
		let deleteFunc=()=>{
			chat.classList.add("removing");
			setTimeout(async ()=>{
				const selected_chat=window._chatmgr.currentChat(true);
				let chat_index=selected_chat?this.getVisibleChatIndex(selected_chat.group,selected_chat.name):null;
				if (alreadyRemoved || delete_permanently || this.chatIsEmpty(group,name)) {
					chat.remove();
					if (await this.checkChatFileExists(group,name)) {
						await window.app.remove_chat(group,name);
					}
				} else {
					this.chatToTrash({group,name});
					chat.remove();
					insertChild(this.listelem,chat,0);
					setTimeout(()=>{chat.classList.remove("removing");},0);
				}
				this.updateScroll();
				if (objeq({group,name},selected_chat||{})) {
					const chats=this.getVisibleChatElems().map(e=>({group:e.dataset.group,name:e.dataset.name}));
					while (!chats[chat_index]&&chat_index>-1) {chat_index--;}
					if (chat_index!==-1) {
						const chat=chats[chat_index];
						window._chatmgr.setChat(chat.group,chat.name);
					} else {
						window._chatmgr.setNoChat();
					}
				}
			},200)
		};
		if (alreadyRemoved&&!delete_permanently) {
			ask_yes_no({
				text: window._text.dialog_delete_chat_permanently_text,
				text_yes: window._text.dialog_delete_chat_permanently_yes,
				text_no: window._text.dialog_delete_chat_permanently_no,
				command: deleteFunc,
				danger_yes: true,
				danger_no: false,
			});
		} else {
			deleteFunc();
		}
	}
	chatToTrash(chat,newGroup=undefined) {
		let newName=str_format(window._text.deleted_chats_pattern,{name:chat.name,group:chat.group});
		newGroup=newGroup||window._groupchooser.special.removed_group+chat.group;
		let i=1;
		while (this.hasChat(newGroup,newName)) {
			newName=str_format(window._text.deleted_chats_pattern_n,{name:chat.name,group:chat.group,n:i++});
		}
		this.renameChat(chat.group,chat.name,newGroup,newName);
	}
	getVisibleChatIndex(group,name) {
		return this.getVisibleChatElems().findIndex(e=>objeq({group,name},e.dataset));
	}
	getChatIndex(group,name) {
		return this.getChatElems().findIndex(e=>objeq({group,name},e.dataset));
	}
	getVisibleChatElems() {
		return this.getChatElems().filter(e=>!this.isChatHidden(null,null,e));
	}
	getChatElems() {
		return Array.from(this.listelem.children).filter(e=>e.classList.contains("sidepane-chat"));
	}
	getChats() {
		return this.getChatElems().map(e=>({group:e.dataset.group,name:e.dataset.name}))
	}
	countChats() {
		return this.listelem.children.length;
	}
}






//
import { html_delete_button, str_format, wait_for, block_contextmenu } from './misc.js';
import { ask_yes_no, ask_text_input, reject_ask } from './uimessage.js';


export class GroupChooser {
	constructor(args) {
		this.special={
			all_groups: args.all_groups,
			default_group: args.default_group,
			removed_group: args.removed_group,
		}
		let special_groups = [args.all_groups, args.default_group, args.removed_group];
		let all_groups = [...special_groups];
		this.dropdown=args.dropdown;
		this.sidepane=args.sidepane;
		block_contextmenu(this.dropdown);
		let add=this.dropdown.querySelector(".dropdown-add-group");
		window._textset.groups_menu_add_group(s=>{add.querySelector(".text").textContent=s;});
		this.dropdown.addEventListener("click",()=>{
			this[this.dropdown.classList.contains("open")?"closeDropdown":"openDropdown"]();
		});
		this.dropdown.addEventListener("blur",(event)=>{
			if (this._prevent_blur) {
				event.stopPropagation();
				event.preventDefault();
			} else {
				this.closeDropdown();
				this.dropdown.blur();
			}
		});
		for (let group of all_groups) {
			this.addGroup(group,special_groups.some(g=>g===group));
			if (group===this.special.all_groups) {
				window._textset.groupname_all(s=>{
					this.renameGroup(group,s);
					this.updateCurrentGroupName()
					this.updateGeneralGroupNames();
				});
			} else if (group===this.special.default_group) {
				window._textset.groupname_default(s=>{
					this.renameGroup(group,s);
					this.updateCurrentGroupName()
					this.updateGeneralGroupNames();
				});
			} else if (group===this.special.removed_group) {
				window._textset.groupname_trash(s=>{
					this.renameGroup(group,s);
					this.updateCurrentGroupName();
					this.updateGeneralGroupNames();
				});
			}
		}
		let i=1;
		this.dropdown.querySelector(".dropdown-add-group").addEventListener("click",async (event)=>{
			event.stopPropagation();
			this._prevent_blur=true;
			const groupname=await ask_text_input({
				text: window._text.create_group_dialog_text,
				text_placeholder: window._text.create_group_dialog_placeholder,
				text_commit: window._text.create_group_dialog_commit,
				text_cancel: window._text.create_group_dialog_cancel,
				danger_commit: false,
				danger_cancel: true,
				on_enter: (text)=>{
					if (this.hasGroup(text)) {return reject_ask(
						window._text.create_group_dialog_alreadyexist,
						window._text.dialog_ok_button
					);}
					if (!text) {return reject_ask(
						window._text.create_group_dialog_noinput,
						window._text.dialog_ok_button
					);}
					return text;
				}
			});
			if (groupname!==undefined) {
				await this.addGroup(groupname,false,true);
				await new Promise(resolve=>this.setGroup(groupname,resolve));
				this.closeDropdown();
			}
			this._prevent_blur=false;
			this.dropdown.focus();
		})
	}
	async init() {
		for (let group of await window.app.get_groups()) {
			if (
				group!==this.special.all_groups &&
				group!==this.special.default_group &&
				!group.startsWith(this.special.removed_group)
			) {
				this.addGroup(group);
			}
		}
		await new Promise(resolve=>this.setGroup(this.special.all_groups,resolve));
	}
	updateGeneralGroupNames() {
		const rename_default=(elem)=>{
			elem.querySelector(".chat-group").textContent = window._text.groupname_default;
		};
		window._chatlist.getChatElems().forEach(elem=>{
			const {group,name} = elem.dataset;
			if (group.startsWith(this.special.removed_group)) {
				if (group.slice(this.special.removed_group.length,group.length)===this.special.default_group) {
					rename_default(elem);
				}
			} else if (group===this.special.default_group) {
				rename_default(elem);
			}
		});
	}
	updateCurrentGroupName() {
		if (this.currentGroupElem()) {
			this.dropdown.querySelector(".dropdown-title").textContent=this.currentGroupElem().textContent;
		}
	}
	closeDropdown() {
		this.dropdown.classList.remove("open");
		this.dropdown.blur();
	}
	openDropdown() {
		this.dropdown.classList.add("open");
	}
	groupSelectHandler(event) {
		window._groupchooser.setGroup(this.dataset.group);
	}
	groupDeleteHandler(event) {
		event.stopPropagation();
		window._groupchooser.removeGroup(this.closest(".dropdown-content").dataset.group);
	}
	addGroup(groupname,is_special,is_async=false) {
		let group=document.createElement("row");
		group.classList.add("dropdown-item");
		group.classList.add("dropdown-content");
		if (is_special) {group.classList.add("special-group");}
		group.innerHTML=`
		<svg class="icon dropdown-item-marker" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="currentColor"/></svg>
		<span class="expand text dropdown-content-title"></span>
		${html_delete_button}
		`;
		group.querySelector(".dropdown-content-title").textContent=groupname;
		group.querySelector(".delete-button").addEventListener("click",this.groupDeleteHandler);
		group.dataset.group=groupname;
		group.addEventListener("click",this.groupSelectHandler);
		this.dropdown.appendChild(group);
		if (!is_special) {
			const p=window.app.create_group(groupname);
			if (is_async) {return p;} else {p.catch(e=>{throw e;});}
		}
	}
	renameGroup(group,title) {
		this.getGroupElem(group).querySelector(".dropdown-content-title").textContent=title;
	}
	removeGroup(group) {
		if (this.groupIsSpecial(group)) {throw new Error(`none of special groups cannot be deleted: ${JSON.stringify({group})}`);}
		let deleteFunc=()=>{
			let removed_group=this.special.removed_group;
			for (let chat of window._chatlist.getChats()) {
				let chat_group=chat.group.slice(0,removed_group.length)===removed_group?removed_group:chat.group;
				if (chat_group===group) {
					window._chatlist.chatToTrash(chat);
				}
			}
			this.getGroupElem(group).remove();
			window.app.remove_group(group).catch(e=>{throw e;});
		}
		this._prevent_blur=true;
		ask_yes_no({
			text:window._text.delete_group_dialog_text,
			text_yes:window._text.delete_group_dialog_commit,
			text_no:window._text.delete_group_dialog_cancel,
			command:deleteFunc,
			danger_yes:true,
			danger_no:false,
		}).then(()=>{
			this._prevent_blur=false;
			this.dropdown.focus();
		}).catch(e=>{throw e;});
	}
	hasGroup(group) {
		if (group&&group.slice(0,this.special.removed_group.length)===this.special.removed_group) {
			group=this.special.removed_group;
		}
		return group && !!this.getGroupElem(group,true);
	}
	groupIsSpecial(group) {
		return this.getGroupElem(group).dataset.special?true:false;
	}
	currentGroupElem() {
		return this.dropdown.querySelector(".choosed");
	}
	currentGroup() {
		return this.dropdown.querySelector(".choosed").dataset.group;
	}
	getGroupElem(group,ignore_error=false) {
		if (group&&group.slice(0,this.special.removed_group.length)===this.special.removed_group) {
			group=this.special.removed_group;
		}
		let src=Array.from(this.dropdown.querySelectorAll(".dropdown-content"));
		let elem=Array.from(this.dropdown.querySelectorAll(".dropdown-content")).find(e=>e.dataset.group===group)
		if (elem || ignore_error) {
			return elem;
		} else {
			throw new Error(`group ${JSON.stringify(group)} not found`);
		}
	}
	setGroup(group,callback=undefined) {
		Array.from(this.dropdown.querySelectorAll(".dropdown-content"))
		.filter(e=>e.classList.contains("choosed"))
		.forEach(e=>e.classList.remove("choosed"));
		this.getGroupElem(group).classList.add("choosed");
		this.updateCurrentGroupName()
		this.updateVisibilityFilter();
		if (window._chatmgr) {window._chatmgr.onSetGroup(group);}
		window._chatlist.loadExsistingChats(group).then(()=>{(callback||(_=>0))();}).catch(e=>{throw e;});
	}
	updateVisibilityFilter() {
		let currentGroup=this.currentGroup();
		let filter=chat=>chat.group===currentGroup;
		if (currentGroup===this.special.all_groups) {
			filter=chat=>chat.group.slice(0,this.special.removed_group.length)!==this.special.removed_group;
			this.sidepane.classList.remove("no-chat-groups");
		} else if (currentGroup===this.special.removed_group) {
			filter=chat=>chat.group.slice(0,this.special.removed_group.length)===this.special.removed_group;
			this.sidepane.classList.remove("no-chat-groups");
		} else {
			this.sidepane.classList.add("no-chat-groups");
		}
		window._chatlist.setVisibilityFilter(filter);
	}
	getGroups() {
		return Array.from(this.dropdown.querySelectorAll(".dropdown-content")).map(e=>e.dataset.group);
	}
}












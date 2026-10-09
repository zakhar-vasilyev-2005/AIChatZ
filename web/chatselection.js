import { objeq, block_contextmenu } from './misc.js';




export class ChatSelection {
	constructor(listelem) {
		this.listelem=listelem;
		this.listelem.addEventListener("blur",()=>this.endSelection());
		this.history=[];
	}
	_initSelection(){
		this.listelem.focus();
	}
	endSelection() {
		for (let elem of window._chatlist.getChatElems()) {
			elem.classList.remove("selected-chat");
		}
		this.history=[];
		this.listelem.blur();
	}
	selectChatElem(elem) {
		elem.classList.add("selected-chat");
		let chat={group:elem.dataset.group,name:elem.dataset.name};
		this.history=this.history.filter(e=>!objeq(chat,e));
		this.history.push(chat);
	}
	unselectChatElem(elem) {
		elem.classList.remove("selected-chat");
		let chat={group:elem.dataset.group,name:elem.dataset.group};
		this.history=this.history.filter(e=>!objeq(chat,e));
	}
	toggleChatElem(elem) {
		if (elem.classList.contains("selected-chat")) {this.unselectChatElem(elem);}
		else {this.selectChatElem(elem);}
	}
	selectChat(group,name,unselect=false) {this.selectChatElem(window._chatlist.getChatElem(group,name));}
	unselectChat(group,name) {this.unselectChatElem(window._chatlist.getChatElem(group,name));}
	isSelected(group,chat) {return window._chatlist.getChatElem(group,name).classList.contains("selected-chat");}
	handleEvent(elem,event) {
		const chat = {group:elem.dataset.group,name:elem.dataset.name};
		if (!this.history.length) {this._initSelection();}
		if (event.shiftKey) {
			if (!this.history.length) {this.toggleChatElem(elem);return;}
			let cur=window._chatlist.getVisibleChatIndex(elem.dataset.group,elem.dataset.name);
			let prev=window._chatlist.getVisibleChatIndex(this.history.at(-1).group,this.history.at(-1).name);
			let getn=n=>window._chatlist.getVisibleChatElems().at(n);
			let loop;
			if (prev>cur) {loop=fn=>{for(let i=prev;i>=cur;i--){fn(i);}};}
			else {loop=fn=>{for(let i=prev;i<=cur;i++){fn(i);}};}
			let every=true;
			loop(i=>{ if (!getn(i).classList.contains("selected-chat")) {every=false;} });
			if (every) {this.unselectChatElem(elem);}
			else {loop(i=>this.selectChatElem(getn(i)));}
		} else if (event.ctrlKey) {
			if (elem.classList.contains("selected-chat")) {
				this.unselectChatElem(elem);
			} else {
				this.selectChatElem(elem);
			}
		}
		if (!this.history.length) {this.endSelection();}
	}
}

















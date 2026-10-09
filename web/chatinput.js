import { wait_elem_added } from "./misc.js";




export class ChatInput {
	constructor(container) {
		this.container=container;
		this.elem=container.querySelector("textarea");
		this.elem.spellcheck=true;
		window._textset.chat_input_placeholder(s=>{this.elem.placeholder=s;});
		this.elem.addEventListener("keydown",(event)=>{
			if (event.code==="Enter" && !event.shiftKey) {
				event.preventDefault();
				event.stopPropagation();
				this.send();
			}
		});
		this.elem.addEventListener("input",()=>this.autoresize());
		wait_elem_added(this.elem,()=>this.autoresize());
	}
	isSendAllowd() {
		const message_elems=window._chatmgr.getMessageElems();
		if (!message_elems.length) {return true;}
		const last_message=window._chatmgr.getMessageData(message_elems.at(-1));
		return last_message.role==="assistant" && !window._chatmgr.isInProgress();
	}
	send() {
		if (this.isSendAllowd()) {
			const content=this.elem.value.trim();
			if (content.length) {
				if (window._chatmgr.isNoChat()) {
					window._chatmgr.newChat(()=>{
						window._chatmgr.onNewMessage(content,"user");
					});
				} else {
					window._chatmgr.onNewMessage(content,"user");
				}
			}
			this.elem.value="";
			this.autoresize();
		}
		this.elem.focus();
	}
	autoresize() {
		this.elem.style.height="auto";
		this.elem.style.height=`max(1.5cm, min(4cm, calc(0.2cm + ${this.elem.scrollHeight}px)))`;
	}
}




































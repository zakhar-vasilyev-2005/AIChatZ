import { wait_elem_added } from "./misc.js"





const marker_invalid_input={invalid:true};

export function reject_ask(message,button_text=undefined,button_danger=undefined) {
	return {marker:marker_invalid_input,text:message,button_text,button_danger};
}

export function ask_cancel(text,cancel_text=undefined,cancel_danger=undefined) {
	return ask_message({
		text: text,
		on_esc: ()=>{},
		buttons: [{
			text: cancel_text||window._text.cancel_button,
			danger: cancel_danger===undefined?true:false,
			focus: true
		}]
	});
}

export function ask_yes_no(args) {
	return ask_message({
		text:args.text,
		on_esc:()=>{},
		buttons:[{
			text:args.text_no||window._text.no_button,
			danger:(args.danger_no===undefined?true:args.danger_no),
			onclick:_=>false
		},{
			text:args.text_yes||window._text.yes_button,
			danger:(args.danger_yes===undefined?true:args.danger_yes),
			onclick:(args.command||(_=>true)),
			focus:true
		}]
	})
}

export function ask_text_input(args) {
	return ask_message({
		text: args.text,
		userinput: args.text_placeholder||true,
		userinput_enter: args.on_enter,
		on_enter: args.on_enter,
		on_esc:()=>{},
		buttons: [{
			text: args.text_cancel,
			danger: (args.danger_cancel===undefined?true:args.danger_cancel),
		},{
			text: args.text_commit,
			danger: (args.danger_commit===undefined?false:args.danger_commit),
			onclick: args.on_enter,
			focus:true
		}]
	});
}

export function open_dialog(init_content,on_esc=undefined) {
	return new Promise(resolve=>{
		document.body.classList.add("disallow-selection");
		document.getElementById("chat").setAttribute("inert","");
		document.getElementById("sidepane").setAttribute("inert","");
		const prev_elem=document.activeElement;
		const pane=document.createElement("div");
		pane.classList.add("ui-message-pane");
		pane.innerHTML=`
			<column class="ui-message" tabindex="-1"></column>
		`;
		const message_body=pane.querySelector(".ui-message");
		const finish_inner={finished:false};
		const finish=async (func)=>{
			if (finish_inner.finished) {return;}
			finish_inner.finished=true;
			let result=(func||(()=>undefined))();
			if (result instanceof Promise) {result=await result;}
			if ((result&&result.marker)===marker_invalid_input) {
				await ask_cancel(result.text,result.button_text,result.button_danger);
			} else {
				pane.classList.add("disallow-selection");
				pane.classList.add("removing");
				pane.setAttribute("inert","");
				setTimeout(()=>{
					pane.remove();
					prev_elem.focus();
					if (document.querySelectorAll(".ui-message").length===0) {
						document.body.classList.remove("disallow-selection");
						document.getElementById("chat").removeAttribute("inert");
						document.getElementById("sidepane").removeAttribute("inert");
					}
					resolve(result);
				},500);
			}
		};
		let inner_data={mousedown:null};
		message_body.addEventListener("keydown",async (event)=>{
			if (event.code==="Escape") {await finish(on_esc);}
		});
		message_body.addEventListener("click",(event)=>{
			event.stopPropagation();
		});
		pane.addEventListener("mousedown",event=>{
			inner_data.mousedown=event;
		});
		pane.addEventListener("mouseup",async (event)=>{
			if (event.target===pane&&inner_data.mousedown.target===pane) {
				event.stopPropagation();
				if (!window.getSelection().toString().trim().length) {await finish(on_esc);}
			}
			inner_data.mousedown=event;
		});
		const post_init = (init_result)=>{
			if (!init_result.supress_bodyfocus) {
				wait_elem_added(message_body,()=>message_body.focus());
			}
			document.body.appendChild(pane);
		}
		const init_result = init_content(message_body,finish)||{};
		if (init_result instanceof Promise) {init_result.then(()=>post_init(init_result)).catch(e=>{throw e;});}
		else {post_init(init_result);}
	})
}

export function ask_message(args) {
	return open_dialog((message_body,raw_finish)=>{
		message_body.innerHTML=`
			<div class="ui-message-content expand">
				<span class="ui-message-text text">hello?</span>
			</div>
			<input class="ui-message-userinput" type="text"></input>
			<row class="ui-message-buttons"></row>
		`;
		const userinput=message_body.querySelector(".ui-message-userinput")
		const finish=(func)=>raw_finish(()=>{
			return (func||(()=>{}))(userinput.value.trim());
		});
		userinput.addEventListener("keydown",async (event)=>{
			if (event.code!=="Escape"&&!userinput.value) {
				event.stopPropagation();
			}
			if (event.code==="Enter") {await finish(args.userinput_enter);}
			if (event.code==="Escape") {
				userinput.blur();
				message_body.focus();
			}
		});
		message_body.querySelector(".ui-message-text").innerHTML=args.text;
		message_body.addEventListener("keydown",async (event)=>{
			if (event.code==="Enter"&&Array.from(args.buttons).some(e=>e.focus)) {await finish(Array.from(args.buttons).find(e=>e.focus).onclick);}
		});
		userinput.classList[args.userinput?"remove":"add"]("hidden");
		if (typeof(args.userinput)=="string") {userinput.placeholder=args.userinput;}
		const button_pane=message_body.querySelector(".ui-message-buttons");
		button_pane.innerHTML="";
		for (let button of args.buttons) {
			let elem=document.createElement("div");
			button.elem=elem;
			elem.classList.add("button");
			elem.setAttribute("tabindex",0);
			if (button.danger) {elem.classList.add("ui-message-danger");}
			elem.innerHTML=`<span class="text expand"></span>`;
			elem.querySelector(".text").textContent=button.text;
			elem.addEventListener("click",async (event)=>{
				event.stopPropagation();
				elem.blur();
				message_body.focus();
				await finish(button.onclick);
			});
			elem.addEventListener("keydown",async (event)=>{
				event.stopPropagation();
				if (event.code==="Enter") {
					elem.blur();
					message_body.focus();
					await finish(button.onclick);
				}
				if (event.code==="Escape") {
					elem.blur();
					message_body.focus();
				}
			});
			button_pane.appendChild(elem);
		}
		if (args.userinput) {wait_elem_added(userinput,()=>userinput.focus());}
		else {wait_elem_added(message_body,()=>message_body.focus());}
		return {supress_bodyfocus: true};
	},args.on_esc);
}


























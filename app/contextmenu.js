const { app, Menu, MenuItem, clipboard } = require("electron");
const { chat_config } = require("./chat_config");




app.on("web-contents-created",(event,contents)=>{
	contents.on('context-menu', (event, params) => {
		const menu=new Menu();
		const {x,y}=params;
		const hasSelection=params.selectionText&&params.selectionText.trim()!=="";
		const canEdit=params.isEditable;
		const clipboardHasText=clipboard.readText().length>0;
		chat_config().then((config)=>{
			let text_entries=config.text_entries;
			menu.append(new MenuItem({
				label: text_entries.contextmenu_cut,
				role: "cut",
				enabled: hasSelection && canEdit,
				click: ()=>{contents.cut();}
			}));
			menu.append(new MenuItem({
				label: text_entries.contextmenu_copy,
				role: "copy",
				enabled: hasSelection,
				click: ()=>{contents.copy();}
			}));
			menu.append(new MenuItem({
				label: text_entries.contextmenu_paste,
				role: "paste",
				enabled: canEdit && clipboardHasText,
				click: ()=>{contents.paste();}
			}));
			menu.append(new MenuItem({ type: "separator" }));
			menu.append(new MenuItem({
				label: text_entries.contextmenu_select_all,
				role: "selectAll",
				enabled: true,
				click: ()=>{contents.selectAll();}
			}));
			menu.popup({x,y});
		}).catch(e=>{throw e;});
	});
});







//
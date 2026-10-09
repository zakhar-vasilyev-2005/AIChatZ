const { ipcMain, Menu, MenuItem } = require('electron')







ipcMain.handle("chat:show-context-menu",(event,entries)=>new Promise(resolve=>{
	const menu=new Menu();
	let result;
	for (let entry of entries) {
		let value=entry.value;
		if (value!==undefined) {
			delete entry.value;
			entry.click=()=>{result=value;};
		}
		menu.append(new MenuItem(entry));
	}
	menu.popup({callback:()=>resolve(result)});
}));


























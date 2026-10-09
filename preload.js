const { ipcRenderer, contextBridge } = require("electron")




ipcRenderer.invoke("chat:config").then((config)=>{
	contextBridge.exposeInMainWorld("app",{
		config:             (entries)=>ipcRenderer.invoke("chat:config",entries),
		get_groups:         ()=>ipcRenderer.invoke("chat:get-groups"),
		create_group:       (group)=>ipcRenderer.invoke("chat:create-group",group),
		remove_group:       (group)=>ipcRenderer.invoke("chat:remove-group",group),
		get_chats:          (group)=>ipcRenderer.invoke("chat:get-chats",group),
		load_chat:          (group,name)=>ipcRenderer.invoke("chat:load-chat",group,name),
		save_chat:          (group,name,messages)=>ipcRenderer.invoke("chat:save-chat",group,name,messages),
		move_chat:          (group,name,newGroup,newName)=>ipcRenderer.invoke("chat:move-chat",group,name,newGroup,newName),
		remove_chat:        (group,name)=>ipcRenderer.invoke("chat:remove-chat",group,name),
		get_chat_mtime:     (group,name)=>ipcRenderer.invoke("chat:get-chat-mtime",group,name),
		show_context_menu:  (entries)=>ipcRenderer.invoke("chat:show-context-menu",entries),
		restart_generation: (messages,params)=>ipcRenderer.invoke("chat:restart-generation",messages,params),
		read_generation:    (line_id)=>ipcRenderer.invoke("chat:read-generation",line_id),
	});
}).catch(e=>{throw e;});









//
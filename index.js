const { app, BrowserWindow, Menu, MenuItem, clipboard, ipcMain } = require("electron");
const path = require("path");
const { chat_config_default, chat_config } = require("./app/chat_config");
require("./app/contextmenu");
require("./app/chat_manager");
require("./app/custom_context_menu");
const { chat_generation_init } = require("./app/chat_generation");




const CHAT_DEBUG_MODE=true;
async function createWindow() {
	if (!CHAT_DEBUG_MODE) {Menu.setApplicationMenu(null);}
	const mainWindow=new BrowserWindow({
		width: 1100,
		height: 600,
		webPreferences: {
			preload: path.join(__dirname,"preload.js"),
			nodeIntegration: false,
			contextIsolation: true
		}
	});
	chat_generation_init().catch(e=>{throw e;});
	if (CHAT_DEBUG_MODE) {
		await chat_config(chat_config_default,true);
		mainWindow.webContents.openDevTools();
	} else {
		await chat_config(chat_config_default)
	}
	mainWindow.loadFile("./web/index.html");
}
app.whenReady().then(createWindow);
app.on("window-all-closed",()=>{if (process.platform!=="darwin") {app.quit();}});

















//
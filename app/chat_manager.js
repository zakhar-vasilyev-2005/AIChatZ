
const { ipcMain } = require("electron");
const path = require("path");
const fs = require("fs").promises;
const filestat = require("./filestat");
const os = require("os");
const { chat_config } = require("./chat_config");


const js=JSON.stringify;
function chat_file_to_group(filename,raw=false) {
	if (!raw) {
		if (path.dirname(filename)==="❬trash❭") {
			return "\u200Btrash\u200B"+chat_file_to_group(path.basename(filename));
		}
		if (filename==="❬default❭") {
			return "\u200Bdefault";
		}
	}
	let a=filename;
	let group="";
	while (filename.length>0) {
		let m=/^❬(\d+)❭/u.exec(filename);
		if (m) {group+=String.fromCodePoint(parseInt(m[1]));}
		else {group+=filename.charAt(0);}
		filename=filename.slice(m?m[0].length:1,filename.length);
	}
	return group;
}
function chat_group_to_file(group,raw=false) {
	if (raw) {/*nothing*/
	} else if (group==="\u200Bdefault") {
		return "❬default❭";
	} else if (group.startsWith("\u200Btrash\u200B")) {
		let second=group.slice("\u200Btrash\u200B".length,group.length);
		return path.join("❬trash❭",chat_group_to_file(second));
	} else if (group==="\u200Ball") {
		throw new Error(`cannot convert group ${JSON.stringify(group)} to filename`);
	}
	let filename="";
	while (group.length>0) {
		let m=/^([^❬❭/\\~^$%:;?<>"|*\p{C}^]+)/u.exec(group);
		if (/^[.-]/u.exec(group) && !filename.length) {m=null;}
		if (m) {filename+=m[0];}
		else {filename+=`❬${group.codePointAt(0)}❭`;}
		group=group.slice(m?m[0].length:1,group.length);
	}
	return filename;
}
async function ensure_dir(dir) {try {
	try {
		const stat=await fs.stat(dir)
		if (!stat.isDirectory()) {
			await fs.unlink(dir);
			await fs.mkdir(dir);
		}
	} catch(e) {
		if (e.code==="ENOENT") {await fs.mkdir(dir);}
		else {throw e;}
	}
} catch(e) {throw new Error(e);}}
async function chat_get_groups() {try {
	const chats_folder = (await chat_config()).chats_folder;
	await ensure_dir(chats_folder);
	await ensure_dir(path.join(chats_folder,"❬trash❭"));
	await ensure_dir(path.join(chats_folder,"❬default❭"));
	await ensure_dir(path.join(chats_folder,"❬trash❭","❬default❭"));
	const groups=[];
	for (let group of await fs.readdir(chats_folder)) {
		if (group!=="❬trash❭") {
			groups.push(chat_file_to_group(group));
		}
	}
	for (let group of await fs.readdir(path.join(chats_folder,"❬trash❭"))) {
		groups.push(chat_file_to_group(path.join("❬trash❭",group)))
	}
	return groups;
} catch(e) {throw new Error(`error on 'chat_get_groups()': ${e}`);}}
async function chat_create_group(group) {try {
	const chats_folder = (await chat_config()).chats_folder;
	const dir_path = path.join(chats_folder,chat_group_to_file(group));
	await ensure_dir(dir_path);
} catch(e) {throw new Error(`error on 'chat_create_group(${js(group)})': ${e}`);}}
async function chat_remove_group(group) {try {
	const chats_folder = (await chat_config()).chats_folder;
	const dir_path = path.join(chats_folder,chat_group_to_file(group));
	for (let name of await chat_get_chats(group)) {
		await chat_remove_chat(group,name);
	}
	await fs.rmdir(dir_path);
} catch(e) {throw new Error(`error on 'chat_remove_group(${js(group)})': ${e}`);}}
async function chat_get_chats(group) {try {
	const chats_folder = (await chat_config()).chats_folder;
	const dir_path = path.join(chats_folder,chat_group_to_file(group));
	const result=[];
	for (let name of await fs.readdir(dir_path)) {
		if (name.endsWith(".json")) {name=name.slice(0,name.length-".json".length);}
		result.push(chat_file_to_group(name,true));
	}
	return result;
} catch(e) {throw new Error(`error on 'chat_get_chats(${js(group)})': ${e}`);}}
async function chat_save_chat(group,name,messages) {try {
	const chats_folder = (await chat_config()).chats_folder;
	const file_path = path.join(chats_folder,chat_group_to_file(group),chat_group_to_file(name,true))+".json";
	const data=JSON.stringify(messages,null,4);
	if (group.startsWith("\u200Btrash\u200B")) {
		await ensure_dir(path.dirname(file_path));
	}
	await fs.writeFile(file_path,data,"utf8");
} catch(e) {throw new Error(`error on 'chat_save_chat(${js(group)},${js(name)})': ${e}`);}}
async function chat_load_chat(group,name) {try {
	const chats_folder = (await chat_config()).chats_folder;
	const file_path = path.join(chats_folder,chat_group_to_file(group),chat_group_to_file(name,true))+".json";
	let data;
	try {data=await fs.readFile(file_path,"utf8");}
	catch(e) {return [];}
	return JSON.parse(data);
} catch(e) {throw new Error(`error on 'chat_load_chat(${js(group)},${js(name)})': ${e}`);}}
async function chat_move_chat(group,name,newGroup,newName) {try {
	const chats_folder = (await chat_config()).chats_folder;
	const file_path = path.join(chats_folder,chat_group_to_file(group),chat_group_to_file(name,true))+".json";
	const new_file_path = path.join(chats_folder,chat_group_to_file(newGroup),chat_group_to_file(newName,true))+".json";
	if (newGroup.startsWith("\u200Btrash\u200B")) {
		await ensure_dir(path.dirname(new_file_path));
	}
	await fs.rename(file_path,new_file_path);
	if (group.startsWith("\u200Btrash\u200B")) {
		const names=await chat_get_chats(group);
		if (!names.length) {
			await chat_remove_group(group);
		}
	}
} catch(e) {throw new Error(`error on 'chat_move_chat(${js(group)},${js(name)},${js(newGroup)},${js(newName)})': ${e}`);}}
async function chat_remove_chat(group,name) {try {
	const chats_folder = (await chat_config()).chats_folder;
	const file_path = path.join(chats_folder,chat_group_to_file(group),chat_group_to_file(name,true))+".json";
	await fs.unlink(file_path);
	if (group.startsWith("❬trash❭")) {
		await fs.rmdir(path.dirname(file_path));
	}
} catch(e) {throw new Error(`error on 'chat_remove_chat(${js(group)},${js(name)})': ${e}`);}}
async function chat_get_chat_mtime(group,name) {try {
	const chats_folder = (await chat_config()).chats_folder;
	const file_path = path.join(chats_folder,chat_group_to_file(group),chat_group_to_file(name,true))+".json";
	if (filestat(file_path,s=>!s.isDirectory())) {
		return (await fs.stat(file_path)).mtime;
	}
} catch(e) {throw new Error(`error on 'chat_get_chat_mtime(${js(group)},${js(name)})': ${e}`);}}




ipcMain.handle("chat:get-groups",(event)=>chat_get_groups());
ipcMain.handle("chat:create-group",(event,group)=>chat_create_group(group));
ipcMain.handle("chat:remove-group",(event,group)=>chat_remove_group(group));
ipcMain.handle("chat:get-chats",(event,group)=>chat_get_chats(group));
ipcMain.handle("chat:load-chat",(event,group,name)=>chat_load_chat(group,name));
ipcMain.handle("chat:save-chat",(event,group,name,messages)=>chat_save_chat(group,name,messages));
ipcMain.handle("chat:move-chat",(event,group,name,newGroup,newName)=>chat_move_chat(group,name,newGroup,newName));
ipcMain.handle("chat:remove-chat",(event,group,name)=>chat_remove_chat(group,name));
ipcMain.handle("chat:get-chat-mtime",(event,group,name)=>chat_get_chat_mtime(group,name));
module.exports={
};










//
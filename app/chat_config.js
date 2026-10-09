const { ipcMain } = require("electron");
const path = require("path");
const fs = require("fs").promises;
const filestat = require("./filestat");
const os = require("os");


const chat_config_file = path.join(__dirname, "config.json");
const chat_config_default = {
	chats_folder: path.join(os.homedir(), ".zvchat"),
	llamafile_arguments: ["--parallel", "8"],
	llamafile_port: 42975,
	gguf_file_path: "google_gemma-3-1b-it-Q8_0.gguf", // relative from 'models' folder
	theme: "light",
	language: "ru",
	text_entries_ru: {
		default_system_message: "Ты полезный ИИ-ассистент.",
		contextmenu_cut: "Вырезать",
		contextmenu_copy: "Копировать",
		contextmenu_paste: "Вставить",
		contextmenu_select_all: "Выделить всё",
		groupname_all: "Все чаты",
		groupname_default: "Обычное",
		groupname_trash: "Удалённые чаты",
		newchat_pattern: "Новый чат", //{group}
		newchat_pattern_n: "Новый чат ({n})", //{group}, {n}
		deleted_chats_pattern: "{name}", //{name}, {group}
		deleted_chats_pattern_n: "{name} ({n})", //{name}, {group}, {n}
		empty_chat_tooltip: "Чат пуст",
		groups_menu_add_group: "Добавить группу",
		create_group_dialog_text: "Введите имя группы",
		create_group_dialog_placeholder: "Группа...",
		create_group_dialog_cancel: "Отмена",
		create_group_dialog_commit: "Создать",
		create_group_dialog_noinput: "Имя группы не может быть пустым",
		create_group_dialog_alreadyexist: "Такая группа уже существует",
		delete_group_dialog_text: "Удалить группу?",
		delete_group_dialog_commit: "Удалить",
		delete_group_dialog_cancel: "Отмена",
		dialog_no_button: "Нет",
		dialog_yes_button: "Да",
		dialog_ok_button: "Ок",
		dialog_delete_chat_permanently_text: "Удалить безвозвратно?",
		dialog_delete_chat_permanently_yes: "Удалить",
		dialog_delete_chat_permanently_no: "Отмена",
		chat_title_no_chat_selected: "Чат не выбран",
		chat_input_placeholder: "Введите сообщение...",
		cancel_button: "Отмена",
		sidepane_no_chats_in_group: "В группе нет чатов",
		sidepanechat_restore: "Восстановить",
		sidepanechat_restore_selected: "Восстановить ({count} шт)",
		sidepanechat_rename: "Переименовать",
		sidepanechat_delete: "Удалить",
		sidepanechat_delete_selected: "Удалить ({count} шт)",
		sidepanechat_delete_permanently: "Удалить безвозвратно",
		sidepanechat_delete_selected_permanently: "Удалить безвозвратно ({count} шт)",
		dialog_rename_chat_text: "Введите имя",
		dialog_rename_chat_cancel: "Отмена",
		dialog_rename_chat_commit: "Переименовать",
		dialog_rename_chat_nameexist: "Имя занято",
		dialog_rename_chat_nameempty: "Пожалуйста, введите имя",
		settings_pane_header: "Настройки",
		settings_entry_lang: "Язык интерфейса:",
		settings_entry_lang_en: "English",
		settings_entry_lang_ru: "Русский",
		settings_entry_lang_en_tooltip: "English",
		settings_entry_lang_ru_tooltip: "Русский",
		settings_entry_theme: "Цветовая палитра (тема):",
		settings_entry_theme_light_tooltip: "Светлая тема",
		settings_entry_theme_dark_tooltip: "Тёмная тема",
		message_date_options: {
			diff_seconds: null,
			diff_minutes: { locale: "ru-RU", mode: "relative", params: { numeric: "auto", style: "long" } },
			diff_hours: { locale: "ru-RU", mode: "absolute", params: { minute: "2-digit", hour: "2-digit", hour12: false } },
			diff_days: { locale: "ru-RU", mode: "absolute", params: { minute: "2-digit", hour: "2-digit", hour12: false, day: "numeric", month: "long" } },
			diff_months: { locale: "ru-RU", mode: "absolute", params: { day: "numeric", month: "long" } },
			diff_years: { locale: "ru-RU", mode: "absolute", params: { day: "numeric", month: "2-digit", year: "numeric" } },
		}
	},
	text_entries_en: {
		default_system_message: "You are a helpful AI assistant.",
		contextmenu_cut: "Cut",
		contextmenu_copy: "Copy",
		contextmenu_paste: "Paste",
		contextmenu_select_all: "Select all",
		groupname_all: "All chats",
		groupname_default: "General",
		groupname_trash: "Trash",
		newchat_pattern: "New chat", //{group}
		newchat_pattern_n: "New chat ({n})", //{group}, {n}
		deleted_chats_pattern: "{name}", //{name}, {group}
		deleted_chats_pattern_n: "{name} ({n})", //{name}, {group}, {n}
		empty_chat_tooltip: "Chat is empty",
		groups_menu_add_group: "Add group",
		create_group_dialog_text: "Enter group name",
		create_group_dialog_placeholder: "Group...",
		create_group_dialog_cancel: "Cancel",
		create_group_dialog_commit: "Create",
		create_group_dialog_noinput: "Group name cannot be empty",
		create_group_dialog_alreadyexist: "Group already exists",
		delete_group_dialog_text: "Delete group?",
		delete_group_dialog_commit: "Delete",
		delete_group_dialog_cancel: "Cancel",
		dialog_no_button: "No",
		dialog_yes_button: "Yes",
		dialog_ok_button: "Ok",
		dialog_delete_chat_permanently_text: "Delete permanently?",
		dialog_delete_chat_permanently_yes: "Delete",
		dialog_delete_chat_permanently_no: "Cancel",
		chat_title_no_chat_selected: "No chat selected",
		chat_input_placeholder: "Type a message...",
		cancel_button: "Cancel",
		sidepane_no_chats_in_group: "No chats in this group",
		sidepanechat_restore: "Restore",
		sidepanechat_restore_selected: "Restore ({count})",
		sidepanechat_rename: "Rename",
		sidepanechat_delete: "Delete",
		sidepanechat_delete_selected: "Delete ({count})",
		sidepanechat_delete_permanently: "Delete permanently",
		sidepanechat_delete_selected_permanently: "Delete permanently ({count})",
		dialog_rename_chat_text: "Enter name",
		dialog_rename_chat_cancel: "Cancel",
		dialog_rename_chat_commit: "Rename",
		dialog_rename_chat_nameexist: "Name already exists",
		dialog_rename_chat_nameempty: "Please enter a name",
		settings_pane_header: "Settings",
		settings_entry_lang: "Language:",
		settings_entry_lang_en: "English",
		settings_entry_lang_ru: "Russian",
		settings_entry_lang_en_tooltip: "English",
		settings_entry_lang_ru_tooltip: "Russian",
		settings_entry_theme: "Color theme:",
		settings_entry_theme_light_tooltip: "Light theme",
		settings_entry_theme_dark_tooltip: "Dark theme",
		message_date_options: {
			diff_seconds: null,
			diff_minutes: { locale: "en-US", mode: "relative", params: { numeric: "auto", style: "long" } },
			diff_hours: { locale: "en-US", mode: "absolute", params: { minute: "2-digit", hour: "2-digit", hour12: false } },
			diff_days: { locale: "en-US", mode: "absolute", params: { minute: "2-digit", hour: "2-digit", hour12: false, day: "numeric", month: "long" } },
			diff_months: { locale: "en-US", mode: "absolute", params: { day: "numeric", month: "long" } },
			diff_years: { locale: "en-US", mode: "absolute", params: { day: "numeric", month: "2-digit", year: "numeric" } },
		}
	}
};
/*
.params (for mode:"absolute") may be: {
	weekday: 'long' | 'short' | 'narrow',
	year: 'numeric' | '2-digit',
	month: 'numeric' | '2-digit' | 'long' | 'short' | 'narrow',
	day: 'numeric' | '2-digit',
	// Time
	hour: 'numeric' | '2-digit',
	minute: 'numeric' | '2-digit',
	second: 'numeric' | '2-digit',
	hour12: true | false,
	hourCycle: 'h11' | 'h12' | 'h23' | 'h24',
	// Presets
	dateStyle: 'full' | 'long' | 'medium' | 'short',
	timeStyle: 'full' | 'long' | 'medium' | 'short',
	// Timezone
	timeZone: 'America/New_York' | 'Europe/London' | 'Asia/Tokyo' | 'UTC',
	timeZoneName: 'long' | 'short' | 'shortOffset' | 'longOffset' | 'shortGeneric' | 'longGeneric'
}
*/
async function chat_config(entries, full_rewrite = false) {
	try {
		let config_data = chat_config_default;
		if (!full_rewrite) {
			config_data = (
				(await filestat(chat_config_file, s => !s.isDirectory()))
					? JSON.parse(await fs.readFile(chat_config_file, "utf8"))
					: chat_config_default
			);
		}
		for (let k in entries || {}) {
			config_data[k] = entries[k];
		}
		await fs.writeFile(chat_config_file, JSON.stringify(config_data, null, 4), "utf8");
		config_data.text_entries = config_data["text_entries_" + config_data.language];
		return config_data;
	} catch (e) {
		if (e instanceof SyntaxError) {
			return await chat_config(entries);
		}
		throw new Error(`Error on 'chat_config(${JSON.stringify(entries)})': ${e}`);
	}
}

ipcMain.handle("chat:config", (event, override_entries) => chat_config(override_entries));
module.exports = { chat_config_file, chat_config_default, chat_config };










//
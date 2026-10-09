import { open_dialog } from "./uimessage.js";
import { objeq } from "./misc.js";




export class AppSettings {
	constructor() {
		
	}
	open() {
		((async ()=>{
			await open_dialog(async (pane, finish)=>{
				const inner={settings:{
					theme: document.body.dataset.theme,
					lang: (await window.app.config()).language,
				}};
				pane.classList.add("settings-pane-container");
				pane.innerHTML = `
					<row class="settings-pane-header">
						<span class="text"></span>
					</row>
					<column class="settings-pane expand">
						<div class="settings-pane-separator"></div>
						<row class="entry lang">
							<span class="text"></span>
							<div class="button choosebutton en" data-settings="{&quot;lang&quot;:&quot;en&quot;}">
								<span class="text"></span>
							</div>
							<div class="button choosebutton ru" data-settings="{&quot;lang&quot;:&quot;ru&quot;}">
								<span class="text"></span>
							</div>
						</row>
						<row class="entry theme">
							<span class="text"></span>
							<div class="button choosebutton light" data-settings="{&quot;theme&quot;:&quot;light&quot;}"></div>
							<div class="button choosebutton dark" data-settings="{&quot;theme&quot;:&quot;dark&quot;}"></div>
						</row>
					</column>
				`;
				const reload = async()=>{
					Array.from(pane.querySelectorAll(".choosebutton")).forEach(btn=>btn.classList[objeq(JSON.parse(btn.dataset.settings),inner.settings)?"add":"remove"]("selected"));
					await window._textreset(inner.settings.lang);
					const config=await window.app.config({theme:inner.settings.theme});
					document.body.dataset.theme=config.theme;
				}
				Array.from(pane.querySelectorAll(".choosebutton")).forEach(btn=>btn.addEventListener("click",async(event)=>{
					Object.assign(inner.settings,JSON.parse(event.target.closest(".choosebutton").dataset.settings));
					await reload();
				}));
				await reload();
				window._textset.settings_pane_header(s=>{pane.querySelector(".settings-pane-header .text").innerHTML=s;});
				window._textset.settings_entry_lang(s=>{pane.querySelector(".lang>.text").innerHTML=s;});
				window._textset.settings_entry_lang_en(s=>{pane.querySelector(".lang>.en>.text").innerHTML=s;});
				window._textset.settings_entry_lang_ru(s=>{pane.querySelector(".lang>.ru>.text").innerHTML=s;});
				window._textset.settings_entry_lang_en_tooltip(s=>{pane.querySelector(".lang>.en>.text").title=s;});
				window._textset.settings_entry_lang_ru_tooltip(s=>{pane.querySelector(".lang>.ru>.text").title=s;});
				window._textset.settings_entry_theme(s=>{pane.querySelector(".theme>.text").innerHTML=s;});
				window._textset.settings_entry_theme_dark_tooltip(s=>{pane.querySelector(".theme>.dark").title=s;});
				window._textset.settings_entry_theme_light_tooltip(s=>{pane.querySelector(".theme>.light").title=s;});
			});
		})()).catch(e=>{throw e;});
	}
}





//
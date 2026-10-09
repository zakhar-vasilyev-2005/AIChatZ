



export function actual_str_length(str) {
    let count = 0;
    for (let char of str) {
        count++;
    }
    return count;
}

export function escape_html(text) {
	const elem=document.createElement("span");
	elem.textContent=text;
	return elem.innerHTML;
}
export function escape_tag_param(text) {
	return text.replace(/[&<>"]/g, function(match) {
		if (match === '&') return '&amp;';
		if (match === '<') return '&lt;';
		if (match === '>') return '&gt;';
		if (match === '"') return '&quot;';
		return match;
	});
}

//b msut match a
export function objeq(a,b) {
	for (let k in a) {if (a[k]!==b[k]) {return false;}}
	return true;
}

export let html_delete_button = `
	<div class="button delete-button">
		<svg class="icon" viewBox="0 0 24 24"><path d="M7 7L17 17M7 17L17 7"/></svg>
	</div>
`;

export function str_format(template,values) {
	return template.replace(/\{(\w+)\}/g,(_,key)=>values[key]===undefined?`{${key}}`:values[key]);
}

export function wait_for(func) {
	const interval=setInterval(async ()=>{
		const result=func();
		if (result instanceof Promise) {result=await result;};
		if (result) {clearInterval(interval);}
	},10);
}

export function block_contextmenu(elem) {
	elem.addEventListener("contextmenu",event=>{
		event.preventDefault();
		event.stopPropagation();
	});
}

export function insertChild(parent,elem,index) {
	if (index) {
		parent.children[index-1].insertAdjacentElement("afterend",elem);
	} else {
		parent.insertAdjacentElement("afterbegin",elem);
	}
}

export function on_elem_added(elem,callback) {
	const observer = new MutationObserver((mutations) => {
		mutations.forEach((mutation) => {
			mutation.addedNodes.forEach((node) => {
				for (let e of [elem,...elem.querySelectorAll("*")]) {
					if (e===elem) {callback();}
				}
			});
		});
	});
	observer.observe(document.body,{childList:true,subtree:true});
	return observer;
}

export function wait_elem_added(elem,callback) {
	const observer=on_elem_added(elem,()=>{callback();observer.disconnect();})
}

export function getTimeFormatter(options) {
	const default_diff={
		locale: "en-US",
		mode: "absolute",
		params: {
			minute: "2-digit",
			hour: "2-digit",
			hour12: false,
			day: "numeric",
			month: "2-digit",
			year: "numeric"
		},
	};
	default_diff.format=new Intl.DateTimeFormat(default_diff.locale,default_diff.params).format;
	const presets={
		"seconds": {count:1000,max:60,args:options.diff_seconds},
		"minutes": {count:1000*60,max:60,args:options.diff_minutes},
		"hours": {count:1000*60*60,max:24,args:options.diff_hours},
		"days": {count:1000*60*60*24,max:30,args:options.diff_days},
		"months": {count:1000*60*60*24*30,max:12,args:options.diff_months},
		"years": {count:1000*60*60*24*365,max:999999,args:options.diff_years||default_diff}
	};
	for (let k in presets) {
		const p=presets[k];
		if (!p.args) {continue;}
		try {
			if (p.args.mode==="relative") {
				p.formatter=new Intl.RelativeTimeFormat(p.args.locale,p.args.params);
				p.format=(date,now)=>{
					const diff=Math.round((date-now)/p.count);
					return p.formatter.format(diff,k);
				};
			} else {
				p.formatter=new Intl.DateTimeFormat(p.args.locale,p.args.params);
				p.format=(date,now)=>{
					return p.formatter.format(date);
				}
			}
		} catch(e) {
			console.log("Error:",e);
			p.args=null;
		}
	}
	return function(date) {
		const now = new Date();
		for (let k of ["seconds","minutes","hours","days","months","years"]) {
			const p=presets[k];
			if ((!p.args) || Math.round((now-date)/p.count)>=p.max) {continue;}
			const result=p.format(date,now);
			return result;
		}
	}
}








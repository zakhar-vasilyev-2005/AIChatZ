import { escape_html, escape_tag_param, actual_str_length } from "./misc.js";



export function split_substring(text,params=undefined) {
	const orig_text=text;
	params=params?params:{};
	let literals=[
		s=>[/^[*_](?=\S)([*_]*?.+?)(?<=\S)[*_](?![*_])/u.exec(s)].filter(e=>!!e)
		.map(m=>({raw:m[0],text:m[1],bold:(params.bold||0)+1}))[0],
		s=>[/^`([^`]+)`/u.exec(s)].filter(e=>!!e)
		.map(m=>({raw:m[0],text:m[1],inline:true}))[0],
		s=>[/^\[([^\[\]]*)\]\(((https?|ftps?|file)(:\/+).*)\)/u.exec(s)].filter(e=>!!e)
		.map(m=>({raw:m[0],text:m[1],bold:(params.bold||0),link:m[2]}))[0],
		s=>[/^((https?|ftps?|file)(:\/+)[\u0021-\u007E]+)/u.exec(s)].filter(e=>!!e)
		.map(m=>({raw:m[0],text:m[1],bold:(params.bold||0),link:m[1]}))[0],
		s=>[/^./u.exec(s)].filter(e=>!!e)
		.map(m=>({raw:m[0],text:m[0],bold:(params.bold||0)}))[0],
	];
	let items=[];
	while (text.length) {
		const m=literals.map(f=>f(text)).reduce((a,b)=>a||b);
		text=text.slice(m.raw.length,text.length);
		delete m.raw;
		items.push(m);
	}
	let tokens=[];
	for (let i=0; i<items.length; i++) {
		const m=items[i];
		if (actual_str_length(m.text)===1) {
			tokens.push(m);
		} else {
			if (m.inline) {
				tokens.push(m);
			} else {
				tokens.push(...split_substring(m.text,m));
			}
		}
	}
	let buffer=[];
	for (let i=0; i<tokens.length; i++) {
		const prev=buffer.length?buffer.at(-1):null;
		const tok=tokens[i];
		if (
			prev
			&& buffer.length && tok.bold===prev.bold
			&& !prev.inline && !tok.inline
			&& !tok.link && !prev.link
		) {
			prev.text+=tok.text;
		} else {
			buffer.push(tok);
		}
	}
	return buffer;
}
export function join_substring(buffer) {
	let result="";
	for (let i=0; i<buffer.length; i++) {
		const tok=buffer[i];
		let [prefix,suffix]=[["",""],["<i>","</i>"],["<b>","</b>"],["<b><i>","</b></i>"]][Math.min(3,tok.bold||0)]
		if (tok.inline) {prefix="<span class=\"inline-code\">";suffix="</span>";}
		let part=prefix+escape_html(tok.text)+suffix;
		if (tok.link) {part=`<a href="${escape_tag_param(tok.link)}">${part}</a>`}
		result+=part;
	}
	return result;
}

export function parse_list_data(data) {
	for (let i=0; i<data.levels.length; i++) {
		let lvl=data.levels[i];
		for (let j=0; j<data.items.length; j++) {
			const item=data.items[j];
			const prev=data.items[j-1]||{};
			if (item.item_level===lvl) {
				item.real_level=i;
			}
		}
	}
	let buffer=[]
	let group=[];
	const lvl=data.levels.shift();
	for (let j=0; j<data.items.length; j++) {
		const item=data.items[j];
		if (item.item_level===lvl) {
			if (group.length) {
				buffer.push(...parse_list_data({levels:data.levels,items:group}))
				group=[];
			}
			buffer.push(item)
		} else if (item.item_level>lvl) {
			group.push(item)
		}
	}
	if (group.length) {
		buffer.push(...parse_list_data({levels:data.levels,items:group}))
	}
	let is_next=(next,prev)=>{
		if (/^[+*-]$/u.exec(prev) || /^[+*-]$/u.exec(next)) {return prev===next;}
		const m_prev=/^((.*?\.)?)(\p{L}|\d+)$/u.exec(prev);
		const m_next=/^((.*?\.)?)(\p{L}|\d+)$/u.exec(next);
		if (m_prev[1]!==m_next[1]) {return false;}
		let prev_n=parseInt(m_prev[3]);
		let next_n=parseInt(m_next[3]);
		if ((prev_n===NaN)!==(next_n===NaN)) {return false;}
		if (prev_n===NaN) {return m_prev[3]===m_next[3];}
		return prev_n+1===next_n;
	};
	let is_similar=(next,prev)=>{
		if (/^[+*-]$/u.exec(prev) || /^[+*-]$/u.exec(next)) {return prev===next;}
		const m_prev=/^((.*?\.)?)(\p{L}|\d+)$/u.exec(prev);
		const m_next=/^((.*?\.)?)(\p{L}|\d+)$/u.exec(next);
		if (m_prev[1]!==m_next[1]) {return false;}
		let prev_n=parseInt(m_prev[3]);
		let next_n=parseInt(m_next[3]);
		return (prev_n===NaN)===(next_n===NaN);
	};
	let prev_marker=buffer.reduce((a,b)=>a.item_marker?a:b).item_marker;
	buffer[0].change_marker=prev_marker;
	buffer[0].split_list=true;
	for (let i=1; i<buffer.length; i++) {
		if (!buffer[i].item_marker) {continue;}
		if (!is_next(buffer[i].item_marker,prev_marker)) {
			buffer[i].change_marker=buffer[i].item_marker;
		}
		if (!is_similar(buffer[i].item_marker,prev_marker)) {
			buffer[i].split_list=true;
		}
		prev_marker=buffer[i].item_marker;
	}
	let chunks=[];
	for (let i=0; i<buffer.length; i++) {
		const item=buffer[i];
		if (item.split_list) {
			chunks.push([item]);
		} else {
			chunks.at(-1).push(item);
		}
	}
	return chunks;
}

export function parse_list_data_html(data,rewrite=undefined) {
	const lists=rewrite||parse_list_data(data);
	let result=[];
	for (let i=0; i<lists.length; i++) {
		const list=lists[i];
		const first_marker=list[0].change_marker;
		delete list[0].change_marker;
		let content=[];
		for (let j=0; j<list.length; j++) {
			const item=list[j];
			if (item.item_html) {
				if (item.change_marker!==undefined && !/^[*+-]$/u.exec(item.change_marker)) {
					content.push(`<li value="${escape_tag_param(item.change_marker)}">${item.item_html}</li>`);
				} else {
					content.push(`<li>${item.item_html}</li>`);
				}
			} else {
				content.push(parse_list_data_html(null,[item]));
			}
		}
		if (/^[*+-]$/u.exec(first_marker)) {
			result.push(`<ul class="list-${{"*":"star","-":"dash","+":"plus"}[first_marker]}">\n${content.join("\n")}\n</ul>\n`);
		} else {
			result.push(`<ol start="${first_marker}">\n${content.join("\n")}\n</ol>`);
		}
	}
	return result.join("\n");
}

export function parse_markdown(text) {
	const line_literals=[
		s=>{
			const m=/^ *(\|((?!\|):?-* *(.*?) *-*:?\|)+) *$/u.exec(s);
			return m?{table_line:m[1].split("|").filter(e=>!!e.length).map(
				e=>/^:?-* *(.*?) *-*:?$/u.exec(e)[1]
			)}:null;
		},
		s=>{
			const m=/^(>+) *(.*?) *$/u.exec(s);
			return m?{cite:m[2],level:m[1].length}:null;
		},
		s=>{
			const m=/^ *[ _*=-]{3,} *$/u.exec(s);
			return m?{separator:m[0]}:null;
		},
		s=>{
			const m=/^``` *(.*?) *$/u.exec(s);
			return m?{block_lang:m[1]}:null;
		},
		s=>/^ *$/u.exec(s)?{line:"",level:0}:null,
		s=>{
			const m=/^(#*)( *.*?) *$/u.exec(s);
			return m?{line:m[2],level:m[1].length}:null;
		},
	]
	let lines_arr=text.split("\n");
	let literals=[]; //{block,lang,lang_prefix},{line,level},{separator},{cite,level},{table_line}
	for (let i=0; i<lines_arr.length;) {
		const line=lines_arr[i];
		const m=line_literals.map(rule=>rule(line)).reduce((a,b)=>a||b);
		if (!m) {
			i++;
			literals.push({line,level:0});
		} else if (m.block_lang) {
			let lang_m=/^((.*[:.])?)([^:.]+)$/u.exec(m.block_lang);
			let block=[];
			i++;
			while (i<lines_arr.length) {
				const line_m=/^``` *$/u.exec(lines_arr[i]);
				if (line_m) {break;}
				else {block.push(lines_arr[i]);}
				i++;
			}
			literals.push({block:block.join("\n"),lang:lang_m[3],lang_prefix:lang_m[1]});
		} else {
			i++;
			literals.push(m)
		}
	}
	let blocks=[]; //{block_html},{line,level},{separator},{cite_html},{table}
	for (let i=0; i<literals.length; i++) {
		let m=literals[i];
		const prev=blocks.at(-1)||{};
		if (m.table_line && !prev.table) {
			blocks.push({table:[m.table_line]});
		} else if (m.table_line && prev.table) {
			prev.table.push(m.table_line);
		} else if (m.cite && !prev.cite_content) {
			blocks.push({cite_content:[">".repeat(m.level-1)+m.cite]});
		} else if (m.cite && prev.cite_content) {
			prev.cite_content.push(">".repeat(m.level-1)+m.cite);
		} else if (m.block) {
			blocks.push({block_html:`
				<div class="code-block">
					<div class="code-header">
						<span class="prefix">${escape_html(m.lang_prefix)}</span>
						<span class="language">${escape_html(m.lang)}</span>
					</div>
					<pre>${m.block}</pre>
				</div>
			`});
		} else {
			blocks.push(m);
		}
		m=blocks.at(-1);
		if (m.cite_content && (i===literals.length-1 || !literals[i+1].cite)) {
			let content=blocks.at(-1).cite_content.map(e=>e.split(1,e.length)).join("\n");
			delete blocks.at(-1).cite_content;
			blocks.at(-1).cite_html="<cite>\n"+parse_markdown(content)+"\n</cite>";
		}
	}
	let buffer=[]; //{block_html},{line_html},{item_html(content),item_marker,item_level},{separator_html},{cite_html},{table_html}
	for (let i=0; i<blocks.length; i++) {
		const m=blocks[i];
		if (m.line!==undefined) {
			const parts=split_substring(m.line);
			if (parts.length) {
				let raw=parts.map(e=>e.text).join("\n");
				let list_m=/^( *)([*+-]|(((\d+|\p{L})\.)*(\d+|\p{L}))\.)/u.exec(raw);
				if (!m.level && list_m) {
					const marker=list_m[3]?list_m[3]:list_m[2];
					let prefix=list_m[0];
					let new_parts=[];
					for (let i=0; i<parts.length; i++) {
						let part=parts[i].text;
						while (part.length && part.charAt(0)===prefix.charAt(0)) {
							part=part.slice(1,part.length);
							prefix=prefix.slice(1,prefix.length);
						}
						parts[i].text=part;
						new_parts.push(parts[i]);
					}
					buffer.push({
						item_html:join_substring(new_parts),
						item_marker: marker,
						item_level:list_m[1].length
					});
				} else {
					const tag=m.level?`h${Math.min(6,m.level)}`:"p";
					buffer.push({line_html:`<${tag}>${join_substring(parts)}</${tag}>`});
				}
			} else {
				buffer.push({line_html:"<p class=\"empty-line\"></p>"});
			}
		} else if (m.separator) {
			buffer.push({separator_html:"<separator></separator>"});
		} else if (m.table) {
			const table=[];
			for (let y=0; y<m.table.length; y++) {
				const line={elems:m.table[y]};
				const is_separator=line.elems.every(e=>!e.length);
				const is_header=y<m.table.length-1&&m.table[y+1].every(e=>!e.length);
				if (!y||!is_separator) {
					table.push([]);
					for (let x=0; x<line.elems.length; x++) {
						const elem=line.elems[x].replace(/<br\/?>/gu,"\n");
						const tag=is_header?"th":"td";
						table.at(-1).push(`<${tag}>${parse_markdown(elem)}</${tag}>`)
					}
					table.push("<tr>"+table.pop().join("\n")+"</tr>");
				}
			}
			buffer.push({table_html:"<table>\n"+table.join("")+"\n</table>"});
		} else {
			buffer.push(m);
		}
	}
	let result=[];
	for (let i=0; i<buffer.length; i++) {
		let m=buffer[i];
		const prev=result.at(-1)||{};
		if (m.item_html && !prev.items) {
			result.push({items:[m],levels:[m.item_level]})
		} else if (m.item_html && prev.items) {
			prev.levels.push(m.item_level);
			prev.items.push(m);
		} else if (m.line_html) {
			result.push(m.line_html);
		} else if (m.table_html) {
			result.push(m.table_html);
		} else if (m.block_html) {
			result.push(m.block_html);
		} else if (m.separator_html) {
			result.push(m.separator_html);
		} else if (m.cite_html) {
			result.push(m.cite_html);
		}
		m=result.at(-1)||{};
		if (m.items && (i===buffer.length-1 || !buffer[i+1].item_html)) {
			m.levels=m.levels.reduce((acc,lvl)=>acc.some(e=>e===lvl)?acc:[...acc,lvl],[]);
			m.levels.sort()
			result.pop();
			result.push(parse_list_data_html(m));
		}
	}
	return result.join("\n");
}


















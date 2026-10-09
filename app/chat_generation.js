const { spawn } = require('child_process');
const http = require('http');
const { chat_config } = require("./chat_config");
const { ipcMain } = require("electron");



function chat_wait_llama_server(port) {
	return new Promise((resolve, reject) => {
		const interval = setInterval(() => {
			http.get(`http:/localhost:${port}/health`, (response) => {
				response.on("data", (buffer) => {
					let data;
					try { data = JSON.parse(buffer.toString()); }
					catch (e) { data = {} };
					if (data.status !== "ok") {
						clearInterval(interval);
						reject(`bad response for "/health": ${JSON.stringify(data.toString())}`);
					} else {
						clearInterval(interval);
						resolve(data);
					}
				})
			}).on("error", (error) => {
				if (error.code !== "ECONNREFUSED") {
					clearInterval(interval);
					reject(error);
				}
			});
		}, 100);
	});
}
async function chat_generate(messages, params = undefined, on_token = undefined) {
	const config = await chat_config()
	return await new Promise((resolve, reject) => {
		const args = params || {};
		params.messages = messages;
		params.stream = true;
		try {
			const text = JSON.stringify(params);
			const options = {
				hostname: "localhost",
				port: config.llamafile_port,
				method: "POST",
				path: "/v1/chat/completions",
				headers: {
					"Content-Type": "application/json",
				}
			};
			const request = http.request(options, (response) => {
				const inner = { buffer: "", result: "" };
				response.on("data", (buffer) => {
					inner.buffer += buffer.toString().slice(5, buffer.length);
					if (inner.buffer.indexOf("\n") !== -1) {
						const chunks = inner.buffer.split("\n");
						for (let chunk of chunks.slice(0, chunks.length - 1)) {
							if (!chunk.length) { continue; }
							const data = JSON.parse(chunk.trim()).choices[0];
							const token = data.delta.content || "";
							if (data.finish_reason) {
								response.destroy();
								resolve(inner.result);
							} else {
								inner.result += token;
								(on_token || (_ => 0))(token);
							}
						}
						inner.buffer = chunks.at(-1);
					}
				})
			})
			request.write(text);
			request.end();
		} catch (e) { reject(e); }
	});
}
async function chat_generation_init() {
	try {
		const config = await chat_config();
		const args = [
			"--server", "--port", `${config.llamafile_port}`,
			"--log-disable", "--nobrowser",
			"--model", config.gguf_file_path,
			...config.llamafile_arguments,
		];
		const proc = spawn("../llamafile.com", args, {
			cwd: path.join(path.dirname(__dirname), "models"),
			detached: false,
			//stdio: ["ignore","ignore","ignore"],
			windowHide: true,
		});
		const proc_inner = { stderr: "" };
		proc.stderr.on("data", (data) => { proc_inner.stderr += data.toString("utf8"); });
		proc.on("close", (code) => {
			throw new Error(`'llamafile.com' exited with error ${code}: ${proc_inner.stderr}`);
		});
		await chat_wait_llama_server(config.llamafile_port);
		chat_generation_data.can_generate = true;
	} catch (e) { throw new Error(`Error in chat_generation_init(): ${e}`); }
}

const chat_generation_data = { line_counter: 0, can_generate: false };
async function chat_generation_restart(messages, params = undefined) {
	const line_id = chat_generation_data.line_counter++;
	chat_generation_data[line_id] = "";
	function update(callback) {
		if (chat_generation_data.can_generate) {
			chat_generate(messages, params, token => {
				chat_generation_data[line_id] += token;
			}).then(() => {
				delete chat_generation_data[line_id];
			}).catch(e => { throw e; });
			callback();
		} else {
			setTimeout(update, 10);
		}
	}
	await new Promise((resolve) => update(resolve));
	return line_id;
}
async function chat_generation_read(line_id) {
	if (chat_generation_data[line_id] === undefined) { return; }
	const delta = chat_generation_data[line_id];
	chat_generation_data[line_id] = "";
	return delta;
}


ipcMain.handle("chat:restart-generation", (event, messages, params) => chat_generation_restart(messages, params));
ipcMain.handle("chat:read-generation", (event, line_id) => chat_generation_read(line_id));
module.exports = {
	chat_wait_llama_server,
	chat_generate,
	chat_generation_init,
	chat_generation_restart,
	chat_generation_read,
};














//
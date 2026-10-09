const path = require("path");
const fs = require("fs").promises;






module.exports=async function(file,func=undefined) {
	try {
		const stat=await fs.stat(file);
		return (func||(a=>a))(stat);
	} catch(e) {
		if (e.code==="ENOENT") {return false;}
		else {throw e;}
	}
}














//
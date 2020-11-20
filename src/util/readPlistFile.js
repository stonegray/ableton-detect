import path from 'path';
import fs from 'fs';
import plist from 'plist';


export default async function readPlistFile(pluginPath) {
	// Read the plist file:
	const plistFile = path.join(pluginPath, './Contents/Info.plist');

	let fileContents;
	try {
		fileContents = await fs.promises.readFile(plistFile, 'utf8');
	} catch (e) {
		console.error('Skipped plugin, missing Info.plist: ' + pluginPath);
		return e;
	}

	return plist.parse(fileContents);
}
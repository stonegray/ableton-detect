import fs from 'fs';

export default async function readJSONFile(file) {
	// Read the plist file:

	let fileContents;
	let object;
	try {
		fileContents = await fs.promises.readFile(file, 'utf8');
		object = JSON.parse(fileContents);
	} catch (e) {
		console.error('Skipped plugin, missing Info.plist: ' + file);
		return e;
	}

	return object;
}
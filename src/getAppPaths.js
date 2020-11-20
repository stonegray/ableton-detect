import path from 'path';
import fs from 'fs';
import os from 'os';

export async function getAppPaths(searchDirectories) {

	// Use defaults if no paths provided
	if (!searchDirectories) {
		searchDirectories = [
			'/Applications',
			path.join(os.homedir(), './Applications')
		];
	}

	// Array of all applications detected in folder
	let apps = [];

	for (const dir of searchDirectories) {

		// Read search directory and find all applications in it
		let thisApps = await fs.promises.readdir(dir, {
			withFileTypes: true
		});

		// Shoehorn some directory information into each app field before
		// we lose context... grrr why don't DirEnt objects store path info?
		thisApps = thisApps.map(a => {
			a.dir = dir;
			return a;
		});

		// Join arrays
		apps = apps.concat(...thisApps);
	}
	return apps;
}

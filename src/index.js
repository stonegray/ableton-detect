// Ableton version and install info

import runtimeTests from './runtimeTests.js';
import { getAppPaths } from './getAppPaths.js';
import scanApplication from './scanApplication.js';

// Take an optional path to a directory of applications, and return
// an array of Ableton installs with detailed information.

export default async function getAbletons(searchDirectories) {

	// Get an array of applications by collecting a list of
	// directories within searchDirectories
	const apps = await getAppPaths(searchDirectories);

	const installedAbletons = [];

	// For each application, quickly determine if it's an Ableton.
	for (const app of apps) {

		// Retrieve basic information:
		const appInfo = await scanApplication(app);

		// If we don't return a value, skip the rest:
		if (!appInfo) continue;

		// Run checks
		appInfo.errors = await runtimeTests(appInfo);

		// Easy boolean check if the Ableton has known issues
		appInfo.ok = appInfo.errors.length === 0;

		// Add to output array:
		installedAbletons.push(appInfo);
	}

	// Return array on completion of loop:
	return installedAbletons;
}


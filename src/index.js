// Ableton version and install info

import path from 'path';
import fs from 'fs';
import os from 'os';

import semver from 'semver';

import getHeaderBytes from './getHeaderBytes.js';
import getLicencesByVersion from './getLicenceInfo.js';
import readPlistFile from './util/readPlistFile.js';
import readJSONFile from './util/readJSONFile.js';
import runtimeTests from './runtimeTests.js';
	
const abletonFilenameRegex = /Ableton .{1,100}(\.app)?/gm;

async function getArchitectureFromMacho(executablePath) {
	const header = await getHeaderBytes(executablePath, 8);

	const headerBytesHex = header.toString('hex');

	// Architecture values defined here:
	// https://opensource.apple.com/source/cctools/cctools-836/include/mach/machine.h

	// First int (magic) is defined here:
	// https://opensource.apple.com/source/xnu/xnu-1456.1.26/EXTERNAL_HEADERS/mach-o/loader.h

	switch (headerBytesHex) {

	// MH_CIGAM_64, CPU_TYPE_I386 | CPU_ARCH_ABI64
	case 'cffaedfe07000001':
		// MH_MAGIC_64, CPU_TYPE_I386 | CPU_ARCH_ABI64
	case 'cafebabe07000001':
		return ['x64'];

		// MH_CIGAM, CPU_TYPE_I386
	case 'cefaedfe07000000':
		// MH_MAGIC, CPU_TYPE_I386
	case 'cafebabe07000000':
		return ['x32'];

		// MH_CIGAM_64, CPU_TYPE_ARM | CPU_ARCH_ABI64
	case 'cffaedfe12000001':
		return ['arm64'];

	default:
		return ['unknown'];
	}

}

async function getAppPaths(searchDirectories) {

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

async function parsePlistData(plistData){


	return {};
}

async function getAppInfo(app){
	// macOS applications are directories, so we can immediately exclude
	// anything that isn't a directory type.
	if (!app.isDirectory()) return false;

	// If the name doesn't start with "Ableton Live..." then skip it. Users
	// can rename their Ableton instances so this check should be more broad
	// than just "\d{1,2}\W\w+\.app"...
	// https://help.ableton.com/hc/en-us/articles/209775945-Installing-multiple-versions-of-Live
	if (!app.name.match(abletonFilenameRegex)) return false;

	// Get plist file:
	const plistData = await readPlistFile(path.join(app.dir, app.name));
	if (plistData instanceof Error) return false;

	// Check if this is actually Live; not another application renamed. If there's a matching
	// CFBundleIdentifier we can probably skip sanity checking the rest. 
	if (plistData?.CFBundleIdentifier !== 'com.ableton.live') return false;

	// By now we have an Ableton, so let's collect some info about it.
	const info = { errors: [] };

	// Populate basic file info:
	info.relPath = app.name;
	info.absPath = path.join(app.dir, app.name);

	// Read installed variaent:
	// ps: I had to download Intro and diff the entire folder to find this because I'm 
	// dumb and didn't bother checking an obvious .cfg file
	const installInfo = await readJSONFile(path.join(
		app.dir, app.name, './Contents/Resources/Installation.cfg'
	));
	
	info.variant = installInfo.variant;

	// Read variant file:
	const installFilePath = path.join(app.dir, app.name, './Contents/Resources/Installation.cfg');
	info.variant = (await readJSONFile(installFilePath)).variant;


	// I'm using a dirty trick to get the first word, basically just creating an
	// ephemeral array and popping the first off, which is the version string.
	info.version = semver.coerce(plistData.CFBundleVersion.split(' ').shift());

	info.fullVersion = plistData.CFBundleVersion;

	info.minSystemVersion = plistData.LSMinimumSystemVersion;

	// Get the icon path so we can show the correct icons for different versions/varients
	// like the green icon for Intro.
	info.icon = path.join(app.dir, app.name, './Contents/Resources', plistData.CFBundleIconFile);


	// Check if binary is 32-bit or 64-bit:
	info.arch = await getArchitectureFromMacho(path.join(
		app.dir, app.name, './Contents/MacOS/Live'
	));

	// Get licence information (Experimental)
	const licences = await getLicencesByVersion(info.version);

	info.addons = [];

	for (const l of licences){

		// Seperate addons, and append to info obj:
		if (l.productIdRaw[0] !== 0x00 || l.productIdRaw[1] > 5) {
			info.addons.push(l);
			continue;
		}

		// Otherwise, probably a product:
		if (l.productIdRaw[1] == 0x00 && info.variant == 'Suite') info.licence = l;

		if (l.productIdRaw[1] == 0x01 && info.variant == 'Standard') info.licence = l;

		if (l.productIdRaw[1] == 0x02 && info.variant == 'Intro') info.licence = l;

		if (l.productIdRaw[1] == 0x04 && info.variant == 'Lite') info.licence = l;
	}

	return info;
}

export default async function getAbletons(searchDirectories) {

	// Get list of possible apps by collecting a list of .app
	// directories within searchDirectories
	const apps = await getAppPaths(searchDirectories);

	const installedAbletons = [];

	// For each application, quickly determine if it's an Ableton.
	for (const app of apps) {

		// Retrieve basic information:
		const appInfo = await getAppInfo(app);

		// If we don't return a value, skip the rest:
		if (!appInfo) continue;

		// Run checks
		appInfo.errors = await runtimeTests(appInfo);

		// Easy boolean check if the Ableton has known issues
		appInfo.ok = appInfo.errors.length === 0;

		// Add to output array:
		installedAbletons.push(appInfo);
	}

	return installedAbletons;
}


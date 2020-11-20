// Ableton version and install info

import path from 'path';
import fs from 'fs';
import os from 'os';

import macosRelease from 'macos-release';
import plist from 'plist';
import semver from 'semver';

import getHeaderBytes from './getHeaderBytes.js';
import getLicencesByVersion from './getLicenceInfo.js';

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

async function getAppInfo(app){
	// macOS applications are directories, so we can immediately exclude
	// anything that isn't a directory type.
	if (!app.isDirectory()) return false;

	// If the name doesn't start with "Ableton Live..." then skip it. Users
	// can rename their Ableton instances so this check should be more broad
	// than just "\d{1,2}\W\w+\.app"...
	// https://help.ableton.com/hc/en-us/articles/209775945-Installing-multiple-versions-of-Live

	const regex = /Ableton .{1,100}(\.app)?/gm;
	if (!app.name.match(regex)) return false;

	// Read the plist file:
	const plistFile = path.join(app.dir, app.name, './Contents/Info.plist');

	let plistData;
	try {
		plistData = plist.parse(await fs.promises.readFile(plistFile, 'utf8'));
	} catch(e){
		console.warn('Failed to parse Live instance, failed to read Info.plist');
		plistData = {};
	}

	// By now we have an Ableton, so let's collect some info about it.
	const info = {
		relPath: '',
		absPath: '',
		version: '',
		fullVersion: '',
		minSystemVersion: '',
		language: '',
		variant: '',
		icon: '',
		ok: false,
		errors: []
	};

	// Check if this is actually Live; not another application renamed. If there's a matching
	// CFBundleIdentifier we can probably skip sanity checking the rest. 
	if (typeof plistData.CFBundleIdentifier == 'undefined') {
		console.warn('Failed to parse Live instance, malformed Info.plist');
		return false;
	}
	if (plistData.CFBundleIdentifier !== 'com.ableton.live') {
		console.warn('Failed to parse Live instance, incorrect CFBundleIdentifier');
		return false;
	}

	// Read installed variaent:
	// ps: I had to download Intro and diff the entire folder to find this because I'm 
	// dumb and didn't bother checking an obvious .cfg file
	const installInfo = JSON.parse(
		await fs.promises.readFile(
			path.join(app.dir, app.name, './Contents/Resources/Installation.cfg')
		)
	);

	info.variant = installInfo.variant;

	info.relPath = app.name;
	info.absPath = path.join(app.dir, app.name);

	// I'm using a dirty trick to get the first word, basically just creating an
	// ephemeral array and popping the first off, which is the version string.
	info.version = semver.coerce(plistData.CFBundleVersion.split(' ').shift());

	info.fullVersion = plistData.CFBundleVersion;

	info.minSystemVersion = plistData.LSMinimumSystemVersion;

	// Get the icon path so we can show the correct icons for different versions/varients
	// like the green icon for Intro.
	info.icon = path.join(app.dir, app.name, './Contents/Resources', plistData.CFBundleIconFile);

	// Check if binary is 32-bit or 64-bit:
	const executablePath = path.join(app.dir, app.name, './Contents/MacOS/Live');

	info.arch = await getArchitectureFromMacho(executablePath);

	const systemVersion = semver.coerce(macosRelease().version);

	// Detect unusable instance, ia32 on x64 when >= catalina
	if (semver.gt(systemVersion, semver.coerce('10.15.0'))) {
		if (info.arch.includes('x32')) {
			info.errors.push('Current platform does not support 32-bit Ableton');
		}
	}

	// Detect unusable instance, arm64 when =< Big Sur
	if (semver.lt(systemVersion, semver.coerce('11.0.0'))) {
		if (info.arch.includes('arm64')){
			info.errors.push('Current OS does not support arm64 binaries');
		}
	}

	// Detect x64 on x32, which is always unsupported
	if (os.arch() == 'x32' && info.arch.includes('x64')){
		info.errors.push('64-bit binaries are not supported on 32-bit OSs');
	}

	// Check that the version is supported:
	if (semver.lt(
		semver.coerce(macosRelease().version),
		semver.coerce(info.minSystemVersion)
	)){
		info.errors.push(`Unsupported OS, needs ${info.minSystemVersion} or newer`);
	}

	return info;
}

export default async function getAbletons(searchDirectories) {

	const apps = await getAppPaths(searchDirectories);

	const installedAbletons = [];

	// For each application, quickly determine if it's an Ableton.
	for (const app of apps) {

		// Retrieve basic information for this
		const appInfo = await getAppInfo(app);

		// If we don't return a value, skip the rest:
		if (!appInfo) continue;

		// Try to get licence information:

		// Get licence information (Experimental)
		const licences = await getLicencesByVersion(appInfo.version);

		appInfo.addons = [];
		appInfo.licence = null;

		for (const l of licences){

			// Seperate addons, and append to info obj:
			if (l.productIdRaw[0] !== 0x00 || 
				l.productIdRaw[1] > 5 ) {
				appInfo.addons.push(l);
				continue;
			}

			// Otherwise, probably a product:
			if (l.productIdRaw[1] == 0x00 && appInfo.variant == 'Suite'){
				appInfo.licence = l;
			}

			if (l.productIdRaw[1] == 0x01 && appInfo.variant == 'Standard'){
				appInfo.licence = l;
			}

			if (l.productIdRaw[1] == 0x02 && appInfo.variant == 'Intro'){
				appInfo.licence = l;
			}

			if (l.productIdRaw[1] == 0x04 && appInfo.variant == 'Lite'){
				appInfo.licence = l;
			}
		}

		// Throw error if we don't have a licence:
		if (appInfo.licence == null){
			appInfo.errors.push(`Missing licence for ${appInfo.variant} version ${appInfo.version}`);
		}

		// Easy boolean check if the Ableton has known issues
		appInfo.ok = appInfo.errors.length === 0;


		installedAbletons.push(appInfo);
	}

	return installedAbletons;
}


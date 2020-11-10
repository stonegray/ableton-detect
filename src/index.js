// Ableton version and install info

import path from 'path';
import fs from 'fs';
import os from 'os';

import macosRelease from 'macos-release';
import plist from 'plist';
import semver from 'semver';

import getHeaderBytes from './getHeaderBytes.js';

// Search given paths and get information about installed Ableton versions.

export default async function getAbletons(searchDirectories) {

	// Use defaults if no paths provided
	if (!searchDirectories) {
		searchDirectories = [
			'/Applications',
			path.join(os.homedir(), "./Applications")
		]
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

	const installedAbletons = [];

	// For each application, quickly determine if it's an Ableton.
	for (const app of apps) {

		// macOS applications are directories, so we can immediately exclude
		// anything that isn't a directory type.
		if (!app.isDirectory()) continue;

		// If the name doesn't start with "Ableton Live..." then skip it. Users
		// can rename their Ableton instances so this check should be more broad
		// than just "\d{1,2}\W\w+\.app"...
		// https://help.ableton.com/hc/en-us/articles/209775945-Installing-multiple-versions-of-Live

		const regex = /Ableton .{1,100}(\.app)?/gm;
		if (!app.name.match(regex)) continue;

		// Read the plist file:
		const plistFile = path.join(app.dir, app.name, "./Contents/Info.plist");

		let plistData;
		plistData = plist.parse(await fs.promises.readFile(plistFile, 'utf8'));

		// By now we have an Ableton, so let's collect some info about it.
		const info = {
			relPath: "",
			absPath: "",
			version: "",
			fullVersion: "",
			minSystemVersion: "",
			language: "",
			variant: "",
			icon: "",
			licenceStatus: "",
			ok: false,
			errors: []
		}

		// Check if this is actually Live; not another application renamed. If there's a matching
		// CFBundleIdentifier we can probably skip sanity checking the rest. 
		if (typeof plistData.CFBundleIdentifier == 'undefined') {
			continue;
		}
		if (plistData.CFBundleIdentifier !== "com.ableton.live") {
			console.warn("Detected malformed Live application", plistFile);
			continue;
		}

		// Read installed variaent:
		// ps: I had to download Intro and diff the entire folder to find this because I'm 
		// dumb and didn't bother checking an obvious .cfg file
		const installInfo = JSON.parse(
			await fs.promises.readFile(
				path.join(app.dir, app.name, "./Contents/Resources/Installation.cfg")
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
		info.icon = path.join(app.dir, app.name, "./Contents/Resources", plistData.CFBundleIconFile);

		// Get licence info:
		// Since we don't know all of the ProductId fields, we can only guess on activated products.
		info.licenceStatus = await getAbletonLicence(info.version);

		// Check if binary is 32-bit or 64-bit:
		const executablePath = path.join(app.dir, app.name, "./Contents/MacOS/Live");
		const header = await getHeaderBytes(executablePath, 8);

		const headerBytesHex = header.toString('hex');

        // Architecture values defined here:
		// https://opensource.apple.com/source/cctools/cctools-836/include/mach/machine.h

		// First int (magic) is defined here:
		https://opensource.apple.com/source/xnu/xnu-1456.1.26/EXTERNAL_HEADERS/mach-o/loader.h

		switch (headerBytesHex) {

			// MH_CIGAM_64, CPU_TYPE_I386 | CPU_ARCH_ABI64
			case 'cffaedfe07000001':
			// MH_MAGIC_64, CPU_TYPE_I386 | CPU_ARCH_ABI64
			case 'cafebabe07000001':
				info.arch = ["x64"];	
				break;

			// MH_CIGAM, CPU_TYPE_I386
			case 'cefaedfe07000000':
			// MH_MAGIC, CPU_TYPE_I386
			case 'cafebabe07000000':
				info.arch = ["x32"];	
				break;

			// MH_CIGAM_64, CPU_TYPE_ARM | CPU_ARCH_ABI64
			case 'cffaedfe12000001':
				info.arch = ["aarch64"];	
				break;
		
			default:
				info.errors.push('Unknown architecture: '+headerBytesHex.toUpperCase);
				break;
		}

		// Check that the version is supported:
		if (semver.lt(
			semver.coerce(macosRelease().version),
			semver.coerce(info.minSystemVersion)
		)){
			info.errors.push(`Unsupported OS, needs ${info.minSystemVersion} or newer`);
		};

		// Easy boolean check if the Ableton has known issues
		info.ok = info.errors.length == 0;

		installedAbletons.push(info);
	}

	return installedAbletons;
}


async function getAbletonLicence(versions) {
	return {
		NOT_IMPLEMENTED: true		
	};

	/*
	const prefFolder = path.join(os.homedir(), './Library/Preferences/Ableton/Live 10.1.25');
	const oldUnlockFolder = path.join('/Library/Application Support/Ableton/');

	const stream = fs.promises.readFile(path.join(prefFolder, ''));

	const rl = readline.createInterface({
		input: stream,
		crlfDelay: Infinity
	});

	for await (const line of rl) {
		// hmm, let's do this later.
	}
	*/
}
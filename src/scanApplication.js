import path from 'path';
import semver from 'semver';
import readPlistFile from './util/readPlistFile.js';
import readJSONFile from './util/readJSONFile.js';
import { getArchitectureFromMacho } from './util/getArchitectureFromMacho.js';
import getSortedLicences from './getLicenceInfo.js';

export const abletonFilenameRegex = /Ableton .{1,100}(\.app)?/gm;

export default async function getAppInfo(app) {
	// macOS applications are directories, so we can immediately exclude
	// anything that isn't a directory type.
	if (!app.isDirectory())
		return false;

	// If the name doesn't start with "Ableton Live..." then skip it. Users
	// can rename their Ableton instances so this check should be more broad
	// than just "\d{1,2}\W\w+\.app"...
	// https://help.ableton.com/hc/en-us/articles/209775945-Installing-multiple-versions-of-Live
	if (!app.name.match(abletonFilenameRegex))
		return false;

	// Get plist file:
	const plistData = await readPlistFile(path.join(app.dir, app.name));
	if (plistData instanceof Error)
		return false;

	// Check if this is actually Live; not another application renamed. If there's a matching
	// CFBundleIdentifier we can probably skip sanity checking the rest. 
	if (plistData?.CFBundleIdentifier !== 'com.ableton.live')
		return false;

	// By now we have an Ableton, so let's collect some info about it.
	let info = { errors: [] };

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

	// Get licence information (Experimental) and append to info:
	info = { ...info, ...await getSortedLicences(info.version, info.variant) };

	return info;
}

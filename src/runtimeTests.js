
import semver from 'semver';
import macosRelease from 'macos-release';

// Given an Ableton info object, perform some sanity tests on it:
export default async function runtimeTests(info){

	const errors = [];

	// It's currently difficult to add to this file because I seem to 
	// be hitting a error for Cognitive Complexity very quickly.


	// Detect unusable instance, ia32 on x64 when >= catalina
	const systemVersion = semver.coerce(macosRelease().version);
	if (semver.gt(systemVersion, semver.coerce('10.15.0')) && info.arch.includes('x32'))
		errors.push('Current platform does not support 32-bit Ableton');

	// Check that the version is supported:
	if (semver.lt(
		semver.coerce(macosRelease().version),
		semver.coerce(info.minSystemVersion)
	)) {
		errors.push(`Unsupported OS, needs ${info.minSystemVersion} or newer`);
	}

	// Throw error if we don't have a licence:
	if (info.licence == null)
		info.errors.push(`Missing licence for ${info.variant} version ${info.version}`);


	return errors;
}
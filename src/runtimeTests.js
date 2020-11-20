import os from 'os';

import semver from 'semver';
import macosRelease from 'macos-release';

export default async function runtimeTests(info){

	const errors = [];

	const systemVersion = semver.coerce(macosRelease().version);

	// Detect unusable instance, ia32 on x64 when >= catalina
	if (semver.gt(systemVersion, semver.coerce('10.15.0'))) {
		if (info.arch.includes('x32')) {
			errors.push('Current platform does not support 32-bit Ableton');
		}
	}

	// Detect unusable instance, arm64 when =< Big Sur
	if (semver.lt(systemVersion, semver.coerce('11.0.0'))) {
		if (info.arch.includes('arm64')){
			errors.push('Current OS does not support arm64 binaries');
		}
	}

	// Detect x64 on x32, which is always unsupported
	if (os.arch() == 'x32' && info.arch.includes('x64')){
		errors.push('64-bit binaries are not supported on 32-bit OSs');
	}

	// Check that the version is supported:
	if (semver.lt(
		semver.coerce(macosRelease().version),
		semver.coerce(info.minSystemVersion)
	)) {
		errors.push(`Unsupported OS, needs ${info.minSystemVersion} or newer`);
	}

	// Throw error if we don't have a licence:
	if (info.licence == null) {
		info.errors.push(`Missing licence for ${info.variant} version ${info.version}`);
	}

	return errors;
}
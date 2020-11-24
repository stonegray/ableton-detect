/* eslint-disable no-fallthrough */
import getHeaderBytes from './getHeaderBytes.js';

export async function getArchitectureFromMacho(executablePath) {
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

// Get information about Ableton

import fs from 'fs';
import path from 'path';
import os from 'os';
import unconvoluteBuffer from './util/unconvoluteBuffer.js';


// We haven't figured out exactly how these AB1E files work, so this parser is
// really hacked together. It's likely to fail if the file format changes, 
// even in a way that would not a break a parser had we properly implemented
// decoding of the filetype, due to our reliance on signature-based location of
// file features and fixed lengths to extract required information.

// We are currently able to decode all information contained in the Licence fields.

async function parseLicenceBuffer(index, buf){

	let licence = {};

	// Position in file:
	licence.logicalId = index;

	// read encoded index, uint16 directly after LICENCE:
	licence.licenceId = buf.readInt16LE(0);

	// Read product type:
	licence.productIdRaw = Buffer.from([buf[29], buf[28]]);

	licence.versionCode = buf[32];

	licence.productId = licence.productIdRaw.toString('hex').toUpperCase();

	// Match format in the `.auz` files by stripping nulls:
	if (buf[29] === 0x00) {
		licence.productId = licence.productId.substring(2);
	}

	// Read serial number:
	const serialBytes = unconvoluteBuffer(buf.slice(4,26));

	licence.serial = serialBytes.toString('hex')
		.match(/.{4}/g)
		.join('-')
		.toUpperCase();

	// Buffer
	licence.serialBuffer = serialBytes;

	// Read the "DistrobutionType"
	// We can infer name of this field from the header structure 
	licence.distrobutionType = buf[40];

	// Read responce code:
	const rc = [];
	for (const byte of buf.slice(44, 44 + 160)){
		if (byte == 0x00) continue;
		rc.push(String.fromCharCode(byte));
	}
	licence.responseCode = rc.join('');


	return licence;
}

export async function getLicencesByVersion(version) {

	const licenceFilePath = path.join(
		os.homedir(), `./Library/Application Support/Ableton/Live ${version.major}.${version.minor}.${version.patch}/Unlock/Unlock.cfg`
	);

	// If we can't open the file, just return an empty array.
	let fileContents;
	try {
		fileContents = await fs.promises.readFile(licenceFilePath);
	} catch (e) {
		// Unable to access file, skip for now.
		return [];
	}

	// Check that file magic matches:
	const header = fileContents.slice(0,4).toString('hex');

	// Throw if we can't read the file:
	if (header !== 'ab1e5678')throw Error('Invalid Ableton .cfg header: Expected AB1E5678');

	// Start signature of each licence field:
	let position = 1;
	let bufs = [];

	while (position > 0) {

		// The first leading 0x00 is important as it prevents a match in the file header. 
		position = fileContents.indexOf(Buffer.from('0000074C6963656E6365', 'hex'), position + 1);

		// Capture 40+1 bytes from offset position+10, and additional 160 bytes for Response
		if (position > 1) bufs.push(fileContents.slice(position + 10, position + 51 + 164));
	}

	const licences = [];
	for (const [index, buf] of bufs.entries()) {

		const l = await parseLicenceBuffer(index, buf);

		licences.push(l);
	}

	return licences;
}


export default async function getSortedLicences(version, variant){

	const licences = await getLicencesByVersion(version);

	const addons = [];
	let licence = {};

	const types = {
		0x00: 'Suite',
		0x01: 'Standard',
		0x02: 'Intro',
		0x04: 'Lite'
	};

	for (const l of licences){

		// Seperate addons, and append to info obj:
		if (l.productIdRaw[0] !== 0x00 || l.productIdRaw[1] > 5) {
			addons.push(l);
			continue;
		}

		// Otherwise, probably a product:
		/*
		if (l.productIdRaw[1] == 0x00 && variant == 'Suite') licence = l;

		if (l.productIdRaw[1] == 0x01 && variant == 'Standard') licence = l;

		if (l.productIdRaw[1] == 0x02 && variant == 'Intro') licence = l;

		if (l.productIdRaw[1] == 0x04 && variant == 'Lite') licence = l;
		*/

		if (types[l.productIdRaw[1]] === variant) licence = l;
	}

	return {
		addons: addons,
		licence: licence
	};
}


/*
console.log(await getLicencesByVersion({
    major: 10,
    minor: 3,
    patch: 25
}))
*/
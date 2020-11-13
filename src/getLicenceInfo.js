// Get information about Ableton

import fs from 'fs';
import path from 'path';
import os from 'os';


// We haven't figured out exactly how these AB1E files work, so this parser is
// really hacked together. It's likely to fail if the file format changes, 
// even in a way that would not a break a parser had we properly implemented
// decoding of the filetype, due to our reliance on signature-based location of
// file features and fixed lengths to extract required information.


// Update these are required:
const map = {
	distrobution: {
		0x50: 'Standard'
	},
	product: {
		'0000': 'Ableton Live Suite',
		'0004': 'Ableton Live Lite'
	}
};


export default async function getLicencesByVersion(version) {


	const licenceFilePath = path.join(
		os.homedir(),
		'./Library/Application Support/Ableton/',
		`Live ${version.major}.${version.minor}.${version.patch}`,
		'./Unlock/Unlock.cfg'
	);

	// If we can't open the file, just return an empty array.
	let fileContents;
	try {
		fileContents = await fs.promises.readFile(licenceFilePath);
	} catch (e) {
		// Unable to access file, skip for now.
		return [];
	}


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

		let licence = {
		};

		// Position in file:
		licence.logicalId = index;

		// read encoded index, uint16 directly after LICENCE:
		licence.licenceId = buf.readInt16LE(0);


		// Read product type:
		licence.productIdRaw = Buffer.from([buf[29], buf[28]]);
		licence.productId = licence.productIdRaw.toString('hex').toUpperCase();

		if (map.product[licence.productId]) {
			licence.productString = map.product[licence.productId];
		} else {
			licence.productString = 'Unknown Addon 0x' + licence.productId;
		}


		// Read serial number:
		const f = buf.slice(4,26);

		const sn = [];
		let i = 0;
		for (const [index, byte] of f.entries()) {

			// Drop nulls:
			if (byte == 0x00) continue;

			// Local index is position relative to non-null bytes
			i++;

			// Swap pairs, AABBCCDD -> BBAADDCC
			if (i % 2) {
				sn[i] = byte;
			} else {
				sn[i - 2] = byte;
			}
		}
		const serialBytes = Buffer.from(sn);

		licence.serial = serialBytes
			.toString('hex')
			.match(/.{4}/g)
			.join('-')
			.toUpperCase();

		// Buffer
		licence.serialBuffer = serialBytes;

		// Read the "DistrobutionType"
		// We can infer from the header structure 
		let dm = buf[40]; //buf.slice(40,41);
		licence.distrobutionType = dm;

		
		/*
        if (map.distrobution[dm]) {
            licence.distrobutionTypeString = map.distrobution[dm];
        } else {
            licence.distrobutionTypeString = "Unknown"
        }*/

		let rc = buf.slice(44, 44 + 160);

		// Infer product type. We assume that product IDs under 0x04 are Ableton, not addons:
		if (buf[28] < 5){
			licence.type = "Product";
		} else {
			licence.type = "Addon";
		}

		licences.push(licence);
	}

	return licences;
}

/*
console.log(await getLicencesByVersion({
    major: 10,
    minor: 3,
    patch: 25
}))
*/
// Get information about Ableton

import fs from 'fs';
import path from 'path';
import os from 'os';


// We haven't figured out exactly how these AB1E files work, so this parser is
// really hacked together. It's likely to fail if the file format changes, 
// even in a way that would not a break a parser had we properly implemented
// decoding of the filetype, due to our reliance on signature-based location of
// file features and fixed lengths to extract required information.

// We are currently able to decode all information contained in the Licence fields.


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

		licence.versionCode = buf[32];

		licence.productId = licence.productIdRaw.toString('hex').toUpperCase();

		// Match format in the `.auz` files by stripping nulls:
		if (buf[29] == 0x00){
			licence.productId = licence.productId.substring(2);
		}

		// Read serial number:
		const f = buf.slice(4,26);

		const temp = [];
		const sn = [];

		// Holy smokes, I'm either stupid or insufficiently caffinated, I feel like
		// I'm code golfing trying to shuffle some bytes around.  

		// Create a new array with every 2nd pair of chars removed; these are nulls,
		// but valid data can be 0x00 so we need to go by position.
		// AABB0000CCDD0000 -> AABBCCDD
		for (let i in [...f]) {
			if ((!((i - 3) % 4) || (!((i - 2) % 4)))) continue;
			temp.push(f[i]);
		}

		// Swap pairs, AABBCCDD -> BBAADDCC
		for (let [i, n] of temp.entries()) {
			if (!!(i % 2)) { // It doesn't work without implicit bool cast...
				sn[i-1] = temp[i];
			} else {
				sn[i+1] = temp[i];
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

		// Read responce code:
		const rc = [];
		for (const byte of buf.slice(44, 44 + 160)){
			if (byte == 0x00) continue;
			rc.push(String.fromCharCode(byte));
		}
		licence.responseCode = rc.join('');

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
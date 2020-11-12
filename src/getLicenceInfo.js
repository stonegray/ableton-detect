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
        0x50: "Standard"
    },
    product: {
        "0000": "Ableton Live Suite",
        "0004": "Ableton Live Lite"
    }
}

export default async function getLicencesByVersion(version) {


    const licenceFilePath = path.join(
        os.homedir(),
        "./Library/Application Support/Ableton/",
        `Live ${version.major}.${version.minor}.${version.patch}`,
        "./Unlock/Unlock.cfg"
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
        licence.productIdRaw = Buffer.from([buf[29], buf[28]])
        licence.productId = licence.productIdRaw.toString('hex').toUpperCase();

        if (map.product[licence.productId]) {
            licence.productString = map.product[licence.productId];
        } else {
            licence.productString = "Unknown Addon 0x" + licence.productId
        }


        // Read serial number:

        /* I'm not certain we're reading this correctly because it doesn't
        match up with the .auz file we have. */

        /* The .cfg file appears to show SerialNumber as a a 6-entry array,
        which matches what we expect. */
        
        const serialBytes = [
            buf.slice(4, 4+2),
            buf.slice(8, 8+2),
            buf.slice(12, 12+2),
            buf.slice(16, 16+2),
            buf.slice(20, 20+2),
            buf.slice(24, 24+2)
        ];
        licence.serial = serialBytes
            .map(b => b.toString('hex'))
            .join('-')
            .toUpperCase();

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

        licence.response = rc;

        // Remove .raw object as we're parsing everything now 
        //licence.raw = buf;

        licences.push(licence);
    }

    console.log(licences);
    return licences;
}

/*
console.log(await getLicencesByVersion({
    major: 10,
    minor: 3,
    patch: 25
}))
*/
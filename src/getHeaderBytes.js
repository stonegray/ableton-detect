import fs from 'fs';

// Quick function to get the first n bytes from a file. Returns false 
// if any error occurs
export default async function getHeaderBytes(file, number) {

	try {
		const fd = await fs.promises.open(file, 'r');

		const buf = Buffer.alloc(number);

		const header = await fd.read(buf, 0, number);

		await fd.close();

		return buf;

	} catch (e) {
		return false;
	}

}

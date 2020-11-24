// Unconvolute an array of bytes.


export default function unconvoluteBuffer(f){

	const temp = [];
	const sn = [];

	// All this does is move bytes around in an array. In like O(3) space lmao
	// converts BBAA0000DDCC0000FFEE0000 to AABBCCDDEEFF

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
	for (let [i] of temp.entries()) {
		if (i % 2) { // It doesn't work without implicit bool cast...
			sn[i-1] = temp[i];
		} else {
			sn[i+1] = temp[i];
		}
	}

	return Buffer.from(sn);
}
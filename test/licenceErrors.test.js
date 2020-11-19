/* eslint-disable no-undef */
import mockfs from 'mock-fs';
import assert from 'assert';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const cwd = path.join(path.dirname(fileURLToPath(import.meta.url)), './..');

describe('Parser error handling checks', function () {

	let getLicencesByVersion;

	before(async function(){
		getLicencesByVersion = (await import('../src/getLicenceInfo.js')).default;
	});
	after(async ()=>{
		mockfs.restore();
	});

	// Just a sanity check:

	// Just a sanity check:
	it('Can mock corrupted Ableton licence database on virtual filesystem', async function () {
		const unlockPath = path.join(
			os.homedir(),
			'./Library/Application Support/Ableton/Live 99.99.99/Unlock/Unlock.cfg'
		);
		const mocks = {};
		mocks[unlockPath] = mockfs.load(path.resolve(cwd, 'resources/Unlock-corrupted.cfg')),
		mockfs(mocks);
	});


	it('Can read test Ableton licence database', async ()=>{
		await getLicencesByVersion({
			major: 99, minor: 99, patch: 99
		});
	});

	describe('Check proper handling for corrupt data', async ()=>{

		let licences;
		before(async () => {
			licences = await getLicencesByVersion({
				major: 99, minor: 99, patch: 99
			});
		});

		it('Returns iterable array', async ()=>{
			assert.strictEqual(Array.isArray(licences), true, Error(
				'Invalid Licences type, expected \'array\''
			));
		});
		it('Returns zero licences', async ()=>{
			assert.strictEqual(licences.length, 0, Error(
				'Invalid Licences array length, expected 0'
			));
		});
	});
});
describe('Parser error handling checks', function () {

	let getLicencesByVersion;

	before(async function(){
		getLicencesByVersion = (await import('../src/getLicenceInfo.js')).default;
	});
	after(async ()=>{
		mockfs.restore();
	});

	// Just a sanity check:

	// Just a sanity check:
	it('Can mock bad header Ableton licence database on virtual filesystem', async function () {
		const unlockPath = path.join(
			os.homedir(),
			'./Library/Application Support/Ableton/',
			'Live 99.99.99',
			'./Unlock/Unlock.cfg'
		);
		const mocks = {};
		mocks[unlockPath] = mockfs.load(path.resolve(cwd, 'resources/Unlock-badheader.cfg')),
		mockfs(mocks);
	});


	describe('Throws error on malformed header', async ()=>{

		before(async () => {

			const fun = async ()=>{
				await getLicencesByVersion({
					major: 99, minor: 99, patch: 99
				});
			};

			assert.throws(fun, Error, 'Did not throw error on malformed magic');
		});

	});
});
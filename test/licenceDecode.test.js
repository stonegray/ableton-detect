/* eslint-disable no-undef */
import mockfs from 'mock-fs';
import assert from 'assert';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const cwd = path.join(path.dirname(fileURLToPath(import.meta.url)), './..');

describe('Parse test licence database', function () {

	let getLicencesByVersion;

	before(async function(){
		const i = await import('../src/licence/getLicenceInfo.js');
		getLicencesByVersion = i.getLicencesByVersion;
	});
	after(async ()=>{
		mockfs.restore();
	});

	// Just a sanity check:
	it('Loads library', async function () {
		assert.strictEqual(getLicencesByVersion instanceof Function, true, Error(
			'Unexpected export type: Not a function'
		));
	});
	
	// Use the Unlock.cfg file in resources for the test:
	it('Can mock Ableton licence database on virtual filesystem', async function () {
		const unlockPath = path.join(
			os.homedir(),
			'./Library/Application Support/Ableton/Live 99.99.99/Unlock/Unlock.cfg'
		);
		const mocks = {};
		mocks[unlockPath] = mockfs.load(path.resolve(cwd, 'resources/Unlock.cfg')),
		mockfs(mocks);
	});


	// This test just checks if we throw an error while reading the licence file. 
	it('Can read test Ableton licence database', async ()=>{
		await getLicencesByVersion({
			major: 99, minor: 99, patch: 99
		});
	});

	// These tests check our parsed data against what we expect.
	describe('Check parsed data', async ()=>{

		let licences;
		before(async () => {
			licences = await getLicencesByVersion({
				major: 99, minor: 99, patch: 99
			});
		});

		it('Correct types and lengths', async ()=>{
			assert.strictEqual(Array.isArray(licences), true, Error(
				'Invalid Licences type, expected \'array\''
			));
			assert.strictEqual(licences.length, 1, Error(
				'Invalid Licences array length, expected 1'
			));
		});

		it('DistrobutionType', async ()=>{
			assert.strictEqual(licences[0].distrobutionType, 80, Error(
				'Invalid DistrobutionType, expected 80'
			));
		});

		it('licenceId', async ()=>{
			assert.strictEqual(licences[0].licenceId, 0, Error(
				'Invalid licenceId, expected 0'
			));
		});

		it('logicalId', async ()=>{
			assert.strictEqual(licences[0].logicalId, 0, Error(
				'Invalid logicalId, expected 0'
			));
		});

		it('productId', async ()=>{
			assert.strictEqual(licences[0].productId, '04', Error(
				'Invalid productId, expected string "04"'
			));
		});

		it('versionCode', async ()=>{
			assert.strictEqual(licences[0].versionCode, 160, Error(
				'Invalid versionCode, expected 160'
			));
		});

		it('Valid serial and responce codes', async ()=>{
			assert.strictEqual(
				licences[0].serial,
				'51A8-6AE6-DFDB-8C40-E26E-500F',
				Error('Failed to correctly parse serial number')
			);
			assert.strictEqual(
				licences[0].responseCode,
				'AC9F5F44DC8A8D18AFE9A9B2FF7A00407A2543EFD57F1F9E310726723BF7E34493A80D980394449D',
				Error('Failed to correctly parse response code')
			);
		});
	});
});
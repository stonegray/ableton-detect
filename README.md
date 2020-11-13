# ableton-detect

**Get information from installed Ableton Live instances**

![](https://img.shields.io/npm/dt/@stonegray/ableton-detect) ![](https://img.shields.io/github/languages/code-size/stonegray/ableton-detect) ![](https://img.shields.io/github/license/stonegray/ableton-detect)

`ableton-detect` scans application folders and returns an array of all installed Ableton Live instances. For every detected instance, it attempts to read the versions, varients (eg. Suite), licences and serial numbers for Ableton and addons, architectures, and more, reporting any issues it encounters. The goal is to be able to determine if a given instance will function. 

During scanning, a number of checks are performed to detect broken or damaged installations. Compatibility checks Any issues found are reported in the output object's `.error` array. 

By default, only `/Applications` and `~/Applications` are searched, but additional search directories can be provided.

This package exports an ES module and requires Node 15+ and macOS.

## Examples

Basic example:

```javascript
import getAbletons from '@stonegray/ableton-detect'

console.log(await getAbletons());
```

Output:

```javascript
[
    {
    relPath: 'Ableton Live 10 Lite.app',
    absPath: '/Applications/Ableton Live 10 Lite.app',
    version: SemVer {
      raw: '10.1.25',
      major: 10,
      minor: 1,
      patch: 25,
      prerelease: [],
      build: [],
      version: '10.1.25'
    },
    fullVersion: '10.1.25 (2020-10-01_995d768242)',
    minSystemVersion: '10.11.6',
    variant: 'Lite',
    icon: '/Applications/Ableton Live 10 Lite.app/Contents/Resources/app.icns',
    ok: true,
    errors: [],
    arch: [ 'x64' ],
    addons: [
      /* Addon support is experimental and may change! */
    ],
    licence: {
      /* Licence support is experimental and may change! */
      logicalId: 0,
      licenceId: 0,
      versionCode: 160,
      productId: '04',
      serial: '51A8-6AE6-DFDB-8C40-E26E-500F',
      distrobutionType: 80,
      responseCode: 'AC9F5F44DC8A8D18AFE9A9B2FF7A00407A2543EFD57F1F9E310726723BF7E34493A80D980394449D'
    }
]
```


## Licences

This library provides experimental support for reading licences. Currently, it provides the following information about the Ableton licence, as well as any installed addons:

- SerialNumber (version `0.0.8+`)
- ProductID
- ProductVersion (version `0.0.11+`)
- DistrobutionType
- ResponseCode (version `0.0.11+`)
- Logical ID (16-bit integer, position in internal database)
  
Example uses of this information:

 - Checking that the user has access to a certain feature
 - Licencing your software by tying it to a unique Ableton seat
 - Verifying that the software is genuine

Licences are stored in the `AB1E5678` (.cfg) files, which I don't have any documentation for. The current code to read the file format works, but needs to be rewriten once we know how to correctly decode the format using the information in the header.

Licences are stored on the system by version, so the licences array for all varients of the same version will share the Addons field.

For testing, an example Ableton serial number, licence database, and activation file (.auz) is provided in `./resources`. This code is for testing only, it won't work to activate Ableton (obviously!)

## Changelog

`0.0.4`:
  - Add error for 32-bit installations on macOS versions above Catalina (10.15.x) that don't support it.
  - Add error for arm64 binaries on macOS versions prior to Big Sur (11x) that don't support it.
  - Add error for all 64-bit binaries on 32-bit platforms.

`0.0.5`:
  - Add experimental support for reading Ableton licences.

`0.0.8`:
  - Extend experimental support for reading Ableton licences to include SerialNumber.

`0.0.11`:
  - Major changes to the unstable Licence feature
  - Rename `.licences` field to `.addons`
  - Seperate handling for Ableton and Addons, stored in `.licence` and `.addons` respectively.
  - Breaking changes to `.responce` properties of licences, now returns hex string instead of Buffer.
  - Now correctly reads all fields in the licence files
  - Bugfix: Fix flipped bytes in serial number
  - The Licence and Addon APIs are near stable, I don't expect significant changes moving forward.

`0.0.12`:
  - Bugfix: Fix 0x80-type addon product IDs incorrectly detecting as Ableton instances

## TODO

- Proper support for future ARM-based versions of Ableton. I've added preliminary support already, but since no versions exist, it has not been tested.
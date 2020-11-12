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
    relPath: 'Ableton Live 10 Suite.app',
    absPath: '/Users/stonegray/Applications/Ableton Live 10 Lite.app',
    variant: 'Suite',
    version: {
      raw: '10.1.25',
      major: 10,
      minor: 1,
      patch: 25,
      version: '10.1.25'
    },
    fullVersion: '10.1.25 (2020-10-01_995d768242)',
    minSystemVersion: '10.11.6',
    arch: [ 'x64' ]
    icon: '/Users/stonegray/Applications/Ableton Live 10 Lite.app/Contents/Resources/app.icns', // Icons are different between versions and varients
    licences: [
     /* Licence support is experimental and output may change in future versions */
    ],
    ok: true,
    errors: [],
  }
]
```


## Licences

This library provides experimental support for reading licences. Currently, it provides the following:

- SerialNumber (version `0.0.8+`)
- ProductID
- ProductVersion
- DistrobutionType
- ResponseCode
- Logical ID (16-bit integer, position in internal database)
  
Example uses of this information:

 - Checking that the user has access to a certain feature
 - Licencing your software by tying it to a unique Ableton seat
 - Verifying that the software is genuine

Licences are stored in the `AB1E5678` (.cfg) files, which I don't have any documentation for. The current code to read the file format works, but needs to be rewriten once we know how to correctly decode the format using the information in the header.

Licences are stored on the system by version, so the licences array for an Ableton Intro instance will contain Ableton Suite licence identifiers if the version is identical.


## Changelog

`0.0.4`:
  - Add error for 32-bit installations on macOS versions above Catalina (10.15.x) that don't support it.
  - Add error for arm64 binaries on macOS versions prior to Big Sur (11x) that don't support it.
  - Add error for all 64-bit binaries on 32-bit platforms.

`0.0.5`:
  - Add experimental support for reading Ableton licences.

`0.0.8`:
  - Extend experimental support for reading Ableton licences to include SerialNumber.

## TODO

- Proper support for future ARM-based versions of Ableton. I've added preliminary support already, but since no versions exist, it has not been tested.
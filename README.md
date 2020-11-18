# ableton-detect

**Get information from installed Ableton Live instances**

[![](https://img.shields.io/npm/dt/@stonegray/ableton-detect) ![](https://img.shields.io/npm/v/@stonegray/ableton-detect)](https://www.npmjs.com/package/@stonegray/ableton-detect) ![](https://img.shields.io/github/languages/code-size/stonegray/ableton-detect) ![](https://img.shields.io/github/license/stonegray/ableton-detect) ![](https://img.shields.io/github/issues-raw/stonegray/ableton-detect)

`ableton-detect` scans application folders and returns an array of all installed Ableton Live instances. For every detected instance, it attempts to read the versions, varients (eg. Suite), architectures, ableton licences, addon licences, serial numbers and more, reporting any issues it encounters. 

During scanning, a number of checks are performed to detect broken or damaged installations. Any issues found while running compatibility checks are reported in the output object's `.error` array. 

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


## Windows Support

`ableton-detect` uses many macOS specific methods to achieve what it does, such as reading Mach-O headers, parsing `Info.plist` files, and reading information in `.app`s. These cannot be simply ported to Windows, and retrieving the same information would require a complete rewrite. If somebody else is willing to figure out how to collect the same data on Windows I think it would be great to add support.


## Projects using `ableton-detect`

**Ableton Licence Backup** [[npm]](https://www.npmjs.com/package/ableton-licence-backup) [[github]](https://github.com/stonegray/ableton-licence-backup#readme)
Extracts the Ableton licences you currently have activated on your machine, and exports them to an Ableton offline authorization (.auz) file, which can be used to reactivate all of the same products and addons in the future, without using the ableton website.

*Made something neat with this library? File an issue or submit a PR!*

## TODO

- Proper support for future ARM-based versions of Ableton. I've added preliminary support already, but since no versions exist, it has not been tested. We currently check for aarch64 binaries, but it's possible that Ableton may use a "Fat binary", simiiar to universal binaries from PPC days. This is not correctly handled and will result in an "Unknown architecture" error and an empty `.arch` array. 

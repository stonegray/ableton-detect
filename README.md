# ableton-detect

**Get information from installed Ableton Live instances**

![](https://img.shields.io/npm/dt/@stonegray/ableton-detect) ![](https://img.shields.io/github/languages/code-size/stonegray/ableton-detect) ![](https://img.shields.io/github/license/stonegray/ableton-detect)

`ableton-detect` scans application folders and returns an array of all installed Ableton Live instances. For every detected instance, it attempts to read the versions, varients (eg. Suite), architectures, and more, reporting any issues it encounters.

During scanning, a number of checks are performed to detect broken or damaged installations. Compatibility checks Any issues found are reported in the output object's `.error` array. 

By default, only `/Applications` and `~/Applications` are searched, but additional search directories can be provided.

This package requires Node 15+ and macOS.

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
    absPath: '/Users/stonegray/Applications/Ableton Live 10 Suite.app',
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
    icon: '/Users/stonegray/Applications/Ableton Live 10 Suite.app/Contents/Resources/app.icns',
    licenceStatus: null,
    ok: true,
    errors: [],
  }
]
```



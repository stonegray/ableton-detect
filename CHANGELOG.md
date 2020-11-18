## Changelog

`0.0.5`:
  - Add experimental support for reading Ableton licences.


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
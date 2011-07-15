# node-rrdtool

A node.js implementation of Tobi Oetiker's excellent RRDTool.

See http://www.mrtg.org/rrdtool/ for further information.

## Status

Please note that this library is currently incomplete.  Pull requests will
be ignored until it is complete.

This version aims to support RRD files created on little-endian platforms (i.e.
PCs running Linux/BSD), either 32 or 64bit.  Only RRD version 3 and 4 files are
supported.

## Included libraries

I've included the jspack library (http://code.google.com/p/jspack) in this
library because there is not currently a package obtainable via npm.


## Contributors

This library borrows concepts and some code from javascriptRRD, which, as a
whole, ended up being insufficient for my needs.  It's designed to run in a
browser, and to make an AJAX request for the entire RRD, then graph it using
Flot, whereas I was looking to make a library that reads the file directly, and
will work with node.js.

You can find this javascriptRRD library at
http://javascriptrrd.sourceforge.net/


## License

MIT License. See LICENSE.md

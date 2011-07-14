
var fs = require('fs');
var jspack = require('./struct').struct;

/* BinaryFile Class */
function BinaryFile(path) {
    this.path = path;

    var _doubleMantExpHi=Math.pow(2,-28);
    var _doubleMantExpLo=Math.pow(2,-52);
    var _doubleMantExpFast=Math.pow(2,-20);


    this.fd = fs.openSync(path, 'r');
    console.log("Opened file " + path);
}

BinaryFile.prototype.getLength = function() {
    var stats = fs.fstatSync(this.fd);
    return stats.size;
}

BinaryFile.prototype.getRawData = function() {
    return fs.readFileSync(this.path);
}


/// read data ///
BinaryFile.prototype.getByteAt = function(offset) {
    var buffer = new Buffer(1);
    fs.readSync(this.fd, buffer, 0, 1, offset);
    return buffer[0];
}

BinaryFile.prototype.getSByteAt = function(offset) {
    var iByte = this.getByteAt(offset);
    if (iByte > 127)
        return iByte - 256;
    else
        return iByte;
}

BinaryFile.prototype.getShortAt = function(offset) {
    var buf = new Buffer(4);
    fs.readSync(this.fd, buf, 0, 4, offset);
    return jspack.Unpack('<h', buf);
}
BinaryFile.prototype.getUShortAt = function(offset) {
    var buf = new Buffer(4);
    fs.readSync(this.fd, buf, 0, 4, offset);
    return jspack.Unpack('<H', buf);
}

BinaryFile.prototype.getLongAt = function(offset) {
    var buf = new Buffer(4);
    fs.readSync(this.fd, buf, 0, 4, offset);
    return jspack.Unpack('<l', buf);
}
BinaryFile.prototype.getULongAt = function(offset) {
    var buf = new Buffer(4);
    fs.readSync(this.fd, buf, 0, 4, offset);
    return jspack.Unpack('<L', buf);
}

BinaryFile.prototype.getStringAt = function(offset, iLength) {
    var buffer = new Buffer(iLength);
    fs.readSync(this.fd, buffer, 0, iLength, offset);
    var aStr = []
    for (var i = 0; (i < buffer.length); i++) {
        aStr[i] =  String.fromCharCode(buffer[i]);
    }
    return aStr.join("");
}
BinaryFile.prototype.getCStringAt = function(offset, iLength) {
    var buffer = new Buffer(iLength);
    fs.readSync(this.fd, buffer, 0, iLength, offset);

    var aStr = []
    for (var i = 0; ((i < buffer.length) && (buffer[i] > 0)); i++) {
        aStr[i] =  String.fromCharCode(buffer[i]);
    }
    return aStr.join("");

}

BinaryFile.prototype.getDoubleAt = function(offset) {
    var buf = new Buffer(8);
    fs.readSync(this.fd, buf, 0, 8, offset);
    return jspack.Unpack('<d', buf);
}

BinaryFile.prototype.getCharAt = function(offset) {
    return String.fromCharCode(this.getByteAt(offset));
}


/* Invalid RRD Exception class */
function InvalidRRD(msg) {
    this.message=msg;
    this.name="Invalid RRD";
}
// pretty print
InvalidRRD.prototype.toString = function() {
    return this.name + ': "' + this.message + '"';
}


// ============================================================
// RRD DS Info class
function RRDDS(rrd_file,rrd_file_idx,my_idx) {
  this.rrd_file     = rrd_file;
  this.rrd_file_idx = rrd_file_idx;
  this.my_idx       = my_idx;
}

RRDDS.prototype.getIdx = function() {
    return this.my_idx;
}
RRDDS.prototype.getName = function() {
    return this.rrd_file.getCStringAt(this.rrd_file_idx,20);
}
RRDDS.prototype.getType = function() {
    return this.rrd_file.getCStringAt(this.rrd_file_idx+20,20);
}
RRDDS.prototype.getMin = function() {
    return this.rrd_file.getDoubleAt(this.rrd_file_idx+48);
}
RRDDS.prototype.getMax = function() {
    return this.rrd_file.getDoubleAt(this.rrd_file_idx+56);
}

// ============================================================
// RRD RRA Info class
function RRDRRAInfo(rrd_data, rra_def_idx, rrd_align, row_cnt, pdp_step, my_idx) {
  this.rrd_data     = rrd_data;
  this.rra_def_idx  = rra_def_idx;
  this.rrd_align    = rrd_align;
  this.row_cnt      = row_cnt;
  this.pdp_step     = pdp_step;
  this.my_idx       = my_idx;
}

RRDRRAInfo.prototype.getIdx = function() {
    return this.my_idx;
}
// Get number of rows
RRDRRAInfo.prototype.getNrRows = function() {
    return this.row_cnt;
}



// ============================================================
// RRD Header class
function RRDHeader(rrd_file) {
    this.rrd_file = rrd_file;
    this.validate();
    this._load();
    this._calculateIndexes();
}

RRDHeader.prototype.validate = function() {
    var header = this.rrd_file.getCStringAt(0, 4);
    if (header != "RRD")
        throw new InvalidRRD("Wrong magic id '" + header + "'");

    this.rrd_version = this.rrd_file.getCStringAt(4,5);
    if ((this.rrd_version !== "0003") && (this.rrd_version !== "0004")) {
        throw new InvalidRRD("Unsupported RRD version " + this.rrd_version + ".");
    }

    // figure out byte alignment
    if (this.rrd_file.getDoubleAt(12) == 8.642135e+130) {
        this.rrd_align == 32;
    }
    else if (this.rrd_file.getDoubleAt(16) == 8.642135e+130) {
        this.rrd_align == 64;
    }
    else {
        throw new InvalidRRD("Unsupported platform.");
    }

}

RRDHeader.prototype._load = function() {
    if (this.rrd_align == 32) {
        this.ds_cnt = this.rrd_file.getULongAt(20);
        this.rra_cnt = this.rrd_file.getULongAt(24);
        this.pdp_step = this.rrd_file.getULongAt(28);
        this.top_header_size = 112;
    }
    else {
        this.ds_cnt = this.rrd_file.getULongAt(24);
        this.rra_cnt = this.rrd_file.getULongAt(32);
        this.pdp_step = this.rrd_file.getULongAt(40);
        this.top_header_size = 128;
    }
}

RRDHeader.prototype._calculateIndexes = function() {
    this.ds_def_idx = this.top_header_size;

    // char ds_nam[20], char dst[20], unival par[10]
    this.ds_el_size = 120;

    // char cf_nam[20], unit row_cnt, uint pdp_cnt, unival par[10]
    this.rra_def_idx = this.ds_def_idx + this.ds_el_size * this.ds_cnt;

    if (this.rrd_align == 32) {
        this.rra_def_el_size = 108;
        this.row_cnt_idx = 20;

        // time_t last_up, int last_up_usec
        this.live_head_size = 8;

        // uint cur_row
        this.rra_ptr_el_size = 4;
    }
    else {
        this.rra_def_el_size = 120;
        this.row_cnt_idx = 24;

        // time_t last_up, int last_up_usec
        this.live_head_size = 16;

        // uint cur_row
        this.rra_ptr_el_size = 8;
    }

    this.live_head_idx = this.rra_def_idx + this.rra_def_el_size * this.rra_cnt;


    this.pdp_prep_idx = this.live_head_idx + this.live_head_size;
    // char last_ds[30], unival scratch[10]
    this.pdp_prep_el_size = 112;

    this.cdp_prep_idx = this.pdp_prep_idx + this.pdp_prep_el_size * this.ds_cnt;
    // unival scratch[10];
    this.cdp_prep_el_size = 80;

    this.rra_ptr_idx = this.cdp_prep_idx + this.cdp_prep_el_size * this.ds_cnt * this.rra_cnt;

    this.header_size = this.rra_ptr_idx + this.rra_ptr_el_size * this.rra_cnt;
}

// load up the row counts
RRDHeader.prototype.loadRowCounts = function() {
    this.rra_def_row_cnts = [];
    // how many rows before me
    this.rra_def_row_cnt_sums = [];

    for (var i=0; i<this.rra_cnt; i++) {
        this.rra_def_row_cnts[i] = this.rrd_file.getULongAt(
                this.rra_def_idx + (i * this.rra_def_el_size) + this.row_cnt_idx);

        if (i==0)
            this.rra_def_row_cnt_sums[i] = 0;
        else
            this.rra_def_row_cnt_sums[i] =
                    this.rra_def_row_cnt_sums[i-1] + this.rra_def_row_cnts[i-1];
    }
}

// gets the minimum step
RRDHeader.prototype.getMinStep = function() {
    return this.pdp_step;
}
// gets the last updated time, as a ULong
RRDHeader.prototype.getLastUpdate = function() {
    return this.rrd_file.getULongAt(this.live_head_idx);
}

// gets DS names, as an array
RRDHeader.prototype.getDSNames = function() {
    var ds_names = [];
    for (var i = 0; i < this.ds_cnt; i++) {
        var ds = this.getDSbyIndex(i);
        var ds_name = ds.getName();
        ds_names.push(ds_name);
    }
    return ds_names;
}

// gets a DS by index
RRDHeader.prototype.getDSbyIndex = function(idx) {
    if ((idx < 0) || (idx > this.ds_cnt))
        throw RangeError("DS index (" + idx + ") out of range [0-" + this.ds_cnt + "]");

    return new RRDDS(this.rrd_file, this.ds_def_idx + this.ds_el_size *idx, idx);
} 

// gets a DS by name
RRDHeader.prototype.getDSbyName = function(name) {
    for (var i = 0; i < this.ds_cnt; i++) {
        var ds = this.getDSbyIndex(i);
        if (ds.getName() == name)
            return ds;
    }
    throw RangeError("DS '" + name + "' does not exist");
}


RRDHeader.prototype.getRRAbyIndex = function(idx) {
    if ((idx < 0) || (idx > this.rra_cnt))
        throw RangeError("RRA index (" + idx + ") out of range [0-" + this.rra_cnt + "]");

    return new RRDRRA(this.rrd_file,
                      this.rra_def_idx + idx * this.rra_def_el_size,
                      this.rrd_align,
                      this.rra_def_row_cnts[idx],
                      this.pdp_step,
                      idx);
}

// ============================================================
// RRD File Class
function RRDFile(path) {
    this.path = path;
    this.file = new BinaryFile(path);

    this.rrd_header = new RRDHeader(this.file);
    this.rrd_header.loadRowCounts();
}


RRDFile.prototype.header = function() { return this.rrd_header; }

RRDFile.prototype.getMinStep = function() {
    return this.rrd_header.getMinStep();
}

RRDFile.prototype.getLastUpdate = function() {
    return this.rrd_header.getLastUpdate();
}

    
exports.RRDFile = RRDFile;
exports.version = '0.1.0';

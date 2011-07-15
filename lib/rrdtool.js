/*
 * RRDTool for Node
 */

var fs = require('fs');
var jspack = require('./struct').struct;

// ============================================================
// BinaryFile class
//
// This is a basic interface to a binary file
//
function BinaryFile(path) {
    this.path = path;
    this.fd = fs.openSync(path, 'r');
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
        return jspack.Unpack('<h', buf)[0];
    }
    BinaryFile.prototype.getUShortAt = function(offset) {
        var buf = new Buffer(4);
        fs.readSync(this.fd, buf, 0, 4, offset);
        return jspack.Unpack('<H', buf)[0];
    }

    BinaryFile.prototype.getLongAt = function(offset) {
        var buf = new Buffer(4);
        fs.readSync(this.fd, buf, 0, 4, offset);
        return jspack.Unpack('<l', buf)[0];
    }
    BinaryFile.prototype.getULongAt = function(offset) {
        var buf = new Buffer(4);
        fs.readSync(this.fd, buf, 0, 4, offset);
        return jspack.Unpack('<L', buf)[0];
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


// ============================================================
// RRD DS Info class
function RRDDS(rrd_data,rrd_file_idx,my_idx) {
  this.rrd_data     = rrd_data;
  this.rrd_file_idx = rrd_file_idx;
  this.my_idx       = my_idx;
}

    RRDDS.prototype.getIdx = function() {
        return this.my_idx;
    }
    RRDDS.prototype.getName = function() {
        return this.rrd_data.getCStringAt(this.rrd_file_idx,20);
    }
    RRDDS.prototype.getType = function() {
        return this.rrd_data.getCStringAt(this.rrd_file_idx+20,20);
    }
    RRDDS.prototype.getMin = function() {
        return this.rrd_data.getDoubleAt(this.rrd_file_idx+48);
    }
    RRDDS.prototype.getMax = function() {
        return this.rrd_data.getDoubleAt(this.rrd_file_idx+56);
    }

// ============================================================
// RRA Info class
function RRAInfo(rrd_data, rra_def_idx, rrd_align, row_cnt, pdp_step, my_idx) {
  this.rrd_data     = rrd_data;
  this.rra_def_idx  = rra_def_idx;
  this.rrd_align    = rrd_align;
  this.row_cnt      = row_cnt;
  this.pdp_step     = pdp_step;
  this.my_idx       = my_idx;
}

    RRAInfo.prototype.getIndex = function() {
        return this.my_idx;
    }
    // Get number of rows
    RRAInfo.prototype.getRowCount = function() {
        return this.row_cnt;
    }

    RRAInfo.prototype.getPdpPerRow = function() {
        if (this.rrd_align == 32)
            return this.rrd_data.getULongAt(this.rra_def_idx + 24);
        else
            return this.rrd_data.getULongAt(this.rra_def_idx + 32);
    }

    RRAInfo.prototype.getStep = function() {
        return this.pdp_step * this.getPdpPerRow();
    }

    RRAInfo.prototype.getCFName = function() {
        return this.rrd_data.getCStringAt(this.rra_def_idx, 20);
    }

// ============================================================
// RRA class
function RRA(rrd_data, rra_ptr_idx, rra_info, header_size, prev_row_cnts, ds_cnt) {
    this.rrd_data   = rrd_data;
    this.rra_info   = rra_info;
    this.row_cnt    = rra_info.row_cnt;
    this.ds_cnt     = ds_cnt;

    var row_size = ds_cnt * 8;

    this.base_rrd_db_idx = header_size + prev_row_cnts * row_size;

    // used often, so cache this
    this.cur_row = rrd_data.getULongAt(rra_ptr_idx);

    this._calc_index = function(row_idx, ds_idx) {
        if ((row_idx < 0) || (row_idx >= this.row_cnt))
            throw RangeError("Row idx (" + row_idx + ") out of range [0-" + this.row_cnt + ").");

        if ((ds_idx < 0) || (ds_idx >= this.ds_cnt))
            throw RangeError("DS idx (" + ds_idx + ") out of range [0-" + this.ds_cnt + ").");

        var real_row_idx = row_idx + this.cur_row + 1;
        if (real_row_idx >= this.row_cnt)
            real_row_idx -= this.row_cnt;

        return row_size * real_row_idx + ds_idx * 8;
    }
}


    RRA.prototype.getIndex = function() {
        return this.rra_info.getIndex();
    }

    RRA.prototype.getRowCount = function() {
        return this.row_cnt;
    }

    RRA.prototype.getDSCount = function() {
        return this.ds_cnt;
    }

    RRA.prototype.getStep = function() {
        return this.rra_info.getStep();
    }

    RRA.prototype.getCFName = function() {
        return this.rra_info.getCFName();
    }

    RRA.prototype.getEl = function(row_idx, ds_idx) {
        return this.rra_data.getDoubleAt(this.base_rrd_db_idx + this.calc_idx(row_idx, ds_idx));
    }

    RRA.prototype.getPdpPerRow = function() {
        return this.rra_info.getPdpPerRow();
    }

// ============================================================
// RRD Header class
function RRDHeader(rrd_data) {
    this.rrd_data = rrd_data;

    this._load = function() {
        if (this.rrd_align == 32) {
            this.ds_cnt     = this.rrd_data.getULongAt(20);
            this.rra_cnt    = this.rrd_data.getULongAt(24);
            this.pdp_step   = this.rrd_data.getULongAt(28);
            this.top_header_size = 112;
        }
        else {
            this.ds_cnt     = this.rrd_data.getULongAt(24);
            this.rra_cnt    = this.rrd_data.getULongAt(32);
            this.pdp_step   = this.rrd_data.getULongAt(40);
            this.top_header_size = 128;
        }
    }

    this._calculateIndexes = function() {
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

    // setup
    this.validate();
    this._load();
    this._calculateIndexes();
}

    RRDHeader.prototype.validate = function() {
        var header = this.rrd_data.getCStringAt(0, 4);
        if (header != "RRD")
            throw new InvalidRRD("Wrong magic id '" + header + "'");

        this.rrd_version = this.rrd_data.getCStringAt(4,5);
        if ((this.rrd_version !== "0003") && (this.rrd_version !== "0004")) {
            throw new InvalidRRD("Unsupported RRD version " + this.rrd_version + ".");
        }

        // figure out byte alignment
        if (this.rrd_data.getDoubleAt(12) == 8.642135e+130) {
            this.rrd_align == 32;
        }
        else if (this.rrd_data.getDoubleAt(16) == 8.642135e+130) {
            this.rrd_align == 64;
        }
        else {
            throw new InvalidRRD("Unsupported platform.");
        }

    }

    // load up the row counts
    RRDHeader.prototype.loadRowCounts = function() {
        this.rra_def_row_cnts = [];
        // how many rows before me
        this.rra_def_row_cnt_sums = [];

        for (var i=0; i<this.rra_cnt; i++) {
            this.rra_def_row_cnts[i] = this.rrd_data.getULongAt(
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
        return this.rrd_data.getULongAt(this.live_head_idx);
    }

    RRDHeader.prototype.getDSCount = function() {
        return this.ds_cnt;
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

        return new RRDDS(this.rrd_data, this.ds_def_idx + this.ds_el_size *idx, idx);
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

    RRDHeader.prototype.getRRACount = function() {
        return this.rra_cnt;
    }

    RRDHeader.prototype.getRRAInfo = function(idx) {
        if ((idx < 0) || (idx > this.rra_cnt))
            throw RangeError("RRA index (" + idx + ") out of range [0-" + this.rra_cnt + "]");

        return new RRAInfo(this.rrd_data,
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
    this.rrd_data = new BinaryFile(path);

    this.rrd_header = new RRDHeader(this.rrd_data);
    this.rrd_header.loadRowCounts();
}

    RRDFile.prototype.header = function() { return this.rrd_header; }

    RRDFile.prototype.getMinStep = function() {
        return this.rrd_header.getMinStep();
    }

    RRDFile.prototype.getLastUpdate = function() {
        return this.rrd_header.getLastUpdate();
    }

    //// DS methods ////
    RRDFile.prototype.getDSNames = function() {
        return this.rrd_header.getDSNames();
    }

    RRDFile.prototype.getDSCount = function() {
        return this.rrd_header.getDSCount();
    }
    // gets a DS
    RRDFile.prototype.getDS = function(id) {
        if (typeof id == 'number')
            return this.rrd_header.getDSbyIndex(id);
        else
            return this.rrd_header.getDSbyName(id);
    }

    //// RRA methods ////

    // fetch count of RRAs
    RRDFile.prototype.getRRACount = function() {
        return this.rrd_header.getRRACount();
    }
    // fetch RRA information/header
    RRDFile.prototype.getRRAInfo = function(idx) {
        return this.rrd_header.getRRAInfo(idx);
    }

    // fetch an RRA
    RRDFile.prototype.getRRA = function(idx) {
        var rra_info = this.rrd_header.getRRAInfo(idx);
        return new RRA(this.rrd_data,
                          this.rrd_header.rra_ptr_idx + idx * this.rrd_header.rra_ptr_el_size,
                          rra_info,
                          this.rrd_header.header_size,
                          this.rrd_header.rra_def_row_cnt_sums[idx],
                          this.getDSCount());
    }


// ============================================================
/* Invalid RRD Exception class */
function InvalidRRD(msg) {
    this.message=msg;
    this.name="Invalid RRD";
}
    // pretty print
    InvalidRRD.prototype.toString = function() {
        return this.name + ': "' + this.message + '"';
    }

    
exports.RRDFile = RRDFile;
exports.version = '0.1.0';

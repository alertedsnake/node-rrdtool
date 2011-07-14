
var rrdtool = require('../lib/rrdtool');

var rrdfile = new rrdtool.RRDFile('./tests/cputemp0.rrd');

///// tests /////

var errors = 0;

errors += dotest("ds_cnt", function() {
    return rrdfile.header().ds_cnt == 1;
});

errors += dotest("ds_names", function() {
    var test = rrdfile.header().getDSNames();
    if (test.length != 1)
        return false;
    else if (test[0] != 'cpu0')
        return false;
    return true;
});

errors += dotest("last update", function() {
    return rrdfile.header().getLastUpdate() == 1310418961;
});

errors += dotest("min step", function() {
    return rrdfile.header().getMinStep() == 60;
});





console.log(errors + " errors encountered.");

function dotest(str, func) {
    var outstr = "checking " + str + "... ";
    if (func()) {
        console.log(outstr + 'OK');
        return 0;
    }
    else {
        console.log(outstr + 'FAIL');
        return 1;
    }
}



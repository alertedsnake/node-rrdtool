
var rrdtool = require('../lib/rrdtool');

var rrdfile = new rrdtool.RRDFile('./tests/cputemp0.rrd');

///// tests /////

var errors = 0;

errors += dotest("ds_cnt", function() {
    return rrdfile.header().ds_cnt == 1;
});

errors += dotest("ds_names", function() {
    var test = rrdfile.getDSNames();
    if (test.length != 1)
        return false;
    else if (test[0] != 'cpu0')
        return false;
    return true;
});

errors += dotest("last update", function() {
    return rrdfile.getLastUpdate() == 1310418961;
});

errors += dotest("min step", function() {
    return rrdfile.getMinStep() == 60;
});


errors += dotest("DS #0 name ", function() {
    return rrdfile.getDS(0).getName() == 'cpu0';
});
errors += dotest("DS #0 type ", function() {
    return rrdfile.getDS(0).getType() == 'GAUGE';
});


errors += dotest("RRA #0 name ", function() {
    return rrdfile.getRRA(0).getCFName() == 'AVERAGE';
});
errors += dotest("RRA #0 row_count ", function() {
    return rrdfile.getRRA(0).getRowCount() == 8928;
});
errors += dotest("RRA #0 ds_count ", function() {
    return rrdfile.getRRA(0).getDSCount() == 1;
});
errors += dotest("RRA #0 pdp_per_row ", function() {
    return rrdfile.getRRA(0).getPdpPerRow() == 1;
});

console.log(errors + " errors encountered.");

console.log("-------------------------------------");
console.log("DS #0 min/max: " + 
                rrdfile.getDS(0).getMin() + " / " + 
                rrdfile.getDS(0).getMax());

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



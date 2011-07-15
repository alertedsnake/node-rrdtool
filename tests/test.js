
var vows = require('vows'),
    assert = require('assert');
var rrdtool = require('../lib/rrdtool');

vows.describe('RRD tests').addBatch({
    'RRD File Tests:': {
        topic: new rrdtool.RRDFile('./tests/cputemp0.rrd'),

        'last update': function(topic) {
            assert.equal(topic.getLastUpdate(), 1310418961);
        },
        'min step': function(topic) {
            assert.equal(topic.getMinStep(), 60);
        },

        'DS:': {
            'count': function(topic) {
                assert.equal(topic.header().ds_cnt, 1);
            },
            'name count': function(topic) {
                assert.equal(topic.getDSNames().length, 1);
            },
            'name match': function(topic) {
                assert.equal(topic.getDSNames()[0], 'cpu0');
            },
            'DS #0:': {
                'name': function(topic) {
                    assert.equal(topic.getDS(0).getName(), 'cpu0');
                },
                'type': function(topic) {
                    assert.equal(topic.getDS(0).getType(), 'GAUGE');
                }
            }
        },
        'RRA:': {
            'count': function(topic) {
                assert.equal(topic.getRRACount(), 10);
            },

            'RRA #0:': {
                'name': function(topic) {
                    assert.equal(topic.getRRA(0).getCFName(), 'AVERAGE');
                },
                'row_count': function(topic) {
                    assert.equal(topic.getRRA(0).getRowCount(), 8928);
                },
                'ds_count': function(topic) {
                    assert.equal(topic.getRRA(0).getDSCount(), 1);
                },
                'pdp_per_row': function(topic) {
                    assert.equal(topic.getRRA(0).getPdpPerRow(), 1);
                }
            }
        }
    }
}).export(module);

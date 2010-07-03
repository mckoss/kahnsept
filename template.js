namespace.lookup('org.startpad.template').defineOnce(function (ns) {
    var util = namespace.util;
    var base = namespace.lookup('org.startpad.base');
    var format = namespace.lookup('org.startpad.format');

    // General purpose template evaluation.
    function Template(s) {
    }

    Template.methods({
        'render': function(obj) {
        }
    });

    // Evaluate the property expression in the context of the
    // object.  Returns an array of values.
    function evalProp(propExp, obj) {
        var parts = propExp.split('.');
        // Successively refine result array (can be multi-value)
        var res = [obj];
        // Evaluate each property reference in turn
        base.forEach(parts, function(part) {
            var resNext = [];
            // ... for each of the objects in the previous result array
            base.forEach(res, function(each) {
                if (each instanceof Object &&
                    each[part] != undefined) {
                    var values = each[part];
                    if (!(values instanceof Array)) {
                        values = [values];
                    }
                    // ... add each of the child values to the new result
                    base.forEach(values, function(value) {
                        if (resNext.indexOf(value) == -1) {
                            resNext.push(value);
                        }
                    });
                }
            });
            res = resNext;
        });
        switch (res.length) {
        case 0:
            return undefined;
        case 1:
            return res[0];
        default:
            return res;
        }
    }

    ns.extend({
        'Template': Template,
        'evalProp': evalProp
    });
});

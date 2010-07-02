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
    // object.
    function evalProp(propExp, obj) {
        return obj[propExp];
    }

    ns.extend({
        'Template': Template,
        'evalProp': evalProp
    });
});

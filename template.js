namespace.lookup('org.startpad.template').defineOnce(function (ns) {
    var util = namespace.util;
    var base = namespace.lookup('org.startpad.base');
    var format = namespace.lookup('org.startpad.format');

    // Render a template (string) given an object.
    // Uses a sub-set of Django template language.
    function render(template, obj) {
        return template;
    }

    ns.extend({
        'render': render
    });
});

namespace.lookup('org.startpad.template.test')
.defineOnce(function (ns) {
    var template = namespace.lookup('org.startpad.template');
    var base = namespace.lookup('org.startpad.base');

    var exports = ['Template', 'evalProp'
                  ];

    function addTests(ts) {
        ts.addTest("Exports", function (ut) {
            base.forEach(exports, function (symbol) {
                ut.assertEq(typeof template[symbol], 'function', symbol);
            });
        });

        ts.addTest("evalProp", function (ut) {
            var tests = [
                ['a', 1],
                ['b', 2]
            ];
            var obj = {
                'a': 1,
                'b': 2,
                'c': {
                    'd': 3
                }
            };
            base.forEach(tests, function(test) {
                ut.assertEq(template.evalProp(test[0], obj),
                            test[1]);
            });
        });

        ts.addTest("Template.render", function (ut) {

        });
    }

    ns.addTests = addTests;
});

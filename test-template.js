namespace.lookup('org.startpad.template.test')
.defineOnce(function (ns) {
    var template = namespace.lookup('org.startpad.template');
    var base = namespace.lookup('org.startpad.base');

    var exports = ['render', 'evalVar'
                  ];

    function addTests(ts) {
        ts.addTest("Exports", function (ut) {
            base.forEach(exports, function (symbol) {
                ut.assertEq(typeof template[symbol], 'function', symbol);
            });
        });

        ts.addTest("evalVar", function (ut) {

        });

        ts.addTest("render", function (ut) {

        });
    }

    ns.addTests = addTests;
});

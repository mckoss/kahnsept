namespace.lookup('com.pageforest.kahnsept.test').defineOnce(function (ns) {
    var kahnsept = namespace.lookup('com.pageforest.kahnsept');
    var base = namespace.lookup('org.startpad.base');

    var kahnseptClasses = ['Schema', 'Property', 'BuiltIn', 'Instance',
                            'Relationship', 'World'
                           ];

    var schemaMethods = ['addProp', 'delProp'];

    function addTests(ts) {
        ts.addTest("Exported Classes", function (ut) {
            for (var i = 0; i < kahnseptClasses.length; i++) {
                var symbol = kahnseptClasses[i];
                ut.assertEq(typeof kahnsept[symbol], 'function', symbol);
            }
        });

        ts.addTest("Schema", function(ut) {
            var s = new kahnsept.Schema('test');
            ut.assertEq(s.name, 'test');
            ut.assertEq(base.keys(s.props).length, 0);

            // Expect Errors
            try {
                s.addProp('prop1');
            } catch (e) {
                ut.assertException(e, "Invalid type");
            }

            s.addProp('prop1', 'string');
            ut.assertEq(base.keys(s.props).length, 1);
            ut.assert(s.props['prop1'] instanceof kahnsept.Property);
            ut.assertEq(s.props['prop1'].name, 'prop1');

            s.delProp('prop1');
            ut.assertEq(base.keys(s.prop).length, 0);
        });

        ts.addTest("Property", function(ut) {

        });
    }

    ns.addTests = addTests;
});

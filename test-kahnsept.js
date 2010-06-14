namespace.lookup('com.pageforest.kahnsept.test').defineOnce(function (ns) {
    var kahnsept = namespace.lookup('com.pageforest.kahnsept');
    var base = namespace.lookup('org.startpad.base');

    var kahnseptClasses = ['Schema', 'Property', 'BuiltIn', 'Instance',
                           'Relationship', 'World'
                          ];

    var schemaMethods = ['addProp', 'delProp'];

    function addTests(ts) {
        ts.addTest("Exported Classes", function (ut) {
            // All Kahnsept Classes exist
            for (var i = 0; i < kahnseptClasses.length; i++) {
                var symbol = kahnseptClasses[i];
                ut.assertEq(typeof kahnsept[symbol], 'function', symbol);
            }
        });

        ts.addTest("World", function(ut) {
            // Worlds can be created
            var w = new kahnsept.World();
            ut.assert(w != undefined);

            // New schemas are assigned to most recent world
            var s = new kahnsept.Schema('test');
            ut.assertIdent(s.world, w);
        });

        ts.addTest("Schema", function(ut) {
            var w = new kahnsept.World();
            var s = new kahnsept.Schema('test');
            // Name of Schema can be assigned
            ut.assertEq(s.name, 'test');
            // Schemas have no props when created
            ut.assertEq(base.keys(s.props).length, 0);

            // Expect Errors - Test - Properties cannot be added without
            // type
            try {
                s.addProp('prop1');
            } catch (e) {
                ut.assertException(e, "Invalid type");
            }

            s.addProp('prop1', 'string');
            // Property successfuly added
            ut.assertEq(base.keys(s.props).length, 1);
            // Prop is a Property
            ut.assert(s.props['prop1'] instanceof kahnsept.Property);
            // Propname correctly assigned
            ut.assertEq(s.props['prop1'].name, 'prop1');

            // Props can be deleted
            s.delProp('prop1');
            ut.assertEq(base.keys(s.props).length, 0);
        });

        ts.addTest("BuiltIn", function(ut) {
            var b = new kahnsept.BuiltIn('string');
            // Builtins are objects
            ut.assertEq(typeof b, 'object');
            // Builtins are Builtins type
            ut.assert(b instanceof kahnsept.BuiltIn);
            // Builtins are Schemas as well
            ut.assert(b instanceof kahnsept.Schema);
        });

        ts.addTest("Instances", function(ut) {
            var w = new kahnsept.World();
            var s = new kahnsept.Schema('test');
            s.addProp("s1", "string");
            s.addProp("n1", "number");

            var obj = s.createInstance();
            obj.setProp("s1", "hello");
            ut.assertEq(obj.s1, "hello");
            obj.setProp("n1", 7);
            ut.assertEq(obj.n1, 7);
            ut
        });
    }

    ns.addTests = addTests;
});

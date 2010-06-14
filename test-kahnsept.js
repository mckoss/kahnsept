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
            var fThrows = false;
            try {
                s.addProp('prop1');
            } catch (e) {
                fThrows = true;
                ut.assertException(e, "Invalid type");
            }
            ut.assert(fThrows);

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
            s.addProp("b1", "boolean");
            s.addProp("d1", "date");

            var obj = s.createInstance();
            ut.assertEq(typeof obj, 'object');
            ut.assert(obj instanceof kahnsept.Instance);

            obj.setProp("s1", "hello");
            ut.assertEq(typeof obj.s1, 'string');
            ut.assertEq(obj.s1, "hello");

            obj.setProp("n1", 7);
            ut.assertEq(typeof obj.n1, 'number');
            ut.assertEq(obj.n1, 7);

            obj.setProp("b1", true);
            ut.assertEq(typeof obj.b1, 'boolean');
            ut.assertEq(obj.b1, true);

            var d = new Date();
            obj.setProp("d1", d);
            ut.assertEq(typeof obj.d1, 'object');
            ut.assertIdent(obj.d1.constructor, Date);
            ut.assertEq(obj.d1.getTime(), d.getTime());

            var fThrows = false;
            try {
                obj.setProp("missing", 1);
            } catch (e) {
                fThrows = true;
                ut.assertException(e, "does not exist");
            }
            ut.assert(fThrows);
        });

        ts.addTest("Property type conversion", function(ut) {
            var w = new kahnsept.World();
            var s = new kahnsept.Schema('test');
            s.addProp("s1", "string");
            s.addProp("n1", "number");
            s.addProp("b1", "boolean");
            s.addProp("d1", "date");

            var obj = s.createInstance();

            obj.setProp("s1", 1);
            ut.assertEq(typeof obj.s1, 'string');
            ut.assertEq(obj.s1, "1");

            obj.setProp("n1", "1.23");
            ut.assertEq(typeof obj.n1, 'number');
            ut.assertEq(obj.n1, 1.23);

            obj.setProp("b1", "true");
            ut.assertEq(typeof obj.b1, 'boolean');
            ut.assertEq(obj.b1, true);

            obj.setProp("d1", "1/1/2010");
            ut.assertEq(typeof obj.d1, 'object');
            ut.assertEq(obj.d1.constructor, 'Date');
            ut.assertEq(obj.d1.getTime(), (new Date("1/1/2010")).getTime());
        });
    }

    ns.addTests = addTests;
});

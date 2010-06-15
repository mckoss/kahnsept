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
                s.addProp('prop1', 'bogus');
            } catch (e) {
                fThrows = true;
                ut.assertException(e, "Invalid schema");
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
            ut.assertEq(obj.d1.constructor, Date);
            ut.assertEq(obj.d1.getTime(), (new Date("1/1/2010")).getTime());
        });

        ts.addTest("Multi-valued properties", function(ut) {
            var w = new kahnsept.World();
            var s = new kahnsept.Schema('test');
            s.addProp("s1", "string", undefined, 'many');

            var obj = s.createInstance();

            obj.setProp("s1", 'test');
            ut.assertEq(obj.s1, ['test']);

            obj.setProp("s1", 'test2');
            ut.assertEq(obj.s1, ['test', 'test2']);
        });

        ts.addTest("Complex Schema", function(ut) {
            var w = new kahnsept.World();
            var coord = new kahnsept.Schema('coordinate');
            coord.addProp("x", "number");
            coord.addProp("y", "number");
            console.log(coord);

            var t = new kahnsept.Schema('test');
            t.addProp("p1", "coordinate");

            var t1 = t.createInstance();
            t1.setProp('p1', {'x': 10, 'y': 20});
            ut.assertEq(typeof t1.p1, 'object');
            ut.assertEq(t1.p1._schema.name, 'coordinate');
            ut.assertEq(typeof t1.p1.x, 'number');
            ut.assertEq(t1.p1.x, 10);
            ut.assertEq(typeof t1.p1.y, 'number');
            ut.assertEq(t1.p1.y, 20);
        });

        ts.addTest("Default properties", function(ut) {
            var w = new kahnsept.World();
            var coord = new kahnsept.Schema('coordinate');
            coord.addProp("x", "number");
            coord.addProp("y", "number");

            var s = new kahnsept.Schema('test');
            s.addProp("s1", "string", "default");
            s.addProp("n1", "number", 123);
            s.addProp("b1", "boolean", false);
            s.addProp("d1", "date", new Date("1/1/2010"));
            s.addProp("c1", "coordinate", {'x': 10, 'y': 20});

            var obj = s.createInstance();

            ut.assertEq(typeof obj.s1, 'string');
            ut.assertEq(obj.s1, "default");

            ut.assertEq(typeof obj.n1, 'number');
            ut.assertEq(obj.n1, 123);

            ut.assertEq(typeof obj.b1, 'boolean');
            ut.assertEq(obj.b1, false);

            ut.assertEq(typeof obj.d1, 'object');
            ut.assertEq(obj.d1.constructor, Date);
            ut.assertEq(obj.d1.getTime(), (new Date("1/1/2010")).getTime());

            ut.assertEq(typeof obj.c1, 'object');
            ut.assertEq(obj.c1._schema.name, 'coordinate');
            ut.assertEq(obj.c1.x, 10);
            ut.assertEq(obj.c1.y, 20);
        });

        ts.addTest("Kahnsept Video Demo", function(ut) {
            var w = new kahnsept.World();
            var person = new kahnsept.Schema('person');
            person.addProp('name');
            person.addProp('age', 'number');

            var deb = person.createInstance();
            deb.setProp('name', "Debbie");
            deb.setProp('age', 29);

            var mike = person.createInstance();
            mike.setProp('name', "Mike");
            mike.setProp('age', 49);

            ut.assertEq(mike.name, "Mike");
            ut.assert(mike.age > deb.age);

            new kahnsept.Relationship(['husband', 'wife'],
                                      [person, person],
                                      undefined,
                                      ['one', 'one']);

            mike.setProp('wife', deb);
            ut.assertIdent(mike.wife, deb);
            ut.assertIdent(deb.husband, mike);

            var fred = person.createInstance();
            fred.setProp('name', "Fred");
            fred.setProp('age', 21);

            fred.setProp('wife', deb);
            ut.assertIdent(fred.wife, deb);
            ut.assertIdent(deb.husband, fred);
            ut.assertIdent(mike.wife, undefined);
        });
    }

    ns.addTests = addTests;
});

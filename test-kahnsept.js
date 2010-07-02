namespace.lookup('com.pageforest.kahnsept.test').defineOnce(function (ns) {
    var kahnsept = namespace.lookup('com.pageforest.kahnsept');
    var base = namespace.lookup('org.startpad.base');

    var kahnseptClasses = ['Schema', 'Property', 'BuiltIn', 'Instance',
                           'Relationship', 'World', 'camelize'
                          ];

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
            var s = w.createSchema('test');
            ut.assertIdent(s.world, w);
        });

        ts.addTest("Schema", function(ut) {
            var w = new kahnsept.World();
            var s = w.createSchema('test');
            // Name of Schema can be assigned
            ut.assertEq(s.name, 'Test');
            // Schemas have no props when created
            ut.assertEq(base.keys(s.props).length, 0);

            // Expect Errors - Test - Properties cannot be added without
            // type
            ut.assertThrows("Invalid schema", function(ut) {
                s.addProperty('prop1', 'Bogus');
            });

            s.addProperty('prop1', 'String');
            // Property successfuly added
            ut.assertEq(base.keys(s.props).length, 1);
            // Prop is a Property
            ut.assert(s.props['prop1'] instanceof kahnsept.Property);
            // Propname correctly assigned
            ut.assertEq(s.props['prop1'].name, 'prop1');

            // Props can be deleted
            s.deleteProperty('prop1');
            ut.assertEq(base.keys(s.props).length, 0);

            var s2 = w.createSchema('Test2');
            s.addProperty('s2', 'Test2');
            ut.assert(s.props['s2'] != undefined);
            ut.assert(s2.props['test'] != undefined);

            ut.assert(w.schemas['Test'] != undefined);
            w.deleteSchema('Test');
            ut.assertEq(w.schemas['Test'], undefined);
            ut.assertEq(s.count, 0);
            ut.assert(!s2.props.hasOwnProperty('test'), 'reference to deleted schema');

            ut.assertThrows("can't delete BuiltIn", function(ut) {
                w.deleteSchema('Number');
            });
        });

        ts.addTest("Instances", function(ut) {
            var w = new kahnsept.World();
            var s = w.createSchema('test');
            s.addProperty("s1", "String");
            s.addProperty("n1", "Number");
            s.addProperty("b1", "Boolean");
            s.addProperty("d1", "Date");

            var obj = s.createInstance();
            ut.assertEq(typeof obj, 'object');
            ut.assert(obj instanceof kahnsept.Instance);
            ut.assertEq(obj._id, 1);
            ut.assertEq(obj.getTitle(), "Test1");

            obj.setValue("s1", "hello");
            ut.assertEq(typeof obj.s1, 'string');
            ut.assertEq(obj.s1, "hello");

            obj.setValue("n1", 7);
            ut.assertEq(typeof obj.n1, 'number');
            ut.assertEq(obj.n1, 7);

            obj.setValue("b1", true);
            ut.assertEq(typeof obj.b1, 'boolean');
            ut.assertEq(obj.b1, true);

            var d = new Date();
            obj.setValue("d1", d);
            ut.assertEq(typeof obj.d1, 'object');
            ut.assertIdent(obj.d1.constructor, Date);
            ut.assertEq(obj.d1.getTime(), d.getTime());

            ut.assertThrows("does not exist", function(ut) {
                obj.setValue("missing", 1);
            });
        });

        ts.addTest("Schema.query", function(ut) {
            var w = new kahnsept.World();
            var s = w.createSchema('test');
            s.addProperty('s1');
            s.addProperty("n1", "Number");
            s.addProperty("b1", "Boolean");
            s.addProperty("d1", "Date");

            var inst;

            for (var i = 0; i < 10; i++) {
                inst = s.createInstance();
                inst.setValues({
                    's1': 'Object ' + i,
                    'n1': i,
                    'b1': i < 5,
                    'd1': new Date(2010, 6, i)
                });
            }

            ut.assertEq(s.query().count(), 10);
            var a = s.query().fetch();
            ut.assertEq(a.length, 10);
            for (i = 0; i < 10; i++) {
                ut.assertEq(a[i].getTitle(), 'Test' + (i + 1));
            }

            var q = s.query().filter(function() {
                return this.n1 < 5;
            });
            ut.assertEq(q.count(), 5);
            ut.assertEq(q.fetch().length, 5);

            q = s.query().filter('n1 <', 5);
            ut.assertEq(q.count(), 5);

            a = s.query().filter('n1 <', 5).filter('n1 >', 2).fetch();
            ut.assertEq(a.length, 2);
            ut.assertEq(a[0].n1, 3);
            ut.assertEq(a[1].n1, 4);

            ut.assertThrows("operator (foo) not supported", function(ut) {
                s.query().filter('n1 foo', 1);
            });

            ut.assertEq(s.query().filter('n1 =', 2).count(), 1);
            ut.assertEq(s.query().filter('n1 <=', 2).count(), 3);
            ut.assertEq(s.query().filter('n1 >=', 2).count(), 8);
            ut.assertEq(s.query().filter('n1 !=', 2).count(), 9);
            ut.assertEq(s.query().filter('s1 contains', '1').count(), 1);
            ut.assertEq(s.query().filter('s1 contains', 'Object').count(), 10);
            ut.assertEq(s.query().filter('s1 contains', 'object').count(), 10);
            ut.assertEq(s.query().filter('s1 like', /[02468]$/).count(), 5);
            ut.assertEq(s.query().filter('s1 like', '[02468]$').count(), 5);

            inst = s.query().get();
            inst.deleteInstance();
            ut.assertEq(s.query().count(), 9);

            function reverse(a, b) {
                return b.n1 - a.n1;
            }

            a = s.query().order(reverse).fetch();
            ut.assertEq(a.length, 9);
            for (i = 0; i < a.length; i++) {
                ut.assertEq(a[i].n1, 9 - i);
            }

            a = s.query().order('-n1').fetch();
            ut.assertEq(a.length, 9);
            for (i = 0; i < a.length; i++) {
                ut.assertEq(a[i].n1, 9 - i);
            }
        });

        ts.addTest("Property type conversion", function(ut) {
            var w = new kahnsept.World();
            var s = w.createSchema('test');
            s.addProperty("s1", "String");
            s.addProperty("n1", "Number");
            s.addProperty("b1", "Boolean");
            s.addProperty("d1", "Date");

            var obj = s.createInstance();

            obj.setValue("s1", 1);
            ut.assertEq(typeof obj.s1, 'string');
            ut.assertEq(obj.s1, "1");

            obj.setValue("n1", "1.23");
            ut.assertEq(typeof obj.n1, 'number');
            ut.assertEq(obj.n1, 1.23);

            obj.setValue("b1", "true");
            ut.assertEq(typeof obj.b1, 'boolean');
            ut.assertEq(obj.b1, true);

            obj.setValue("d1", "1/1/2010");
            ut.assertEq(typeof obj.d1, 'object');
            ut.assertEq(obj.d1.constructor, Date);
            ut.assertEq(obj.d1.getTime(), (new Date("1/1/2010")).getTime());
        });

        ts.addTest("Multi-valued properties", function(ut) {
            var w = new kahnsept.World();
            var s = w.createSchema('test');
            s.addProperty("s1", "String", undefined, 'many');
            s.addProperty("s2", "String", undefined, 'many');

            var obj = s.createInstance({'s2': ['hello', 'mom']});

            ut.assertEq(obj.s2, ['hello', 'mom']);

            obj.setValue("s1", 'test');
            ut.assertEq(obj.s1, ['test']);

            obj.setValue("s1", 'test2');
            ut.assertEq(obj.s1, ['test', 'test2']);
        });

        ts.addTest("Complex Schema", function(ut) {
            var w = new kahnsept.World();
            var coord = w.createSchema('coordinate');
            coord.addProperty("x", "Number");
            coord.addProperty("y", "Number");

            var t = w.createSchema('test');
            t.addProperty("p1", "Coordinate");

            var t1 = t.createInstance();
            t1.setValue('p1', {'x': 10, 'y': 20});
            ut.assertEq(typeof t1.p1, 'object');
            ut.assertEq(t1.p1._schema.name, 'Coordinate');
            ut.assertEq(typeof t1.p1.x, 'number');
            ut.assertEq(t1.p1.x, 10);
            ut.assertEq(typeof t1.p1.y, 'number');
            ut.assertEq(t1.p1.y, 20);
        });

        ts.addTest("Default properties", function(ut) {
            var w = new kahnsept.World();
            var coord = w.createSchema('Coordinate');
            coord.addProperty("x", "Number");
            coord.addProperty("y", "Number");

            var s = w.createSchema('test');
            s.addProperty("s1", "String", "default");
            s.addProperty("n1", "Number", 123);
            s.addProperty("b1", "Boolean", false);
            s.addProperty("d1", "Date", new Date("1/1/2010"));
            s.addProperty("c1", "Coordinate", {'x': 10, 'y': 20});

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
            ut.assertEq(obj.c1._schema.name, 'Coordinate');
            ut.assertEq(obj.c1.x, 10);
            ut.assertEq(obj.c1.y, 20);
        });

        ts.addTest("Schema.renameProperty", function(ut) {
            var w = new kahnsept.World();
            var t = w.createSchema('Test');
            t.addProperty("s1");

            var obj = t.createInstance();
            obj.setValue('s1', 'value');

            ut.assertEq(obj.s1, 'value');
            ut.assert(t.props['s1'].name, 's1');
            t.renameProperty('s1', 's2');
            ut.assertEq(obj.s1, undefined);
            ut.assertEq(obj.s2, 'value');
            ut.assertEq(t.props['s2'].name, 's2');
        });

        ts.addTest("Kahnsept Video Demo", function(ut) {
            var w = new kahnsept.World();
            var person = w.createSchema('Person');
            person.addProperty('name');
            person.addProperty('age', 'Number');

            var deb = person.createInstance();
            deb.setValue('name', "Debbie");
            deb.setValue('age', 29);

            var mike = person.createInstance();
            mike.setValue('name', "Mike");
            mike.setValue('age', 49);

            ut.assertEq(mike.name, "Mike");
            ut.assert(mike.age > deb.age);

            new kahnsept.Relationship('Person', 'Person',
                                      {'names': ['husband', 'wife']});

            mike.setValue('wife', deb);
            ut.assertIdent(mike.wife, deb);
            ut.assertIdent(deb.husband, mike);

            var fred = person.createInstance();
            fred.setValue('name', "Fred");
            fred.setValue('age', 21);

            fred.setValue('wife', deb);
            ut.assertIdent(fred.wife, deb);
            ut.assertIdent(deb.husband, fred);
            ut.assertIdent(mike.wife, undefined);

            var s = JSON.stringify(w.toJSON(), undefined, 4);
            ut.assertEq(typeof s, 'string');
        });

        ts.addTest("Schema.deleteProperty", function(ut) {
            var w = new kahnsept.World();
            var person = w.createSchema('person');
            var address = w.createSchema('address');

            person.addProperty('residence', 'Address', undefined, 'one');

            ut.assert(person.props['residence'] != undefined);
            ut.assert(address.props['person'] != undefined);

            var p = person.createInstance('person');
            var a = address.createInstance('address');
            p.setValue('residence', a);
            ut.assertIdent(p.residence, a);
            person.deleteProperty('residence');
            ut.assertEq(p.residence, undefined);

            ut.assertEq(person.props['residence'], undefined, 1);
            ut.assertEq(address.props['person'], undefined, 2);
        });

        ts.addTest("One to Many", function(ut) {
            var w = new kahnsept.World();
            var parent = w.createSchema('Parent');
            var child = w.createSchema('Child');

            new kahnsept.Relationship('Child', 'Parent',
                                      {'cards': ['one', 'many']});

            var p1 = parent.createInstance();
            var p2 = parent.createInstance();
            var c1 = child.createInstance();
            var c2 = child.createInstance();

            //Single Connection
            p1.setValue('child', c1);
            ut.assertIdent(p1.child[0], c1);
            ut.assertIdent(c1.parent, p1);

            //One parent, two children
            p1.setValue('child', c2);
            ut.assertEq(p1.child.length, 2);
            ut.assertIdent(p1.child[1], c2);
            //ut.assert(p1.hasValue("child", c1));
            //ut.assert(p1.hasValue("child", c2));
            ut.assertIdent(c2.parent, p1);

            //"Steal" child into second parent
            p2.setValue('child', c2);
            ut.assertEq(p1.child.length, 1);
            ut.assertEq(p2.child.length, 1);
            ut.assertIdent(p1.child[0], c1);
            ut.assertIdent(p2.child[0], c2);

            // Delete instance - remove all relationship properties
            c2.deleteInstance();
            ut.assertEq(p2.child.length, 0);
            ut.assertEq(c2.parent, undefined);
        });

        ts.addTest("Many to Many", function(ut) {
            var w = new kahnsept.World();
            var model = w.createSchema('Model');
            var color = w.createSchema('Color');

            new kahnsept.Relationship('Color', 'Model',
                                      {'cards': ['many', 'many']});

            var m1 = model.createInstance();
            var m2 = model.createInstance();
            var c1 = color.createInstance();
            var c2 = color.createInstance();

            m1.setValue('color', c1);
            m1.setValue('color', c2);
            ut.assertEq(m1.color.length, 2);
            ut.assertEq(c1.model.length, 1);
            ut.assertEq(c2.model.length, 1);

            m2.setValue('color', c1);
            m2.setValue('color', c2);
            ut.assertEq(m1.color.length, 2);
            ut.assertEq(m2.color.length, 2);
            ut.assertEq(c1.model.length, 2);
            ut.assertEq(c2.model.length, 2);
        });

        function undefinedProps(obj) {
            var undefs = [];
            for (var prop in obj) {
                if (obj.hasOwnProperty(prop)) {
                    if (obj[prop] == undefined) {
                        undefs.push(prop);
                    }
                }
            }
            if (undefs.length > 0) {
                return undefs;
            }
            return undefined;
        }

        ts.addTest("JSON", function(ut) {
            var w = new kahnsept.World();
            var person = w.createSchema('Person');
            person.addProperty('name');
            person.addProperty('age', 'Number');

            new kahnsept.Relationship('Person', 'Person',
                                      {'names': ['husband', 'wife']});

            new kahnsept.Relationship('Person', 'Person',
                                      {'names': ['parents', 'children'],
                                       'cards': ['many', 'many']});

            var deb = person.createInstance({name: "Debbie",
                                             age: 29});
            var mike = person.createInstance({name: "Mike",
                                              age: 49,
                                              wife: deb});
            var chris = person.createInstance({name: "Chris",
                                               age: 21,
                                               parents: [mike, deb]});
            var fred = person.createInstance({name: "Fred",
                                              age: 21,
                                              wife: deb});

            var s = JSON.stringify(w.toJSON(), undefined, 4);
            ut.assertEq(typeof s, 'string');

            var json = JSON.parse(s);
            var s2 = JSON.stringify(json, undefined, 4);
            ut.assertEq(s, s2);

            var w2 = new kahnsept.World();
            w2.importJSON(json);
            var json2 = w2.toJSON();
            var s3 = JSON.stringify(json2, undefined, 4);

            ut.assertEq(json.schemas, json2.schemas);
            ut.assertEq(json.relationships, json2.relationships);
            ut.assertEq(json.instances.length, json2.instances.length);

            var i;
            var j;
            var names = ['schemas', 'relationships'];
            for (i = 0; i < names.length; i++) {
                var name = names[i];
                ut.assertEq(JSON.stringify(json[name]),
                            JSON.stringify(json2[name]));
            }

            for (j = 0; j < json2.instances.length; j++) {
                var undefs = undefinedProps(json2.instances[j]);
                ut.assertEq(undefs, undefined, undefs);
            }

            for (i = 0; i < json.instances.length; i++) {
                var key = json.instances[i]._key;
                for (j = 0; j < json2.instances.length; j++) {
                    if (json2.instances[j]._key == key) {
                        break;
                    }
                }
                ut.assert(j < json2.instances.length,
                          "Key " + key + " not found.");
            }

        });

        ts.addTest("camelize", function(ut) {
            var tests = [
                [' test ', 'test'],
                ['test case', 'testCase'],
                ['testCase', 'testCase'],
                ['test case', 'TestCase', true],
                ['this isA test case, my boy', 'thisIsATestCaseMyBoy'],
                ['THIS is A test', 'thisIsATest']
            ];

            for (var i = 0; i < tests.length; i++) {
                var test = tests[i];
                ut.assertEq(kahnsept.camelize(test[0], test[2]), test[1]);
            }

            ut.assertThrows("Illegal name", function(ut) {
                kahnsept.camelize('');
            });
        });
    }

    ns.addTests = addTests;
});

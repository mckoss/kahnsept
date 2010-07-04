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
            var x = {'z': 5};
            var y = {'z': 5};
            var obj = {
                'a': 1,
                'b': 2,
                'c': {
                    'd': 3
                },
                'e': [x, y]
            };

            var tests = [
                ['a', 1],
                ['b', 2],
                ['c.d', 3],
                ['e.z', 5]
            ];

            base.forEach(tests, function(test) {
                ut.assertEq(template.evalProp(test[0], obj),
                            test[1]);
            });
        });

        ts.addTest("Template.render", function (ut) {
            var t = new template.Template("My name is {{ myName }}.");
            var obj = {'myName': "Mike"};
            ut.assertEq(t.render(obj), "My name is Mike.");

            t = new template.Template("I live in {{ address.state }} state.");
            obj = {
                address: {
                    street: "3614 Hunts Point Road",
                    state: "WA"
                }
            };
            ut.assertEq(t.render(obj), "I live in WA state.");
        });
    }

    ns.addTests = addTests;
});

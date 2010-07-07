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

        ts.addTest("Template.render - variable", function (ut) {
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

        ts.addTest("Template.render - html escaping", function (ut) {
            var t = new template.Template("My name is {{ myName }}.");
            var obj = {'myName': "Mike <script>alert(1);</script>"};
            ut.assertEq(t.render(obj),
                "My name is Mike &lt;script&gt;alert(1);&lt;/script&gt;.");
            t = new template.Template("My name is {{ myName|safe }}.");
            ut.assertEq(t.render(obj),
                "My name is Mike <script>alert(1);</script>.");
        });

        ts.addTest("Template.render - for", function (ut) {
            ut.assertThrows("Missing closing tag 'endfor'",
                function(ut) {
                    var t = new template.Template("{% for var in list %}var");
                });
            ut.assertThrows("Tag 'endfor' without matching 'for'", function(ut) {
                var t = new template.Template("var{% endfor %}");
            });
            var t = new template.Template(
                "{% for var in list %}{{ var }}{% endfor %}");
            var list = [1, 2, 'hello', 3];
            ut.assertEq(t.render({'list': list}), "12hello3");
        });
    }

    ns.addTests = addTests;
});

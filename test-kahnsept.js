namespace.lookup('com.pageforest.kahnsept.test').defineOnce(function (ns) {
	var kahnsept = namespace.lookup('com.pageforest.kahnsept');
	var base = namespace.lookup('org.startpad.base');

	var kahnseptClasses = ['Schema', 'Property', 'BuiltIn', 'Instance',
	                       'Relationship', 'World'
	                       ];

	var schemaMethods = ['addProp', 'delProp'];

	function addTests(ts) {
		ts.addTest("Exported Classes", function (ut) {
			//Test - All Kahnsept Classes exist
			for (var i = 0; i < kahnseptClasses.length; i++) {
				var symbol = kahnseptClasses[i];
				ut.assertEq(typeof kahnsept[symbol], 'function', symbol);
			}
		});

		ts.addTest("World", function(ut) {
			//Test - worlds can be created
			var w = new kahnsept.World();
			ut.assert(w != undefined);

			//Test new schemas are assigned to most recent world
			var s = new kahnsept.Schema('test');
			ut.assertIdent(s.world, w);
		});

		ts.addTest("Schema", function(ut) {
			var w = new kahnsept.World();
			var s = new kahnsept.Schema('test');
			ut.assertEq(s.name, 'test');  //test- Name of Schema can be assigned
			ut.assertEq(base.keys(s.props).length, 0);  //Schemas have no props when created

			// Expect Errors - Test - Properties cannot be added without type
			try {
				s.addProp('prop1');
			} catch (e) {
				ut.assertException(e, "Invalid type");
			} 

			s.addProp('prop1', 'string');
			ut.assertEq(base.keys(s.props).length, 1);  //Test - Property successfuly added
			ut.assert(s.props['prop1'] instanceof kahnsept.Property); //Test prop is a Property
			ut.assertEq(s.props['prop1'].name, 'prop1');  //Test propname correctly assigned

			s.delProp('prop1');
			ut.assertEq(base.keys(s.props).length, 0);  //Test - Props can be deleted
		});

		ts.addTest("BuiltIn", function(ut) {
			var b = new kahnsept.BuiltIn('string');
			ut.assertEq(typeof b, 'object');  //Test - Builtins are objects
			ut.assert(b instanceof kahnsept.BuiltIn); // Test - Builtins are Builtins
			ut.assert(b instanceof kahnsept.Schema); // Test - Builtins are Schemas
		});
	}

	ns.addTests = addTests;
});

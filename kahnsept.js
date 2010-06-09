namespace.lookup('com.pageforest.kahnsept').defineOnce(function (ns) {

    function Schema(name) {
        this.name = name;
        this.props = {};
    }

    function Property(name) {
        this.name = name;
    }

    function BuiltIn() {
    }

    function Instance() {
    }

    function Relationship() {
    }

    function World() {
    }

    Schema.methods({
        addProp: function (name, type) {
            if (typeof type != 'string') {
                throw new Error("Invalid type: " + type);
            }

            var prop = this.props[name];
            if (prop) {
                throw new Error("Property " + name + " exists.");
            }

            this.props[name] = new Property(name);
        },

        delProp: function(name) {
            delete this.props[name];
        }
    });

    ns.extend({
        'Schema': Schema,
        'Property': Property,
        'BuiltIn': BuiltIn,
        'Instance': Instance,
        'Relationship': Relationship,
        'World': World
    });
});

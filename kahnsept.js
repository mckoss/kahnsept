namespace.lookup('com.pageforest.kahnsept').defineOnce(function (ns) {
    var currentWorld;

    function World() {
        currentWorld = this;

        this.schemas = {};

        this.instances = [];
        this.idNext = 0;

        this.init();
    }

    function Schema(name, world) {
        if (typeof name != 'string') {
            throw new Error("Invalid schema name: " + name);
        }
        this.name = name;
        if (world == undefined) {
            world = currentWorld;
        }
        if (world) {
            world.addSchema(this);
        }
        this.props = {};
    }

    function Property(name, type, defaultValue) {
        this.name = name;
        this.type = type;
        this.defaultValue = defaultValue;
    }

    function BuiltIn(name, world) {
        Schema.call(this, name, world);
    }

    BuiltIn.prototype = new Schema('dummy');
    BuiltIn.types = {
        'number': Number,
        'string': String,
        'bool': Boolean,
        'date': Date
    };

    function Instance(schema) {
        this._schema = schema;
    }

    function Relationship() {
    }

    World.methods({
        init: function() {
            for (var type in BuiltIn.types) {
                if (BuiltIn.types.hasOwnProperty(type)) {
                    new BuiltIn(type, this);
                }
            }
        },

        addSchema: function(schema) {
            if (!(schema instanceof Schema)) {
                throw new Error("Invalid schema: " + schema);
            }

            var s = this.schemas[schema.name];
            if (s != undefined) {
                throw new Error("Schema " + schema.name + " exists.");
            }

            this.schemas[schema.name] = schema;
            schema.world = this;
        }
    });

    Schema.methods({
        addProp: function (name, type, defaultValue) {
            if (typeof type != 'string') {
                throw new Error("Invalid type: " + type);
            }

            var prop = this.props[name];
            if (prop) {
                throw new Error("Property " + name + " exists.");
            }

            
            
            this.props[name] = new Property(name, type, defaultValue);
        },

        delProp: function(name) {
            delete this.props[name];
        },

        createInstance: function (values) {
            var i = new Instance(this);
            this.world.instances.push(i);

            for(var prop in this.props) {
            	if(this.props[prop].defaultValue != undefined) {
            		i.setProp(prop, this.props[prop].defaultValue);
            	}
            }
            
            if (values != undefined) {
                for (var prop in values) {
                    if (values.hasOwnProperty(prop)) {
                        i.setProp(prop, values[prop]);
                    }
                }
            }
            return i;
        }
    });

    Instance.methods({
        setProp: function (name, value) {
            if (this._schema.props[name] == undefined) {
                throw new Error("Property " + name + " does not exist.");
            }
            var targetType = this._schema.props[name].type;
            switch (targetType) {
            case 'string':
                value = value.toString();
                break;
            case 'number':
                value = parseFloat(value);
                break;
            case 'boolean':
                value = Boolean(value);
                break;
            case 'date':
                value = new Date(value);
                break;
            default:
                if (value instanceof Instance) {
                    if (value.type != targetType) {
                        throw new Error("Property type mismatch, " +
                                        value.type +
                                        " should be " + targetType + ".");
                    }
                }
                else {
                    var world = this._schema.world;
                    var schema = world.schemas[targetType];
                    if (schema == undefined) {
                        throw new Error("Undefined schema: " + targetType);
                    }
                    value = schema.createInstance(value);
                }
            }

            this[name] = value;
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

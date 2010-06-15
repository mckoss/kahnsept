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
        if (world == undefined) {
            world = currentWorld;
        }
        if (world.schemas[name] != undefined) {
            throw new Error("Duplicate schema name: " + name);
        }
        world.schemas[name] = this;
        this.world = world;
        this.name = name;
        this.props = {};
    }

    function Property(name, type) {
        this.name = name;
        this.type = type;
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
                    this.addSchema(new BuiltIn(type));
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
        }
    });

    Schema.methods({
        addProp: function (name, type) {
            if (typeof type != 'string') {
                throw new Error("Invalid type: " + type);
            }

            var prop = this.props[name];
            if (prop) {
                throw new Error("Property " + name + " exists.");
            }

            this.props[name] = new Property(name, type);
        },

        delProp: function(name) {
            delete this.props[name];
        },

        createInstance: function (values) {
            var i = new Instance(this);
            this.world.instances.push(i);
            
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
            			throw new Error("Property type mismatch, " + value.type +
            					" should be " + targetType + ".");
            		}
            	}
            	else {
            		value = currentWorld.schemas[targetType].createInstance(value);
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

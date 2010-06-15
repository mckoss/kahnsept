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

    // A schema property definition:
    // name - The name of the property
    // type - The name of the schema
    function Property(name, schemaName, defaultValue, card) {
        this.name = name;
        this.schemaName = schemaName;
        this.defaultValue = defaultValue;
        if (card == undefined) {
            card = 'one';
        }
        this.card = card;

        if (!(this.card == 'one' || this.card == 'many')) {
            throw new Error("Invalid cardinality: " + card);
        }
    }

    function BuiltIn(name, world) {
        Schema.call(this, name, world);
    }

    BuiltIn.prototype = new Schema('dummy');
    BuiltIn.types = {
        'number': Number,
        'string': String,
        'boolean': Boolean,
        'date': Date
    };

    function Instance(schema) {
        this._schema = schema;
    }

    // Relationship is created from two schemas, cardinalities
    // and "tags" (property names).
    function Relationship(schemaNames, names, cards) {
        var i;

        this.schemaNames = schemaNames;
        this.cards = cards;
        this.names = names;

        // The name for each property
        for (i = 0; i < 2; i++) {
            if (this.names[i] == undefined) {
                this.names[i] = this.schemaNames[1 - i];
            }
        }

        var props = [];
        var schemas = [];
        try {
            for (i = 0; i < 2; i++) {
                schemas[i] = currentWorld.schemas[this.schemaNames[i]];
                if (schemas[i] == undefined) {
                    throw new Error("Invalid schema: " + this.schemaNames[i]);
                }
                props[i] = new Property(this.names[i],
                                        this.schemaNames[1 - i],
                                        undefined,
                                        this.cards[i]);

                schemas[i]._addProp(this.names[i], props[i]);
            }
        } catch (e) {
            for (i = 0; i < 2; i++) {
                if (props[i]) {
                    schemas[i].delProp(this.names[i]);
                }
            }
            throw e;
        }
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
        },

        inverseCard: function(card) {
            if (card == 'one') {
                return 'many';
            } else if (card == 'many') {
                return 'one';
            }
            return undefined;
        }
    });

    Schema.methods({
        addProp: function(name, schemaName, defaultValue, card) {
            var schema = this.world.schemas[schemaName];
            if (schema instanceof BuiltIn) {
                var prop = new Property(name, schemaName,
                                        defaultValue, card);
                this._addProp(name, prop);
            }
            else {
                new Relationship([this.name, schemaName],
                                 [name, undefined],
                                 [card, this.world.inverseCard(card)]);
            }
            return this.props[name];
        },

        _addProp: function (name, prop) {
            if (this.props[name]) {
                throw new Error("Property " + name + " exists.");
            }

            this.props[name] = prop;
        },

        delProp: function(name) {
            delete this.props[name];
        },

        createInstance: function (values) {
            var i = new Instance(this);
            var prop;
            this.world.instances.push(i);

            for (prop in this.props) {
                if (this.props[prop].defaultValue != undefined) {
                    i.setProp(prop, this.props[prop].defaultValue);
                }
            }

            if (values != undefined) {
                for (prop in values) {
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
            var prop = this._schema.props[name];
            if (prop == undefined) {
                throw new Error("Property " + name + " does not exist.");
            }
            var targetSchemaName = prop.schemaName;
            // TODO: Call schema.setValue(this, name, value) so each
            // schema class implements it's own setter function.
            switch (targetSchemaName) {
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
                    if (value.schemaName != targetSchemaName) {
                        throw new Error("Property type mismatch, " +
                                        value.schemaName +
                                        " should be " + targetSchemaName + ".");
                    }
                }
                else {
                    var world = this._schema.world;
                    var schema = world.schemas[targetSchemaName];
                    if (schema == undefined) {
                        throw new Error("Undefined schema: " +
                                        targetSchemaName);
                    }
                    value = schema.createInstance(value);
                }
            }

            if (prop.card == 'many') {
                // TODO: Don't add duplicate values?
                // How do we edit or delete a value in a 'many' property?
                if (this[name] == undefined) {
                    this[name] = [];
                }
                this[name].push(value);
            }
            else {
                this[name] = value;
            }
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

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
    // defaultValue can be one of:
    //   undefined
    //   Instance - shared by all instances that have this property
    //   object initializer (e.g., {'x': 1, 'y': 2}) - used to initialize
    //     a private copy of the property instance.
    function Property(name, schemaName, defaultValue, card, relationship) {
        this.name = name;
        this.schemaName = schemaName;
        this.defaultValue = defaultValue;
        if (card == undefined) {
            card = 'one';
        }
        this.card = card;
        this.relationship = relationship;

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
    function Relationship(names, schemaNames, defaultValues, cards) {
        var i;

        this.schemaNames = schemaNames;
        this.cards = cards;
        this.names = names;
        if (defaultValues == undefined) {
            defaultValues = [undefined, undefined];
        }

        // The name for each property
        for (i = 0; i < 2; i++) {
            if (this.names[i] == undefined) {
                this.names[i] = this.schemaNames[1 - i];
            }
        }

        this.props = [];
        var schemas = [];
        try {
            for (i = 0; i < 2; i++) {
                schemas[i] = currentWorld.schemas[this.schemaNames[i]];
                if (schemas[i] == undefined) {
                    throw new Error("Invalid schema: " + this.schemaNames[i]);
                }
                this.props[i] = new Property(this.names[i],
                                             this.schemaNames[1 - i],
                                             defaultValues[i],
                                             this.cards[i],
                                             this);

                schemas[i]._addProp(this.names[i], this.props[i]);
            }
        } catch (e) {
            for (i = 0; i < 2; i++) {
                if (this.props[i]) {
                    schemas[i].delProp(this.names[i]);
                    delete this.props[i];
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
            if (schemaName == undefined) {
                schemaName = 'string';
            }
            var schema = this.world.schemas[schemaName];
            if (schema instanceof BuiltIn) {
                var prop = new Property(name, schemaName,
                                        defaultValue, card);
                this._addProp(name, prop);
            }
            else {
                new Relationship([name, undefined],
                                 [this.name, schemaName],
                                 [defaultValue, undefined],
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
            if (values instanceof Instance) {
                if (values._schema.name != this.name) {
                    throw new Error("Property type mismatch, " +
                                    values._schema.name + " should be " + targetSchemaName + ".");
                }
                return values;
            }

            var i = new Instance(this);
            var prop;
            this.world.instances.push(i);

            // Set default property values - as defined in Schema
            for (prop in this.props) {
                if (this.props.hasOwnProperty(prop)) {
                    if (this.props[prop].defaultValue != undefined) {
                        i.setProp(prop, this.props[prop].defaultValue);
                    }
                }
            }

            // Insitialize other properties as passed in createInstance
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

    BuiltIn.methods({
        createInstance: function(value) {
           switch (this.name) {
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
           }

           return value;
        }
    });

    Property.methods({
        setValue: function(instance, value, fOneOnly) {
            if (this.card == 'many') {
                // TODO: Don't add duplicate values?
                // How do we edit or delete a value in a 'many' property?
                if (instance[this.name] == undefined) {
                    instance[this.name] = [];
                }
                instance[this.name].push(value);
            }
            else {
                instance[this.name] = value;
            }
            
            if (!fOneOnly && this.relationship) {
                var propOther = this.relationship.otherProp(this);
                propOther.setValue(value, instance, true);
            }
        }
    });

    Relationship.methods({
        otherProp: function(prop) {
            if (prop === this.props[0]) {
                return this.props[1];
            }
            if (prop == this.props[1]) {
                return this.props[0];
            }
            return undefined;
        }
    });

    Instance.methods({
        setProp: function (name, value) {
            var prop = this._schema.props[name];

            if (prop == undefined) {
                throw new Error("Property " + name + " does not exist in " +
                                this._schema.name + " instance.");
            }

            var targetSchemaName = prop.schemaName;

            var world = this._schema.world;
            var schema = world.schemas[targetSchemaName];

            if (schema == undefined) {
                throw new Error("Undefined schema: " + targetSchemaName);
            }

            value = schema.createInstance(value);
            prop.setValue(this, value);
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

namespace.lookup('com.pageforest.kahnsept').defineOnce(function (ns) {
    var currentWorld;

    // World - Container for all data and meta-data for schemas, and
    // instances.
    function World() {
        currentWorld = this;
        this.schemas = {};
        this.instances = [];
        this.idNext = 0;
        this.init();
    }

    // Schema - A definition for a Kahnsept "object". Contains a
    // collection of allowed properties.
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

    // Property - Defintion for a single property in an Schema.  Can
    // be single or multi-valued (card == 'one' or card == 'many'.
    // Each property has a name and schemaName of the type of value(s)
    // that it can contain.
    //
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

    // BuiltIn - A Schema sub-class to represent the built-in property
    // types in Kahnsept.
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

    // Instance - An instance is a collection of property name/value pairs which
    // conform to a Schema definition.
    function Instance(schema) {
        this._schema = schema;
    }

    // Relationship - Relationships are "bi-directional" properties.
    function Relationship(names, schemaNames, defaultValues, cards) {
        var i;

        this.schemaNames = schemaNames;
        this.cards = cards;
        this.names = names;
        if (defaultValues == undefined) {
            defaultValues = [undefined, undefined];
        }

        for (i = 0; i < 2; i++) {
            if (this.names[i] == undefined) {
                this.names[i] = this.schemaNames[1 - i].toLowerCase();
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
            // If we have an error, we should clean up any half-generated
            // properties.
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
        // Initialize the World by creating all the built-in Schema types.
        init: function() {
            for (var type in BuiltIn.types) {
                if (BuiltIn.types.hasOwnProperty(type)) {
                    new BuiltIn(type, this);
                }
            }
        },

        // Add a new schema to the World.
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
        // Add a property to the Schema.  Handles BuiltIt properties
        // and shorthand for bi-directional Relationships.
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
                                 [card, undefined]);
            }
            return this.props[name];
        },

        // Internal function to register a property in the Schema.
        _addProp: function (name, prop) {
            if (this.props[name]) {
                throw new Error("Property " + name + " exists.");
            }

            this.props[name] = prop;
        },

        // Remove a property from this schema.
        // BUG: Does not delete the inverse property of a relationship.
        delProp: function(name) {
            delete this.props[name];
        },

        // Make an instance of the given Schema. Instances can be a
        // reference to and existing Instance, or a property value
        // descriptor (an Object containing property names and values to
        // assign).
        //
        // Note that BuiltIn overrides the createInstance method (below).
        createInstance: function (values) {
            if (values instanceof Instance) {
                if (values._schema.name != this.name) {
                    throw new Error("Property type mismatch, " +
                                    values._schema.name + " should be " +
                                    this.name + ".");
                }
                return values;
            }

            var i = new Instance(this);
            var name;
            var prop;

            this.world.instances.push(i);

            // Set default property values and initialize multi-valued
            // properties to empty array.
            for (name in this.props) {
                if (this.props.hasOwnProperty(name)) {
                    prop = this.props[name];
                    if (prop.card == 'many') {
                        i[name] = [];
                    }
                    if (prop.defaultValue != undefined) {
                        prop.setValue(i, prop.defaultValue);
                    }
                }
            }

            // Initialize other properties as passed in createInstance
            if (values != undefined) {
                for (name in values) {
                    if (values.hasOwnProperty(name) && name[0] != '_') {
                        prop = this.props[name];
                        prop.setValue(i, values[name]);
                    }
                }
            }
            return i;
        }
    });

    BuiltIn.methods({
        // For BuiltIn's, we just convert the initial value to the
        // corresponding JavaScript value type.
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
        // Assign a value to a property in an instance.
        // fOneOnly prevents calling setValue on the bi-directional
        // property of a relationship (to prevent infinite recursion).
        setValue: function(instance, value, fOneOnly) {
            var schema = currentWorld.schemas[this.schemaName];
            if (schema == undefined) {
                throw new Error("Undefined schema: " + this.schemaName);
            }

            var i = this.indexValue(instance, value);

            // Setting an existing value is a no-op.
            if (i != undefined) {
                return;
            }

            // Convert the initial value to the correct type.
            value = schema.createInstance(value);

            // Multi-valued property.
            if (this.card == 'many') {
                instance[this.name].push(value);
            }
            // Single-valued property.
            else {
                this.removeValue(instance, instance[this.name]);
                instance[this.name] = value;
            }

            if (this.relationship && !fOneOnly) {
                var otherProp = this.relationship.otherProp(this);
                otherProp.setValue(value, instance, true);
            }
        },

        indexValue: function(instance, value) {
            if (!(instance instanceof Instance)) {
                throw new Error("Invalid instance: " + (typeof instance));
            }

            if (value == undefined) {
                return undefined;
            }

            if (this.card == 'one') {
                return value == instance[this.name] ? true : undefined;
            }

            var values = instance[this.name];
            for (var i = 0; i < values[i]; i++) {
                if (value == values[i]) {
                    return i;
                }
            }

            return undefined;
        },

        removeValue: function(instance, value, fOneOnly) {
            var i = this.indexValue(instance, value);
            if (i == undefined) {
                return;
            } else if (i === true) {
                instance[this.name] = undefined;
            } else {
                var values = instance[this.name];
                values.splice(i, 1);
            }

            if (this.relationship && !fOneOnly) {
                var otherProp = this.relationship.otherProp(this);
                otherProp.removeValue(value, instance, true);
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

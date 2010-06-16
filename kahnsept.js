namespace.lookup('com.pageforest.kahnsept').defineOnce(function (ns) {
    var util = namespace.util;

    // BUG: Kind of a hack - try to minimize the need for a global
    // world variable.
    var currentWorld;

    // World - Container for all data and meta-data for schemas, and
    // instances.
    function World() {
        currentWorld = this;
        this.schemas = {};
        this.relationships = [];
        this.instances = [];

        // Next unique id for instances.
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
        'Number': Number,
        'String': String,
        'Boolean': Boolean,
        'Date': Date
    };

    // Instance - An instance is a collection of property name/value pairs which
    // conform to a Schema definition.
    function Instance(schema) {
        this._schema = schema;
        this._id = currentWorld.idNext++;
    }

    // Relationship - Relationships are "bi-directional" properties.
    // Usage:
    //     new Relationship('Parent', 'Child')
    //     new Relationship('Parent', 'Child', {names: ['child', 'parent']})
    //     new Relationship('Parent', 'Child', {cards: ['many', 'one']})
    // Options:
    //     names: Property names array
    //     cards: Cardinality array
    //     defaultValues: Default property values
    function Relationship(schemaLeft, schemaRight, options) {
        var i;

        this.schemaNames = [schemaLeft, schemaRight];
        this.cards = util.copyArray(options.cards);
        this.names = util.copyArray(options.names);
        var defaultValues = util.copyArray(options.defaultValues);

        for (i = 0; i < 2; i++) {
            if (this.names[i] == undefined) {
                this.names[i] = this.schemaNames[1 - i].toLowerCase();
            }
        }

        this.props = [];
        this.schemas = [];
        try {
            for (i = 0; i < 2; i++) {
                this.schemas[i] = currentWorld.schemas[this.schemaNames[i]];
                if (this.schemas[i] == undefined) {
                    throw new Error("Invalid schema: " + this.schemaNames[i]);
                }
                this.props[i] = new Property(this.names[i],
                                             this.schemaNames[1 - i],
                                             defaultValues[i],
                                             this.cards[i],
                                             this);

                this.schemas[i]._addProp(this.names[i], this.props[i]);
            }
            currentWorld.relationships.push(this);
        } catch (e) {
            // If we have an error, we should clean up any half-generated
            // properties.
            for (i = 0; i < 2; i++) {
                if (this.props[i]) {
                    this.schemas[i].delProp(this.names[i], true);
                    delete this.props[i];
                    delete this.schemas[i];
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
        },

        toJSON: function() {
            var i;
            var json = {
                schemas: {},
                relationships: [],
                instances: [],
                idNext: this.idNext
            };

            for (var schemaName in this.schemas) {
                if (this.schemas.hasOwnProperty(schemaName)) {
                    var schema = this.schemas[schemaName];
                    // Don't bother to serialize the built-in Schema
                    if (schema instanceof BuiltIn) {
                        continue;
                    }
                    json.schemas[schema.name] = schema.toJSON();
                }
            }

            for (i = 0; i < this.relationships.length; i++) {
                var relationship = this.relationships[i];
                json.relationships.push(relationship.toJSON());
            }

            for (i = 0; i < this.instances.length; i++) {
                var instance = this.instances[i];
                json.instances.push(instance.toJSON());
            }
            return json;
        },

        // Import from the JSON export format into the current world.
        // Try to preserve Instance id's - but not guaranteed.
        importJSON: function(json, schemaOnly) {
            var i;

            var schemas = json.schemas;
            for (i = 0; i < schemas.length; i++) {
                var schema = schemas[i];
                Schema.fromJSON(schema);
            }
        }
    });

    Schema.methods({
        // Add a property to the Schema.  Handles BuiltIt properties
        // and shorthand for bi-directional Relationships.
        addProp: function(name, schemaName, defaultValue, card) {
            if (schemaName == undefined) {
                schemaName = 'String';
            }
            var schema = this.world.schemas[schemaName];
            if (schema instanceof BuiltIn) {
                var prop = new Property(name, schemaName,
                                        defaultValue, card);
                this._addProp(name, prop);
            }
            else {
                new Relationship(this.name, schemaName,
                                 {'names': [name],
                                  'defaultValues': [defaultValue],
                                  'cards': [card]}
                                );
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

        // Remove a property from this schema.  Note that we don't
        // not fix up any instances that may have been using this
        // property.
        delProp: function(name, fOneOnly) {
            var prop = this.props[name];
            if (prop == undefined) {
                throw new Error("Property " + name + " does not exist in " +
                                this.name);
            }
            if (prop.relationship && !fOneOnly) {
                prop.relationship.deleteProps();
                return;
            }
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
        },

        toJSON: function() {
            var json = {
                'name': this.name,
                'props': {}
            };

            for (var propName in this.props) {
                if (this.props.hasOwnProperty(propName)) {
                    var prop = this.props[propName];
                    if (!prop.relationship) {
                        json.props[propName] = prop.toJSON();
                    }
                }
            }
            return json;
        }
    });

    namespace.extend(Schema, {
        fromJSON: function (json) {
            var schema = new Schema(json.name);
        }
    });

    BuiltIn.methods({
        // For BuiltIn's, we just convert the initial value to the
        // corresponding JavaScript value type.
        createInstance: function(value) {
            switch (this.name) {
            case 'String':
                value = value.toString();
                break;
            case 'Number':
                value = parseFloat(value);
                break;
            case 'Boolean':
                value = Boolean(value);
                break;
            case 'Date':
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
            var i;

            // Allow setting multiple values at once.
            if (value instanceof Array && this.card == 'many') {
                for (i = 0; i < value.length; i++) {
                    this.setValue(instance, value[i], fOneOnly);
                }
                return;
            }

            var schema = currentWorld.schemas[this.schemaName];
            if (schema == undefined) {
                throw new Error("Undefined schema: " + this.schemaName);
            }

            i = this.indexValue(instance, value);

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
            for (var i = 0; i < values.length; i++) {
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
        },

        toJSON: function() {
            var json = {
                'defaultValue': this.defaultValue,
                'schema': this.schemaName,
                'card': this.card
            };
            if (this.relationship) {
                json.name = this.name;
            }
            return json;
        },

        getJSON: function(instance) {
            if (this.card == 'one') {
                return this.valueJSON(instance[this.name]);
            }

            var json = [];
            var values = instance[this.name];
            for (var i = 0; i < values.length; i++) {
                json.push(this.valueJSON(values[i]));
            }
            return json;
        },

        valueJSON: function(value) {
            if (value == undefined) {
                return undefined;
            }

            if (!this.relationship) {
                return value;
            }

            // Relation properties are unambiguously Instance
            // references - so we can just persist the instance id.
            return value._id;
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
        },

        deleteProps: function() {
            var i;
            for (i = 0; i < 2; i++) {
                this.schemas[i].delProp(this.names[i], true);
            }

            var relationships = currentWorld.relationships;
            for (i = 0; i < relationships.length; i++) {
                if (relationships[i] == this) {
                    relationships.splice(i, 1);
                    return;
                }
            }
        },

        toJSON: function() {
            return [this.props[0].toJSON(),
                    this.props[1].toJSON()];
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
        },

        toJSON: function() {
            var schema = this._schema;

            var json = {
                '_schema': schema.name,
                '_id': this._id
            };

            for (var propName in schema.props) {
                if (schema.props.hasOwnProperty(propName)) {
                    var prop = schema.props[propName];
                    json[propName] = prop.getJSON(this);
                }
            }
            return json;
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

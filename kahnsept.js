namespace.lookup('com.pageforest.kahnsept').defineOnce(function (ns) {
    var util = namespace.util;
    var base = namespace.lookup('org.startpad.base');
    var format = namespace.lookup('org.startpad.format');

    // BUG: Kind of a hack - try to minimize the need for a global
    // world variable.
    var currentWorld;

    // World - Container for all data and meta-data for schemas, and
    // instances.
    function World() {
        currentWorld = this;
        this.schemas = {};
        this.relationships = [];
        this.instances = {};

        // Max number of Schema.fetch() results.
        this.maxFetch = 10000;

        // Used to map id's for importJSON.
        this.importMap = {};

        this.init();
    }

    // Converts a string to a camel-case identifier (valid
    // for property and schema names.
    function camelize(s, fInitCap) {
        // Add word breaks for every capital following a lower case
        // letter.
        var sSplit = "";
        var isLastLower;
        for (var i = 0; i < s.length; i++) {
            var isLower = s[i] == s[i].toLowerCase();
            if (isLastLower == undefined) {
                isLastLower = isLower;
            }
            if (isLastLower && !isLower) {
                sSplit += ' ';
            }
            sSplit += s[i];
            isLastLower = isLower;
        }

        // Slugify the result.
        s = format.slugify(sSplit);

        if (s == '') {
            throw new Error("Illegal name: <empty string>.");
        }

        // Convert slugified string to camelCase
        var sOut = "";
        var ich = 0;
        var ichFind = s.indexOf('-', 0);
        while (ichFind >= 0) {
            sOut += s.substring(ich, ichFind) +
                s[ichFind + 1].toUpperCase();
            ich = ichFind + 2;
            ichFind = s.indexOf('-', ich);
        }
        sOut += s.substring(ich);

        if (fInitCap) {
            sOut = sOut[0].toUpperCase() + sOut.substr(1);
        }

        return sOut;
    }

    // Schema - A definition for a Kahnsept "object". Contains a
    // collection of allowed properties.
    function Schema(name) {
        name = camelize(name, true);
        this.name = name;
        this.props = {};
        this.idNext = 1;
        this.instances = [];
        this.count = 0;
    }

    function Query(schema) {
        this.schema = schema;
        this.filters = [];
        this.orders = [];
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
        name = camelize(name);
        this.name = name;
        this.schemaName = schemaName;
        if (defaultValue != undefined) {
            this.defaultValue = defaultValue;
        }
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
    function BuiltIn(name) {
        Schema.call(this, name);
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
    function Instance(schema, key) {
        this._schema = schema;
        this._key = key;
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
                this.names[i] = this.schemaNames[1 - i];
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
                this.names[i] = this.props[i].name;
                this.schemas[i]._addProp(this.props[i]);
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
            base.forEach(BuiltIn.types, function(type, typeName) {
                this.addSchema(new BuiltIn(typeName));
            }.fnMethod(this));
        },

        // Add a new schema to the World.
        createSchema: function(schemaName) {
            return this.addSchema(new Schema(schemaName));
        },

        // Unlink a schema from a world and remove all it's instances
        // and references in other schema.
        deleteSchema: function(schemaName) {
            if (this.schemas[schemaName] == undefined) {
                throw new Error("Schema " + schemaName + " does not exist.");
            }
            var schema = this.schemas[schemaName];
            if (schema instanceof BuiltIn) {
                throw new Error("Can't delete BuiltIn Schema " +
                                schemaName + ".");
            }
            base.forEach(schema.instances, function(inst) {
                schema.deleteInstance(inst);
            });
            base.forEach(schema.props, function(prop, propName) {
                schema.delProp(propName);
            });
            schema.world = undefined;
            delete this.schemas[schemaName];
        },

        addSchema: function(schema) {
            if (this.schemas[schema.name] != undefined) {
                throw new Error("Schema " + schema.name + " exists.");
            }
            this.schemas[schema.name] = schema;
            schema.world = this;
            return schema;
        },

        generateKey: function(schema, keyHint) {
            // Generate an instance key - use the keyHint if possible (not
            // used).
            if (keyHint != undefined && this.instances[keyHint] == undefined) {
                return keyHint;
            }

            // Review: Keys should NEVER repeat or be duplicately generated
            // independently.
            var ms = new Date().getTime();
            var rand = Math.random().toString().substr(2);
            return schema.name + '|' + ms + '|' + rand;
        },

        schemaFromKey: function(key) {
            var parts = key.split('|');
            return this.schemas[parts[0]];
        },

        createInstance: function(schema, key) {
            // REVIEW: Try to preserve stability of the instance id's?
            var inst;

            if (key != undefined && this.importMap[key]) {
                return this.importMap[key];
            }

            var newKey = this.generateKey(schema, key);
            inst = new Instance(schema, newKey);
            this.instances[newKey] = inst;

            if (key != undefined) {
                this.importMap[key] = inst;
            }
            return inst;
        },

        // Remove an instance from the World key map.
        deleteInstance: function(inst) {
            delete this.instances[inst._key];
        },

        toJSON: function() {
            var i;
            var json = {
                schemas: [],
                relationships: [],
                instances: []
            };

            base.forEach(this.schemas, function(schema) {
                // Don't bother to serialize the built-in Schema
                if (schema instanceof BuiltIn) {
                    return;
                }
                json.schemas.push(schema.toJSON());
            });

            base.forEach(this.relationships, function(relationship) {
                json.relationships.push(relationship.toJSON());
            });

            base.forEach(this.instances, function(instance) {
                json.instances.push(instance.toJSON());
            });
            return json;
        },

        // Import from the JSON export format into the current world.
        // Try to preserve Instance id's - but not guaranteed.
        importJSON: function(json, schemaOnly) {
            var i;

            this.importMap = {};

            var schemas = json.schemas;
            for (i = 0; i < schemas.length; i++) {
                Schema.fromJSON(schemas[i]);
            }

            var relationships = json.relationships;
            for (i = 0; i < relationships.length; i++) {
                Relationship.fromJSON(relationships[i]);
            }

            if (schemaOnly) {
                return;
            }

            var instances = json.instances;
            for (i = 0; i < instances.length; i++) {
                Instance.fromJSON(instances[i]);
            }

            delete this.importMap;
        }
    });

    Schema.methods({
        // Add a property to the Schema.  Handles BuiltIn properties
        // and shorthand for bi-directional Relationships.
        //
        // TODO: When adding a property with a default value, should
        // update all existing instances with the default.
        addProp: function(name, schemaName, defaultValue, card) {
            if (schemaName == undefined) {
                schemaName = 'String';
            }
            var schema = this.world.schemas[schemaName];
            if (schema instanceof BuiltIn) {
                var prop = new Property(name, schemaName,
                                        defaultValue, card);
                this._addProp(prop);
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
        _addProp: function (prop) {
            var name = prop.name;
            if (this.props[name]) {
                throw new Error("Property " + name + " exists.");
            }

            this.props[name] = prop;
        },

        // Remove a property from this schema.  All instances
        // have the values of this property removed.
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
            base.forEach(this.instances, function(inst) {
                prop.removeValue(inst);
            });
            delete this.props[name];
        },

        // Rename a property - and all the instances.
        renameProp: function(oldName, newName) {
            oldName = camelize(oldName);
            newName = camelize(newName);
            if (oldName == newName) {
                return;
            }
            if (this.props[newName] != undefined) {
                throw new Error("Property " + newName + " already exists.");
            }
            if (this.props[oldName] == undefined) {
                throw new Error("No such property: " + oldName +
                                " in " + this.name + ".");
            }
            var prop = this.props[oldName];
            delete this.props[oldName];
            this.props[newName] = prop;
            prop.name = newName;
            base.forEach(this.instances, function(inst) {
                if (inst[oldName] != undefined) {
                    inst[newName] = inst[oldName];
                    delete inst[oldName];
                }
            });
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

            // In the import case, we can create a stub object as a forward
            // reference.
            if (typeof values == 'string') {
                values = {'_key': values};
            }
            else if (values == undefined) {
                values = {};
            }

            // Be sure to get the same instance if we're importing a
            // specific key.
            var inst = this.world.createInstance(this, values._key);

            // Each new instance gets a unique (local) id number.
            // Do not allocate an instance id if it's already registered.
            if (inst._id == undefined) {
                this.instances[this.idNext] = inst;
                this.count++;
                inst._id = this.idNext++;
            }

            var name;
            var prop;

            // Set default property values and initialize multi-valued
            // properties to empty array.
            for (name in this.props) {
                if (this.props.hasOwnProperty(name)) {
                    prop = this.props[name];
                    if (prop.card == 'many' && inst[name] == undefined) {
                        inst[name] = [];
                    }
                    if (prop.defaultValue != undefined &&
                        !prop.hasValue(inst)) {
                        prop.setValue(inst, prop.defaultValue);
                    }
                }
            }

            inst.setValues(values);

            return inst;
        },

        // To delete an instance, set remove all of its Relationship
        // properties, and remove from the instance maps in the World
        // and Schema.
        deleteInstance: function(inst) {
            base.forEach(this.props, function(prop) {
                prop.removeValue(inst);
            });
            this.world.deleteInstance(inst);
            delete this.instances[inst._id];
            this.count--;
        },

        query: function() {
            return new Query(this);
        },

        toJSON: function() {
            var json = {
                'name': this.name,
                'props': []
            };

            base.forEach(this.props, function(prop) {
                if (!prop.relationship) {
                    json.props.push(prop.toJSON());
                }
            });
            return json;
        }
    });

    util.extendObject(Schema, {
        fromJSON: function (json) {
            var schema = currentWorld.createSchema(json.name);

            base.forEach(json.props, function(propJSON) {
                schema._addProp(Property.fromJSON(propJSON));
            });
        }
    });

    Query.methods({
        // Number of Instances in the result (if fetch() where called).
        count: function() {
            // Special case - unfiltered list - return count of
            // instances.
            if (this.filters.length == 0) {
                return this.schema.count;
            }

            return this.fetch().length;
        },

        get: function() {
            return this.fetch(1)[0];
        },

        fetch: function(count) {
            if (count != undefined) {
                count = World.maxFetch;
            }

            var a = [];
            var instances = this.schema.instances;

            base.forEach(instances, function(inst) {
                for (var j = 0; j < this.filters.length; j++) {
                    if (!this.filters[j].call(inst)) {
                        return;
                    }
                }

                a.push(inst);

                // Can only early exit if we're returning an
                // unordered collection
                if (a.length == count && this.orders.length == 0) {
                    return false;
                }
            }.fnMethod(this));

            if (this.orders.length != 0) {
                a.sort(this.fnOrder.fnMethod(this));
            }

            if (a.length > count) {
                a = a.slice(0, count);
            }
            return a;
        },

        fnOrder: function(a, b) {
            var sgn;

            for (var i = 0; i < this.orders.length; i++) {
                sgn = this.orders[i](a, b);
                if (sgn != 0) {
                    return sgn;
                }
            }
            return 0;
        },

        // Modify the current query to be filtered.
        // Usage:
        //   query.filter('prop op', value)
        //     where op is one of =, <, <=, >, >=, !=, 'contains', 'like'
        //     prop is is a property name or propery expression (e.g.,
        //     prop.sub-prop)
        //   query.filter(fn)
        //     where fn(instance) returns true iff instance should be
        //     returned by the query
        // TODO: Handle property expressions.
        // TODO: Handle multi-values properties.
        filter: function(propOp, value) {
            if (typeof propOp == 'function') {
                this.filters.push(propOp);
                return this;
            }

            var i = propOp.indexOf(' ');
            if (i == -1) {
                throw new Error("filter syntax error: '" + propOp + "'");
            }

            var propExp = propOp.substr(0, i);
            var op = propOp.substr(i + 1);
            var fn = Query.fnOps[op];

            if (fn == undefined) {
                throw new Error("filter operator (" + op + ") not supported.");
            }

            if (op == 'like') {
                if (!(value instanceof RegExp)) {
                    value = new RegExp(value);
                }
            }

            // Use the current closure to preserve propExp, and value
            function test() {
                // this === instance to test
                return fn(this[propExp], value);
            }

            this.filters.push(test);
            return this;
        },

        // Return query results in the given order.
        // Usage:
        //   query.order('prop') - Ascending
        //   query.order('-prop') - Descending
        //   query.order(fn) - An ordering function for two instances
        //     fn(a,b): returns -1 (a < b), 0 (a == b), or 1 (a > b)
        order: function(propExp) {
            if (typeof propExp == 'function') {
                this.orders.push(propExp);
                return this;
            }

            var fReverse = propExp[0] == '-';
            if (fReverse) {
                propExp = propExp.substr(1);
            }

            // Use current closure to preserve propExp and fReverse
            function compare(a, b) {
                a = a[propExp];
                b = b[propExp];
                var sgn = 0;

                if (a < b) {
                    sgn = -1;
                }
                else if (a > b) {
                    sgn = 1;
                }
                if (fReverse) {
                    sgn = -sgn;
                }
                return sgn;
            }

            this.orders.push(compare);
            return this;
        }
    });

    util.extendObject(Query, {
        fnOps: {
            '=': function(a, b) {
                return a == b;
            },
            '<': function(a, b) {
                return a < b;
            },
            '<=': function(a, b) {
                return a <= b;
            },
            '>': function(a, b) {
                return a > b;
            },
            '>=': function(a, b) {
                return a >= b;
            },
            '!=': function(a, b) {
                return a != b;
            },
            'contains': function(a, b) {
                var s = a.toString().toLowerCase();
                b = b.toString().toLowerCase();
                return s.indexOf(b) != -1;
            },
            'like': function(a, b) {
                // b should be a Regexp
                return b.test(a);
            }
        }
    });

    BuiltIn.methods({
        // For BuiltIn's, we just convert the initial value to the
        // corresponding JavaScript value type.
        // TODO: Should have better error checking and throw on errors.
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

            // Convert the initial value to the correct type.
            if (value != undefined) {
                value = schema.createInstance(value);
            }

            i = this.indexValue(instance, value);

            // Setting an existing value is a no-op.
            if (i != undefined) {
                return;
            }

            // Multi-valued property.
            if (this.card == 'many') {
                if (value != undefined) {
                    instance[this.name].push(value);
                }
            }
            // Single-valued property.
            else {
                this.removeValue(instance, instance[this.name]);
                if (value == undefined) {
                    delete instance[this.name];
                } else {
                    instance[this.name] = value;
                }
            }

            if (this.relationship && !fOneOnly) {
                var otherProp = this.relationship.otherProp(this);
                otherProp.setValue(value, instance, true);
            }
        },

        hasValue: function(instance) {
            if (this.card == 'one') {
                return instance[this.name] != undefined;
            }

            return instance[this.name].length > 0;
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

        // Remove a particular value from an instance property.
        // If value == undefined, remove ALL values from the
        // instance property.
        removeValue: function(inst, value, fOneOnly) {
            var i;

            if (value == undefined) {
                if (this.card == 'one') {
                    if (inst[this.name] != undefined) {
                        this.removeValue(inst, inst[this.name]);
                    }
                }
                else {
                    for (i = 0; i < inst[this.name].length; i++) {
                        this.removeValue(inst, inst[this.name][i]);
                    }
                }
                return;
            }

            i = this.indexValue(inst, value);
            if (i == undefined) {
                return;
            } else if (i === true) {
                delete inst[this.name];
            } else {
                var values = inst[this.name];
                values.splice(i, 1);
            }

            if (this.relationship && !fOneOnly) {
                var otherProp = this.relationship.otherProp(this);
                otherProp.removeValue(value, inst, true);
            }
        },

        toJSON: function() {
            var json = {
                'name': this.name,
                'schema': this.schemaName
            };
            if (this.defaultValue) {
                json.defaultValue = this.defaultValue;
            }
            if (this.card != 'one') {
                json.card = this.card;
            }
            return json;
        },

        getJSON: function(inst) {
            if (this.card == 'one') {
                return this.valueJSON(inst[this.name]);
            }

            var json = [];
            var values = inst[this.name];
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
            // references - so we can just persist the instance key.
            return value._key;
        }
    });

    util.extendObject(Property, {
        fromJSON: function(json) {
            return new Property(json.name, json.schema,
                                json.defaultValue, json.card);
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

    util.extendObject(Relationship, {
        fromJSON: function(json) {
            var propLeft = json[0];
            var propRight = json[1];
            var options = {
                names: [propLeft.name, propRight.name],
                cards: [propLeft.card, propRight.card],
                defaultValues: [propLeft.defaultValue, propRight.defaultValue]
            };
            return new Relationship(propRight.schema, propLeft.schema, options);
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

        // Set one or more values defined in values Object
        setValues: function(values) {
            base.forEach(values, function(value, name) {
                if (name[0] != '_') {
                    this.setProp(name, value);
                }
            }.fnMethod(this));
        },

        getTitle: function() {
            if (this.title) {
                return this.title;
            }
            return this._schema.name + this._id;
        },

        deleteInstance: function() {
            this._schema.deleteInstance(this);
        },

        toJSON: function() {
            var schema = this._schema;

            var json = {
                '_key': this._key
            };

            base.forEach(schema.props, function(prop, propName) {
                var value = prop.getJSON(this);
                if (value != undefined) {
                    json[propName] = value;
                }
            }.fnMethod(this));
            return json;
        }
    });

    util.extendObject(Instance, {
        fromJSON: function(json) {
            var schema = currentWorld.schemaFromKey(json._key);
            if (schema == undefined) {
                throw new Error("No such schema: " + json._schema);
            }
            return schema.createInstance(json);
        }
    });

    ns.extend({
        'Schema': Schema,
        'Property': Property,
        'BuiltIn': BuiltIn,
        'Instance': Instance,
        'Relationship': Relationship,
        'World': World,
        'camelize': camelize
    });
});

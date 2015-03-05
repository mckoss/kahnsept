# Overview #

The Kahnsept Javascript library implements a programming interface to an in-memory Kahnsept database.  The Kahnsept library namespace is contained in _com.pageforest.kahnsept_.

  * **World** - A World instance holds all the data associated with a Kahnsept database including its schemas, relationships, and instances.
  * **Schema** - A Schema object defines name a contained properties for each type of Kahnsept database instance.
    * **BuiltIn** - A BuiltIn is a sub-class of a Schema.  The standard BuiltIns are String, Number, Boolean, and Date.
  * **Relationship** - A Relationship defines a (two-direction) association between Kahnsept instances.
  * **Property** - A Property defines a names attribute of an instance.  Properties are strongly typed and can contain BuiltIn data or a reference to other instances.  Note that Properties can be either single or multivalued (called the _cardinality_ of the Property).
  * **Instance** - The "data" of a Kahnsept World is stored in Instances.  Each instance is a normal JavaScript Object, whose properties are a subset of it's Schema properties (Properties can be missing/undefined in an instance).

# An Example #

The following code demonstrates how to create a Kahnsept World, and populate it with Schema and Intstances:

```
            var kahnsept = namespace.lookup('com.pageforest.kahnsept');

            var w = new kahnsept.World();
            var person = w.createSchema('Person');
            person.addProp('name');
            person.addProp('age', 'Number');

            new kahnsept.Relationship('Person', 'Person',
                                      {'names': ['husband', 'wife']});

            new kahnsept.Relationship('Person', 'Person',
                                      {'names': ['parents', 'children'],
                                       'cards': ['many', 'many']});

            var deb = person.createInstance({name: "Debbie",
                                             age: 29});
            var mike = person.createInstance({name: "Mike",
                                              age: 49,
                                              wife: deb});
            var chris = person.createInstance({name: "Chris",
                                               age: 21,
                                               parents: [mike, deb]});
            var fred = person.createInstance({name: "Fred",
                                              age: 21,
                                              wife: deb});
```

## World ##
_Creating a World:_
```
var world = new kahnsept.World();
```

_Create a new Schema:_
```
var schema = world.createSchema(schemaName);
```

_Create a new Instance:_
```
var inst = world.createInstance(schema[, key]);
```
_(Internal method- see schema.createInstance(), below).  Passing in a key string, will make a best effort to assign the key as the internal key name for the created instance (it must be unique in the World, or a distinct key will be assigned instead)._

_Convert to serializable JSON object:_
```
var json = world.toJSON();
```
After creating a JSON object, you can call ` JSON.stringify(json) ` to convert the JSON object to a string.

_Import from JSON:_
```
world.importJSON(json[, schemaOnly]);
```
Imports all the schema, relationships, and instances (if schemaOnly is _false_) into the current World object.

## Schema ##
_Add a Property to a Schema:_
Usage:
```
schema.addProp(name[, schemaName[, defaultValue[, card]]]);
```
  * **name** (_String_) - The property name to add.
  * **schemaName** (_String_) - Name of the schema type for allowed values.
  * **defaultValue** - (_Object_) A built-in JavaScript value or an Object.  If an Object is given, a setProp will be called on each property/value pair when Instances of this schema are created.  Otherwise, all properties in instances are initialized to _undefined_.
  * **card** - (_String_) The cardinality of the property (defaults to 'one').  If set to 'many', then instances contain an array of values for this property.

_Note: A Property which references another Schema type, will create a two-directional Relationship rather than a simple Property._

_Remove a Property from a Schema:_
```
schema.delProp(name);
```
_Note: If the Property is part of a Relationship, both the forward and backward Properties will be removed from the World.  Any Instances which already have values for a deleted property, will continue to have those values._

_Create an Instance:_
```
var instance = schema.createInstance([values]);
```
  * **values** (_Object_) - A built-in JavaScript value or an Object containing property/value pairs for initial values to assign to Properties of the Instance.

## Relationship ##

_Create a Relationship:_
```
new kahnsept.Relationship(schemaLeft, schemaRight[, options]);
```
  * **schemaLeft** (_String_) - Name of first schema.
  * **schemaRight** (_String_) - Name of second schema.
  * **options** (_Object_) - Properties of the options Object can be any of:
    * **card** (_` Array[2] `_) - String values 'one' or 'many' for the cardinality of each side of the relationship.
    * **names** (_` Array[2] `_) - String names for the properties to use in each instance.  If not given, dafaults to the (lowercase) name of the Schema of the _other_ schema.
    * **defaultValues** (_` Array[2] `_) - Objects for the default value to assign to new Instances which are part of this Relationship.

## Instance ##
_Set a Property value:_
```
instance.setProp(name, value);
```
  * **name** (_String_) - Name of the property to set (must be defined in the Instance's Schema.).
  * **value** (_Object_) - Can be any of:
    * **undefined** - To clear a 'one' property, set it's value to _undefined_.
    * **Instance** - Assign a Instance to a property (the reverse property will also be set in the given Instance).
    * **Array** - An array of values to be assigned to a 'many' Property.
    * **Object** - A collection of intisal property/value pairs to assign to a new Instance of the given Property type.

## Query ##

Kahnsept supports a query API (inspired by Google App Engine's [Query API](http://code.google.com/appengine/docs/python/datastore/queryclass.html#Query_filter)).

_Create a Query object from a Schema:_
```
var query = schema.query();
```

_Add a filter to a Query:_
```
query.filter("prop op", value);
query.filter(fn);
```
Where _prop_ is a property name (or a _property expression_ - see below), op is one of =, >, >=, <, <=, !=, contains, or like.  The query will then return a subset of instances that match the filter predicate.

A function, fn, can also be passed to the filter.  It is called with _this_ defined as the instance to be tested.  fn should return true iff the instance is to be included in the set.

A _contains_ filter returns true if the value appears anywhere in the string representation of the property (case insensitively).

A _like_ filter treats value as a regular expression which is used to match the value of the property.

Filters can also be chained together:
```
query.filter("prop1 op", value).filter("prop2 op", value);
```
All filters must evaluate to _true_ in order for an instances to be returned in the qualifying set.

_Return the instances specified by a Query:_
```
var instanceArray = query.fetch([maxCount]);
```
Returns an array of instances matching the query.  At most maxCount instances will be returned if specified.

_Get the first instance specified by a Query:_
```
var instance = query.get();
```
Equivalent to ` query.fetch(1)[0] `.

_Count the number of Instances returned by a Query:_
```
var c = query.count();
```
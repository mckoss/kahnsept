_This page copied from schema.py comment string in the python-based Kahnsept project.  It should be updated to a real specification document for the [YAML](http://www.yaml.org/spec/1.2/spec.html)-based Kahnsept schema language._

```
Kahnsept Schema - a simple language for specifying network data models

TODO:
- There is an argument that all properties should be "owned" - to be just like
  scalar properties (we don't expect to independently edit a string, and have
  all entities that use the old string value to be changed).
  
  But how do we indicate the cases that are NOT owned?
  
      Entity->
      ->Entity
      >Entity
      >name<Entity>
      >name<Entity(s)>
      
  Or, conversely use default un-owned, and express ownership:
  
      .Entity
      .name<Entity>
      Entity(own)
      *Entity
      
- Is "own" the same as the reverse relationship being "one"?

  own implies one for the converse relation.  But you can have relations
  (like "spouse") that are one-one but NOT own.
  
- When dumping a database, expect own properties to be embedded in the parent, whereas
  referenced properties are merely listed (and expressed elsewhere in the instance list).
  
- Relations could support mutliple Entities AND have their own (scalar) properties.  And present,
  we just have two-entity relations defined here.  A work around is to create an Entity which
  represents the Relation - this introduces and extra layer of indirection in referencing other
  entities and properties in the relation (maybe)?
  
- Should (s) default to reverse relation of one or many?  Many is the least restrictive.  This is tied
  with the presence of the own property (which would imply one and not many for the converse relation).
  
      Test
          Questions(s)
          
      Class
          Student(s)
          
  The first seems strongly to imply ownership (and converse singularity) but the second case implies
  a reference (and converse multiplicity).  For the former, when not the case we override in our model either
  with
  
      Test
          Questions(s)/(s)
          
  or
  
      Test
          Question(s)
          
      Question
          Test(s)
          
  or
  
      Relations:
      ----------
      Test(s)/Questions(s)
      
  For the later, we could clarify with:
  
      Class
          Student(s)
      Student
          Class(s)
          
- No enumeration type specified.  Could just use strings, or an Entity with text, but it would be nice
  to have a typed solution.  Note, XML-Schema has this (uses "xs:restriction").
  
- Any need for namespaces?

- Way to specify that a property is UNIQUE across all instances (like and id or choice collection)
  (* is sometimes used):
  
      Entities:
      ---------
      Person
          *username
          name
          phone
          Address(own)
          
- Specify optional or required elements (allowing zero cardinality).  Default to zero, and indicate
  required with !
  
      Entities:
      ---------
      Class
          *id
          name!
          Teacher!
          Student(s)
          
        Teacher
            name
            
        Student
            name
            
- What about type heirarchies?  Really just a shortcut mechanism, no?   How about:

    Entities:
    ---------
    Class
        name
        Teacher!
        Student(s)
        
    Person
        name
        Address
        
    Student(Person)
        
    Teacher(Person)
        Class(s)
        
  but we have ambiguity of the naming of converse relations.  What is Class.Person(s)?  Does it exist independent
  of Class.Teacher and Class.Student(s)?
  
  compare to a container model for sharing schema:
  
      Entities:
      ---------
      Class
          name
          Teacher!
          Student(s)
        
      Person
          name
          Address(own)
      
      Student
          Person(own)
          
      Teacher
          Person(own)
          
  we then reference Teacher.Person.name and Student.Person.name, and never Class.Person.
        

- Given a model we want to auto-generate:

    - HTML Forms
        - Instance views (display, new, edit)
        - Appropriate field entry (and customizations?)
    - HTML Views
        - Object navigation
    - Python classes
    - AppEngine models
    - Django models
    - Load/Save Schema/Data formats:
        - JSON
        - XML
        - CSV
        - UML
        - XML Schema
        - Other E/R data formats

    Chris's Testing Framework Example:
    
    Entities:
    ---------
    Test
        title<Text>         // (Type (Text) is optional - uppercase props and Entity names, lower case are assumed Text props)
        Question(s)         // (s) (represents a ?-many relationship)

    Question
        prompt
        QuestionType        // No Relation specified -> many-to-one relationship
        PossibleAnswer(s)   // (s) indicates one-to-many relationship
        Test(s)             // (s) on both sides indicates a many-to-many relationship
        
    QuestionType
        Text

    PossibleAnswer
        data
        delta_score<N>      // Abbrev for <N> Number <T> Text <?> Boolean <D> Date ? 
    
    User
        name
        UserAnswer(s)
        Score(s)
        
    UserAnswer
        Question
        data
        Date

    Score
        User
        Test
        ScoringDimension
        amplitude<Number>

    ScoringDimension
        Text
    
    Relations: // Redundant with above - can define either inline, or separately here
    ----------
    Test(s)/Question(s)
    Test/Score(s)
    
    Question, PossibleAnswer(s)
    Question, UserAnswer(s)
    
    Question(s), QuestionType
    UserAnswer(s), PossibleAnswer
    
    User, Score(s)
    User, UserAnswer(s)
    
    Score(s), ScoringDimension
    PossibleAnswer(s), ScoringDimension
    
An example with relationship names:

    Entities:
    ---------
    Person
        name
        parent<Person(s)>/child(s)
        spouse<Person>/spouse
        born_in<Location>/birthplace_of
        
    Location
        City
        State
        Country
        
    City
        Text
        
    State
        Text
        
    Country
        Text
        
    Relations:
    ----------
    parent<Person(s)>/child<Person(s)>
    spouse<Person>/spouse<Person>      // Can I have symmetrical names like this - non-directional relations with both names the same!
    born_in<Location>/birthplace_of<Person(s)>
    
Another example:

    Entities:
    ---------
    Class
        name
        Student(s)
        Teacher
        Schedule
        
    Student
        name
        Class(s)
        
    Teacher
        name
        Class(s)
        
    Schedule
        start<Date>
        end<Date>
        days_of_week
        time_start<Time>  // BUG: Want Time to be "owned" - so can't be one-many - allow multiple Time with same values
        time_end<Time>
        
    Time
        hour<N>
        min<N>
        
And more:

    Entities:
    ---------
    Employee
        name
        supervisor<Employee>/report(s)
        
Orders and items (see http://www.w3.org/TR/xmlschema-0/#po.xsd)

    Entities:
    ---------
    PurchaseOrder
        shipTo<Address>(own)/shipping   // w/o specifying converse relation names - we have name conflict on Address.PurchaseOrder
        billTo<Address>(own)/billing    
        comment
        Item(s)(own)
        orderDate<Date>
        
    Address
        name
        street
        city
        state
        zip
        country
        
    Item
        productName
        quantity<Number>
        price<Number>
        comment
        shipDate<Date>
```
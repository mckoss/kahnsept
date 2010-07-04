namespace.lookup('org.startpad.template').defineOnce(function (ns) {
    var util = namespace.util;
    var base = namespace.lookup('org.startpad.base');
    var format = namespace.lookup('org.startpad.format');

    // General purpose template evaluation.
    function Template(source) {
        this.parse(source);
        return this;
    }

    function Node(type, content) {
        this.type = type;
        this.content = content;
        this.nodes = [];
    }

    Template.methods({
        'parse': function(source) {
            this.source = source;
            this.top = new Node('block');
            this.current = this.top;
            this.stack = [];
            this.ich = 0;
            while (this.ich < source.length) {
                this.nextToken();
            }
            if (this.stack.length != 0) {
                throw new Error("Missing closing token for " +
                                this.stack[this.stack.length - 1].type + ".");
            }
        },

        'nextToken': function() {
            var ichEnd;
            var ichToken = this.source.indexOf('{', this.ich);

            if (ichToken == -1) {
                ichToken = this.source.length;
            }
            this.current.addNode('text',
                                 this.source.substring(this.ich,
                                                       ichToken));
            if (ichToken == this.source.length) {
                this.ich = ichToken;
                return;
            }
            switch (this.source[ichToken + 1]) {
            case '{':
                ichEnd = this.source.indexOf('}}', ichToken + 2);
                if (ichEnd == -1) {
                    throw new Error("Unbalanced token at " + ichToken);
                }
                var propName = this.source.substring(ichToken + 2, ichEnd);
                propName = base.strip(propName);
                this.current.addNode('var', propName);
                this.ich = ichEnd + 2;
                break;

            case '%':
                throw new Error("Don't support blocks, yet.");

            default:
                this.current.addNode('text',
                                     this.source.substring(this.ichToken,
                                                           this.ichToken + 1));
                this.ich = this.ichToken + 1;
                break;
            }
        },

        'render': function(obj) {
            return this.top.render(obj);
        }
    });

    Node.methods({
        'render': function(obj) {
            switch (this.type) {
            case 'text':
                return this.content;
            case 'var':
                return ns.evalProp(this.content, obj);
            case 'block':
                var s = "";
                base.forEach(this.nodes, function(node) {
                    s += node.render(obj);
                });
                return s;
            }
        },

        'addNode': function(type, content) {
            this.nodes.push(new Node(type, content));
        }
    });

    // Evaluate the property expression in the context of the
    // object.  Returns an array of values.
    function evalProp(propExp, obj) {
        var parts = propExp.split('.');
        // Successively refine result array (can be multi-value)
        var res = [obj];
        // Evaluate each property reference in turn
        base.forEach(parts, function(part) {
            var resNext = [];
            // ... for each of the objects in the previous result array
            base.forEach(res, function(each) {
                if (each instanceof Object &&
                    each[part] != undefined) {
                    var values = each[part];
                    if (!(values instanceof Array)) {
                        values = [values];
                    }
                    // ... add each of the child values to the new result
                    base.forEach(values, function(value) {
                        if (resNext.indexOf(value) == -1) {
                            resNext.push(value);
                        }
                    });
                }
            });
            res = resNext;
        });
        switch (res.length) {
        case 0:
            return undefined;
        case 1:
            return res[0];
        default:
            return res;
        }
    }

    ns.extend({
        'Template': Template,
        'evalProp': evalProp
    });
});
